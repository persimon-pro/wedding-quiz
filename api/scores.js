// Vercel Serverless Function: /api/scores
let memoryScores = [];

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      let data = req.body;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) {}
      }

      if (data && data.name) {
        const entry = {
          id: Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: String(data.name).trim().substring(0, 30),
          pts: Number(data.pts) || 0,
          correct: Number(data.correct) || 0,
          time: Number(data.time) || 0,
          timestamp: new Date().toISOString()
        };

        memoryScores.push(entry);
        memoryScores.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.correct !== a.correct) return b.correct - a.correct;
          return (a.time || 0) - (b.time || 0);
        });

        // Keep top 100
        if (memoryScores.length > 100) {
          memoryScores = memoryScores.slice(0, 100);
        }

        return res.status(200).json({ success: true, count: memoryScores.length, entry });
      }

      return res.status(400).json({ error: 'Name is required' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    memoryScores = [];
    return res.status(200).json({ success: true, message: 'All scores cleared' });
  }

  // GET: return all scores
  return res.status(200).json(memoryScores);
};
