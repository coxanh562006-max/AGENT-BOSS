// Máy chủ đồng bộ cho Học Hàn Ngữ. Không cần cài thêm thư viện (Node 18 trở lên).
// Cách chạy:  node scripts/sync-server.js
// Biến môi trường:
//   PORT      cổng, mặc định 8787
//   DATA_DIR  thư mục lưu dữ liệu, mặc định ./data
//
// API:
//   GET  /api/health             kiểm tra máy chủ đang chạy
//   POST /api/sync?key=MÃ        body: { "state": {...} }
//                                gộp với dữ liệu đã lưu, lưu lại, trả về { "state": {...} }
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Core = require('../js/core.js');

const PORT = Number(process.env.PORT) || 8787;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MAX_BODY = 50 * 1024 * 1024;

function fileFor(key) {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return path.join(DATA_DIR, 'sync-' + hash + '.json');
}

function readState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return Core.emptyState();
  }
}

function writeState(file, state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file);
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let size = 0;
    const chunks = [];
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Dữ liệu quá lớn'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

function isValidState(s) {
  return s && typeof s === 'object' && Array.isArray(s.lessons) &&
    s.deleted && typeof s.deleted === 'object' && s.progress && typeof s.progress === 'object';
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (url.pathname === '/api/health') return send(res, 200, { ok: true });

  if (url.pathname !== '/api/sync' || req.method !== 'POST') {
    return send(res, 404, { error: 'Không tìm thấy' });
  }

  const key = url.searchParams.get('key') || '';
  if (key.length < 4 || key.length > 200) {
    return send(res, 400, { error: 'Mã đồng bộ phải dài từ 4 đến 200 ký tự' });
  }

  readBody(req).then(function (text) {
    let incoming;
    try {
      incoming = JSON.parse(text).state;
    } catch (err) {
      return send(res, 400, { error: 'Dữ liệu gửi lên không phải JSON' });
    }
    if (!isValidState(incoming)) {
      return send(res, 400, { error: 'Cấu trúc dữ liệu không hợp lệ' });
    }
    const file = fileFor(key);
    const merged = Core.mergeStates(readState(file), incoming);
    writeState(file, merged);
    return send(res, 200, { state: merged });
  }).catch(function (err) {
    send(res, 500, { error: err.message || 'Lỗi máy chủ' });
  });
});

if (require.main === module) {
  server.listen(PORT, function () {
    console.log('Máy chủ đồng bộ chạy tại http://localhost:' + PORT);
    console.log('Dữ liệu lưu tại ' + DATA_DIR);
  });
}

module.exports = server;
