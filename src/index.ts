import express from 'express';
import ical from 'ical-generator';
import { WebUntis } from 'webuntis';
import * as dotenv from 'dotenv';
import { decrypt, encrypt } from './encryption';
import path from 'path';
import { toGMT } from './utils';

const app = express();
app.use(express.json());
dotenv.config({ path: '.env'});

const PORT = process.env.PORT || 3100;

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'index.html');
  res.sendFile(filePath);
});

app.get('/health', (req, res) => {
  console.log('Health check successful');
  res.status(200).send('OK');
});

app.get('/test', async (req, res) => {

    const { token, from, to } = req.query;

    if (process.env.ENVIROMENT === 'production') {
      res.status(403).send('This endpoint is disabled in production');
    }

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
        console.log(entry.date.toString(), "" , 800);

        // Convert Untis date and time to a Date object
        const date = WebUntis.convertUntisDate(entry.date.toString());
        const time = WebUntis.convertUntisTime(800, date);

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

  if (process.env.ENVIROMENT === 'production') {
    res.status(403).send('This endpoint is disabled in production');
  }

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

app.get('/absence', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    res.status(400).send('Missing token');
    return;
  }

  const data = decrypt(token as string);
  const untis = new WebUntis(data.school, data.user, data.password, data.domain);

  try {
    await untis.login();

    const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const toDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    const absences = await untis.getAbsentLesson(fromDate, toDate);
    await untis.logout();

    let totalAbsenceMinutes = 0
    let unexcusedAbsenceMinutes = 0

    absences.absences.forEach((absence) => {
      const from = WebUntis.convertUntisTime(absences.absences[0].startTime, WebUntis.convertUntisDate(absences.absences[0].startDate.toString()))
      const to = WebUntis.convertUntisTime(absences.absences[0].endTime, WebUntis.convertUntisDate(absences.absences[0].startDate.toString()))
      const duration = (to.getTime() - from.getTime()) / 60000
      
      totalAbsenceMinutes += duration
      if (!absence.isExcused) {
        unexcusedAbsenceMinutes += duration
      }
    })
    
    res.json({
      absences: absences.absences.length,
      totalAbsenceMinutes, 
      unexcusedAbsenceMinutes,
    });
  } catch (error) {
    console.error('Error fetching absences:', error);
    res.status(500).send('Error fetching absences');
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
        const untisDate = WebUntis.convertUntisDate(entry.date.toString());
        const rawStart = WebUntis.convertUntisTime(entry.startTime, untisDate);
        const rawEnd = WebUntis.convertUntisTime(entry.endTime, untisDate);
        const start = toGMT(rawStart);
        const end = toGMT(rawEnd);

        const subject = entry.su[0]?.name || '📚 Untitled Lesson';
        const exkursion = entry.lstext || entry.substText
        const room = entry.ro[0]?.name || '🏫 Unknown Room';
        const code = entry.code ? `🔖 ${entry.code}` : '';
        const teachers = entry.te?.length
          ? entry.te.map((t) => `👩‍🏫 ${t.longname} (${t.name})`).join('\n')
          : '👤 N/A';
        const info = entry.info ? `💬 ${entry.info}` : '💬 No additional info';

        calendar.createEvent({
          start,
          end,
          summary: exkursion ? `${exkursion}` : `${subject} ${code}`,
          location: room,
          description: `${teachers}\n\n${info}`,
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
    res.json(short)
  } catch {
    res.status(500)
  }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})

