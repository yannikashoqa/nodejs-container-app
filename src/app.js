const express = require('express');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Hello from Node.js Container App!',
    version: process.env.APP_VERSION || '1.0.0',
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

// Info endpoint
app.get('/info', (req, res) => {
  res.status(200).json({
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    memory: `${Math.round(os.freemem() / 1024 / 1024)} MB free`,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };