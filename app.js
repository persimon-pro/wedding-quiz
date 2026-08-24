const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Отключаем кэширование
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Хранение результатов участников в оперативной памяти (как в Digital Wall)
let scores = [];

// Роуты для страниц
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'display.html'));
});

// REST API (для совместимости)
app.get('/api/scores', (req, res) => {
  res.json(scores);
});

app.post('/api/scores', (req, res) => {
  const data = req.body;
  if (data && data.name) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: String(data.name).trim().substring(0, 30),
      pts: Number(data.pts) || 0,
      correct: Number(data.correct) || 0,
      time: Number(data.time) || 0,
      timestamp: new Date().toLocaleTimeString('ru-RU')
    };

    scores.push(entry);
    scores.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.correct !== a.correct) return b.correct - a.correct;
      return (a.time || 0) - (b.time || 0);
    });
    scores = scores.slice(0, 100);

    io.emit('score_added', entry);
    io.emit('all_scores', scores);

    return res.json({ success: true, count: scores.length, entry });
  }
  res.status(400).json({ error: 'Name is required' });
});

app.delete('/api/scores', (req, res) => {
  scores = [];
  io.emit('scores_cleared');
  res.json({ success: true, message: 'Cleared' });
});

// Socket.IO события (как в Digital Wall)
io.on('connection', (socket) => {
  console.log('Подключен клиент:', socket.id);
  
  // Отправляем текущие результаты подключенному экрану
  socket.emit('all_scores', scores);

  // Получение результатов от гостя
  socket.on('submit_score', (data) => {
    if (data && data.name) {
      const entry = {
        id: Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: String(data.name).trim().substring(0, 30),
        pts: Number(data.pts) || 0,
        correct: Number(data.correct) || 0,
        time: Number(data.time) || 0,
        timestamp: new Date().toLocaleTimeString('ru-RU')
      };

      scores.push(entry);
      scores.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.correct !== a.correct) return b.correct - a.correct;
        return (a.time || 0) - (b.time || 0);
      });
      scores = scores.slice(0, 100);

      console.log(`[+] Новый результат: ${entry.name} — ${entry.pts} очков`);
      io.emit('score_added', entry);
      io.emit('all_scores', scores);
    }
  });

  // Очистка списка
  socket.on('clear_scores', () => {
    scores = [];
    io.emit('scores_cleared');
    console.log('Список результатов очищен');
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключился:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Свадебный Квиз запущен на порту: ${PORT}`);
  console.log(`📱 Для гостей: http://localhost:${PORT}`);
  console.log(`📺 Для экрана / проектора: http://localhost:${PORT}/display`);
});
