(function () {
  'use strict';

  var Core = window.HanhocCore;
  var SAMPLE = window.HANHOC_SAMPLE;
  // Khi chạy bản gộp một file, tài nguyên được nhúng sẵn trong HANHOC_ASSETS.
  var ASSETS = window.HANHOC_ASSETS || {};
  var LOGO = ASSETS['assets/logo.jpg'] || 'assets/logo.jpg';

  var STORE_STATE = 'hanhoc.state.v2';
  var STORE_V1_SOURCES = 'hanhoc.sources.v1';
  var STORE_V1_PROGRESS = 'hanhoc.progress.v1';
  var STORE_SYNC = 'hanhoc.sync.v1';
  var STORE_SCOPE = 'hanhoc.scope.v1';

  var NAV = [
    {
      group: 'Quản lý',
      items: [
        { id: 'home', label: 'Trang chủ', icon: '🏠' },
        { id: 'lessons', label: 'Bài học & file', icon: '🗂️' }
      ]
    },
    {
      group: 'Luyện tập',
      items: [
        { id: 'flashcard', label: 'Flashcard', icon: '🃏' },
        { id: 'word', label: 'Viết từ', icon: '✍️' },
        { id: 'order', label: 'Sắp xếp câu', icon: '🧩' },
        { id: 'extend', label: 'Ví dụ mở rộng', icon: '💡' },
        { id: 'mcq', label: 'Trắc nghiệm ABCD', icon: '🎯' },
        { id: 'translate', label: 'Dịch hai chiều', icon: '🔁' }
      ]
    },
    {
      group: 'Tài liệu',
      items: [
        { id: 'vocab', label: 'Từ vựng', icon: '📘' },
        { id: 'grammar', label: 'Ngữ pháp', icon: '📐' },
        { id: 'sentences', label: 'Câu', icon: '💬' },
        { id: 'lecture', label: 'Bài giảng', icon: '📖' }
      ]
    }
  ];

  var EXERCISES = {
    word: {
      title: 'Viết từ',
      desc: 'Cho nghĩa tiếng Việt, bạn gõ lại từ tiếng Hàn tương ứng.',
      need: function (ds) { return ds.vocab.length > 0; },
      needText: 'Cần có file từ vựng trong bài.',
      build: function (ds) { return Core.wordQuestions(ds.vocab); }
    },
    order: {
      title: 'Sắp xếp câu',
      desc: 'Cho câu tiếng Việt, bấm các từ tiếng Hàn đã xáo trộn để ghép lại thành câu đúng.',
      need: function (ds) { return ds.sentences.length > 0; },
      needText: 'Cần có câu tiếng Hàn kèm đáp án tiếng Việt trong bài.',
      build: function (ds) { return Core.orderQuestions(ds.sentences); }
    },
    extend: {
      title: 'Ví dụ mở rộng',
      desc: 'Tự viết câu mới dùng từ vựng hoặc mẫu ngữ pháp. Với từ vựng, trang kiểm tra có dùng đúng từ không. Với mẫu ngữ pháp, bạn tự so sánh với ví dụ mẫu.',
      need: function (ds) { return ds.vocab.length + ds.grammar.length > 0; },
      needText: 'Cần có file từ vựng hoặc file ngữ pháp trong bài.',
      build: function (ds) { return Core.extensionQuestions(ds.vocab, ds.grammar); }
    },
    mcq: {
      title: 'Trắc nghiệm ABCD',
      desc: 'Chọn đáp án đúng trong bốn phương án: nghĩa của từ, câu, mẫu ngữ pháp.',
      need: function (ds) { return ds.vocab.length + ds.sentences.length + ds.grammar.length >= 2; },
      needText: 'Cần ít nhất hai mục dữ liệu để tạo phương án nhiễu.',
      build: function (ds) { return Core.choiceQuestions(ds); }
    },
    translate: {
      title: 'Dịch hai chiều',
      desc: 'Dịch câu tiếng Hàn sang tiếng Việt và ngược lại. Kết quả được đối chiếu với đáp án đã cho.',
      need: function (ds) { return ds.sentences.length > 0; },
      needText: 'Cần có câu tiếng Hàn kèm đáp án tiếng Việt trong bài.',
      build: function (ds) { return Core.translationQuestions(ds.sentences); }
    }
  };

  var FILE_ACCEPT = '.txt,.csv,.tsv,.md,.xlsx,.docx,.pdf,.doc';

  var state = {
    data: null,      // toàn bộ dữ liệu: bài, file đã xoá, tiến độ
    dataset: null,   // dữ liệu của phạm vi đang chọn (một bài hoặc tất cả)
    scope: 'all'
  };

  var syncTimer = null;
  var syncMessage = '';

  // ---------- Tiện ích ----------

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $all(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      toast('Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.');
      return false;
    }
  }

  var toastTimer = null;
  function toast(message) {
    var el = $('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3400);
  }

  function fmtDate(ts) {
    return ts ? new Date(ts).toLocaleDateString('vi-VN') : '';
  }

  function fmtDateTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function reviewText(ts) {
    return ts ? fmtDate(ts) : 'Chưa ôn';
  }

  function hasData(ds) {
    return ds.vocab.length + ds.grammar.length + ds.sentences.length + ds.lecture.length > 0;
  }

  function pageHead(title, desc) {
    return '<header class="page-head"><h1>' + esc(title) + '</h1>' +
      (desc ? '<p>' + esc(desc) + '</p>' : '') + '</header>';
  }

  function noDataView(root) {
    root.innerHTML = pageHead('Chưa có dữ liệu') +
      '<div class="card empty"><div class="big-icon">📭</div>' +
      '<h2>' + esc(scopeLabel()) + ' chưa có nội dung</h2>' +
      '<p>Vào Bài học & file để tạo bài và tải file lên: bài giảng, từ vựng, ngữ pháp, câu tiếng Hàn và đáp án tiếng Việt.</p>' +
      '<a class="btn primary" href="#/lessons">Đi tới Bài học & file</a></div>';
  }

  // ---------- Lưu trữ và phạm vi ----------

  function activeLessons() {
    if (state.scope === 'all') return state.data.lessons;
    return state.data.lessons.filter(function (l) { return l.id === state.scope; });
  }

  function scopeLabel() {
    if (state.scope === 'all') return 'Tất cả các bài';
    var l = findLesson(state.scope);
    return l ? 'Bài "' + l.name + '"' : 'Tất cả các bài';
  }

  function findLesson(id) {
    return state.data.lessons.filter(function (l) { return l.id === id; })[0] || null;
  }

  function refresh() {
    if (state.scope !== 'all' && !findLesson(state.scope)) state.scope = 'all';
    state.dataset = Core.scopeDataset(activeLessons());
  }

  // Lưu sau mỗi thay đổi và hẹn đồng bộ.
  function commit() {
    state.data.updatedAt = Date.now();
    saveJSON(STORE_STATE, state.data);
    refresh();
    scheduleSync();
  }

  function loadState() {
    var raw = loadJSON(STORE_STATE, null);
    if (raw) return Core.mergeStates(Core.emptyState(), raw);
    var migrated = Core.migrateV1(
      loadJSON(STORE_V1_SOURCES, null),
      loadJSON(STORE_V1_PROGRESS, {}) || {},
      Date.now()
    );
    saveJSON(STORE_STATE, migrated);
    return migrated;
  }

  function getProgress(id) {
    return state.data.progress[id] || { ok: 0, bad: 0, known: false };
  }

  function bump(id, ok) {
    var p = getProgress(id);
    if (ok) p.ok++; else p.bad++;
    p.last = Date.now();
    state.data.progress[id] = p;
    commit();
  }

  function setKnown(id, known) {
    var p = getProgress(id);
    p.known = known;
    p.last = Date.now();
    state.data.progress[id] = p;
    commit();
  }

  function totals() {
    var t = { ok: 0, bad: 0, known: 0 };
    Object.keys(state.data.progress).forEach(function (id) {
      var p = state.data.progress[id];
      t.ok += p.ok || 0;
      t.bad += p.bad || 0;
      if (id.indexOf('card:') === 0 && p.known) t.known++;
    });
    return t;
  }

  // ---------- Đọc file ----------

  var scriptPromises = {};
  function loadScript(src) {
    if (ASSETS[src] === 'inline') return Promise.resolve();
    if (!scriptPromises[src]) {
      scriptPromises[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = ASSETS[src] || src;
        s.onload = resolve;
        s.onerror = function () { reject(new Error('Không tải được thư viện ' + src)); };
        document.head.appendChild(s);
      });
    }
    return scriptPromises[src];
  }

  function extOf(name) {
    var m = /\.([^.]+)$/.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }

  function trimTrailingEmpty(cells) {
    var end = cells.length;
    while (end > 0 && !cells[end - 1]) end--;
    return cells.slice(0, end);
  }

  function rowsToLines(rows) {
    return rows
      .map(function (row) { return trimTrailingEmpty(row.map(function (c) { return Core.clean(c); })); })
      .filter(function (row) { return row.length > 0; })
      .map(function (row) { return row.join(' | '); });
  }

  function readXlsx(file) {
    return loadScript('vendor/xlsx.full.min.js').then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      var wb = window.XLSX.read(buf, { type: 'array' });
      var rows = [];
      wb.SheetNames.forEach(function (name) {
        var sheetRows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false, blankrows: false });
        rows = rows.concat(sheetRows.map(function (r) { return r.map(String); }));
      });
      return rowsToLines(rows);
    });
  }

  function docxElementsToLines(root) {
    var lines = [];
    function walk(node) {
      Array.prototype.forEach.call(node.children, function (el) {
        var tag = el.tagName.toLowerCase();
        if (tag === 'table') {
          Array.prototype.forEach.call(el.querySelectorAll('tr'), function (tr) {
            var cells = Array.prototype.map.call(tr.children, function (td) { return td.textContent; });
            lines.push(rowsToLines([cells])[0] || '');
          });
        } else if (/^h[1-6]$/.test(tag)) {
          lines.push('# ' + el.textContent);
        } else if (tag === 'p' || tag === 'li') {
          lines.push(el.textContent);
        } else if (tag === 'ul' || tag === 'ol' || tag === 'div') {
          walk(el);
        }
      });
    }
    walk(root);
    return lines.map(Core.clean).filter(Boolean);
  }

  function readDocx(file) {
    return loadScript('vendor/mammoth.browser.min.js').then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      return window.mammoth.convertToHtml({ arrayBuffer: buf });
    }).then(function (result) {
      var doc = new DOMParser().parseFromString('<div>' + result.value + '</div>', 'text/html');
      return docxElementsToLines(doc.body.firstElementChild);
    });
  }

  // Gom các mẩu chữ của PDF thành dòng theo toạ độ dọc. Khoảng trống lớn giữa hai mẩu
  // (thường là ô bảng) được đổi thành dấu | để cột vẫn tách được.
  function pdfItemsToLines(items) {
    var rows = [];
    items.forEach(function (item) {
      if (!item.str || !item.str.trim()) return;
      var y = Math.round(item.transform[5]);
      var row = null;
      for (var i = rows.length - 1; i >= 0; i--) {
        if (Math.abs(rows[i].y - y) <= 2) { row = rows[i]; break; }
      }
      if (!row) {
        row = { y: y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    });
    rows.sort(function (a, b) { return b.y - a.y; });
    return rows.map(function (row) {
      row.items.sort(function (a, b) { return a.transform[4] - b.transform[4]; });
      var text = '';
      var prevEnd = null;
      row.items.forEach(function (item) {
        var x = item.transform[4];
        if (prevEnd !== null) {
          var gap = x - prevEnd;
          text += gap > 12 ? ' | ' : (gap > 1 ? ' ' : '');
        }
        text += item.str;
        prevEnd = x + (item.width || 0);
      });
      return Core.clean(text);
    }).filter(Boolean);
  }

  function readPdf(file) {
    return loadScript('vendor/pdf.worker.min.js').then(function () {
      return loadScript('vendor/pdf.min.js');
    }).then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      return window.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (pdf) {
      var lines = [];
      var chain = Promise.resolve();
      for (var n = 1; n <= pdf.numPages; n++) {
        chain = chain.then(makePageReader(pdf, n, lines));
      }
      return chain.then(function () {
        if (!lines.length) {
          throw new Error('Không đọc được chữ trong PDF. Có thể đây là file scan (ảnh), hãy dùng bản chữ hoặc file .docx.');
        }
        return lines;
      });
    });
  }

  function makePageReader(pdf, pageNumber, lines) {
    return function () {
      return pdf.getPage(pageNumber).then(function (page) {
        return page.getTextContent();
      }).then(function (content) {
        pdfItemsToLines(content.items).forEach(function (line) { lines.push(line); });
      });
    };
  }

  function readFileLines(file) {
    var ext = extOf(file.name);
    if (ext === 'xlsx' || ext === 'xlsm') return readXlsx(file);
    if (ext === 'docx') return readDocx(file);
    if (ext === 'pdf') return readPdf(file);
    if (ext === 'doc') return Promise.reject(new Error('File .doc (Word cũ) chưa đọc được. Hãy mở bằng Word, chọn Lưu thành → Word Document (.docx) rồi nạp lại.'));
    if (ext === 'xls') return Promise.reject(new Error('File .xls chưa đọc được. Hãy lưu thành .xlsx rồi nạp lại.'));
    return file.text().then(function (text) {
      text = text.replace(/^﻿/, '');
      if (ext === 'csv') return rowsToLines(Core.parseCsv(text));
      return text.split(/\r?\n/).map(Core.clean).filter(Boolean);
    });
  }

  // ---------- Bài học và file ----------

  function createLesson(name) {
    var now = Date.now();
    state.data.lessons.push({ id: Core.newId('l'), name: name, createdAt: now, updatedAt: now, files: [] });
    commit();
  }

  function deleteLesson(id) {
    state.data.deleted.lessons[id] = Date.now();
    state.data.lessons = state.data.lessons.filter(function (l) { return l.id !== id; });
    commit();
  }

  function addFile(lesson, kind, file) {
    return readFileLines(file).then(function (lines) {
      if (!lines.length) throw new Error('File không có nội dung đọc được.');
      var now = Date.now();
      var chosen = kind === 'auto' ? (Core.guessKind(file.name) || 'lecture') : kind;
      lesson.files.push({ id: Core.newId('f'), kind: chosen, name: file.name, uploadedAt: now, lines: lines });
      lesson.updatedAt = now;
      commit();
      toast(describeUpload(file.name, chosen, lines));
    });
  }

  // Thông báo sau khi tải lên: nói rõ file đã vào mục nào và có đọc được nội dung không.
  function describeUpload(name, kind, lines) {
    if (kind === 'vocab') {
      var v = Core.parseVocab(lines).items.length;
      if (!v) return 'Không đọc được từ nào trong "' + name + '". Dòng đầu: "' + lines[0] + '". Mỗi dòng cần dạng: từ | nghĩa.';
      return 'Đã thêm "' + name + '" vào Từ vựng: ' + v + ' từ.';
    }
    if (kind === 'grammar') {
      var g = Core.parseGrammar(lines).items.length;
      if (!g) return 'Không đọc được mẫu ngữ pháp nào trong "' + name + '". Dòng đầu: "' + lines[0] + '".';
      return 'Đã thêm "' + name + '" vào Ngữ pháp: ' + g + ' mẫu.';
    }
    var info = Core.kindInfo(kind);
    return 'Đã thêm "' + name + '" vào ' + (info ? info.label : kind) + ' (' + lines.length + ' dòng).';
  }

  function deleteFile(lesson, fileId) {
    state.data.deleted.files[fileId] = Date.now();
    lesson.files = lesson.files.filter(function (f) { return f.id !== fileId; });
    lesson.updatedAt = Date.now();
    commit();
  }

  function loadSampleLesson() {
    var now = Date.now();
    var files = [
      { kind: 'vocab', name: 'Từ vựng mẫu.txt', key: 'vocabLines' },
      { kind: 'grammar', name: 'Ngữ pháp mẫu.txt', key: 'grammarLines' },
      { kind: 'ko', name: 'Câu tiếng Hàn mẫu.txt', key: 'koLines' },
      { kind: 'vi', name: 'Đáp án tiếng Việt mẫu.txt', key: 'viLines' },
      { kind: 'lecture', name: 'Bài giảng mẫu.txt', key: 'lectureLines' }
    ].map(function (f) {
      return { id: Core.newId('f'), kind: f.kind, name: f.name, uploadedAt: now, lines: SAMPLE[f.key].slice() };
    });
    state.data.lessons.push({ id: Core.newId('l'), name: 'Bài mẫu', createdAt: now, updatedAt: now, files: files });
    commit();
  }

  // ---------- Đồng bộ ----------

  function syncConfig() {
    return loadJSON(STORE_SYNC, null) || {};
  }

  function scheduleSync() {
    if (!dbRef && !syncConfig().url) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncNow(false); }, 2000);
  }

  function setSyncMessage(msg) {
    syncMessage = msg;
    var el = $('#syncStatus');
    if (el) el.textContent = msg;
  }

  function syncNow(manual) {
    if (dbRef) return dbSync(manual);
    var cfg = syncConfig();
    if (!cfg.url || !cfg.key) {
      if (manual) toast('Hãy nhập địa chỉ máy chủ và mã đồng bộ trước.');
      return Promise.resolve();
    }
    var base = cfg.url.replace(/\/+$/, '');
    setSyncMessage('Đang đồng bộ…');
    var before = JSON.stringify(state.data);
    return fetch(base + '/api/sync?key=' + encodeURIComponent(cfg.key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: state.data })
    }).then(function (res) {
      if (!res.ok) throw new Error('máy chủ trả về lỗi ' + res.status);
      return res.json();
    }).then(function (body) {
      state.data = Core.mergeStates(state.data, body.state);
      saveJSON(STORE_STATE, state.data);
      refresh();
      setSyncMessage('Đã đồng bộ lúc ' + timeNow());
      // Vẽ lại nếu thiết bị khác vừa thay đổi dữ liệu, trừ khi đang làm bài.
      if (JSON.stringify(state.data) !== before && !$('.quiz')) render();
    }).catch(function (err) {
      setSyncMessage('Chưa đồng bộ được: ' + (err && err.message ? err.message : 'lỗi mạng') +
        '. Dữ liệu vẫn được lưu trên máy này.');
    });
  }

  // ---------- Sao lưu ----------

  // Trong Claude, file chỉ được lưu qua capability downloads (người xem phải đồng ý).
  var downloadsRef = null;
  var inClaude = !!(window.claude && typeof window.claude.use === 'function');

  function exportBackup() {
    var text = JSON.stringify({ app: 'hanhoc', version: 2, state: state.data }, null, 2);
    var filename = 'hoc-han-ngu-' + new Date().toISOString().slice(0, 10) + '.json';
    if (downloadsRef) {
      downloadsRef.save({ filename: filename, data: text }).then(function () {
        toast('Đã lưu bản sao về máy.');
      }).catch(function (err) {
        toast(err && err.code === 'declined' ? 'Bạn đã huỷ lưu file.' : 'Không lưu được file lúc này.');
      });
      return;
    }
    if (inClaude) {
      toast('Lưu file không khả dụng trong phiên này. Dữ liệu vẫn được đồng bộ tự động.');
      return;
    }
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Đã tải file sao lưu về máy.');
  }

  // Mở bản sao: gộp vào dữ liệu hiện có, không xoá gì. Nhận cả bản sao phiên bản cũ.
  function restoreBackup(file) {
    file.text().then(function (text) {
      var data = JSON.parse(text);
      var incoming = null;
      if (data && data.app === 'hanhoc' && data.state) {
        incoming = data.state;
      } else if (data && data.app === 'hanhoc' && data.sources) {
        incoming = Core.migrateV1(data.sources, data.progress || {}, Date.now());
      } else {
        throw new Error('File này không phải bản sao lưu của Học Hàn Ngữ.');
      }
      state.data = Core.mergeStates(state.data, incoming);
      saveJSON(STORE_STATE, state.data);
      refresh();
      scheduleSync();
      toast('Đã khôi phục dữ liệu từ bản sao.');
      render();
    }).catch(function (err) {
      toast(err && err.message ? err.message : 'Không mở được file sao lưu.');
    });
  }

  // Đồng bộ qua tài khoản Claude (capability db). Chỉ chạy khi trang được mở trong Claude.
  var dbRef = null;

  function plain(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function runInSeries(list) {
    return list.reduce(function (chain, fn) { return chain.then(fn); }, Promise.resolve());
  }

  function dbRemoteState() {
    return Promise.all([
      dbRef.collection('lessons').get(),
      dbRef.collection('progress').get(),
      dbRef.collection('tombstones').get()
    ]).then(function (res) {
      var remote = Core.emptyState();
      res[0].docs.forEach(function (d) { if (d.exists) remote.lessons.push(plain(d.data())); });
      res[1].docs.forEach(function (d) { if (d.exists) remote.progress[d.id] = plain(d.data()); });
      res[2].docs.forEach(function (d) {
        if (!d.exists) return;
        var t = plain(d.data());
        if (t.kind === 'lesson') remote.deleted.lessons[t.id] = t.at;
        else remote.deleted.files[t.id] = t.at;
      });
      return remote;
    });
  }

  function tombstoneOp(kind, id, at) {
    var docId = (kind === 'lesson' ? 'l-' : 'f-') + id;
    return function () {
      return dbRef.collection('tombstones').doc(docId).set({ kind: kind, id: id, at: at });
    };
  }

  // Ghi những gì khác với db: bài thay đổi, bài đã xoá, mục tiến độ mới.
  function dbPush(remote) {
    var ops = [];
    var remoteLessons = {};
    remote.lessons.forEach(function (l) { remoteLessons[l.id] = l; });

    state.data.lessons.forEach(function (l) {
      if (JSON.stringify(remoteLessons[l.id]) !== JSON.stringify(l)) {
        ops.push(function () { return dbRef.collection('lessons').doc(l.id).set(l); });
      }
    });
    Object.keys(state.data.deleted.lessons).forEach(function (id) {
      if (!remote.deleted.lessons[id]) ops.push(tombstoneOp('lesson', id, state.data.deleted.lessons[id]));
      if (remoteLessons[id]) ops.push(function () { return dbRef.collection('lessons').doc(id).delete(); });
    });
    Object.keys(state.data.deleted.files).forEach(function (id) {
      if (!remote.deleted.files[id]) ops.push(tombstoneOp('file', id, state.data.deleted.files[id]));
    });
    Object.keys(state.data.progress).forEach(function (k) {
      if (JSON.stringify(remote.progress[k]) !== JSON.stringify(state.data.progress[k])) {
        ops.push(function () { return dbRef.collection('progress').doc(k).set(state.data.progress[k]); });
      }
    });
    return runInSeries(ops);
  }

  function dbErrorText(err) {
    var code = err && err.code;
    if (code === 'invalid_argument') return 'Một bài quá lớn để đồng bộ (tối đa khoảng 256 KB mỗi bài). Hãy tách bài thành nhiều bài nhỏ.';
    if (code === 'quota_exceeded') return 'Hết dung lượng đồng bộ. Dữ liệu vẫn được lưu trên máy này.';
    if (code === 'not_granted' || code === 'revoked' || code === 'capability_disabled') {
      return 'Đồng bộ không khả dụng trong phiên này. Dữ liệu vẫn được lưu trên máy này.';
    }
    return 'Chưa đồng bộ được (' + (err && err.message ? err.message : 'lỗi mạng') + '). Dữ liệu vẫn được lưu trên máy này.';
  }

  function timeNow() {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  function dbSync(manual) {
    setSyncMessage('Đang đồng bộ…');
    var before = JSON.stringify(state.data);
    return dbRemoteState().then(function (remote) {
      state.data = Core.mergeStates(state.data, remote);
      saveJSON(STORE_STATE, state.data);
      refresh();
      return dbPush(remote);
    }).then(function () {
      setSyncMessage('Đã đồng bộ lúc ' + timeNow());
      if (JSON.stringify(state.data) !== before && !$('.quiz')) render();
    }).catch(function (err) {
      setSyncMessage(dbErrorText(err));
    });
  }

  // ---------- Điều hướng ----------

  function renderSidebar(activeId) {
    var nav = '';
    NAV.forEach(function (group) {
      nav += '<div class="nav-group">' + esc(group.group) + '</div>';
      group.items.forEach(function (item) {
        nav += '<a class="nav-link' + (item.id === activeId ? ' active' : '') + '" href="#/' + item.id + '"' +
          (item.id === activeId ? ' aria-current="page"' : '') + '>' +
          '<span class="nav-icon">' + item.icon + '</span>' + esc(item.label) + '</a>';
      });
    });
    $('#nav').innerHTML = nav;

    var options = '<option value="all"' + (state.scope === 'all' ? ' selected' : '') + '>Tất cả các bài</option>';
    state.data.lessons.forEach(function (l) {
      options += '<option value="' + esc(l.id) + '"' + (state.scope === l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>';
    });
    $('#scopeWrap').innerHTML = '<label class="scope-label">Đang học<select class="select scope-select" id="scope">' + options + '</select></label>';
    $('#scope').addEventListener('change', function (e) {
      state.scope = e.target.value;
      saveJSON(STORE_SCOPE, state.scope);
      refresh();
      render();
    });

    var ds = state.dataset;
    $('#sideFoot').innerHTML =
      '<div>📘 ' + ds.vocab.length + ' từ vựng</div>' +
      '<div>📐 ' + ds.grammar.length + ' mẫu ngữ pháp</div>' +
      '<div>💬 ' + ds.sentences.length + ' câu</div>';
  }

  var VIEWS = {
    home: viewHome,
    lessons: viewLessons,
    flashcard: viewFlashcard,
    word: function (root) { viewExercise(root, 'word'); },
    order: function (root) { viewExercise(root, 'order'); },
    extend: function (root) { viewExercise(root, 'extend'); },
    mcq: function (root) { viewExercise(root, 'mcq'); },
    translate: function (root) { viewExercise(root, 'translate'); },
    vocab: viewVocab,
    grammar: viewGrammar,
    sentences: viewSentences,
    lecture: viewLecture
  };

  function currentRoute() {
    var id = (window.location.hash || '').replace(/^#\/?/, '');
    return VIEWS[id] ? id : 'home';
  }

  function render() {
    var id = currentRoute();
    renderSidebar(id);
    var root = $('#view');
    VIEWS[id](root);
    root.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  // ---------- Trang chủ ----------

  function viewHome(root) {
    var ds = state.dataset;
    var t = totals();
    var pct = t.ok + t.bad ? Math.round((t.ok / (t.ok + t.bad)) * 100) : 0;
    var idx = Core.reviewIndex(state.data.progress);

    var warnings = ds.warnings.map(function (w) { return '<div class="notice">' + esc(w) + '</div>'; }).join('');

    var lessonRows = state.data.lessons.map(function (l) {
      var d = Core.lessonDataset(l);
      return '<tr><td class="ko">' + esc(l.name) + '</td>' +
        '<td>' + fmtDate(l.createdAt) + '</td>' +
        '<td>' + esc(reviewText(Core.lessonLastReview(d, idx))) + '</td>' +
        '<td>' + d.vocab.length + ' từ · ' + d.sentences.length + ' câu · ' + d.grammar.length + ' mẫu</td></tr>';
    }).join('');

    var tiles = NAV[1].items.map(function (item) {
      var desc = {
        flashcard: 'Lật thẻ từ, ngữ pháp và câu. Đánh dấu thẻ đã thuộc.',
        word: 'Nghĩa tiếng Việt → gõ từ tiếng Hàn.',
        order: 'Ghép các từ thành câu tiếng Hàn đúng.',
        extend: 'Tự viết câu mới với từ và mẫu ngữ pháp.',
        mcq: 'Chọn đáp án A, B, C, D cho từ, câu và mẫu.',
        translate: 'Dịch Hàn → Việt và Việt → Hàn.'
      }[item.id];
      return '<a class="card tile" href="#/' + item.id + '"><div class="tile-icon">' + item.icon + '</div>' +
        '<h3>' + esc(item.label) + '</h3><p>' + esc(desc) + '</p></a>';
    }).join('');

    var body;
    if (!state.data.lessons.length) {
      body = '<div class="card empty"><div class="big-icon">🌱</div><h2>Chưa có bài nào</h2>' +
        '<p>Tạo bài đầu tiên và tải file lên, hoặc nạp bài mẫu để thử trước.</p>' +
        '<a class="btn primary" href="#/lessons">Đi tới Bài học & file</a></div>';
    } else {
      body = '' +
        '<section class="section grid grid-stats">' +
          '<div class="card stat"><div class="num">' + ds.vocab.length + '</div><div class="label">Từ vựng</div></div>' +
          '<div class="card stat"><div class="num">' + ds.grammar.length + '</div><div class="label">Mẫu ngữ pháp</div></div>' +
          '<div class="card stat"><div class="num">' + ds.sentences.length + '</div><div class="label">Câu</div></div>' +
          '<div class="card stat"><div class="num">' + t.known + '</div><div class="label">Thẻ đã thuộc</div></div>' +
          '<div class="card stat"><div class="num">' + pct + '%</div><div class="label">Đúng trong bài tập (' + (t.ok + t.bad) + ' lượt)</div></div>' +
        '</section>' +
        '<section class="section"><h2>Các bài</h2><div class="table-wrap"><table class="table">' +
          '<thead><tr><th>Bài</th><th>Tạo ngày</th><th>Ôn gần nhất</th><th>Nội dung</th></tr></thead>' +
          '<tbody>' + lessonRows + '</tbody></table></div></section>' +
        '<section class="section"><h2>Bắt đầu học</h2><div class="grid grid-tiles">' + tiles + '</div></section>';
    }

    root.innerHTML = '' +
      '<section class="card hero">' +
        '<img src="' + LOGO + '" alt="Logo Học Hàn Ngữ">' +
        '<div><h1>Học Hàn Ngữ</h1>' +
        '<p>Từ file bài giảng của bạn, trang tự tạo flashcard, bài tập viết, trắc nghiệm và dịch câu.</p></div>' +
      '</section>' +
      '<div class="section">' + warnings + '</div>' +
      body;
  }

  // ---------- Bài học & file ----------

  function syncCardHtml(sync) {
    if (dbRef) {
      return '<section class="card sync-card">' +
        '<h2>Đồng bộ giữa các thiết bị</h2>' +
        '<p class="muted">Dữ liệu được đồng bộ tự động qua tài khoản Claude của bạn. Đăng nhập cùng tài khoản trên điện thoại, máy tính hoặc tablet để thấy cùng dữ liệu.</p>' +
        '<p class="sync-status" id="syncStatus">' + esc(syncMessage || 'Đang đồng bộ…') + '</p>' +
        '<div class="row"><button class="btn soft" id="syncNow">Đồng bộ ngay</button></div>' +
      '</section>';
    }
    return     '<section class="card sync-card">' +
        '<h2>Đồng bộ giữa các thiết bị</h2>' +
        '<p class="muted">Điện thoại, máy tính và tablet dùng cùng một địa chỉ máy chủ và cùng một mã đồng bộ thì sẽ thấy cùng dữ liệu. Xem hướng dẫn trong README.</p>' +
        '<div class="sync-form">' +
          '<input class="input" id="syncUrl" placeholder="Địa chỉ máy chủ, ví dụ https://ten-may-chu.example.com" value="' + esc(sync.url || '') + '">' +
          '<input class="input" id="syncKey" placeholder="Mã đồng bộ (dùng chung trên mọi thiết bị)" value="' + esc(sync.key || '') + '">' +
          '<div class="row"><button class="btn primary" id="syncSave">Lưu và đồng bộ</button>' +
          '<button class="btn soft" id="syncNow">Đồng bộ ngay</button></div>' +
        '</div>' +
        '<p class="sync-status" id="syncStatus">' + esc(syncMessage || (sync.url ? 'Đã cấu hình.' : 'Chưa cấu hình, dữ liệu chỉ lưu trên máy này.')) + '</p>' +
      '</section>';
  }

  function viewLessons(root) {
    var sync = syncConfig();
    var lessons = state.data.lessons.map(function (l) {
      var counts = Core.lessonDataset(l);
      var idx = Core.reviewIndex(state.data.progress);
      var moveOptions = function (current) {
        return Core.KINDS.map(function (k) {
          return '<option value="' + k.kind + '"' + (k.kind === current ? ' selected' : '') + '>' + esc(k.label) + '</option>';
        }).join('');
      };
      var files = l.files.map(function (f) {
        var info = Core.kindInfo(f.kind);
        return '<li class="file-row">' +
          '<div class="file-main"><strong>' + esc(f.name) + '</strong>' +
          '<small>Tải lên ' + esc(fmtDateTime(f.uploadedAt)) + ' · ' + f.lines.length + ' dòng</small></div>' +
          '<div class="file-actions">' +
            '<select class="select file-kind" data-move-file="' + esc(f.id) + '" data-lesson="' + esc(l.id) + '" aria-label="Thuộc mục">' + moveOptions(f.kind) + '</select>' +
            '<button class="btn small danger" data-del-file="' + esc(f.id) + '" data-lesson="' + esc(l.id) + '">Xoá file</button>' +
          '</div>' +
        '</li>';
      }).join('') || '<li class="muted">Chưa có file nào.</li>';

      var kindOptions = Core.KINDS.map(function (k) {
        return '<option value="' + k.kind + '">' + esc(k.label) + '</option>';
      }).join('');

      return '' +
        '<article class="card lesson">' +
          '<div class="lesson-head">' +
            '<div><h2>' + esc(l.name) + '</h2>' +
              '<small>Tạo ngày ' + esc(fmtDate(l.createdAt)) + ' · Ôn gần nhất: ' + esc(reviewText(Core.lessonLastReview(counts, idx))) + '</small></div>' +
            '<button class="btn small danger" data-del-lesson="' + esc(l.id) + '">Xoá bài</button>' +
          '</div>' +
          '<div class="lesson-counts"><span class="badge">' + counts.vocab.length + ' từ</span>' +
            '<span class="badge">' + counts.grammar.length + ' mẫu</span>' +
            '<span class="badge">' + counts.sentences.length + ' câu</span>' +
            '<span class="badge">' + counts.lecture.length + ' dòng bài giảng</span></div>' +
          '<ul class="file-list">' + files + '</ul>' +
          '<div class="upload-row">' +
            '<select class="select" data-kind-for="' + esc(l.id) + '" aria-label="Loại file">' +
              '<option value="auto">Tự nhận theo tên file</option>' + kindOptions + '</select>' +
            '<input class="file-input" type="file" accept="' + FILE_ACCEPT + '" data-upload="' + esc(l.id) + '" multiple>' +
          '</div>' +
        '</article>';
    }).join('');

    root.innerHTML = pageHead('Bài học & file',
      'Mỗi bài có các file riêng. Chọn một bài ở thanh bên để luyện riêng bài đó, hoặc chọn "Tất cả các bài". Có thể xoá từng file khi không cần nữa.') +
      syncCardHtml(sync) +
      '<section class="card backup-card">' +
        '<h2>Sao lưu</h2>' +
        '<p class="muted">Tải bản sao về máy để giữ dữ liệu, hoặc mở bản sao khi đổi máy.</p>' +
        '<div class="row">' +
          '<button class="btn soft" id="exportBackup">Lưu bản sao (.json)</button>' +
          '<label class="btn ghost" style="cursor:pointer">Mở bản sao<input type="file" id="restoreFile" accept=".json,application/json" hidden></label>' +
        '</div>' +
      '</section>' +
      '<section class="card create-lesson">' +
        '<h2>Tạo bài mới</h2>' +
        '<div class="row"><input class="input" id="lessonName" placeholder="Tên bài, ví dụ: Bài 5 - Đi học" style="flex:1 1 260px">' +
        '<button class="btn primary" id="createLesson">Tạo bài</button>' +
        (state.data.lessons.length ? '' : '<button class="btn soft" id="loadSample">Nạp bài mẫu</button>') + '</div>' +
      '</section>' +
      (state.data.lessons.length
        ? '<div class="lesson-list">' + lessons + '</div>'
        : '<div class="card empty"><div class="big-icon">🗂️</div><p>Chưa có bài nào.</p></div>') +
      '<details class="guide card" style="margin-top:1.25rem">' +
        '<summary>Mẹo định dạng file</summary>' +
        '<ul>' +
          '<li>Từ vựng: <code>từ tiếng Hàn | nghĩa | ví dụ | dịch ví dụ</code>. Ngữ pháp: <code>mẫu | ý nghĩa | giải thích | ví dụ | dịch</code>.</li>' +
          '<li>Dùng <code>|</code> hoặc phím Tab để tách cột. File Excel, Word dạng bảng và PDF có chữ được đọc tự động.</li>' +
          '<li>Dòng tiêu đề được bỏ qua. Số thứ tự đầu dòng như "1." được bỏ đi khi ghép câu.</li>' +
          '<li>Câu tiếng Hàn và đáp án tiếng Việt ghép theo thứ tự dòng. Muốn chắc chắn, viết "câu hàn | câu việt" trên cùng một dòng.</li>' +
          '<li>Với file Word cũ (.doc), lưu thành .docx trước khi tải lên.</li>' +
        '</ul>' +
      '</details>';

    bindLessons(root);
  }

  function bindLessons(root) {
    $('#createLesson', root).addEventListener('click', function () {
      var name = $('#lessonName', root).value.trim();
      if (!name) { toast('Hãy nhập tên bài.'); return; }
      createLesson(name);
      toast('Đã tạo bài "' + name + '".');
      render();
    });
    $('#lessonName', root).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('#createLesson', root).click();
    });
    var sample = $('#loadSample', root);
    if (sample) sample.addEventListener('click', function () {
      loadSampleLesson();
      toast('Đã nạp bài mẫu.');
      render();
    });

    var saveBtn = $('#syncSave', root);
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var url = $('#syncUrl', root).value.trim();
      var key = $('#syncKey', root).value.trim();
      if (!/^https?:\/\//i.test(url)) { toast('Địa chỉ máy chủ phải bắt đầu bằng http:// hoặc https://'); return; }
      if (key.length < 4) { toast('Mã đồng bộ cần ít nhất 4 ký tự.'); return; }
      saveJSON(STORE_SYNC, { url: url, key: key });
      syncNow(true);
    });
    $('#exportBackup', root).addEventListener('click', exportBackup);
    $('#restoreFile', root).addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) restoreBackup(file);
      e.target.value = '';
    });
    var nowBtn = $('#syncNow', root);
    if (nowBtn) nowBtn.addEventListener('click', function () { syncNow(true); });

    $all('[data-move-file]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var lesson = findLesson(sel.getAttribute('data-lesson'));
        var file = lesson && lesson.files.filter(function (f) { return f.id === sel.getAttribute('data-move-file'); })[0];
        if (!file) return;
        file.kind = sel.value;
        lesson.updatedAt = Date.now();
        commit();
        toast('Đã chuyển "' + file.name + '" sang ' + Core.kindInfo(sel.value).label + '.');
        render();
      });
    });

    $all('[data-upload]', root).forEach(function (input) {
      input.addEventListener('change', function () {
        var lessonId = input.getAttribute('data-upload');
        var kind = $('[data-kind-for="' + lessonId + '"]', root).value;
        var lesson = findLesson(lessonId);
        var files = Array.prototype.slice.call(input.files || []);
        input.value = '';
        if (!lesson || !files.length) return;
        files.reduce(function (chain, file) {
          return chain.then(function () {
            return addFile(lesson, kind, file).catch(function (err) {
              toast(err && err.message ? err.message : 'Không đọc được file.');
            });
          });
        }, Promise.resolve()).then(function () { render(); });
      });
    });

    $all('[data-del-file]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lesson = findLesson(btn.getAttribute('data-lesson'));
        var fileId = btn.getAttribute('data-del-file');
        var file = lesson && lesson.files.filter(function (f) { return f.id === fileId; })[0];
        if (!file || !window.confirm('Xoá file "' + file.name + '"?')) return;
        deleteFile(lesson, fileId);
        toast('Đã xoá ' + file.name + '.');
        render();
      });
    });

    $all('[data-del-lesson]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lesson = findLesson(btn.getAttribute('data-del-lesson'));
        if (!lesson || !window.confirm('Xoá cả bài "' + lesson.name + '" và mọi file trong bài?')) return;
        deleteLesson(lesson.id);
        toast('Đã xoá bài "' + lesson.name + '".');
        render();
      });
    });
  }

  // ---------- Flashcard ----------

  function viewFlashcard(root) {
    var ds = state.dataset;
    if (!hasData(ds)) return noDataView(root);

    var session = {
      filter: 'all',
      total: 0,
      deck: [],
      index: 0,
      flipped: false
    };

    function buildDeck() {
      var cards = Core.flashcards(state.dataset, session.filter);
      session.total = cards.length;
      var unknown = cards.filter(function (c) { return !getProgress(c.id).known; });
      var known = cards.filter(function (c) { return getProgress(c.id).known; });
      session.deck = Core.shuffle(unknown).concat(Core.shuffle(known));
      session.index = 0;
      session.flipped = false;
    }

    function draw() {
      var deck = session.deck;
      var remaining = deck.length - session.index;
      var stats = '<span class="deck-count">Còn lại: ' + remaining + ' thẻ</span>';

      if (!session.total) {
        root.innerHTML = pageHead('Flashcard') + filterBar(stats) +
          '<div class="card empty"><div class="big-icon">🗂️</div><h2>Không có thẻ nào</h2>' +
          '<p>Bài này chưa có nội dung cho loại thẻ đã chọn.</p></div>';
        bindFilter();
        return;
      }

      if (session.index >= deck.length) {
        root.innerHTML = pageHead('Flashcard') + filterBar(stats) +
          '<div class="card result"><div class="score">🎉</div><h2>Bạn đã đi hết bộ thẻ</h2>' +
          '<p class="muted">Các thẻ đã thuộc được lưu lại. Lần sau trang sẽ ưu tiên thẻ chưa thuộc.</p>' +
          '<div class="row" style="justify-content:center"><button class="btn primary" id="restart">Học lại bộ thẻ</button></div></div>';
        bindFilter();
        $('#restart', root).addEventListener('click', function () { buildDeck(); draw(); });
        return;
      }

      var card = deck[session.index];
      var backHtml = card.back.map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('');
      var lastText = reviewText(getProgress(card.id).last);
      root.innerHTML = pageHead('Flashcard', 'Bấm vào thẻ để lật. Chọn "Đã thuộc" để bỏ thẻ khỏi lượt này, "Chưa thuộc" để ôn lại sau.') +
        filterBar(stats) +
        '<div class="flip-stage">' +
          '<div class="fcard' + (session.flipped ? ' is-flipped' : '') + '" id="fcard" role="button" tabindex="0" aria-label="Lật thẻ">' +
            '<div class="face front card"><span class="badge">' + esc(card.label) + '</span>' +
              '<div class="front-text">' + esc(card.front) + '</div>' +
              '<div class="hint">Bấm để xem nghĩa · Ôn gần nhất: ' + esc(lastText) + '</div></div>' +
            '<div class="face back"><span class="badge">' + esc(card.label) + '</span>' +
              '<div class="back-text">' + backHtml + '</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="fcard-actions">' +
          '<button class="btn danger" id="notKnown">✗ Chưa thuộc</button>' +
          '<button class="btn primary" id="known">✓ Đã thuộc</button>' +
        '</div>';

      bindFilter();
      var fcard = $('#fcard', root);
      function flip() {
        session.flipped = !session.flipped;
        fcard.classList.toggle('is-flipped', session.flipped);
      }
      fcard.addEventListener('click', flip);
      fcard.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });

      function answer(known) {
        setKnown(card.id, known);
        if (known) {
          session.deck.splice(session.index, 1);
        } else {
          session.deck.push(session.deck.splice(session.index, 1)[0]);
        }
        session.flipped = false;
        draw();
      }
      $('#known', root).addEventListener('click', function () { answer(true); });
      $('#notKnown', root).addEventListener('click', function () { answer(false); });
    }

    function filterBar(stats) {
      return '<div class="deck-bar">' +
        '<label class="row"><span class="muted">Loại thẻ</span>' +
        '<select class="select" id="filter">' +
          '<option value="all"' + (session.filter === 'all' ? ' selected' : '') + '>Tất cả</option>' +
          '<option value="vocab"' + (session.filter === 'vocab' ? ' selected' : '') + '>Từ vựng</option>' +
          '<option value="grammar"' + (session.filter === 'grammar' ? ' selected' : '') + '>Ngữ pháp</option>' +
          '<option value="sentence"' + (session.filter === 'sentence' ? ' selected' : '') + '>Câu</option>' +
        '</select></label>' + stats + '</div>';
    }

    function bindFilter() {
      var sel = $('#filter', root);
      if (!sel) return;
      sel.addEventListener('change', function () {
        session.filter = sel.value;
        buildDeck();
        draw();
      });
    }

    buildDeck();
    draw();
  }

  // ---------- Bài tập ----------

  function viewExercise(root, id) {
    var ex = EXERCISES[id];
    var ds = state.dataset;
    if (!ex.need(ds)) {
      root.innerHTML = pageHead(ex.title, ex.desc) +
        '<div class="card empty"><div class="big-icon">📭</div><h2>Chưa đủ dữ liệu</h2>' +
        '<p>' + esc(ex.needText) + '</p>' +
        '<a class="btn primary" href="#/lessons">Đi tới Bài học & file</a></div>';
      return;
    }

    var total = ex.build(ds).length;
    root.innerHTML = pageHead(ex.title, ex.desc) +
      '<section class="card intro-form">' +
        '<label>Số câu<select class="select" id="count">' +
          [10, 20, 50].filter(function (n) { return n < total; }).concat([0]).map(function (n) {
            var label = n === 0 ? 'Tất cả (' + total + ' câu)' : n + ' câu';
            return '<option value="' + n + '"' + (n === 10 || (n === 0 && total <= 10) ? ' selected' : '') + '>' + label + '</option>';
          }).join('') +
        '</select></label>' +
        '<div class="row"><button class="btn primary" id="start">Bắt đầu</button></div>' +
      '</section>';

    $('#start', root).addEventListener('click', function () {
      var n = Number($('#count', root).value);
      var all = Core.shuffle(ex.build(state.dataset));
      var questions = n ? all.slice(0, n) : all;
      runQuiz(root, {
        title: ex.title,
        questions: questions,
        restart: function () { viewExercise(root, id); }
      });
    });
  }

  function runQuiz(root, opts) {
    var qs = opts.questions;
    var index = 0;
    var right = 0;
    var wrong = [];

    function draw() {
      if (index >= qs.length) return finish();
      var q = qs[index];
      root.innerHTML = '' +
        '<div class="quiz">' +
          '<div class="quiz-top">' +
            '<button class="btn small ghost" id="exit">← Thoát</button>' +
            '<span class="quiz-count">Câu ' + (index + 1) + '/' + qs.length + ' · Đúng ' + right + '</span>' +
          '</div>' +
          '<div class="bar"><span style="width:' + Math.round((index / qs.length) * 100) + '%"></span></div>' +
          '<article class="card qcard">' +
            '<div class="qlabel">' + esc(q.promptLabel) + '</div>' +
            '<div class="qprompt">' + esc(q.prompt) + '</div>' +
            '<div class="qbody" id="qbody"></div>' +
            '<div id="qfb"></div>' +
          '</article>' +
        '</div>';

      $('#exit', root).addEventListener('click', opts.restart);
      var body = $('#qbody', root);
      if (q.kind === 'choice') drawChoice(body, q);
      else if (q.kind === 'order') drawOrder(body, q);
      else if (q.kind === 'self') drawSelf(body, q);
      else drawText(body, q);
    }

    function drawChoice(body, q) {
      var letters = ['A', 'B', 'C', 'D'];
      body.innerHTML = '<div class="choices">' + q.options.map(function (opt, i) {
        return '<button class="choice" data-i="' + i + '"><span class="letter">' + letters[i] + '</span><span>' + esc(opt) + '</span></button>';
      }).join('') + '</div>';
      $all('.choice', body).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = Number(btn.getAttribute('data-i'));
          var res = q.check(i);
          $all('.choice', body).forEach(function (b) {
            b.disabled = true;
            var bi = Number(b.getAttribute('data-i'));
            if (q.options[bi] === q.answer) b.classList.add('is-right');
            else if (bi === i) b.classList.add('is-wrong');
          });
          submit(q, res, q.options[i], q.answer);
        });
      });
    }

    function drawText(body, q) {
      body.innerHTML = '' +
        '<div class="row">' +
          '<input class="input" id="ans" autocomplete="off" spellcheck="false" placeholder="Nhập đáp án của bạn" style="flex:1 1 280px">' +
          '<button class="btn primary" id="check">Kiểm tra</button>' +
        '</div>';
      var input = $('#ans', body);
      input.focus();
      function go() {
        var value = input.value;
        if (!Core.normNoSpace(value)) { input.focus(); return; }
        input.disabled = true;
        $('#check', body).disabled = true;
        submit(q, q.check(value), value, q.answer);
      }
      $('#check', body).addEventListener('click', go);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    }

    function drawOrder(body, q) {
      var picked = [];
      body.innerHTML = '' +
        '<div class="built" id="built"></div>' +
        '<div class="pool" id="pool"></div>' +
        '<div class="row end">' +
          '<button class="btn ghost small" id="reset">Xoá hết</button>' +
          '<button class="btn primary" id="check" disabled>Kiểm tra</button>' +
        '</div>';

      function paint() {
        $('#built', body).innerHTML = picked.length
          ? picked.map(function (k, pos) {
              return '<button class="chip on" data-pos="' + pos + '">' + esc(q.tokens[k]) + '</button>';
            }).join('')
          : '<span class="hint">Bấm các từ bên dưới theo thứ tự để ghép câu.</span>';
        $('#pool', body).innerHTML = q.tokens.map(function (t, k) {
          return '<button class="chip" data-k="' + k + '"' + (picked.indexOf(k) !== -1 ? ' disabled' : '') + '>' + esc(t) + '</button>';
        }).join('');
        $('#check', body).disabled = picked.length !== q.tokens.length;
        $all('#pool .chip', body).forEach(function (b) {
          b.addEventListener('click', function () {
            picked.push(Number(b.getAttribute('data-k')));
            paint();
          });
        });
        $all('#built .chip', body).forEach(function (b) {
          b.addEventListener('click', function () {
            picked.splice(Number(b.getAttribute('data-pos')), 1);
            paint();
          });
        });
      }

      $('#reset', body).addEventListener('click', function () { picked = []; paint(); });
      $('#check', body).addEventListener('click', function () {
        var words = picked.map(function (k) { return q.tokens[k]; });
        submit(q, q.check(words), words.join(' '), q.answer);
      });
      paint();
    }

    function drawSelf(body, q) {
      body.innerHTML = '' +
        '<textarea class="input" id="ans" rows="3" placeholder="Viết câu của bạn (không bắt buộc)"></textarea>' +
        '<div class="row"><button class="btn primary" id="reveal">Xem ví dụ mẫu</button></div>';
      $('#reveal', body).addEventListener('click', function () {
        var fb = $('#qfb', root);
        var detail = q.detail.length
          ? '<ul>' + q.detail.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>'
          : '';
        fb.innerHTML = '<div class="qfeedback info">' +
          '<div class="verdict">So sánh câu của bạn với ví dụ mẫu</div>' + detail +
          '<div class="you">Câu của bạn: ' + esc($('#ans', root).value || '(chưa viết)') + '</div>' +
          '<div class="row">' +
            '<button class="btn primary" id="selfOk">Tôi viết đúng</button>' +
            '<button class="btn ghost" id="selfNo">Cần luyện thêm</button>' +
          '</div></div>';
        $('#reveal', root).disabled = true;
        $('#selfOk', root).addEventListener('click', function () { selfDone(q, true); });
        $('#selfNo', root).addEventListener('click', function () { selfDone(q, false); });
      });
    }

    function selfDone(q, ok) {
      bump(q.id, ok);
      if (ok) right++; else wrong.push({ q: q, input: '' });
      index++;
      draw();
    }

    function submit(q, res, userInput, answer) {
      bump(q.id, res.ok);
      if (res.ok) right++;
      else wrong.push({ q: q, input: userInput });

      var fb = $('#qfb', root);
      var detailHtml = q.detail && q.detail.length
        ? '<ul>' + q.detail.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>'
        : '';
      var answerHtml = '';
      if (q.kind !== 'choice' && q.mode !== 'extend' && answer) {
        answerHtml = '<div class="answer">Đáp án: <b>' + esc(answer) + '</b></div>';
      }
      var youHtml = (q.kind === 'text' || q.kind === 'order') && userInput
        ? '<div class="you">Bạn nhập: ' + esc(userInput) + '</div>'
        : '';
      var verdict = res.ok ? 'Đúng rồi' : 'Chưa đúng';
      var cls = res.ok ? 'ok' : 'bad';
      if (q.kind === 'choice') {
        verdict = res.ok ? 'Chính xác!' : 'Chưa đúng';
      }
      fb.innerHTML = '<div class="qfeedback ' + cls + '">' +
        '<div class="verdict">' + esc(verdict) + '</div>' +
        (q.kind === 'choice' && res.ok ? '' : '<div>' + esc(res.text) + '</div>') +
        youHtml + answerHtml + detailHtml +
        '<div class="row end"><button class="btn primary" id="next">' +
          (index + 1 >= qs.length ? 'Xem kết quả' : 'Câu tiếp theo →') + '</button></div>' +
      '</div>';

      $('#next', root).addEventListener('click', function () {
        index++;
        draw();
      });
    }

    function finish() {
      var pct = qs.length ? Math.round((right / qs.length) * 100) : 0;
      var wrongHtml = wrong.length
        ? '<div class="wrong-list"><h3>Cần ôn lại</h3><ul>' + wrong.map(function (w) {
            var ans = w.q.answer ? ' → ' + esc(w.q.answer) : '';
            return '<li><b>' + esc(w.q.prompt) + '</b>' + ans + '</li>';
          }).join('') + '</ul></div>'
        : '<p>Không có câu nào sai. Tuyệt vời!</p>';
      root.innerHTML = '' +
        '<div class="card result">' +
          '<div class="score">' + pct + '%</div>' +
          '<h2>Hoàn thành ' + esc(opts.title) + '</h2>' +
          '<p>Đúng ' + right + '/' + qs.length + ' câu</p>' +
          wrongHtml +
          '<div class="row" style="justify-content:center;margin-top:1.5rem">' +
            '<button class="btn primary" id="again">Làm bộ mới</button>' +
            '<a class="btn ghost" href="#/home">Về trang chủ</a>' +
          '</div>' +
        '</div>';
      $('#again', root).addEventListener('click', opts.restart);
    }

    draw();
  }

  // ---------- Tài liệu ----------

  function searchBox(placeholder) {
    return '<div class="row" style="margin-bottom:1rem">' +
      '<input class="input search" id="q" type="search" placeholder="' + esc(placeholder) + '"></div>';
  }

  function viewVocab(root) {
    var ds = state.dataset;
    if (!ds.vocab.length) return noDataView(root);
    var idx = Core.reviewIndex(state.data.progress);
    root.innerHTML = pageHead('Từ vựng', scopeLabel() + ' · ' + ds.vocab.length + ' từ') + searchBox('Tìm từ, nghĩa hoặc ví dụ...') +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th><th>Ôn gần nhất</th></tr></thead><tbody id="rows"></tbody></table></div>';

    function paint(term) {
      var t = Core.normLoose(term);
      var list = ds.vocab.filter(function (v) {
        return !t || Core.normLoose([v.ko, v.vi, v.exKo, v.exVi].join(' ')).indexOf(t) !== -1;
      });
      $('#rows', root).innerHTML = list.map(function (v) {
        var ex = v.exKo ? esc(v.exKo) + (v.exVi ? '<br><small>' + esc(v.exVi) + '</small>' : '') : '<span class="muted">—</span>';
        return '<tr><td class="ko">' + esc(v.ko) + '</td><td>' + esc(v.vi) + '</td><td>' + ex + '</td>' +
          '<td>' + esc(reviewText(Core.lastReviewOf(v.id, idx))) + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="muted">Không có kết quả.</td></tr>';
    }
    paint('');
    $('#q', root).addEventListener('input', function (e) { paint(e.target.value); });
  }

  function viewGrammar(root) {
    var ds = state.dataset;
    if (!ds.grammar.length) return noDataView(root);
    var idx = Core.reviewIndex(state.data.progress);
    root.innerHTML = pageHead('Ngữ pháp', scopeLabel() + ' · ' + ds.grammar.length + ' mẫu') + searchBox('Tìm mẫu hoặc nghĩa...') + '<div id="list" class="grid" style="grid-template-columns:1fr"></div>';

    function paint(term) {
      var t = Core.normLoose(term);
      var list = ds.grammar.filter(function (g) {
        var text = [g.pattern, g.meaning, g.explain].concat(g.examples.map(function (e) { return e.ko + ' ' + e.vi; })).join(' ');
        return !t || Core.normLoose(text).indexOf(t) !== -1;
      });
      $('#list', root).innerHTML = list.map(function (g) {
        var ex = g.examples.map(function (e) {
          return '<li>' + esc(e.ko) + (e.vi ? ' <span class="muted">— ' + esc(e.vi) + '</span>' : '') + '</li>';
        }).join('');
        return '<article class="card gram-card"><h3>' + esc(g.pattern) + '</h3>' +
          (g.meaning ? '<div class="meaning">' + esc(g.meaning) + '</div>' : '') +
          (g.explain ? '<p>' + esc(g.explain) + '</p>' : '') +
          (ex ? '<ul>' + ex + '</ul>' : '') +
          '<small class="muted">Ôn gần nhất: ' + esc(reviewText(Core.lastReviewOf(g.id, idx))) + '</small></article>';
      }).join('') || '<p class="muted">Không có kết quả.</p>';
    }
    paint('');
    $('#q', root).addEventListener('input', function (e) { paint(e.target.value); });
  }

  function viewSentences(root) {
    var ds = state.dataset;
    if (!ds.sentences.length) return noDataView(root);
    var idx = Core.reviewIndex(state.data.progress);
    root.innerHTML = pageHead('Câu', scopeLabel() + ' · ' + ds.sentences.length + ' câu') + searchBox('Tìm câu...') + '<div id="list" class="list"></div>';

    function paint(term) {
      var t = Core.normLoose(term);
      var list = ds.sentences.filter(function (s) {
        return !t || Core.normLoose(s.ko + ' ' + s.vi).indexOf(t) !== -1;
      });
      $('#list', root).innerHTML = list.map(function (s, i) {
        return '<article class="card list-item"><div class="idx">' + (i + 1) + '</div><div>' +
          '<div class="ko">' + esc(s.ko) + '</div><div class="vi">' + esc(s.vi) + '</div>' +
          '<small class="muted">Ôn gần nhất: ' + esc(reviewText(Core.lastReviewOf(s.id, idx))) + '</small></div></article>';
      }).join('') || '<p class="muted">Không có kết quả.</p>';
    }
    paint('');
    $('#q', root).addEventListener('input', function (e) { paint(e.target.value); });
  }

  function viewLecture(root) {
    var lessons = activeLessons();
    var sections = lessons.map(function (lesson) {
      var reading = Core.lessonDataset(lesson).lecture;
      if (!reading.length) return '';
      var body = reading.map(function (item) {
        if (item.type === 'heading') return '<h3>' + esc(item.text) + '</h3>';
        if (item.type === 'pair') return '<div class="pair"><span class="ko">' + esc(item.ko) + '</span><span class="vi">' + esc(item.vi) + '</span></div>';
        return '<p>' + esc(item.text) + '</p>';
      }).join('');
      return '<article class="card lecture-body"><h2>' + esc(lesson.name) + '</h2>' + body + '</article>';
    }).join('');

    if (!sections) return noDataView(root);
    root.innerHTML = pageHead('Bài giảng', 'Nội dung bài giảng của từng bài. Các cặp "từ | nghĩa" và "câu | dịch" đã được thêm vào bộ học của bài đó.') + sections;
  }

  // ---------- Khởi động ----------

  function init() {
    state.data = loadState();
    if (inClaude) {
      window.claude.use('downloads').then(function (d) { downloadsRef = d; }).catch(function () {});
      window.claude.use('db').then(function (db) {
        if (!db) return;
        dbRef = db;
        if (currentRoute() === 'lessons') render();
        syncNow(false);
      }).catch(function () {});
    }
    state.scope = loadJSON(STORE_SCOPE, 'all') || 'all';
    refresh();
    window.addEventListener('hashchange', render);
    // Kiểm tra thay đổi từ thiết bị khác mỗi 30 giây khi trang đang hiển thị.
    setInterval(function () {
      if (!document.hidden && (dbRef || syncConfig().url)) syncNow(false);
    }, 30000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) syncNow(false);
    });
    if (!window.location.hash) window.location.hash = '#/home';
    render();
    syncNow(false);
  }

  init();
})();
