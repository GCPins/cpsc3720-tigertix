const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

const routePath = path.join(__dirname, 'routes/adminRoutes.js');
const routes = require(routePath);

app.use(cors());
app.use(express.json());

// /api? /api/admin?
app.use('/api/admin', routes);

const PORT = 5001;
app.listen(PORT, async () => {
  console.log(`Admin service running on http://localhost:${PORT}`);
});
