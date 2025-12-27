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
// Увеличиваем лимиты для аватарок
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ЛОГИРОВАНИЕ ЗАПРОСОВ (поможет понять, что шлет приложение)
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch(err => console.error('❌ DB Connection Error:', err));

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
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

// SOCKET.IO
const userSockets = new Map();
io.on('connection', (socket) => {
  socket.on('join', async (email) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    userSockets.set(cleanEmail, socket.id);
    socket.email = cleanEmail;
    await User.findOneAndUpdate({ email: cleanEmail }, { status: 'Доступен', lastSeen: new Date() });
    io.emit('user_status_change', { email: cleanEmail, status: 'Доступен' });
    console.log(`User ${cleanEmail} joined`);
  });

  socket.on('send_message', async (data) => {
    const newMessage = new Message(data);
    await newMessage.save();
    const recipientSocketId = userSockets.get(data.to.toLowerCase().trim());
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

// API
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(400).json({ error: 'User exists' });
    
    const user = new User({ email: cleanEmail, password: hashPassword(password), displayName });
    await user.save();
    console.log(`New user registered: ${cleanEmail}`);
    res.json(user);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/login', async (req, res) => {
  const cleanEmail = req.body.email.toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });
  if (!user || user.password !== hashPassword(req.body.password)) {
    console.log(`Login failed for: ${cleanEmail}`);
    return res.status(401).json({ error: 'Invalid' });
  }
  res.json(user);
});

app.get('/api/users/:email', async (req, res) => {
  const user = await User.findOne({ email: req.params.email.toLowerCase().trim() }, '-password');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.put('/api/users/:email', async (req, res) => {
  try {
    const cleanEmail = req.params.email.toLowerCase().trim();
    const updatedUser = await User.findOneAndUpdate(
      { email: cleanEmail },
      { $set: req.body },
      { new: true, fields: '-password' }
    );
    if (!updatedUser) {
      console.log(`Update failed: User ${cleanEmail} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`Profile updated: ${cleanEmail}`);
    res.json(updatedUser);
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

app.get('/api/messages', async (req, res) => {
  const from = req.query.from.toLowerCase().trim();
  const to = req.query.to.toLowerCase().trim();
  const msgs = await Message.find({
    $or: [{ from, to }, { from: to, to: from }]
  }).sort('timestamp');
  res.json(msgs);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
