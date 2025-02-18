const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const app = express();

const HTTP_Port = 5000;
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval';");
  next();
});

mongoose.connect('mongodb://mongoadmin:mySecret1!@10.115.2.1:8017/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB!'))
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });


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
    upgrades: {
      rate: { type: Number, default: 0 },
      damage: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
      knockback: { type: Number, default: 0 }
    }
  },
}, { collection: 'zombie_game' });

const User = mongoose.model('user', userSchema);

app.post("/api/stats", async (req, res) => {
  try {
      console.log("Empfangene Daten:", req.body);
      const { username, stats } = req.body;
      if (!username || !stats) {
          return res.status(400).json({ success: false, message: "Fehlende Daten" });
      }

      const user = await User.findOne({ username });
      if (!user) {
          return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
      }

      user.stats = stats;
      await user.save();

      res.json({ success: true, message: "Spielstand gespeichert!" });
  } catch (error) {
      console.error("Fehler beim Speichern:", error);
      res.status(500).json({ success: false, message: "Fehler beim Speichern", error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
      const { username } = req.query;
      if (!username) {
          return res.status(400).json({ success: false, message: "Kein Benutzername angegeben" });
      }

      const user = await User.findOne({ username });
      if (!user) {
          return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
      }

      res.json({ success: true, stats: user.stats });
  } catch (error) {
      console.error("Fehler beim Abrufen:", error);
      res.status(500).json({ success: false, message: "Fehler beim Abrufen der Daten", error: error.message });
  }
});

app.listen(HTTP_Port, () => console.log(`Server is running on http://localhost:${HTTP_Port}/`));
