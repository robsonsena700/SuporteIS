import express from 'express';

const app = express();
const PORT = 5555;

app.get('/', (req, res) => {
  res.send('Hello');
});

const server = app.listen(PORT, () => {
  console.log(`Simple Server running on port ${PORT}`);
});

process.on('exit', (code) => {
    console.log(`Simple Server exiting with code: ${code}`);
});
