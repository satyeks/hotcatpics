const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// Initialize persistent JSON database
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        presets: Array.isArray(parsed.presets) ? parsed.presets : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : []
      };
    }
  } catch (err) {
    console.error('Error loading DB:', err);
  }
  return { presets: [], orders: [] };
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sortPresetsDescending(presets) {
  return presets
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => ((b.p.orders || 0) - (a.p.orders || 0)) || ((b.p.createdAt || b.idx) - (a.p.createdAt || a.idx)))
    .map((x) => x.p);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJSON(res, 200, { ok: true });
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // --- API ROUTES ---
  if (pathname === '/api/presets' && req.method === 'GET') {
    const db = loadDB();
    return sendJSON(res, 200, { presets: sortPresetsDescending(db.presets) });
  }

  if (pathname === '/api/presets' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDB();
    const newPreset = {
      id: body.id || `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      model: body.model || 'IPHONE 16',
      caseColor: body.caseColor || 'white',
      bgColor: body.bgColor || '#5DC6E8',
      stickers: Array.isArray(body.stickers) ? body.stickers : [],
      charm: body.charm || null,
      orders: Number(body.orders) || 0,
      createdAt: Date.now()
    };
    db.presets.push(newPreset);
    saveDB(db);
    return sendJSON(res, 201, { preset: newPreset, presets: sortPresetsDescending(db.presets) });
  }

  if (pathname === '/api/presets' && req.method === 'DELETE') {
    const db = loadDB();
    db.presets = [];
    saveDB(db);
    return sendJSON(res, 200, { presets: [] });
  }

  const orderMatch = pathname.match(/^\/api\/presets\/([^/]+)\/order$/);
  if (orderMatch && req.method === 'POST') {
    const presetId = orderMatch[1];
    const db = loadDB();
    const target = db.presets.find((p) => p.id === presetId);
    if (target) {
      target.orders = (target.orders || 0) + 1;
      saveDB(db);
    }
    return sendJSON(res, 200, { presets: sortPresetsDescending(db.presets) });
  }

  const deleteMatch = pathname.match(/^\/api\/presets\/([^/]+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const presetId = deleteMatch[1];
    const db = loadDB();
    db.presets = db.presets.filter((p) => p.id !== presetId);
    saveDB(db);
    return sendJSON(res, 200, { presets: sortPresetsDescending(db.presets) });
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = loadDB();
    const orderRecord = {
      id: body.id || `order_${Date.now()}`,
      placedAt: new Date().toISOString(),
      ...body
    };
    db.orders.push(orderRecord);
    if (body.items && body.items.presetId) {
      const target = db.presets.find((p) => p.id === body.items.presetId);
      if (target) {
        target.orders = (target.orders || 0) + 1;
      }
    }
    saveDB(db);
    return sendJSON(res, 201, { ok: true, order: orderRecord });
  }

  if (pathname === '/api/orders' && req.method === 'GET') {
    const db = loadDB();
    return sendJSON(res, 200, { orders: db.orders });
  }

  // --- STATIC FILE SERVING ---
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' || ext === '.css' || ext === '.js' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`HOTCATPICS server running on http://localhost:${PORT}`);
});
