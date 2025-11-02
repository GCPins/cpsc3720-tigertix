const express = require('express');
const cors = require('cors');
const app = express();
const routes = require('./routes/clientRoutes.js');

app.use(cors());
app.use(express.json());
app.use('/api', routes);

// centralized error handler
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const status = err && err.statusCode ? err.statusCode : 500;
  res.status(status).json({ error: err && err.message ? err.message : 'Internal Server Error' });
});

const PORT = 6001;
app.listen(PORT, () => {
  console.log(`Client service running at http://localhost:${PORT}`)
});
