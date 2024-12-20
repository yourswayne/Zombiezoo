const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware
app.use(express.json());

// Multer für Bilder
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MongoDB
mongoose.connect('mongodb://mongoadmin:mySecret1!@10.115.2.1:8017/', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mit MongoDB verbunden!'))
  .catch(err => console.log('Fehler bei der MongoDB-Verbindung:', err));

// Schema und Modelle
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: { type: Buffer },
  createdAt: { type: Date, default: Date.now },
  isLoggedIn: { type: Boolean, default: false } // Zum Verfolgen des Login-Status
}, { collection: 'zombie_game' });

const User = mongoose.model('user', userSchema);

// Registrierung
app.post("/api/register", upload.single('profileImage'), async (req, res) => {
  const { username, email, password } = req.body;
  const profileImage = req.file ? req.file.buffer : null;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "Alle Felder sind erforderlich." });
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Benutzername vergeben." });
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ success: false, message: "E-Mail wird bereits verwendet." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPassword, profileImage });

  try {
    await newUser.save();
    res.status(201).json({ success: true, message: "Registrierung erfolgreich!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fehler bei der Registrierung." });
  }
});

// Anmeldung
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Benutzername oder Passwort falsch.' });
  }

  user.isLoggedIn = true;
  await user.save();

  const token = jwt.sign({ userId: user._id }, 'dein_geheimer_schlüssel', { expiresIn: '1h' });
  res.status(200).json({ success: true, message: 'Anmeldung erfolgreich!', token });
});

const serverStartTime = Date.now();

// Überprüfen, ob das Token vor dem Serverneustart erstellt wurde
function isTokenValid(decodedToken) {
    return decodedToken.iat * 1000 >= serverStartTime;
}

// Profilbild-Endpunkt aktualisieren
app.get('/api/profile-image', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Token fehlt oder ist ungültig.' });
    }

    try {
        const token = authHeader;
        const decoded = jwt.verify(token, 'dein_geheimer_schlüssel');

        // Token-Validierung mit Serverstartzeit
        if (!isTokenValid(decoded)) {
            return res.status(401).json({ success: false, message: 'Token ist ungültig oder abgelaufen.' });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.profileImage) {
            return res.status(404).json({ success: false, message: 'Kein Profilbild gefunden.' });
        }

        const base64Image = user.profileImage.toString('base64');
        const image = `data:image/png;base64,${base64Image}`;
        return res.status(200).json({ success: true, profileImage: image });
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token ist ungültig oder abgelaufen.' });
    }
});



// Automatische Abmeldung
app.post('/api/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ success: false, message: 'Nicht autorisiert.' });

  try {
    const token = authHeader;
    const decoded = jwt.verify(token, 'dein_geheimer_schlüssel');
    const user = await User.findById(decoded.userId);

    if (user) {
      user.isLoggedIn = false;
      await user.save();
      return res.status(200).json({ success: true, message: 'Abmeldung erfolgreich.' });
    }

    res.status(404).json({ success: false, message: 'Benutzer nicht gefunden.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler bei der Abmeldung.' });
  }
});

// Startseite und Spiel
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'start.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use(express.static('public'));

// Server starten
app.listen(3000, () => console.log('Server läuft auf http://localhost:3000/'));
