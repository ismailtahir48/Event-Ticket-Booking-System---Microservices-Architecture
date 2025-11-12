import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3009;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Notifications service running on port ${PORT}`);
});

