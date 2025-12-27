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

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch(err => console.error('❌ DB Connection Error:', err));

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

// Socket.io
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

// API РОУТЫ
// Регистрация
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

// Логин
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || user.password !== hashPassword(req.body.password)) return res.status(401).json({ error: 'Invalid' });
  res.json(user);
});

// ПОЛУЧЕНИЕ ОДНОГО ЮЗЕРА (Нужно при входе в настройки)
app.get('/api/users/:email', async (req, res) => {
  const user = await User.findOne({ email: req.params.email }, '-password');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// ОБНОВЛЕНИЕ ПРОФИЛЯ (Тот самый роут, которого не хватало!)
app.put('/api/users/:email', async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: req.params.email },
      { $set: req.body },
      { new: true, fields: '-password' }
    );
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(updatedUser);
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

app.get('/api/messages', async (req, res) => {
  const msgs = await Message.find({
    $or: [{ from: req.query.from, to: req.query.to }, { from: req.query.to, to: req.query.from }]
  }).sort('timestamp');
  res.json(msgs);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
