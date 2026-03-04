const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Redis = require('ioredis');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8006;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edulms';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title_en: String,
  title_ru: String,
  title_kk: String,
  message_en: String,
  message_ru: String,
  message_kk: String,
  data: mongoose.Schema.Types.Mixed,
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const preferenceSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  email_enabled: { type: Boolean, default: true },
  push_enabled: { type: Boolean, default: true },
  types: {
    assignment: { type: Boolean, default: true },
    grade: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    announcement: { type: Boolean, default: true },
    deadline: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
  },
});

const Notification = mongoose.model('Notification', notificationSchema);
const Preference = mongoose.model('Preference', preferenceSchema);

const connectedUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
  }

  socket.on('disconnect', () => {
    if (userId) {
      connectedUsers.delete(userId);
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.get('/notifications', async (req, res) => {
  const { user_id, limit = 50, offset = 0, unread_only } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const filter = { user_id };
  if (unread_only === 'true') filter.is_read = false;

  const notifications = await Notification.find(filter)
    .sort({ created_at: -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit));

  const unread_count = await Notification.countDocuments({ user_id, is_read: false });

  res.json({ notifications, unread_count });
});

app.post('/notifications', async (req, res) => {
  const { user_id, type, title_en, title_ru, title_kk, message_en, message_ru, message_kk, data } = req.body;

  const notification = await Notification.create({
    user_id, type, title_en, title_ru, title_kk, message_en, message_ru, message_kk, data,
  });

  io.to(`user:${user_id}`).emit('notification', notification);

  res.status(201).json(notification);
});

app.post('/notifications/bulk', async (req, res) => {
  const { user_ids, type, title_en, title_ru, title_kk, message_en, message_ru, message_kk, data } = req.body;

  const notifications = await Notification.insertMany(
    user_ids.map((uid) => ({
      user_id: uid, type, title_en, title_ru, title_kk, message_en, message_ru, message_kk, data,
    }))
  );

  user_ids.forEach((uid) => {
    io.to(`user:${uid}`).emit('notification', { type, title_en, title_ru, title_kk, message_en, message_ru, message_kk, data });
  });

  res.status(201).json({ count: notifications.length });
});

app.put('/notifications/:id/read', async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { is_read: true });
  res.json({ message: 'marked as read' });
});

app.put('/notifications/read-all', async (req, res) => {
  const { user_id } = req.body;
  await Notification.updateMany({ user_id, is_read: false }, { is_read: true });
  res.json({ message: 'all marked as read' });
});

app.delete('/notifications/:id', async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ message: 'notification deleted' });
});

app.get('/preferences/:user_id', async (req, res) => {
  let pref = await Preference.findOne({ user_id: req.params.user_id });
  if (!pref) {
    pref = await Preference.create({ user_id: req.params.user_id });
  }
  res.json(pref);
});

app.put('/preferences/:user_id', async (req, res) => {
  const pref = await Preference.findOneAndUpdate(
    { user_id: req.params.user_id },
    req.body,
    { upsert: true, new: true }
  );
  res.json(pref);
});

// --- NEWS ---
const newsSchema = new mongoose.Schema({
  title_en: String,
  title_ru: String,
  title_kk: String,
  content_en: String,
  content_ru: String,
  content_kk: String,
  author_id: String,
  author_name: String,
  pinned: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const News = mongoose.model('News', newsSchema);

app.get('/news', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const news = await News.find()
    .sort({ pinned: -1, created_at: -1 })
    .skip(parseInt(offset))
    .limit(parseInt(limit));
  const total = await News.countDocuments();
  res.json({ news, total });
});

app.post('/news', async (req, res) => {
  const { title_en, title_ru, title_kk, content_en, content_ru, content_kk, author_id, author_name, pinned } = req.body;
  const article = await News.create({
    title_en, title_ru, title_kk, content_en, content_ru, content_kk, author_id, author_name, pinned,
  });
  res.status(201).json(article);
});

app.delete('/news/:id', async (req, res) => {
  await News.findByIdAndDelete(req.params.id);
  res.json({ message: 'news deleted' });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Notification service starting on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
