const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Railway后端正常运行' });
});

app.listen(port);
