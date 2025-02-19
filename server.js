const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken'); // Falls JWT für Authentifizierung genutzt wird
const favicon = require('serve-favicon');
const app = express();

const HTTP_Port = 5000;
app.use(express.json());

// ✅ Favicon bereitstellen (Muss VOR express.static stehen!)
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// ✅ Startseite setzen
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "start.html"));
});

// ✅ Spiel-Seite setzen
app.get("/game", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Debugging: Alle eingehenden Header anzeigen
app.use((req, res, next) => {
    console.log("Headers:", req.headers);
    next();
});

// ✅ MongoDB-Verbindung
mongoose.connect('mongodb://mongoadmin:mySecret1!@10.115.2.1:8017/', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB!'))
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

// ✅ Mongoose Schema für Benutzer
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    stats: {
        wave: { type: Number, default: 1 },
        money: { type: Number, default: 100 },
        upgrades: {
            rate: { type: Number, default: 1 },
            damage: { type: Number, default: 1 },
            speed: { type: Number, default: 1 },
            knockback: { type: Number, default: 0 }
        }
    },
}, { collection: 'zombie_game' });

const User = mongoose.model('user', userSchema);
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; " +
      "connect-src 'self' ws://localhost:5000; " +
      "frame-ancestors 'self';"
  );
  next();
});



// ✅ POST: Login
app.post("/api/login", async (req, res) => {
    try {
        console.log("Login-Daten empfangen:", req.body);
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Benutzername und Passwort erforderlich." });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "Benutzer nicht gefunden." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Ungültige Anmeldedaten." });
        }

        console.log(`✅ Login erfolgreich: ${username}`);
        res.json({ message: "Anmeldung erfolgreich.", token: "dummy_token" });
    } catch (error) {
        console.error("❌ Fehler beim Login:", error);
        res.status(500).json({ message: "Interner Serverfehler.", error: error.message });
    }
});

// ✅ POST: Spielstand speichern
app.post("/api/stats", async (req, res) => {
    try {
        console.log("Empfangene Daten:", req.body);
        let { username, stats } = req.body;

        if (!username || !stats) {
            return res.status(400).json({ success: false, message: "Fehlende Daten" });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
        }

        user.stats = stats;
        await user.save();

        console.log(`✅ Spielstand gespeichert für ${username}`);
        res.json({ success: true, message: "Spielstand gespeichert!" });
    } catch (error) {
        console.error("❌ Fehler beim Speichern:", error);
        res.status(500).json({ success: false, message: "Fehler beim Speichern", error: error.message });
    }
});

app.get('/api/profile-image', async (req, res) => {
  try {
      const { username } = req.query;
      if (!username) {
          return res.status(400).json({ message: "Kein Benutzername angegeben." });
      }

      const user = await User.findOne({ username });
      if (!user || !user.profileImage) {
          return res.status(404).json({ message: "Kein Profilbild gefunden." });
      }

      res.setHeader('Content-Type', 'image/png'); // Passe das Format an, falls nötig
      res.send(user.profileImage);
  } catch (error) {
      console.error("❌ Fehler beim Abrufen des Profilbildes:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Profilbildes." });
  }
});

// ✅ GET: Spielstand abrufen
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
        console.error("❌ Fehler beim Abrufen:", error);
        res.status(500).json({ success: false, message: "Fehler beim Abrufen der Daten", error: error.message });
    }
});

// ✅ Server starten
app.listen(HTTP_Port, () => console.log(`✅ Server läuft auf http://localhost:${HTTP_Port}/`));