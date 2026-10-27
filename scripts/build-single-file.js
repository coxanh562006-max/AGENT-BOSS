// Gộp toàn bộ web thành một file HTML duy nhất: Hoc-Han-Ngu.html
// Cách chạy: node scripts/build-single-file.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OUT = path.join(root, 'Hoc-Han-Ngu.html');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function dataUri(rel, mime) {
  return 'data:' + mime + ';base64,' + fs.readFileSync(path.join(root, rel)).toString('base64');
}

const ASSETS = {
  'assets/logo.jpg': dataUri('assets/logo.jpg', 'image/jpeg'),
  'vendor/xlsx.full.min.js': dataUri('vendor/xlsx.full.min.js', 'text/javascript'),
  'vendor/mammoth.browser.min.js': dataUri('vendor/mammoth.browser.min.js', 'text/javascript'),
  'vendor/pdf.min.js': dataUri('vendor/pdf.min.js', 'text/javascript'),
  'vendor/pdf.worker.min.js': dataUri('vendor/pdf.worker.min.js', 'text/javascript')
};

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

const scriptTags = jsFiles.map(function (f) { return '  <script src="' + f + '"></script>'; }).join('\n');
html = replaceOnce(html, scriptTags,
  '  <script>window.HANHOC_ASSETS = ' + JSON.stringify(ASSETS) + ';</script>\n' +
  '  <script>\n' + jsCode + '\n</script>');

fs.writeFileSync(OUT, html);
console.log('Đã tạo ' + path.relative(root, OUT) + ' (' + Math.round(fs.statSync(OUT).size / 1024) + ' KB)');
