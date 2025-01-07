import express from 'express';
import ical from 'ical-generator';
import { WebUntis } from 'webuntis';
import * as dotenv from 'dotenv';
import { dateIntToDate } from './utils';
import { decrypt, encrypt } from './encryption';

const app = express();
app.use(express.json());
dotenv.config({ path: '.env.local'});

const PORT = process.env.PORT || 3100;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
})

app.get('/test', async (req, res) => {

    const { token } = req.query;

    if (!token) {
        res.status(400).send('Missing token');
        return;
    }

    const data = decrypt(token as string);

    try {
        const untis = new WebUntis(data.school, data.user, data.password, data.domain);
        await untis.login()
        const timetable = await untis.getOwnTimetableForToday()
        await untis.logout()

        res.json(timetable);
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
    
    const { token } = req.query;

    if (!token) {
        res.status(400).send('Missing token');
        return;
    }

    const data = decrypt(token as string);  
    const untis = new WebUntis(data.school, data.user, data.password, data.domain);

    try {
      await untis.login();
      const timetable = await untis.getOwnTimetableForToday();
      await untis.logout();

      console.log(timetable);
  
      const calendar = ical({ name: `${data.user}'s WebUntis Calendar` });
  
      timetable.forEach((entry) => {
        const start = dateIntToDate(entry.date, entry.startTime);
        const end = dateIntToDate(entry.date, entry.endTime);
        calendar.createEvent({
          start,
          end,
          summary: entry.su[0]?.name || 'Untitled Event',
          location: entry.ro[0]?.name || 'Unknown Location',
          description: `Teacher: ${entry.te[0]?.name || 'Unknown'}`,
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})

