import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {extractFileId, streamDrivePdf} from './lib/drive-proxy.js';

// Dev/preview equivalent of the Vercel /api/drive serverless function, so the
// Google Drive import works with `npm run dev` and `npm run preview` too.
async function driveMiddleware(req: any, res: any) {
  try {
    const u = new URL(req.url || '', 'http://localhost');
    const fileId = extractFileId(u.searchParams.get('id') || u.searchParams.get('link') || '');
    if (!fileId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error: 'Missing or invalid Drive file id/link.'}));
      return;
    }
    await streamDrivePdf(fileId, res);
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: 'Proxy failed while fetching from Drive.'}));
  }
}

const drivePlugin = {
  name: 'lumina-drive-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/drive', driveMiddleware);
  },
  configurePreviewServer(server: any) {
    server.middlewares.use('/api/drive', driveMiddleware);
  },
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), drivePlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
