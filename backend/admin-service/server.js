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
  console.error(err.stack);
  res.status(err.statusCode || 500).send(err.message || "The server encountered an error!");
});

const PORT = 5001;
app.listen(PORT, async () => {
  console.log(`Admin service running on http://localhost:${PORT}`);
});
