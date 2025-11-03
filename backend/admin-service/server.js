const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

const routePath = path.join(__dirname, 'routes/adminRoutes.js');
const routes = require(routePath);

// middleware(s)
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/admin', routes);

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  res.status(err && err.statusCode ? err.statusCode : 500).send(
    (err && err.message) || 'The server encountered an error!'
  );
});

// Export app for testing; only listen when run directly
module.exports = app;

if (require.main === module) {
  const PORT = process.env.ADMIN_PORT || 5001;
  app.listen(PORT, async () => {
    console.log(`Admin service running on http://localhost:${PORT}`);
  });
}
