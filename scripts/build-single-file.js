// Gộp toàn bộ web thành một file HTML duy nhất.
//   node scripts/build-single-file.js                 -> Hoc-Han-Ngu.html (mở trực tiếp trên máy)
//   node scripts/build-single-file.js --artifact OUT  -> bản đăng lên Claude (thư viện nhúng trực tiếp,
//                                                         không có khung <html>/<head>/<body>)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const argIndex = process.argv.indexOf('--artifact');
const ARTIFACT_OUT = argIndex !== -1 ? path.resolve(process.argv[argIndex + 1]) : null;
const OUT = ARTIFACT_OUT || path.join(root, 'Hoc-Han-Ngu.html');

const VENDOR_SCRIPTS = [
  'vendor/xlsx.full.min.js',
  'vendor/mammoth.browser.min.js',
  'vendor/pdf.worker.min.js',
  'vendor/pdf.min.js'
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function dataUri(rel, mime) {
  return 'data:' + mime + ';base64,' + fs.readFileSync(path.join(root, rel)).toString('base64');
}

// Đường dẫn -> giá trị cho HANHOC_ASSETS. 'inline' nghĩa là thư viện đã có trong trang.
const ASSETS = { 'assets/logo.jpg': dataUri('assets/logo.jpg', 'image/jpeg') };
VENDOR_SCRIPTS.forEach(function (rel) {
  ASSETS[rel] = ARTIFACT_OUT ? 'inline' : dataUri(rel, 'text/javascript');
});

const jsFiles = ['js/core.js', 'js/sample-data.js', 'js/app.js'];
const jsCode = jsFiles.map(read).join('\n;\n');
if (jsCode.indexOf('</script') !== -1) {
  throw new Error('Mã JS có chuỗi "</script", không thể nhúng inline.');
}

let html = read('index.html');

// Dùng hàm thay thế để tránh ký tự đặc biệt "$" trong CSS/JS bị hiểu nhầm.
function replaceOnce(source, search, replacement) {
  if (source.indexOf(search) === -1) throw new Error('Không tìm thấy: ' + search);
  return source.replace(search, function () { return replacement; });
}

html = replaceOnce(html, '<link rel="stylesheet" href="css/style.css">',
  '<style>\n' + read('css/style.css') + '\n</style>');

html = html.split('assets/logo.jpg').join(ASSETS['assets/logo.jpg']);

if (ARTIFACT_OUT) {
  // Claude tự tạo khung <!doctype>, <head>, <body> và thẻ viewport/charset.
  html = html
    .replace('<!doctype html>', '')
    .replace(/<html[^>]*>/, '')
    .replace('</html>', '')
    .replace('<head>', '')
    .replace('</head>', '')
    .replace('<body>', '')
    .replace('</body>', '')
    .replace('<meta charset="utf-8">', '')
    .replace('<meta name="viewport" content="width=device-width, initial-scale=1">', '');
}

const scriptTags = jsFiles.map(function (f) { return '  <script src="' + f + '"></script>'; }).join('\n');
const vendorBlock = ARTIFACT_OUT
  ? VENDOR_SCRIPTS.map(function (rel) {
      // Thư viện xlsx chứa ký tự U+FFFD thô trong bảng mã; đổi sang dạng \uFFFD (cùng ý nghĩa trong JS)
      // vì trình đăng trang từ chối ký tự thay thế.
      const code = read(rel).split('\uFFFD').join('\\uFFFD');
      if (code.indexOf('</script') !== -1) throw new Error(rel + ' chứa "</script".');
      return '<script>\n' + code + '\n</script>';
    }).join('\n') + '\n'
  : '';

html = replaceOnce(html, scriptTags,
  vendorBlock +
  '<script>window.HANHOC_ASSETS = ' + JSON.stringify(ASSETS) + ';</script>\n' +
  '<script>\n' + jsCode + '\n</script>');

fs.writeFileSync(OUT, html);
console.log('Đã tạo ' + path.relative(root, OUT) + ' (' + Math.round(fs.statSync(OUT).size / 1024) + ' KB)');
