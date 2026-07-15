// Vercel serverless function: GET /api/drive?id=<drive link or file id>
// Streams a public Google Drive PDF back to the browser (same origin, no CORS).
import { extractFileId, streamDrivePdf } from '../lib/drive-proxy.js';

export default async function handler(req, res) {
  try {
    const raw = req.query?.id ?? req.query?.link ?? '';
    const fileId = extractFileId(Array.isArray(raw) ? raw[0] : raw);
    if (!fileId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing or invalid Drive file id/link.' }));
      return;
    }
    await streamDrivePdf(fileId, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Proxy failed while fetching from Drive.' }));
  }
}
