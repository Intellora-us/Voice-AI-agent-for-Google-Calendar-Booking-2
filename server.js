const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Full body:', JSON.stringify(req.body, null, 2));
  next();
});

app.post('/webhook/retell-calendar', async (req, res) => {
  console.log('=== WEBHOOK CALLED ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  // Respond immediately with success
  res.json({
    success: true,
    message: "Test booking received"
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'Server is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
