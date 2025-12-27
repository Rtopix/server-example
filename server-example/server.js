const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Подключение к MongoDB через переменную окружения
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas!'))
  .catch(err => console.error('DB Connection Error:', err));

// Схемы данных (аналог твоих JSON файлов)
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  displayName: String,
  status: { type: String, default: 'Не в сети' },
  avatar: { type: String, default: 'default.png' },
  statusMessage: { type: String, default: '' },
  lastSeen: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

function hashPassword(password) {
  const salt = 'livetalk_salt_secret'; 
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Socket.io (Мессенджер)
const userSockets = new Map();

io.on('connection', (socket) => {
  socket.on('join', async (email) => {
    userSockets.set(email, socket.id);
    socket.email = email;
    await User.findOneAndUpdate({ email }, { status: 'Доступен', lastSeen: new Date() });
    io.emit('user_status_change', { email, status: 'Доступен' });
  });

  socket.on('send_message', async (data) => {
    const newMessage = new Message(data);
    await newMessage.save();
    const recipientSocketId = userSockets.get(data.to);
    if (recipientSocketId) io.to(recipientSocketId).emit('receive_message', newMessage);
    socket.emit('receive_message', newMessage);
  });

  socket.on('disconnect', async () => {
    if (socket.email) {
      userSockets.delete(socket.email);
      await User.findOneAndUpdate({ email: socket.email }, { status: 'Не в сети', lastSeen: new Date() });
      io.emit('user_status_change', { email: socket.email, status: 'Не в сети' });
    }
  });
});

// API (Логин и Регистрация)
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User exists' });
    const user = new User({ email, password: hashPassword(password), displayName });
    await user.save();
    res.json(user);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.password !== hashPassword(password)) return res.status(401).json({ error: 'Invalid' });
  res.json(user);
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

app.get('/api/messages', async (req, res) => {
  const { from, to } = req.query;
  const msgs = await Message.find({
    $or: [{ from, to }, { from: to, to: from }]
  }).sort('timestamp');
  res.json(msgs);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
