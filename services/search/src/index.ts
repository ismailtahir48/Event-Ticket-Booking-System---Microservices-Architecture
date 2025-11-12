import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3010;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/search', async (req, res) => {
  res.json({ results: [] });
});

app.listen(PORT, () => {
  console.log(`Search service running on port ${PORT}`);
});

