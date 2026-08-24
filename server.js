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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

let scores = [];

// REST API for Vercel / fetch compatibility
app.get('/api/scores', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(scores);
});

app.post('/api/scores', (req, res) => {
  const data = req.body;
  if (data && data.name) {
    const entry = {
      id: Date.now(),
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

    // Broadcast in real-time
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

// Socket.IO real-time handlers
io.on('connection', (socket) => {
  socket.emit('all_scores', scores);

  socket.on('submit_score', (data) => {
    if (data && data.name) {
      const entry = {
        id: Date.now(),
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
    }
  });

  socket.on('clear_scores', () => {
    scores = [];
    io.emit('scores_cleared');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Wedding Quiz Server running on: http://localhost:${PORT}`);
  console.log(`Live Projector Display on: http://localhost:${PORT}/display.html`);
});
