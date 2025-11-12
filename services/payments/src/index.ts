import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3007;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/pay', async (req, res) => {
  const { orderId, method, cardToken } = req.body;
  
  // Mock payment processing
  const paymentId = `pay_${Date.now()}`;
  
  // Simulate success
  setTimeout(() => {
    // In real implementation, publish to RabbitMQ
  }, 100);
  
  res.json({
    paymentId,
    status: 'succeeded',
    orderId,
  });
});

app.post('/payments/webhook', async (req, res) => {
  // Handle webhook from payment provider
  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Payments service running on port ${PORT}`);
});

