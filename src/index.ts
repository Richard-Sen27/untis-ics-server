import express from 'express';
import ical from 'ical-generator';
import { WebUntis } from 'webuntis';
import * as dotenv from 'dotenv';
import { decrypt, encrypt } from './encryption';
import path from 'path';

const app = express();
app.use(express.json());
dotenv.config({ path: '.env'});

const PORT = process.env.PORT || 3100;

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'index.html');
  res.sendFile(filePath);
});

app.get('/test', async (req, res) => {

    const { token, from, to } = req.query;

    if (!token) {
        res.status(400).send('Missing token');
        return;
    }

    const data = decrypt(token as string);
    const fromDate = from ? new Date(from as string) : null;
    const toDate = to ? new Date(to as string) : null;

    try {
        const untis = new WebUntis(data.school, data.user, data.password, data.domain);
        await untis.login()
        const timetable = fromDate && toDate ? 
        await untis.getOwnTimetableForRange(fromDate, toDate) : 
        await untis.getOwnTimetableForToday();
      
      await untis.logout();

        const entry = timetable[0];
        console.log(entry.date.toString(), "" , entry.startTime);

        // Convert Untis date and time to a Date object
        const date = WebUntis.convertUntisDate(entry.date.toString());
        const time = WebUntis.convertUntisTime(entry.startTime, date);

        // Adjust timezone to GMT+1
        const timezoneOffset = 1 * 60; // GMT+1 in minutes
        const gmtPlusOneTime = new Date(time.getTime() - timezoneOffset * 60000);

        console.log('Original Time:', time); // Time in the default timezone
        console.log('Time in GMT+1:', gmtPlusOneTime); // Adjusted time

        res.json(gmtPlusOneTime);
    } catch {
        console.log('Error fetching timetable');
        res.status(500).send('Error fetching timetable');
    }
});

app.post('/encrypt', async (req, res) => {

  const { user, password, school, domain } = req.body;

  // Validate input
  if (!user || !password || !school || !domain) {
    res.status(400).send('Missing user, password, school, or domain');
    return;
  }

  try {
    // Encrypt the data
    const token = encrypt({ user, password, school, domain });

    // Return the token
    res.status(200).json({ token });
  } catch (err: any) {
    console.error('Error encrypting data:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/decrypt', async (req, res) => {
  const { token } = req.body;

  // Validate input
  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  try {
    // Decrypt the token
    const data = decrypt(token);

    // Return the data
    res.status(200).json(data);
  } catch (err: any) {
    console.error('Error decrypting token:', err.message);
    res.status(500).send('Internal Server Error');
  }
})

app.get('/calendar.ics', async (req, res) => {
    
    const { token, from, to } = req.query;

    if (!token) {
        res.status(400).send('Missing token');
        return;
    }

    const fromDate = from ? new Date(from as string) : null;
    const toDate = to ? new Date(to as string) : null;

    const data = decrypt(token as string);  
    const untis = new WebUntis(data.school, data.user, data.password, data.domain);

    try {
      await untis.login();
      const timetable = fromDate && toDate ? 
        await untis.getOwnTimetableForRange(fromDate, toDate) : 
        await untis.getOwnTimetableForToday();
      
      await untis.logout();

      const calendar = ical({ name: `${data.user}'s WebUntis Calendar` });
  
      timetable.forEach((entry) => {
        const start = WebUntis.convertUntisTime(entry.startTime, WebUntis.convertUntisDate(entry.date.toString()))
        const end = WebUntis.convertUntisTime(entry.endTime, WebUntis.convertUntisDate(entry.date.toString()))
        calendar.createEvent({
          start,
          end,
          summary: (entry.su[0]?.name || 'Untitled Event') + (entry.code ? ` [${entry.code}]` : ''),
          location: entry.ro[0]?.name || 'Unknown Location',
          description: 
            `Teacher: ${entry.te.map((t, i) => (i !== 0 ? ", " : "") + t.longname + " (" + t.name + ")").join("") || 'N/A'}\nInfo: ${entry.info || 'N/A'}`
        });
      });
  
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');
      res.send(calendar.toString());
      return

    } catch (error) {
      console.error('Error generating calendar:', error);
      res.status(500).send('Error generating calendar');
      return
    }
});

app.get('/schoolSearch', async (req, res) => {
  const { query } = req.query

  try{
    const response = await fetch('https://mobile.webuntis.com/ms/schoolquery2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `wu_schulsuche-${Date.now()}`,
        method: 'searchSchool',
        params: [{ search: query }],
        jsonrpc: '2.0',
      }),
    });
    const { result } = await response.json()
    const short = result.schools.map((school: any) => ({ 
      displayName: school.displayName, 
      server: school.server, 
      loginName: school.loginName 
    }))
    console.log("Short response: ", short)
    res.json(short)
  } catch {
    res.status(500)
  }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})

