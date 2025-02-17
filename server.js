const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const HTTP_Port = 5000;
// Middleware
app.use(express.json());

// Multer for images with file restrictions
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPEG files are allowed.'));
    }
  },
});

// MongoDB connection with retry logic
const connectWithRetry = () => {
  mongoose.connect('mongodb://mongoadmin:mySecret1!@10.115.2.1:8017/', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('Connected to MongoDB!'))
    .catch((err) => {
      console.error('Error connecting to MongoDB, retrying in 5 seconds:', err);
      setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();

// Schema and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: { type: Buffer },
  createdAt: { type: Date, default: Date.now },
  isLoggedIn: { type: Boolean, default: false },
  stats: {
    wave: { type: Number, default: 0 },
    money: { type: Number, default: 0 },
    zombieStats: {
      health: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
    },
    upgrades: { type: Number, default: 0 },
  },
}, { collection: 'zombie_game' });

const User = mongoose.model('user', userSchema);

// Registration
app.post("/api/register", upload.single('profileImage'), async (req, res) => {
  const { username, email, password } = req.body;
  const profileImage = req.file ? req.file.buffer : null;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Username already taken." });
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ success: false, message: "Email already in use." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPassword, profileImage });

  try {
    await newUser.save();
    res.status(201).json({ success: true, message: "Registration successful!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error during registration." });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
  }

  user.isLoggedIn = true;
  await user.save();

  const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });
  res.status(200).json({ success: true, message: 'Login successful!', token });
});

// Token validation helper
const isTokenValid = (decodedToken, serverStartTime) => decodedToken.iat * 1000 >= serverStartTime;

const serverStartTime = Date.now();

// Fetch stats
app.get('/api/stats', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token missing or invalid.' });
  }

  try {
    const decoded = jwt.verify(token, 'your_secret_key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({ success: true, stats: user.stats });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token is invalid or expired.' });
  }
});

// Update stats
app.post("/api/stats", async (req, res) => {
  try {
      console.log("Empfangene Daten:", req.body); // Debugging

      const { stats } = req.body;
      if (!stats) {
          return res.status(400).json({ success: false, message: "Keine Daten gesendet" });
      }

      if (!mongoose.connection.readyState) {
          return res.status(500).json({ success: false, message: "MongoDB nicht verbunden!" });
      }

      // Daten speichern (MongoDB Beispiel)
      await GameStats.updateOne(
          { userId: "defaultUser" },
          { $set: stats },
          { upsert: true }
      );

      res.json({ success: true, message: "Spielstand gespeichert!" });
  } catch (error) {
      console.error("Fehler beim Speichern:", error);
      res.status(500).json({ success: false, message: "Fehler beim Speichern", error: error.message });
  }
});


// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Serve static files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'start.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use(express.static('public'));

// Start the server
app.listen(5000, () => console.log('Server is running on http://localhost:5000/'));
