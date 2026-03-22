const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('🔥 Big Slick Server Running');
});

app.get('/api/test', (req, res) => {
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Running on http://localhost:${PORT}`);
});