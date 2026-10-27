const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../js/core.js');
const SAMPLE = require('../js/sample-data.js');

const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

test('parseCsv handles quotes and CRLF', () => {
  const rows = Core.parseCsv('Từ,Nghĩa\r\n가다,"đi, di chuyển"\r\n"a ""b""",c\r\n');
  assert.deepEqual(rows, [
    ['Từ', 'Nghĩa'],
    ['가다', 'đi, di chuyển'],
    ['a "b"', 'c']
  ]);
});

test('parseVocab skips header and reads optional examples', () => {
  const { items, skipped } = Core.parseVocab([
    'Từ tiếng Hàn | Nghĩa',
    '1. 가다 | đi | 학교에 가요. | Tôi đi học.',
    '먹다 | ăn',
    'hello | xin chào',
    '가다 | đi lại (trùng)'
  ]);
  assert.equal(skipped, 1);
  assert.equal(items.length, 2);
  assert.equal(items[0].ko, '가다');
  assert.equal(items[0].exKo, '학교에 가요.');
  assert.equal(items[0].exVi, 'Tôi đi học.');
  assert.equal(items[1].ko, '먹다');
  assert.equal(items[1].exKo, '');
});

test('parseGrammar merges rows with the same pattern', () => {
  const { items } = Core.parseGrammar([
    'Mẫu | Ý nghĩa | Giải thích | Ví dụ | Dịch',
    '-고 싶다 | muốn | Diễn tả mong muốn. | 가고 싶어요. | Tôi muốn đi.',
    '-고 싶다 | muốn | | 먹고 싶어요. | Tôi muốn ăn.'
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].pattern, '-고 싶다');
  assert.equal(items[0].meaning, 'muốn');
  assert.equal(items[0].explain, 'Diễn tả mong muốn.');
  assert.equal(items[0].examples.length, 2);
  assert.equal(items[0].examples[1].ko, '먹고 싶어요.');
});

test('buildSentencePairs aligns Korean and Vietnamese by line', () => {
  const { pairs, warnings } = Core.buildSentencePairs(
    ['1. 저는 학생입니다.', '2. 감사합니다.'],
    ['1. Tôi là học sinh.', '2. Cảm ơn.']
  );
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].ko, '저는 학생입니다.');
  assert.equal(pairs[0].vi, 'Tôi là học sinh.');
  assert.deepEqual(warnings, []);
});

test('buildSentencePairs warns on mismatched counts and accepts inline pairs', () => {
  const { pairs, warnings } = Core.buildSentencePairs(
    ['저는 학생입니다. | Tôi là học sinh.', '감사합니다.', '물 주세요.'],
    ['Cảm ơn.']
  );
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].vi, 'Tôi là học sinh.');
  assert.equal(pairs[1].ko, '감사합니다.');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /khác số câu/);
});

test('parseLecture routes pairs to vocab or sentences', () => {
  const lec = Core.parseLecture([
    '# Bài 1',
    '한국 | Hàn Quốc',
    '저는 한국에 가고 싶어요 | Tôi muốn đi Hàn Quốc.',
    'Ghi chú thường'
  ]);
  assert.equal(lec.reading[0].type, 'heading');
  assert.equal(lec.vocab.length, 1);
  assert.equal(lec.vocab[0].ko, '한국');
  assert.equal(lec.sentences.length, 1);
  assert.equal(lec.reading[3].type, 'text');
});

test('buildDataset on the sample produces every category', () => {
  const ds = Core.buildDataset({
    vocabLines: SAMPLE.vocabLines,
    grammarLines: SAMPLE.grammarLines,
    koLines: SAMPLE.koLines,
    viLines: SAMPLE.viLines,
    lectureLines: SAMPLE.lectureLines
  });
  assert.equal(ds.vocab.length, 19); // 18 từ + "한국" từ bài giảng, "안녕하세요" không trùng lặp
  assert.equal(ds.grammar.length, 5);
  assert.equal(ds.sentences.length, 12); // 10 câu + 2 cặp câu trong bài giảng
  assert.deepEqual(ds.warnings, []);
  assert.equal(ds.vocab.filter((v) => v.ko === '안녕하세요').length, 1);
});

test('ids are stable for the same content', () => {
  const a = Core.parseVocab(['가다 | đi']).items[0].id;
  const b = Core.parseVocab(['가다 | đi khác']).items[0].id;
  assert.equal(a, b);
});

