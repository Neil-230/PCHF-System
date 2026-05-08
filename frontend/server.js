import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

// Serve static files from the dist directory under the /fouraxis path
app.use('/fouraxis', express.static(path.join(__dirname, 'dist')));

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
