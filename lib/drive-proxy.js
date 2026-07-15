// Shared Google Drive download proxy.
//
// Google's file-download endpoint does not send CORS headers, so a browser
// fetch() is blocked. This runs server-side (Vercel serverless function in
// prod, Vite middleware in dev), where CORS does not apply, and streams the
// PDF back to the same origin the app is served from.
import { Readable } from 'node:stream';

const ID_RE = /^[a-zA-Z0-9_-]+$/;

// Pull a Drive file id out of the many share-link shapes users paste.
export function extractFileId(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // https://drive.google.com/file/d/FILE_ID/view  |  /d/FILE_ID
  const pathMatch = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];
  // ...?id=FILE_ID  |  &id=FILE_ID  (open?id=, uc?id=)
  const queryMatch = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  // Raw id pasted on its own
  if (ID_RE.test(s)) return s;
  return null;
}

// Hard allowlist so a parsed interstitial URL can never point us off Google
// (SSRF guard).
function isGoogleHost(url) {
  try {
    const h = new URL(url).hostname;
    return h === 'google.com' || h.endsWith('.google.com');
  } catch {
    return false;
  }
}

// Large files return a "can't scan for viruses" HTML page with a form whose
// hidden inputs (id/export/confirm/uuid) build the real download URL.
function parseConfirmForm(html) {
  const actionMatch = html.match(/action="([^"]+)"/);
  if (!actionMatch) return null;
  let url;
  try {
    url = new URL(actionMatch[1].replace(/&amp;/g, '&'));
  } catch {
    return null;
  }
  const inputRe = /<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g;
  let m;
  while ((m = inputRe.exec(html))) {
    url.searchParams.set(m[1], m[2]);
  }
  return url.toString();
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

// Fetch a public Drive PDF and stream it to a Node response.
// Works with both a Vercel function `res` and a Vite/connect middleware `res`.
export async function streamDrivePdf(fileId, res) {
  const first = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  let upstream = await fetch(first, { redirect: 'follow' });
  let contentType = upstream.headers.get('content-type') || '';

  // Retry once through the virus-scan confirm form for large files.
  if (contentType.includes('text/html')) {
    const html = await upstream.text();
    const confirmedUrl = parseConfirmForm(html);
    if (confirmedUrl && isGoogleHost(confirmedUrl)) {
      upstream = await fetch(confirmedUrl, { redirect: 'follow' });
      contentType = upstream.headers.get('content-type') || '';
    }
  }

  if (!upstream.ok || !upstream.body) {
    return sendJson(res, 502, {
      error: `Drive returned ${upstream.status}. Make sure the file is shared as "Anyone with the link".`,
    });
  }
  // Still HTML => not public, or needs a Google sign-in.
  if (contentType.includes('text/html')) {
    return sendJson(res, 403, {
      error: 'This file is not publicly downloadable. Set sharing to "Anyone with the link".',
    });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/pdf');
  const len = upstream.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);
  res.setHeader('Cache-Control', 'no-store');
  Readable.fromWeb(upstream.body).pipe(res);
}