test('similarity and translation checks', () => {
  assert.equal(Core.similarity('Tôi là học sinh.', 'tôi là học sinh'), 1);
  assert.equal(Core.checkTranslation('Tôi là học sinh', 'Tôi là học sinh.').ok, true);
  assert.equal(Core.checkTranslation('Tôi là học sinh', 'Tôi là học sinh đây.').ok, true);
  assert.equal(Core.checkTranslation('Hôm nay trời mưa', 'Tôi là học sinh.').ok, false);
  assert.equal(Core.checkTranslation('   ', 'Tôi').ok, false);
  assert.equal(Core.checkTranslation('저는 학생이에요', '저는 학생이에요.').ok, true);
});

test('checkWord ignores spacing but not spelling', () => {
  assert.equal(Core.checkWord('공부 하다', '공부하다').ok, true);
  assert.equal(Core.checkWord('공부', '공부하다').ok, false);
  assert.equal(Core.checkWord('', '공부하다').ok, false);
});

test('checkOrder compares token sequence', () => {
  assert.equal(Core.checkOrder(['저는', '학생입니다'], ['저는', '학생입니다']).ok, true);
  assert.equal(Core.checkOrder(['학생입니다', '저는'], ['저는', '학생입니다']).ok, false);
});

test('checkExtension requires Hangul and the target word stem', () => {
  assert.equal(Core.verbStem('가다'), '가');
  assert.equal(Core.verbStem('학교'), '학교');
  assert.equal(Core.checkExtension('저는 학교에 가요.', '가').ok, true);
  assert.equal(Core.checkExtension('I go to school.', '가').ok, false);
  assert.equal(Core.checkExtension('저는 학교에 와요.', '가').ok, false);
});

test('flashcards filter by kind', () => {
  const ds = Core.buildDataset({
    vocabLines: SAMPLE.vocabLines,
    grammarLines: SAMPLE.grammarLines,
    koLines: SAMPLE.koLines,
    viLines: SAMPLE.viLines
  });
  assert.equal(Core.flashcards(ds, 'vocab').length, ds.vocab.length);
  assert.equal(Core.flashcards(ds, 'grammar').length, ds.grammar.length);
  assert.equal(Core.flashcards(ds, 'sentence').length, ds.sentences.length);
  assert.equal(Core.flashcards(ds, 'all').length,
    ds.vocab.length + ds.grammar.length + ds.sentences.length);
});

test('choice questions have a single correct option among 2 to 4 options', () => {
  const ds = Core.buildDataset({
    vocabLines: SAMPLE.vocabLines,
    grammarLines: SAMPLE.grammarLines,
    koLines: SAMPLE.koLines,
    viLines: SAMPLE.viLines
  });
  const qs = Core.choiceQuestions(ds);
  assert.ok(qs.length > 0);
  for (const q of qs) {
    assert.ok(q.options.length >= 2 && q.options.length <= 4, q.id);
    assert.equal(new Set(q.options).size, q.options.length, q.id);
    const correct = q.options.map((o, i) => (q.check(i).ok ? i : -1)).filter((i) => i >= 0);
    assert.equal(correct.length, 1, q.id);
    assert.equal(q.options[correct[0]], q.answer, q.id);
  }
});

test('translation questions go both ways', () => {
  const qs = Core.translationQuestions([{ id: 's:1', ko: '저는 학생이에요.', vi: 'Tôi là học sinh.' }]);
  assert.equal(qs.length, 2);
  assert.equal(qs[0].prompt, '저는 학생이에요.');
  assert.equal(qs[0].answer, 'Tôi là học sinh.');
  assert.equal(qs[1].answer, '저는 학생이에요.');
  assert.equal(qs[0].check('Tôi là học sinh.').ok, true);
});

test('order questions skip single-word sentences and shuffle tokens', () => {
  const qs = Core.orderQuestions([
    { id: 's:1', ko: '감사합니다.', vi: 'Cảm ơn.' },
    { id: 's:2', ko: '저는 학생입니다.', vi: 'Tôi là học sinh.' }
  ]);
  assert.equal(qs.length, 1);
  assert.deepEqual([...qs[0].tokens].sort(), ['저는', '학생입니다'].sort());
  assert.equal(qs[0].check(['저는', '학생입니다']).ok, true);
});

test('shuffle keeps all items with a seeded generator', () => {
  const out = Core.shuffle([1, 2, 3, 4, 5], seeded(7));
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});
