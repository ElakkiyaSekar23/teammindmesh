import { createApiApp } from '../../server/apiApp';

const app = createApiApp();

export default function handler(req: any, res: any) {
  if (!req.url || req.url === '/' || req.url.startsWith('/?')) {
    req.url = '/api/groq/live-world-alerts' + (req.url.startsWith('/?') ? req.url.slice(1) : '');
  }
  return app(req, res);
}
