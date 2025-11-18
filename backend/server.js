require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize database
const db = require('./database/init');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs_redesigned'));
app.use('/api/applications', require('./routes/applications_redesigned'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/', (req, res) => {
  res.json({ message: 'AI Recruitment Platform API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});