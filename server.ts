import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiApp } from './server/apiApp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = createApiApp();

  const distPath = fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : path.resolve(process.cwd(), 'dist');

  if (isProduction) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res
          .status(404)
          .send('DeepTier: dist/index.html not found. Please run `npm run build` before starting production server.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    const distExists = fs.existsSync(path.resolve(distPath, 'index.html'));
    console.log(
      `DeepTier server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'dev'}${
        isProduction && !distExists ? ', dist missing' : ''
      })`,
    );
  });

  const shutdown = () => {
    console.log('Shutting down DeepTier server gracefully...');
    server.close(() => {
      console.log('DeepTier server stopped.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forcing server shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
