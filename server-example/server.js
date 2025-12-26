// Сервер для LiveTalk
// Используйте Express + Socket.io для WebSocket

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // В продакшене укажите конкретные домены
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Простое хранилище в памяти (в продакшене используйте БД)
const users = new Map();
const messages = new Map();
const favorites = new Map();

// ========== ПОЛЬЗОВАТЕЛИ ==========

app.get('/api/users', (req, res) => {
  res.json(Array.from(users.values()));
});

app.get('/api/users/:email', (req, res) => {
  const user = users.get(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { email, password, displayName } = req.body;
  
  if (users.has(email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const user = {
    email,
    password, // В продакшене хешируйте пароль!
    displayName: displayName || email.split('@')[0],
    status: 'Доступен',
    avatar: 'default.png',
    statusMessage: '',
    lastSeen: new Date().toISOString(),
    token: `token_${Date.now()}_${Math.random()}` // Простой токен
  };
  
  users.set(email, user);
  res.json(user);
});

app.put('/api/users/:email', (req, res) => {
  const user = users.get(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  Object.assign(user, req.body);
  users.set(req.params.email, user);
  res.json(user);
});

// ========== СООБЩЕНИЯ ==========

app.get('/api/messages', (req, res) => {
  const { from, to } = req.query;
  const key = `${from}_${to}`;
  const reverseKey = `${to}_${from}`;
  
  const msgs1 = messages.get(key) || [];
  const msgs2 = messages.get(reverseKey) || [];
  
  const allMessages = [...msgs1, ...msgs2].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  res.json(allMessages);
});

app.post('/api/messages', (req, res) => {
  const { from, to, text } = req.body;
  
  const message = {
    from,
    to,
    text,
    timestamp: new Date().toISOString(),
    read: false
  };
  
  const key = `${from}_${to}`;
  if (!messages.has(key)) {
    messages.set(key, []);
  }
  messages.get(key).push(message);
  
  // Отправляем через WebSocket получателю
  io.emit('new_message', { contact: from, message });
  
  res.json(message);
});

app.get('/api/messages/unread', (req, res) => {
  const { user, contact } = req.query;
  const key = `${contact}_${user}`;
  const msgs = messages.get(key) || [];
  
  const unreadCount = msgs.filter(m => m.to === user && !m.read).length;
  res.json({ count: unreadCount });
});

app.post('/api/messages/read', (req, res) => {
  const { user, contact } = req.body;
  const key = `${contact}_${user}`;
  const msgs = messages.get(key) || [];
  
  msgs.forEach(m => {
    if (m.to === user) m.read = true;
  });
  
  res.json({ success: true });
});

// ========== ИЗБРАННОЕ ==========

app.get('/api/favorites', (req, res) => {
  const { user } = req.query;
  const favs = favorites.get(user) || [];
  res.json(favs);
});

app.post('/api/favorites', (req, res) => {
  const { user, contact } = req.body;
  
  if (!favorites.has(user)) {
    favorites.set(user, []);
  }
  
  const favs = favorites.get(user);
  if (!favs.includes(contact)) {
    favs.push(contact);
  }
  
  res.json({ success: true });
});

app.delete('/api/favorites', (req, res) => {
  const { user, contact } = req.body;
  const favs = favorites.get(user) || [];
  const filtered = favs.filter(f => f !== contact);
  favorites.set(user, filtered);
  res.json({ success: true });
});

// ========== WEBSOCKET ==========

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// WebSocket endpoint для обновлений
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  // В продакшене проверяйте токен
  next();
});

// Cyclic.sh и другие платформы автоматически устанавливают PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

