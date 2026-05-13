const path = require('path');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 网站首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 测试接口
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Railway后端正常运行' });
});

app.listen(port, () => {
  console.log(`运行在端口 ${port}`);
});
