import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/orgs', async (req, res) => {
  res.json({ orgs: [] });
});

app.listen(PORT, () => {
  console.log(`Directory service running on port ${PORT}`);
});

