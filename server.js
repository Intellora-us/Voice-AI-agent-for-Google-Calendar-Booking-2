const express = require('express');
const app = express();

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  next();
});

async function getAccessToken() {
  console.log('Getting access token...');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  console.log('Token response:', data);
  return data.access_token;
}

app.post('/webhook/retell-calendar', async (req, res) => {
  console.log('Webhook called!');
  try {
    const { function_name, arguments: args } = req.body;
    console.log('Function name:', function_name);
    console.log('Arguments:', JSON.stringify(args, null, 2));

    if (function_name === 'book_appointment') {
      const {
        customer_name,
        customer_email,
        appointment_date,
        appointment_time,
        duration_minutes = 30,
        appointment_type = 'consultation',
        notes = ''
      } = args;

      console.log('Booking appointment for:', customer_name);

      const accessToken = await getAccessToken();
      console.log('Got access token');

      const startDateTime = `${appointment_date}T${appointment_time}:00`;
      const endDateTime = new Date(
        new Date(startDateTime).getTime() + duration_minutes * 60000
      ).toISOString();

      console.log('Start time:', startDateTime);
      console.log('End time:', endDateTime);

      const event = {
        summary: `${appointment_type} - ${customer_name}`,
        description: `Appointment Type: ${appointment_type}\n\nNotes: ${notes}`,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/New_York',
        },
        attendees: [
          { email: customer_email }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      console.log('Creating calendar event...');

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        }
      );

      const data = await response.json();
      console.log('Calendar API response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create event');
      }

      console.log('Success! Event created:', data.id);

      res.json({
        success: true,
        message: `Appointment booked successfully for ${customer_name} on ${appointment_date} at ${appointment_time}`,
        event_id: data.id,
        event_link: data.htmlLink
      });
    } else {
      console.log('Unknown function:', function_name);
      res.status(400).json({
        success: false,
        message: 'Unknown function name'
      });
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Server is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});