const express = require('express');
const cors = require('cors');
const app = express();

const routes = requires('./routes/adminRoutes.js');

app.use(cors());

// /api? /api/admin?
app.use('/api/admin', routes);

const PORT = 6001;
app.listen(PORT, () => {
  console.log(`Admin service running on http://localhost:${PORT}`);
});
