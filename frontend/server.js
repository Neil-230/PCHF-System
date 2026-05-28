import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;
app.use(express.json());

// Serve static files from the dist directory under the /fouraxis path
app.use('/fouraxis', express.static(path.join(__dirname, 'dist')));

// Proxy API requests to the backend container
app.use('/fouraxis/api', async (req, res) => {
  const backendUrl = `http://fouraxis-backend:4000/api${req.url}`;
  console.log(`[Proxy] ${req.method} ${req.url} -> ${backendUrl}`);
  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: { 
        'Content-Type': 'application/json',
        ...req.headers, 
        host: 'fouraxis-backend:4000' 
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy Error:', error.message);
    res.status(500).json({ error: 'Proxy Error', details: error.message });
  }
});

// Handle React routing, return all requests to React app as a fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Redirect root to /fouraxis
app.get('/', (req, res) => {
  res.redirect('/fouraxis');
});

app.listen(PORT, () => {
  console.log(`Frontend Express server running on port ${PORT}`);
});
