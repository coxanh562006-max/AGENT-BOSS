/*
 * Lõi xử lý: đọc dòng dữ liệu, ghép cặp câu, sinh bài tập.
 * Không phụ thuộc DOM nên có thể chạy được trong Node để kiểm thử.
 */
(function (root) {
  'use strict';

  var HANGUL_RE = /[ᄀ-ᇿ㄰-㆏가-힯]/;
  var NUMBERING_RE = /^\s*\d+\s*[.)]\s*/;

  function hasHangul(text) {
    return HANGUL_RE.test(text || '');
  }

  function clean(text) {
    return String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  }

  function stripNumbering(text) {
    return clean(text).replace(NUMBERING_RE, '');
  }

  // FNV-1a: mã ổn định cho cùng một nội dung, để tiến độ học không mất khi nạp lại file.
  function hash(text) {
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }

  function makeId(prefix, text) {
    return prefix + ':' + hash(text);
  }

  // Tách một dòng theo tab hoặc dấu |. Trả về null nếu không có dấu phân cách.
  function splitCells(line) {
    if (line.indexOf('\t') !== -1) return line.split('\t').map(clean);
    if (line.indexOf('|') !== -1) return line.split('|').map(clean);
    return null;
  }

  function linesToRows(lines) {
    return lines.map(function (line) {
      return splitCells(line) || [clean(line)];
    });
  }

  // Trình đọc CSV có hỗ trợ dấu ngoặc kép và dấu " lặp lại.
  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          cell += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += c;
      }
    }
    row.push(cell);
    rows.push(row);
    return rows
      .map(function (r) { return r.map(clean); })
      .filter(function (r) { return r.some(Boolean); });
  }

  function cleanLines(lines) {
    return (lines || []).map(clean).filter(Boolean);
  }

  // Dòng tiêu đề: dòng đầu tiên không có chữ Hàn ở cột đầu.
  function isHeader(index, cells) {
    return index === 0 && !hasHangul(cells[0]);
  }

  function makeVocabItem(ko, vi, exKo, exVi) {
    return { id: makeId('v', ko), ko: ko, vi: vi, exKo: exKo || '', exVi: exVi || '' };
  }

  // Cột: Từ tiếng Hàn | Nghĩa | Ví dụ tiếng Hàn (không bắt buộc) | Dịch ví dụ (không bắt buộc)
  function parseVocab(lines) {
    var items = [];
    var seen = {};
    var skipped = 0;
    linesToRows(cleanLines(lines)).forEach(function (cells, index) {
      var ko = stripNumbering(cells[0]);
      var vi = cells[1] || '';
      if (isHeader(index, cells)) return;
      if (!hasHangul(ko) || !vi) {
        skipped++;
        return;
      }
      if (seen[ko]) return;
      seen[ko] = true;
      items.push(makeVocabItem(ko, vi, cells[2], cells[3]));
    });
    return { items: items, skipped: skipped };
  }

  // Cột: Mẫu | Ý nghĩa | Giải thích | Ví dụ tiếng Hàn | Ví dụ tiếng Việt
  // Nhiều dòng cùng một mẫu sẽ được gộp thành một mẫu có nhiều ví dụ.
  function parseGrammar(lines) {
    var map = {};
    var order = [];
    var skipped = 0;
    linesToRows(cleanLines(lines)).forEach(function (cells, index) {
      var pattern = cells[0] || '';
      if (isHeader(index, cells)) return;
      if (!hasHangul(pattern)) {
        skipped++;
        return;
      }
      if (!map[pattern]) {
        map[pattern] = {
          id: makeId('g', pattern),
          pattern: pattern,
          meaning: cells[1] || '',
          explain: cells[2] || '',
          examples: []
        };
        order.push(pattern);
      }
      var item = map[pattern];
      if (!item.meaning && cells[1]) item.meaning = cells[1];
      if (!item.explain && cells[2]) item.explain = cells[2];
      if (cells[3]) item.examples.push({ ko: cells[3], vi: cells[4] || '' });
    });
    return {
      items: order.map(function (p) { return map[p]; }),
      skipped: skipped
    };
  }

  function makeSentence(ko, vi) {
    return { id: makeId('s', ko), ko: ko, vi: vi };
  }

  // Ghép câu tiếng Hàn với câu tiếng Việt (đáp án).
  // - Dòng có dạng "câu hàn | câu việt" được ghép trực tiếp.
  // - Các dòng còn lại ghép theo thứ tự dòng với file tiếng Việt.
  function buildSentencePairs(koLines, viLines) {
    var pairs = [];
    var warnings = [];
    var plainKo = [];
    cleanLines(koLines).forEach(function (line) {
      var cells = splitCells(line);
      if (cells && cells.length >= 2 && hasHangul(stripNumbering(cells[0])) && cells[1]) {
        pairs.push(makeSentence(stripNumbering(cells[0]), cells[1]));
      } else {
        var ko = stripNumbering(line);
        if (hasHangul(ko)) plainKo.push(ko);
      }
    });
    var viList = cleanLines(viLines).map(stripNumbering).filter(Boolean);
    if (plainKo.length !== viList.length && plainKo.length && viList.length) {
      warnings.push(
        'Số câu tiếng Hàn (' + plainKo.length + ') khác số câu tiếng Việt (' +
        viList.length + '). Chỉ ghép ' + Math.min(plainKo.length, viList.length) + ' cặp đầu tiên.'
      );
    }
    if (plainKo.length && !viList.length) {
      warnings.push('Có ' + plainKo.length + ' câu tiếng Hàn nhưng chưa có file đáp án tiếng Việt.');
    }
    var count = Math.min(plainKo.length, viList.length);
    for (var i = 0; i < count; i++) {
      pairs.push(makeSentence(plainKo[i], viList[i]));
    }
    return { pairs: pairs, warnings: warnings };
  }

  // Bài giảng: tiêu đề bắt đầu bằng #, cặp "a | b" được tự động thêm vào từ vựng hoặc câu.
  // Cặp có khoảng trắng ở vế tiếng Hàn là câu, cặp không có khoảng trắng là từ.
  function parseLecture(lines) {
    var reading = [];
    var vocab = [];
    var sentences = [];
    cleanLines(lines).forEach(function (line) {
      if (line.charAt(0) === '#') {
        reading.push({ type: 'heading', text: clean(line.replace(/^#+/, '')) });
        return;
      }
      var cells = splitCells(line);
      if (cells && cells.length >= 2 && hasHangul(stripNumbering(cells[0])) && cells[1]) {
        var ko = stripNumbering(cells[0]);
        if (ko.indexOf(' ') !== -1) {
          sentences.push(makeSentence(ko, cells[1]));
        } else {
          vocab.push(makeVocabItem(ko, cells[1]));
        }
        reading.push({ type: 'pair', ko: ko, vi: cells[1] });
      } else {
        reading.push({ type: 'text', text: line });
      }
    });
    return { reading: reading, vocab: vocab, sentences: sentences };
  }

  function dedupeBy(list, keyFn) {
    var seen = {};
    return list.filter(function (item) {
      var key = keyFn(item);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  // src: { vocabLines, grammarLines, koLines, viLines, lectureLines }
  function buildDataset(src) {
    src = src || {};
    var vocabRes = parseVocab(src.vocabLines || []);
    var grammarRes = parseGrammar(src.grammarLines || []);
    var sentenceRes = buildSentencePairs(src.koLines || [], src.viLines || []);
    var lecture = parseLecture(src.lectureLines || []);

    var vocab = dedupeBy(vocabRes.items.concat(lecture.vocab), function (v) { return v.ko; });
    var sentences = dedupeBy(sentenceRes.pairs.concat(lecture.sentences), function (s) { return s.ko; });
    var grammar = grammarRes.items;

    return {
      vocab: vocab,
      grammar: grammar,
      sentences: sentences,
      lecture: lecture.reading,
      warnings: sentenceRes.warnings,
      skipped: { vocab: vocabRes.skipped, grammar: grammarRes.skipped }
    };
  }

  // ---------- Chuẩn hoá và so sánh ----------

  function normLoose(text) {
    return clean(text)
      .toLowerCase()
      .replace(/[.,!?;:"'“”‘’()\[\]~\-…·]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normNoSpace(text) {
    return normLoose(text).replace(/ /g, '');
  }

  // Độ giống nhau theo bigram (Dice), từ 0 đến 1.
  function similarity(a, b) {
    a = normNoSpace(a);
    b = normNoSpace(b);
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    var A = bigrams(a);
    var B = bigrams(b);
    var inter = 0;
    Object.keys(A).forEach(function (g) {
      if (B[g]) inter += Math.min(A[g], B[g]);
    });
    return (2 * inter) / ((a.length - 1) + (b.length - 1));
  }

  function bigrams(s) {
    var map = {};
    for (var i = 0; i < s.length - 1; i++) {
      var g = s.slice(i, i + 2);
      map[g] = (map[g] || 0) + 1;
    }
    return map;
  }

  function checkWord(input, answer) {
    var ok = normNoSpace(input) !== '' && normNoSpace(input) === normNoSpace(answer);
    return { ok: ok, text: ok ? 'Chính xác!' : 'Chưa đúng.' };
  }

  function checkTranslation(input, answer) {
    var sim = similarity(input, answer);
    if (!normNoSpace(input)) return { ok: false, text: 'Bạn chưa nhập đáp án.' };
    if (sim === 1) return { ok: true, text: 'Chính xác!' };
    if (sim >= 0.85) return { ok: true, text: 'Gần đúng, xem đáp án để so sánh thêm.' };
    if (sim >= 0.5) return { ok: false, text: 'Mới đúng một phần, xem đáp án bên dưới.' };
    return { ok: false, text: 'Chưa đúng, xem đáp án bên dưới.' };
  }

  function tokensOf(sentence) {
    return clean(sentence).replace(/[.!?。]+$/, '').split(' ').filter(Boolean);
  }

  function checkOrder(tokens, answerTokens) {
    var ok = tokens.length === answerTokens.length &&
      tokens.every(function (t, i) { return t === answerTokens[i]; });
    return { ok: ok, text: ok ? 'Chính xác!' : 'Thứ tự chưa đúng.' };
  }

  // Gốc của động/tính từ: bỏ đuôi 다 để chấp nhận mọi dạng chia.
  function verbStem(ko) {
    return ko.length > 1 && ko.slice(-1) === '다' ? ko.slice(0, -1) : ko;
  }

  function checkExtension(input, stem) {
    if (!hasHangul(input)) return { ok: false, text: 'Hãy viết câu bằng tiếng Hàn.' };
    if (stem && normNoSpace(input).indexOf(normNoSpace(stem)) === -1) {
      return { ok: false, text: 'Câu chưa dùng từ "' + stem + '".' };
    }
    return { ok: true, text: 'Câu có dùng đúng từ. So sánh thêm với ví dụ mẫu.' };
  }

  // ---------- Sinh thẻ và câu hỏi ----------

  function flashcards(dataset, filter) {
    var cards = [];
    if (filter === 'all' || filter === 'vocab') {
      dataset.vocab.forEach(function (v) {
        cards.push({
          id: 'card:' + v.id, kind: 'vocab', label: 'Từ vựng',
          front: v.ko, back: [v.vi].concat(v.exKo ? ['Ví dụ: ' + v.exKo + (v.exVi ? ' — ' + v.exVi : '')] : [])
        });
      });
    }
    if (filter === 'all' || filter === 'grammar') {
      dataset.grammar.forEach(function (g) {
        cards.push({
          id: 'card:' + g.id, kind: 'grammar', label: 'Ngữ pháp',
          front: g.pattern,
          back: [g.meaning, g.explain].concat(g.examples.map(function (e) {
            return e.ko + (e.vi ? ' — ' + e.vi : '');
          })).filter(Boolean)
        });
      });
    }
    if (filter === 'all' || filter === 'sentence') {
      dataset.sentences.forEach(function (s) {
        cards.push({ id: 'card:' + s.id, kind: 'sentence', label: 'Câu', front: s.ko, back: [s.vi] });
      });
    }
    return cards;
  }

  function wordQuestions(vocab) {
    return vocab.map(function (v) {
      return {
        id: 'word:' + v.id,
        mode: 'word',
        kind: 'text',
        promptLabel: 'Viết từ tiếng Hàn có nghĩa:',
        prompt: v.vi,
        answer: v.ko,
        detail: v.exKo ? ['Ví dụ: ' + v.exKo + (v.exVi ? ' — ' + v.exVi : '')] : [],
        check: function (input) { return checkWord(input, v.ko); }
      };
    });
  }

  function orderQuestions(sentences) {
    return sentences
      .filter(function (s) { return tokensOf(s.ko).length >= 2; })
      .map(function (s) {
        var answerTokens = tokensOf(s.ko);
        return {
          id: 'order:' + s.id,
          mode: 'order',
          kind: 'order',
          promptLabel: 'Sắp xếp các từ thành câu tiếng Hàn:',
          prompt: s.vi,
          answer: s.ko,
          tokens: shuffle(answerTokens),
          detail: [],
          check: function (input) { return checkOrder(input, answerTokens); }
        };
      });
  }

  function extensionQuestions(vocab, grammar) {
    var list = vocab.map(function (v) {
      var stem = verbStem(v.ko);
      return {
        id: 'ext:' + v.id,
        mode: 'extend',
        kind: 'text',
        promptLabel: 'Viết 1 câu tiếng Hàn dùng từ:',
        prompt: v.ko + ' (' + v.vi + ')',
        answer: v.exKo || '',
        detail: v.exKo ? ['Ví dụ mẫu: ' + v.exKo + (v.exVi ? ' — ' + v.exVi : '')] : [],
        check: function (input) { return checkExtension(input, stem); }
      };
    });
    grammar.forEach(function (g) {
      list.push({
        id: 'ext:' + g.id,
        mode: 'extend',
        kind: 'self',
        promptLabel: 'Viết 1 câu tiếng Hàn dùng mẫu:',
        prompt: g.pattern + ' — ' + g.meaning,
        answer: '',
        detail: g.examples.map(function (e) { return 'Ví dụ: ' + e.ko + (e.vi ? ' — ' + e.vi : ''); })
      });
    });
    return list;
  }

  // Trắc nghiệm ABCD: chọn đáp án đúng trong các phương án cùng loại.
  function choiceQuestions(dataset) {
    var qs = [];
    function addChoice(id, label, prompt, answer, pool) {
      var others = pool.filter(function (x) { return x !== answer; });
      var distractors = shuffle(others).slice(0, 3);
      if (distractors.length < 1) return;
      var options = shuffle([answer].concat(distractors));
      var answerIndex = options.indexOf(answer);
      qs.push({
        id: id,
        mode: 'choice',
        kind: 'choice',
        promptLabel: label,
        prompt: prompt,
        options: options,
        answer: answer,
        detail: [],
        check: function (index) {
          var ok = index === answerIndex;
          return { ok: ok, text: ok ? 'Chính xác!' : 'Đáp án đúng là: ' + answer };
        }
      });
    }
    var viWords = dataset.vocab.map(function (v) { return v.vi; });
    var koWords = dataset.vocab.map(function (v) { return v.ko; });
    dataset.vocab.forEach(function (v) {
      addChoice('mcq-vi:' + v.id, 'Từ này có nghĩa là gì?', v.ko, v.vi, viWords);
      addChoice('mcq-ko:' + v.id, 'Từ tiếng Hàn nào có nghĩa là:', v.vi, v.ko, koWords);
    });
    var koSentences = dataset.sentences.map(function (s) { return s.ko; });
    var viSentences = dataset.sentences.map(function (s) { return s.vi; });
    dataset.sentences.forEach(function (s) {
      addChoice('mcq-sen:' + s.id, 'Câu này có nghĩa là gì?', s.ko, s.vi, viSentences);
      addChoice('mcq-sen-ko:' + s.id, 'Câu tiếng Hàn nào có nghĩa là:', s.vi, s.ko, koSentences);
    });
    var meanings = dataset.grammar.map(function (g) { return g.meaning; }).filter(Boolean);
    dataset.grammar.forEach(function (g) {
      if (g.meaning) addChoice('mcq-g:' + g.id, 'Mẫu ngữ pháp này có nghĩa là gì?', g.pattern, g.meaning, meanings);
    });
    return qs;
  }

  // Dịch hai chiều dựa trên đáp án đã cho.
  function translationQuestions(sentences) {
    var qs = [];
    sentences.forEach(function (s) {
      qs.push({
        id: 'tr-ko:' + s.id,
        mode: 'translate',
        kind: 'text',
        promptLabel: 'Dịch sang tiếng Việt:',
        prompt: s.ko,
        answer: s.vi,
        detail: [],
        check: function (input) { return checkTranslation(input, s.vi); }
      });
      qs.push({
        id: 'tr-vi:' + s.id,
        mode: 'translate',
        kind: 'text',
        promptLabel: 'Dịch sang tiếng Hàn:',
        prompt: s.vi,
        answer: s.ko,
        detail: [],
        check: function (input) { return checkTranslation(input, s.ko); }
      });
    });
    return qs;
  }

  function shuffle(list, rand) {
    var r = rand || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // ---------- Bài học, tệp, đồng bộ ----------

  var KINDS = [
    { kind: 'lecture', key: 'lectureLines', label: 'Bài giảng' },
    { kind: 'vocab', key: 'vocabLines', label: 'Từ vựng' },
    { kind: 'grammar', key: 'grammarLines', label: 'Ngữ pháp' },
    { kind: 'ko', key: 'koLines', label: 'Câu tiếng Hàn' },
    { kind: 'vi', key: 'viLines', label: 'Đáp án tiếng Việt' }
  ];

  function kindInfo(kind) {
    return KINDS.filter(function (k) { return k.kind === kind; })[0] || null;
  }

  function newId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Trạng thái đầy đủ: danh sách bài, các mục đã xoá (để đồng bộ không khôi phục lại), tiến độ.
  function emptyState() {
    return { updatedAt: 0, lessons: [], deleted: { lessons: {}, files: {} }, progress: {} };
  }

  function lessonDataset(lesson) {
    var src = {};
    KINDS.forEach(function (k) { src[k.key] = []; });
    (lesson.files || []).forEach(function (f) {
      var info = kindInfo(f.kind);
      if (info) src[info.key] = src[info.key].concat(f.lines || []);
    });
    return buildDataset(src);
  }

  // Ghép dữ liệu của nhiều bài. Mỗi bài được đọc riêng để cặp câu Hàn–Việt không bị lệch.
  function scopeDataset(lessons) {
    var out = { vocab: [], grammar: [], sentences: [], lecture: [], warnings: [], skipped: { vocab: 0, grammar: 0 } };
    lessons.forEach(function (lesson) {
      var ds = lessonDataset(lesson);
      out.vocab = out.vocab.concat(ds.vocab);
      out.grammar = out.grammar.concat(ds.grammar);
      out.sentences = out.sentences.concat(ds.sentences);
      out.lecture = out.lecture.concat(ds.lecture);
      out.warnings = out.warnings.concat(ds.warnings);
      out.skipped.vocab += ds.skipped.vocab;
      out.skipped.grammar += ds.skipped.grammar;
    });
    out.vocab = dedupeBy(out.vocab, function (v) { return v.ko; });
    out.grammar = dedupeBy(out.grammar, function (g) { return g.pattern; });
    out.sentences = dedupeBy(out.sentences, function (s) { return s.ko; });
    return out;
  }

  function mergeMaxMap(x, y) {
    var out = {};
    Object.keys(x || {}).forEach(function (k) { out[k] = x[k]; });
    Object.keys(y || {}).forEach(function (k) { out[k] = Math.max(out[k] || 0, y[k]); });
    return out;
  }

  function mergeProgressRecord(p, q) {
    if (!p) return q;
    if (!q) return p;
    var newer = (q.last || 0) > (p.last || 0) ? q : p;
    return {
      ok: Math.max(p.ok || 0, q.ok || 0),
      bad: Math.max(p.bad || 0, q.bad || 0),
      known: newer.known,
      last: Math.max(p.last || 0, q.last || 0)
    };
  }

  // Gộp hai trạng thái (ví dụ: dữ liệu trên máy tính và trên điện thoại).
  // - Bài và file: hợp lại theo id. Mục đã xoá ở một bên sẽ bị xoá ở cả hai bên.
  // - Tiến độ: mỗi mục lấy bản ghi có lần ôn gần nhất mới hơn.
  function mergeStates(a, b) {
    a = a || emptyState();
    b = b || emptyState();
    var deleted = {
      lessons: mergeMaxMap(a.deleted && a.deleted.lessons, b.deleted && b.deleted.lessons),
      files: mergeMaxMap(a.deleted && a.deleted.files, b.deleted && b.deleted.files)
    };

    var byId = {};
    var order = [];
    [a.lessons || [], b.lessons || []].forEach(function (list) {
      list.forEach(function (lesson) {
        var cur = byId[lesson.id];
        if (!cur) {
          byId[lesson.id] = {
            id: lesson.id, name: lesson.name, createdAt: lesson.createdAt,
            updatedAt: lesson.updatedAt || 0, files: (lesson.files || []).slice()
          };
          order.push(lesson.id);
          return;
        }
        // File có mặt ở cả hai bên: lấy bản của bài mới hơn (ví dụ vừa đổi mục).
        var newer = (lesson.updatedAt || 0) > cur.updatedAt ? lesson : cur;
        var older = newer === lesson ? cur : lesson;
        var seen = {};
        var merged = [];
        (newer.files || []).forEach(function (f) { seen[f.id] = true; merged.push(f); });
        (older.files || []).forEach(function (f) {
          if (!seen[f.id]) { seen[f.id] = true; merged.push(f); }
        });
        cur.files = merged;
        cur.name = newer.name;
        cur.createdAt = Math.min(cur.createdAt || Infinity, lesson.createdAt || Infinity);
        cur.updatedAt = Math.max(cur.updatedAt, lesson.updatedAt || 0);
      });
    });

    var lessons = order
      .filter(function (id) { return !deleted.lessons[id]; })
      .map(function (id) {
        var l = byId[id];
        l.files = l.files.filter(function (f) { return !deleted.files[f.id]; });
        l.files.sort(function (x, y) { return (x.uploadedAt || 0) - (y.uploadedAt || 0); });
        return l;
      });

    var progress = {};
    [a.progress || {}, b.progress || {}].forEach(function (p) {
      Object.keys(p).forEach(function (k) { progress[k] = mergeProgressRecord(progress[k], p[k]); });
    });

    return {
      updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
      lessons: lessons,
      deleted: deleted,
      progress: progress
    };
  }

  // Chuyển dữ liệu của phiên bản cũ (một bộ file duy nhất) thành một bài.
  function migrateV1(sources, progress, now) {
    var st = emptyState();
    st.progress = progress || {};
    st.updatedAt = now;
    if (!sources) return st;
    var files = [];
    KINDS.forEach(function (k) {
      var lines = sources[k.key] || [];
      if (!lines.length) return;
      files.push({
        id: newId('f'), kind: k.kind,
        name: (sources.names || {})[k.kind] || k.label,
        uploadedAt: now, lines: lines
      });
    });
    if (files.length) {
      st.lessons.push({ id: newId('l'), name: 'Dữ liệu cũ', createdAt: now, updatedAt: now, files: files });
    }
    return st;
  }

  // Đoán loại file từ tên, ví dụ "Từ vựng Bài 6 - Dịch chủ đề.docx" -> vocab.
  // Thứ tự kiểm tra quan trọng: "Dịch" trong tên từ vựng không được hiểu là đáp án.
  function guessKind(name) {
    var s = String(name || '').toLowerCase();
    if (/ngữ\s*pháp|ngu\s*phap|grammar/.test(s)) return 'grammar';
    if (/bài\s*giảng|bai\s*giang|lecture/.test(s)) return 'lecture';
    if (/từ\s*vựng|tu\s*vung|vocab/.test(s)) return 'vocab';
    if (/đáp\s*án|dap\s*an|tiếng\s*việt|tieng\s*viet|dịch|dich/.test(s)) return 'vi';
    if (/câu|cau|tiếng\s*hàn|tieng\s*han/.test(s)) return 'ko';
    return null;
  }

  // Ngày ôn gần nhất: tra theo phần mã của mục, để dùng chung cho mọi loại bài tập.
  function itemHash(id) {
    var s = String(id);
    return s.slice(s.lastIndexOf(':') + 1);
  }

  function reviewIndex(progress) {
    var idx = {};
    Object.keys(progress || {}).forEach(function (k) {
      var p = progress[k];
      if (!p || !p.last) return;
      var h = itemHash(k);
      if (!idx[h] || p.last > idx[h]) idx[h] = p.last;
    });
    return idx;
  }

  function lastReviewOf(id, idx) {
    return idx[itemHash(id)] || 0;
  }

  function lessonLastReview(ds, idx) {
    var latest = 0;
    ds.vocab.concat(ds.grammar, ds.sentences).forEach(function (item) {
      latest = Math.max(latest, lastReviewOf(item.id, idx));
    });
    return latest;
  }

  var Core = {
    KINDS: KINDS,
    kindInfo: kindInfo,
    guessKind: guessKind,
    newId: newId,
    emptyState: emptyState,
    lessonDataset: lessonDataset,
    scopeDataset: scopeDataset,
    mergeStates: mergeStates,
    migrateV1: migrateV1,
    reviewIndex: reviewIndex,
    lastReviewOf: lastReviewOf,
    lessonLastReview: lessonLastReview,
    hasHangul: hasHangul,
    clean: clean,
    parseCsv: parseCsv,
    splitCells: splitCells,
    parseVocab: parseVocab,
    parseGrammar: parseGrammar,
    buildSentencePairs: buildSentencePairs,
    parseLecture: parseLecture,
    buildDataset: buildDataset,
    normLoose: normLoose,
    normNoSpace: normNoSpace,
    similarity: similarity,
    checkWord: checkWord,
    checkTranslation: checkTranslation,
    checkOrder: checkOrder,
    checkExtension: checkExtension,
    tokensOf: tokensOf,
    verbStem: verbStem,
    flashcards: flashcards,
    wordQuestions: wordQuestions,
    orderQuestions: orderQuestions,
    extensionQuestions: extensionQuestions,
    choiceQuestions: choiceQuestions,
    translationQuestions: translationQuestions,
    shuffle: shuffle
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Core;
  } else {
    root.HanhocCore = Core;
  }
})(typeof window !== 'undefined' ? window : globalThis);
