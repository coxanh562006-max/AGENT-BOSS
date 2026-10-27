(function () {
  'use strict';

  var Core = window.HanhocCore;
  var SAMPLE = window.HANHOC_SAMPLE;
  // Khi chạy bản gộp một file, tài nguyên được nhúng sẵn trong HANHOC_ASSETS.
  var ASSETS = window.HANHOC_ASSETS || {};
  var LOGO = ASSETS['assets/logo.jpg'] || 'assets/logo.jpg';

  var STORE_SOURCES = 'hanhoc.sources.v1';
  var STORE_PROGRESS = 'hanhoc.progress.v1';
  var CATEGORY_KEYS = ['vocabLines', 'grammarLines', 'koLines', 'viLines', 'lectureLines'];

  var NAV = [
    {
      group: 'Quản lý',
      items: [
        { id: 'home', label: 'Trang chủ', icon: '🏠' },
        { id: 'import', label: 'Nhập dữ liệu', icon: '📥' }
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
      needText: 'Cần có file từ vựng.',
      build: function (ds) { return Core.wordQuestions(ds.vocab); }
    },
    order: {
      title: 'Sắp xếp câu',
      desc: 'Cho câu tiếng Việt, bấm các từ tiếng Hàn đã xáo trộn để ghép lại thành câu đúng.',
      need: function (ds) { return ds.sentences.length > 0; },
      needText: 'Cần có câu tiếng Hàn kèm đáp án tiếng Việt.',
      build: function (ds) { return Core.orderQuestions(ds.sentences); }
    },
    extend: {
      title: 'Ví dụ mở rộng',
      desc: 'Tự viết câu mới dùng từ vựng hoặc mẫu ngữ pháp. Với từ vựng, trang kiểm tra có dùng đúng từ không. Với mẫu ngữ pháp, bạn tự so sánh với ví dụ mẫu.',
      need: function (ds) { return ds.vocab.length + ds.grammar.length > 0; },
      needText: 'Cần có file từ vựng hoặc file ngữ pháp.',
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
      needText: 'Cần có câu tiếng Hàn kèm đáp án tiếng Việt.',
      build: function (ds) { return Core.translationQuestions(ds.sentences); }
    }
  };

  var SLOTS = [
    {
      key: 'vocab', target: 'vocabLines', title: 'Từ vựng', icon: '📘',
      desc: 'Mỗi dòng: từ tiếng Hàn | nghĩa | ví dụ (không bắt buộc) | dịch ví dụ (không bắt buộc).',
      accept: '.txt,.csv,.tsv,.md,.xlsx,.docx'
    },
    {
      key: 'grammar', target: 'grammarLines', title: 'Ngữ pháp', icon: '📐',
      desc: 'Mỗi dòng: mẫu | ý nghĩa | giải thích | ví dụ tiếng Hàn | ví dụ tiếng Việt. Dòng trùng mẫu sẽ được gộp.',
      accept: '.txt,.csv,.tsv,.md,.xlsx,.docx'
    },
    {
      key: 'ko', target: 'koLines', title: 'Câu tiếng Hàn', icon: '💬',
      desc: 'Mỗi dòng một câu. Có thể viết sẵn "câu hàn | câu việt" để ghép cặp ngay trong file.',
      accept: '.txt,.csv,.tsv,.md,.xlsx,.docx'
    },
    {
      key: 'vi', target: 'viLines', title: 'Đáp án dịch (tiếng Việt)', icon: '✅',
      desc: 'Mỗi dòng một câu tiếng Việt, đúng thứ tự với file câu tiếng Hàn.',
      accept: '.txt,.csv,.tsv,.md,.xlsx,.docx'
    },
    {
      key: 'lecture', target: 'lectureLines', title: 'Bài giảng', icon: '📖',
      desc: 'Tiêu đề bắt đầu bằng #. Dòng "từ | nghĩa" được thêm vào từ vựng, dòng "câu hàn | câu việt" được thêm vào câu.',
      accept: '.txt,.md,.docx,.csv,.tsv,.xlsx'
    }
  ];

  var state = {
    sources: null,
    progress: null,
    dataset: null
  };

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
    toastTimer = setTimeout(function () { el.hidden = true; }, 3200);
  }

  function emptySources() {
    var src = { names: {} };
    CATEGORY_KEYS.forEach(function (k) { src[k] = []; });
    return src;
  }

  function hasData(ds) {
    return ds.vocab.length + ds.grammar.length + ds.sentences.length + ds.lecture.length > 0;
  }

  function rebuild() {
    state.dataset = Core.buildDataset(state.sources);
  }

  function persistSources() {
    saveJSON(STORE_SOURCES, state.sources);
    rebuild();
  }

  function getProgress(id) {
    return state.progress[id] || { ok: 0, bad: 0, known: false };
  }

  function bump(id, ok) {
    var p = getProgress(id);
    if (ok) p.ok++; else p.bad++;
    p.last = Date.now();
    state.progress[id] = p;
    saveJSON(STORE_PROGRESS, state.progress);
  }

  function setKnown(id, known) {
    var p = getProgress(id);
    p.known = known;
    p.last = Date.now();
    state.progress[id] = p;
    saveJSON(STORE_PROGRESS, state.progress);
  }

  function totals() {
    var t = { ok: 0, bad: 0, known: 0 };
    Object.keys(state.progress).forEach(function (id) {
      var p = state.progress[id];
      t.ok += p.ok || 0;
      t.bad += p.bad || 0;
      if (id.indexOf('card:') === 0 && p.known) t.known++;
    });
    return t;
  }

  function emptyState(icon, title, text, linkHref, linkText) {
    return '' +
      '<div class="card empty">' +
        '<div class="big-icon">' + icon + '</div>' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + esc(text) + '</p>' +
        (linkHref ? '<a class="btn primary" href="' + linkHref + '">' + esc(linkText) + '</a>' : '') +
      '</div>';
  }

  function pageHead(title, desc) {
    return '<header class="page-head"><h1>' + esc(title) + '</h1>' +
      (desc ? '<p>' + esc(desc) + '</p>' : '') + '</header>';
  }

  function noDataView(root) {
    root.innerHTML = pageHead('Chưa có dữ liệu') +
      emptyState('📥', 'Hãy nạp file của bạn trước', 'Tải file bài giảng, từ vựng, ngữ pháp và câu để trang tự tạo flashcard và bài tập.', '#/import', 'Đi tới Nhập dữ liệu');
  }

  // ---------- Đọc file ----------

  var scriptPromises = {};
  function loadScript(src) {
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

  function readFileLines(file) {
    var ext = extOf(file.name);
    if (ext === 'xlsx' || ext === 'xlsm') return readXlsx(file);
    if (ext === 'docx') return readDocx(file);
    if (ext === 'pdf') return Promise.reject(new Error('Chưa đọc được PDF. Hãy xuất file ra .docx hoặc .txt rồi nạp lại.'));
    if (ext === 'doc' || ext === 'xls') return Promise.reject(new Error('Hãy lưu file thành .docx hoặc .xlsx rồi nạp lại.'));
    return file.text().then(function (text) {
      text = text.replace(/^﻿/, '');
      if (ext === 'csv') return rowsToLines(Core.parseCsv(text));
      return text.split(/\r?\n/).map(Core.clean).filter(Boolean);
    });
  }

  // ---------- Điều hướng ----------

  function renderNav(activeId) {
    var html = '';
    NAV.forEach(function (group) {
      html += '<div class="nav-group">' + esc(group.group) + '</div>';
      group.items.forEach(function (item) {
        html += '<a class="nav-link' + (item.id === activeId ? ' active' : '') + '" href="#/' + item.id + '"' +
          (item.id === activeId ? ' aria-current="page"' : '') + '>' +
          '<span class="nav-icon">' + item.icon + '</span>' + esc(item.label) + '</a>';
      });
    });
    $('#nav').innerHTML = html;

    var ds = state.dataset;
    $('#sideFoot').innerHTML =
      '<div>📘 ' + ds.vocab.length + ' từ vựng</div>' +
      '<div>📐 ' + ds.grammar.length + ' mẫu ngữ pháp</div>' +
      '<div>💬 ' + ds.sentences.length + ' câu</div>';
  }

  var VIEWS = {
    home: viewHome,
    import: viewImport,
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
    renderNav(id);
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

    var warnings = ds.warnings.map(function (w) { return '<div class="notice">' + esc(w) + '</div>'; }).join('');

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
    if (!hasData(ds)) {
      body = emptyState('🌱', 'Chưa có dữ liệu học', 'Nạp file bài giảng, từ vựng, ngữ pháp và câu của bạn để bắt đầu. Hoặc dùng dữ liệu mẫu để thử trước.', '#/import', 'Nhập dữ liệu');
    } else {
      body = '' +
        '<section class="section grid grid-stats">' +
          '<div class="card stat"><div class="num">' + ds.vocab.length + '</div><div class="label">Từ vựng</div></div>' +
          '<div class="card stat"><div class="num">' + ds.grammar.length + '</div><div class="label">Mẫu ngữ pháp</div></div>' +
          '<div class="card stat"><div class="num">' + ds.sentences.length + '</div><div class="label">Câu</div></div>' +
          '<div class="card stat"><div class="num">' + t.known + '</div><div class="label">Thẻ đã thuộc</div></div>' +
          '<div class="card stat"><div class="num">' + pct + '%</div><div class="label">Đúng trong bài tập (' + (t.ok + t.bad) + ' lượt)</div></div>' +
        '</section>' +
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

  // ---------- Nhập dữ liệu ----------

  function slotStatus(slot) {
    var lines = state.sources[slot.target] || [];
    if (!lines.length) return { text: 'Chưa có file', loaded: false };
    var name = state.sources.names[slot.key] || 'Đã nạp';
    var detail;
    if (slot.key === 'vocab') {
      var v = Core.parseVocab(lines);
      detail = v.items.length + ' từ' + (v.skipped ? ' · bỏ qua ' + v.skipped + ' dòng không hợp lệ' : '');
    } else if (slot.key === 'grammar') {
      var g = Core.parseGrammar(lines);
      detail = g.items.length + ' mẫu' + (g.skipped ? ' · bỏ qua ' + g.skipped + ' dòng không hợp lệ' : '');
    } else if (slot.key === 'ko') {
      var koCount = lines.filter(Core.hasHangul).length;
      detail = koCount + ' dòng có tiếng Hàn';
    } else if (slot.key === 'vi') {
      detail = lines.length + ' dòng';
    } else {
      var reading = Core.parseLecture(lines).reading.length;
      detail = reading + ' dòng nội dung';
    }
    return { text: name + ' · ' + detail, loaded: true };
  }

  function viewImport(root) {
    var slotsHtml = SLOTS.map(function (slot) {
      var st = slotStatus(slot);
      return '' +
        '<section class="card slot" data-slot="' + slot.key + '">' +
          '<div class="slot-head"><h3>' + slot.icon + ' ' + esc(slot.title) + '</h3>' +
          (st.loaded ? '<button class="btn small ghost" data-clear="' + slot.key + '">Xoá</button>' : '') + '</div>' +
          '<p>' + esc(slot.desc) + '</p>' +
          '<input class="file-input" type="file" accept="' + slot.accept + '" data-file="' + slot.key + '">' +
          '<div class="status' + (st.loaded ? ' loaded' : '') + '">' + esc(st.text) + '</div>' +
        '</section>';
    }).join('');

    var warnings = state.dataset.warnings.map(function (w) { return '<div class="notice">' + esc(w) + '</div>'; }).join('');

    root.innerHTML = pageHead('Nhập dữ liệu',
      'Nạp file của bạn, trang tự cập nhật flashcard và bài tập. Hỗ trợ .txt, .csv, .tsv, .md, .docx, .xlsx. Dữ liệu được lưu trên trình duyệt này.') +
      '<div class="row end" style="margin-bottom:1rem">' +
        '<button class="btn soft" id="loadSample">Nạp dữ liệu mẫu</button>' +
        '<button class="btn ghost" id="exportBackup">Lưu bản sao (.json)</button>' +
        '<label class="btn ghost" style="cursor:pointer">Mở bản sao<input type="file" id="restoreFile" accept=".json,application/json" hidden></label>' +
        '<button class="btn danger" id="clearAll">Xoá tất cả</button>' +
      '</div>' +
      warnings +
      '<div class="grid grid-slots">' + slotsHtml + '</div>' +
      '<details class="guide card" style="margin-top:1.25rem">' +
        '<summary>Mẹo định dạng file</summary>' +
        '<ul>' +
          '<li>Dùng dấu <code>|</code> hoặc phím Tab để tách cột. File Excel và Word dạng bảng được đọc tự động.</li>' +
          '<li>Dòng tiêu đề (ví dụ "Từ tiếng Hàn | Nghĩa") được bỏ qua tự động.</li>' +
          '<li>Số thứ tự đầu dòng như "1." hoặc "2)" được bỏ đi khi ghép câu.</li>' +
          '<li>Câu tiếng Hàn và đáp án tiếng Việt được ghép theo thứ tự dòng. Nếu muốn chắc chắn, hãy viết "câu hàn | câu việt" trên cùng một dòng.</li>' +
          '<li>File PDF chưa được hỗ trợ. Hãy xuất ra .docx hoặc .txt.</li>' +
        '</ul>' +
      '</details>';

    $all('input[data-file]', root).forEach(function (input) {
      input.addEventListener('change', function () {
        var slot = SLOTS.filter(function (s) { return s.key === input.getAttribute('data-file'); })[0];
        var file = input.files && input.files[0];
        if (file) onFile(slot, file);
        input.value = '';
      });
    });
    $all('[data-clear]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slot = SLOTS.filter(function (s) { return s.key === btn.getAttribute('data-clear'); })[0];
        state.sources[slot.target] = [];
        delete state.sources.names[slot.key];
        persistSources();
        render();
      });
    });
    $('#loadSample', root).addEventListener('click', function () {
      state.sources = emptySources();
      CATEGORY_KEYS.forEach(function (k) { state.sources[k] = SAMPLE[k].slice(); });
      state.sources.names = { vocab: 'Mẫu', grammar: 'Mẫu', ko: 'Mẫu', vi: 'Mẫu', lecture: 'Mẫu' };
      persistSources();
      toast('Đã nạp dữ liệu mẫu.');
      render();
    });
    $('#exportBackup', root).addEventListener('click', exportBackup);
    $('#restoreFile', root).addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) restoreBackup(file);
      e.target.value = '';
    });
    $('#clearAll', root).addEventListener('click', function () {
      if (!window.confirm('Xoá toàn bộ file đã nạp? Tiến độ học vẫn được giữ.')) return;
      state.sources = emptySources();
      persistSources();
      toast('Đã xoá dữ liệu.');
      render();
    });
  }

  function onFile(slot, file) {
    readFileLines(file).then(function (lines) {
      if (!lines.length) throw new Error('File không có nội dung đọc được.');
      state.sources[slot.target] = lines;
      state.sources.names[slot.key] = file.name;
      persistSources();
      toast('Đã nạp ' + file.name + ' (' + lines.length + ' dòng).');
      render();
    }).catch(function (err) {
      toast(err && err.message ? err.message : 'Không đọc được file.');
    });
  }

  // ---------- Sao lưu ----------

  function exportBackup() {
    var payload = { app: 'hanhoc', version: 1, sources: state.sources, progress: state.progress };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'hoc-han-ngu-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Đã tải file sao lưu về máy.');
  }

  function restoreBackup(file) {
    file.text().then(function (text) {
      var data = JSON.parse(text);
      if (!data || data.app !== 'hanhoc' || !data.sources) {
        throw new Error('File này không phải bản sao lưu của Học Hàn Ngữ.');
      }
      state.sources = Object.assign(emptySources(), data.sources);
      state.progress = data.progress || {};
      saveJSON(STORE_PROGRESS, state.progress);
      persistSources();
      toast('Đã khôi phục dữ liệu từ bản sao.');
      render();
    }).catch(function (err) {
      toast(err && err.message ? err.message : 'Không mở được file sao lưu.');
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
        root.innerHTML = pageHead('Flashcard') + emptyState('🗂️', 'Không có thẻ nào', 'Hãy nạp thêm dữ liệu tương ứng với loại thẻ đã chọn.', '#/import', 'Nhập dữ liệu');
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
      root.innerHTML = pageHead('Flashcard', 'Bấm vào thẻ để lật. Chọn "Đã thuộc" để bỏ thẻ khỏi lượt này, "Chưa thuộc" để ôn lại sau.') +
        filterBar(stats) +
        '<div class="flip-stage">' +
          '<div class="fcard' + (session.flipped ? ' is-flipped' : '') + '" id="fcard" role="button" tabindex="0" aria-label="Lật thẻ">' +
            '<div class="face front card"><span class="badge">' + esc(card.label) + '</span>' +
              '<div class="front-text">' + esc(card.front) + '</div>' +
              '<div class="hint">Bấm để xem nghĩa</div></div>' +
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
      root.innerHTML = pageHead(ex.title, ex.desc) + emptyState('📭', 'Chưa đủ dữ liệu', ex.needText, '#/import', 'Nhập dữ liệu');
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

  function searchBox(id, placeholder) {
    return '<div class="row" style="margin-bottom:1rem">' +
      '<input class="input search" id="' + id + '" type="search" placeholder="' + esc(placeholder) + '"></div>';
  }

  function viewVocab(root) {
    var ds = state.dataset;
    if (!ds.vocab.length) return noDataView(root);
    root.innerHTML = pageHead('Từ vựng', ds.vocab.length + ' từ') + searchBox('q', 'Tìm từ, nghĩa hoặc ví dụ...') +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th></tr></thead><tbody id="rows"></tbody></table></div>';

    function paint(term) {
      var t = Core.normLoose(term);
      var list = ds.vocab.filter(function (v) {
        return !t || Core.normLoose([v.ko, v.vi, v.exKo, v.exVi].join(' ')).indexOf(t) !== -1;
      });
      $('#rows', root).innerHTML = list.map(function (v) {
        var ex = v.exKo ? esc(v.exKo) + (v.exVi ? '<br><small>' + esc(v.exVi) + '</small>' : '') : '<span class="muted">—</span>';
        return '<tr><td class="ko">' + esc(v.ko) + '</td><td>' + esc(v.vi) + '</td><td>' + ex + '</td></tr>';
      }).join('') || '<tr><td colspan="3" class="muted">Không có kết quả.</td></tr>';
    }
    paint('');
    $('#q', root).addEventListener('input', function (e) { paint(e.target.value); });
  }

  function viewGrammar(root) {
    var ds = state.dataset;
    if (!ds.grammar.length) return noDataView(root);
    root.innerHTML = pageHead('Ngữ pháp', ds.grammar.length + ' mẫu') + searchBox('q', 'Tìm mẫu hoặc nghĩa...') + '<div id="list" class="grid" style="grid-template-columns:1fr"></div>';

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
          (ex ? '<ul>' + ex + '</ul>' : '') + '</article>';
      }).join('') || '<p class="muted">Không có kết quả.</p>';
    }
    paint('');
    $('#q', root).addEventListener('input', function (e) { paint(e.target.value); });
  }

  function viewSentences(root) {
    var ds = state.dataset;
    if (!ds.sentences.length) return noDataView(root);
    root.innerHTML = pageHead('Câu', ds.sentences.length + ' câu') + searchBox('q', 'Tìm câu...') + '<div id="list" class="list"></div>';

    function paint(term) {
      var t = Core.normLoose(term);
      var list = ds.sentences.filter(function (s) {
        return !t || Core.normLoose(s.ko + ' ' + s.vi).indexOf(t) !== -1;
      });
      $('#list', root).innerHTML = list.map(function (s, i) {
        return '<article class="card list-item"><div class="idx">' + (i + 1) + '</div><div>' +
          '<div class="ko">' + esc(s.ko) + '</div><div class="vi">' + esc(s.vi) + '</div></div></article>';
      }).join('') || '<p class="muted">Không có kết quả.</p>';
    }
    paint('');
    $('#q', root).addEventListener('input', function (e) { paint(e.target.value); });
  }

  function viewLecture(root) {
    var ds = state.dataset;
    var reading = ds.lecture;
    if (!reading.length) return noDataView(root);
    var body = reading.map(function (item) {
      if (item.type === 'heading') return '<h3>' + esc(item.text) + '</h3>';
      if (item.type === 'pair') return '<div class="pair"><span class="ko">' + esc(item.ko) + '</span><span class="vi">' + esc(item.vi) + '</span></div>';
      return '<p>' + esc(item.text) + '</p>';
    }).join('');
    root.innerHTML = pageHead('Bài giảng', 'Nội dung bài giảng. Các cặp "từ | nghĩa" và "câu | dịch" đã được thêm vào bộ học.') +
      '<article class="card lecture-body">' + body + '</article>';
  }

  // ---------- Khởi động ----------

  function init() {
    state.sources = Object.assign(emptySources(), loadJSON(STORE_SOURCES, null) || {});
    state.progress = loadJSON(STORE_PROGRESS, {}) || {};
    rebuild();
    window.addEventListener('hashchange', render);
    if (!window.location.hash) window.location.hash = '#/home';
    render();
  }

  init();
})();
