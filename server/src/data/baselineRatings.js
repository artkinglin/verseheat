import { books, getBook, getBookVerseCount, getChapterVerseCount } from './bible.js';

function key(bookId, chapter, verse) {
  return `${bookId}:${chapter}:${verse}`;
}

function anchorRange(bookId, chapter, startVerse, endVerse, score) {
  return Array.from({ length: endVerse - startVerse + 1 }, (_, index) => [
    key(bookId, chapter, startVerse + index),
    score,
  ]);
}

function bufferBaselineScore(score) {
  return Math.max(6, Math.min(10, Math.round(6 + ((score - 1) * 4) / 9)));
}

const anchorEntries = [
  [key(43, 3, 16), 10],
  ...anchorRange(40, 22, 37, 39, 10),
  [key(1, 1, 1), 10],
  [key(19, 23, 1), 10],
  [key(40, 7, 12), 10],
  [key(49, 3, 14), 9],
  [key(50, 4, 13), 9],
  [key(24, 29, 11), 9],
  [key(45, 8, 28), 9],
  ...anchorRange(46, 13, 4, 7, 9),
  ...anchorRange(20, 3, 5, 6, 9),
  [key(49, 4, 32), 8],
  [key(45, 3, 23), 8],
  [key(33, 6, 8), 8],
  [key(40, 6, 33), 8],
  ...anchorRange(48, 5, 22, 23, 8),
  [key(23, 41, 10), 8],
  ...anchorRange(59, 1, 2, 3, 7),
  [key(51, 3, 23), 7],
  [key(20, 22, 6), 7],
  [key(58, 11, 1), 7],
  [key(62, 4, 8), 7],
  [key(19, 46, 1), 7],
  [key(45, 12, 2), 6],
  [key(55, 1, 7), 6],
  [key(20, 16, 3), 6],
  [key(21, 3, 1), 6],
  [key(42, 6, 31), 6],
  [key(60, 5, 7), 5],
  [key(6, 1, 9), 5],
  ...anchorRange(4, 6, 24, 26, 5),
  [key(20, 15, 1), 5],
  [key(44, 2, 42), 4],
  ...anchorRange(3, 19, 9, 10, 4),
  ...anchorRange(54, 3, 2, 3, 4),
  [key(56, 1, 5), 4],
  [key(13, 1, 1), 3],
  ...anchorRange(4, 33, 5, 15, 3),
  ...anchorRange(6, 15, 20, 32, 3),
  ...anchorRange(15, 2, 3, 15, 3),
  ...anchorRange(2, 38, 24, 29, 2),
  ...anchorRange(11, 7, 15, 22, 2),
  ...anchorRange(4, 7, 12, 83, 2),
  [key(7, 19, 29), 1],
  [key(9, 15, 3), 1],
  ...anchorRange(1, 5, 6, 8, 1),
  ...anchorRange(4, 1, 20, 46, 1),
];

const anchorRatings = new Map(anchorEntries);

const notableRatings = new Map([
  [key(1, 1, 27), 8],
  [key(1, 2, 24), 7],
  [key(1, 50, 20), 7],
  [key(2, 20, 3), 8],
  [key(2, 20, 12), 7],
  [key(5, 6, 4), 8],
  [key(5, 6, 5), 8],
  [key(5, 31, 6), 7],
  [key(6, 24, 15), 8],
  [key(8, 1, 16), 7],
  [key(18, 19, 25), 7],
  [key(19, 1, 1), 7],
  [key(19, 19, 14), 7],
  [key(19, 23, 4), 8],
  [key(19, 27, 1), 8],
  [key(19, 34, 8), 7],
  [key(19, 34, 18), 8],
  [key(19, 37, 4), 7],
  [key(19, 51, 10), 8],
  [key(19, 91, 1), 8],
  [key(19, 119, 105), 8],
  [key(19, 139, 14), 8],
  [key(20, 1, 7), 7],
  [key(20, 16, 18), 6],
  [key(23, 6, 8), 7],
  [key(23, 9, 6), 8],
  [key(23, 26, 3), 8],
  [key(23, 40, 31), 8],
  [key(23, 53, 5), 8],
  [key(24, 29, 13), 7],
  [key(25, 3, 22), 7],
  [key(25, 3, 23), 7],
  [key(25, 3, 24), 7],
  [key(27, 3, 17), 7],
  [key(33, 5, 2), 7],
  [key(35, 2, 4), 7],
  [key(36, 3, 17), 7],
  [key(38, 4, 6), 7],
  [key(39, 3, 10), 6],
  [key(40, 5, 3), 8],
  [key(40, 5, 9), 8],
  [key(40, 5, 14), 7],
  [key(40, 5, 16), 8],
  [key(40, 6, 9), 8],
  [key(40, 6, 24), 7],
  [key(40, 6, 34), 7],
  [key(40, 11, 28), 8],
  [key(40, 28, 19), 8],
  [key(40, 28, 20), 8],
  [key(41, 12, 30), 8],
  [key(41, 12, 31), 8],
  [key(42, 1, 37), 7],
  [key(42, 2, 11), 8],
  [key(42, 10, 27), 8],
  [key(42, 15, 20), 7],
  [key(42, 23, 34), 7],
  [key(43, 1, 1), 8],
  [key(43, 1, 14), 8],
  [key(43, 8, 12), 8],
  [key(43, 10, 10), 8],
  [key(43, 11, 25), 8],
  [key(43, 11, 35), 7],
  [key(43, 13, 34), 8],
  [key(43, 13, 35), 8],
  [key(43, 14, 6), 8],
  [key(43, 14, 27), 8],
  [key(43, 15, 5), 8],
  [key(44, 1, 8), 7],
  [key(44, 4, 12), 7],
  [key(45, 1, 16), 8],
  [key(45, 5, 8), 8],
  [key(45, 6, 23), 8],
  [key(45, 8, 1), 8],
  [key(45, 10, 9), 8],
  [key(45, 12, 1), 7],
  [key(45, 12, 19), 6],
  [key(45, 15, 13), 7],
  [key(46, 10, 13), 7],
  [key(46, 10, 31), 7],
  [key(46, 13, 13), 8],
  [key(47, 5, 17), 8],
  [key(47, 12, 9), 8],
  [key(48, 2, 20), 8],
  [key(48, 6, 9), 7],
  [key(49, 2, 8), 8],
  [key(49, 2, 9), 8],
  [key(49, 6, 10), 7],
  [key(50, 1, 6), 7],
  [key(50, 2, 3), 7],
  [key(50, 4, 4), 7],
  [key(50, 4, 6), 8],
  [key(50, 4, 7), 8],
  [key(50, 4, 8), 8],
  [key(51, 3, 12), 7],
  [key(51, 3, 13), 7],
  [key(51, 3, 17), 7],
  [key(52, 5, 16), 7],
  [key(52, 5, 17), 7],
  [key(52, 5, 18), 7],
  [key(54, 4, 12), 7],
  [key(54, 6, 10), 6],
  [key(55, 3, 16), 8],
  [key(58, 4, 12), 7],
  [key(58, 13, 5), 7],
  [key(58, 13, 8), 7],
  [key(59, 1, 5), 7],
  [key(59, 1, 19), 7],
  [key(59, 1, 22), 7],
  [key(59, 4, 7), 7],
  [key(59, 4, 8), 7],
  [key(60, 2, 9), 7],
  [key(60, 3, 15), 7],
  [key(61, 3, 9), 7],
  [key(62, 1, 9), 8],
  [key(62, 4, 18), 8],
  [key(66, 3, 20), 7],
  [key(66, 21, 4), 8],
]);

const bookBaseRatings = new Map([
  [1, 3.7], [2, 3.4], [3, 2.6], [4, 2.6], [5, 4.0],
  [6, 3.1], [7, 2.8], [8, 4.6], [9, 3.2], [10, 3.1],
  [11, 3.0], [12, 2.9], [13, 2.4], [14, 2.9], [15, 2.8],
  [16, 3.0], [17, 3.2], [18, 4.3], [19, 5.1], [20, 5.0],
  [21, 4.1], [22, 3.6], [23, 4.1], [24, 3.4], [25, 3.8],
  [26, 3.0], [27, 4.0], [28, 3.5], [29, 3.5], [30, 3.4],
  [31, 3.0], [32, 4.2], [33, 3.8], [34, 2.9], [35, 3.8],
  [36, 3.3], [37, 3.0], [38, 3.4], [39, 3.7], [40, 5.8],
  [41, 5.1], [42, 5.3], [43, 6.0], [44, 4.6], [45, 5.8],
  [46, 5.2], [47, 5.2], [48, 5.7], [49, 5.8], [50, 6.0],
  [51, 5.5], [52, 5.4], [53, 4.8], [54, 4.8], [55, 5.0],
  [56, 4.6], [57, 4.2], [58, 5.4], [59, 5.8], [60, 5.6],
  [61, 5.1], [62, 5.9], [63, 4.7], [64, 4.5], [65, 4.7], [66, 4.1],
]);

const lowContextChapters = new Set([
  '1:5', '1:10', '2:25', '2:26', '2:27', '2:28', '2:29', '2:30', '2:31',
  '2:35', '2:36', '2:37', '2:38', '3:1', '3:2', '3:3', '3:4', '3:5',
  '3:6', '3:7', '3:11', '3:12', '3:13', '3:14', '3:15', '4:1', '4:2',
  '4:3', '4:4', '4:7', '4:26', '4:33', '4:34', '6:13', '6:14', '6:15',
  '6:16', '6:17', '6:18', '6:19', '6:21', '6:22', '13:1', '13:2',
  '13:3', '13:4', '13:5', '13:6', '13:7', '13:8', '13:9', '15:2',
  '15:10', '16:7', '17:9', '18:24', '24:46', '24:47', '24:48', '24:49',
  '24:50', '24:51', '24:52',
]);

const highTeachingChapters = new Set([
  '2:20', '5:5', '5:6', '19:23', '19:91', '19:119', '19:139', '20:3',
  '20:15', '23:40', '23:53', '25:3', '40:5', '40:6', '40:7', '40:22',
  '40:28', '42:6', '42:10', '42:15', '43:1', '43:3', '43:14', '43:15',
  '45:8', '45:12', '46:13', '48:5', '49:2', '49:4', '50:4', '51:3',
  '58:11', '59:1', '62:4',
]);

function baselineFormula(bookId, chapter, verse) {
  let score = bookBaseRatings.get(bookId) || 3.5;

  if (lowContextChapters.has(`${bookId}:${chapter}`)) score -= 1.25;
  if (highTeachingChapters.has(`${bookId}:${chapter}`)) score += 1.0;

  if (bookId >= 40 && bookId <= 43 && chapter >= 26) score -= 0.7;
  if (bookId === 66 && chapter >= 6 && chapter <= 18) score -= 0.8;
  if (bookId >= 6 && bookId <= 12 && chapter >= 8) score -= 0.25;
  if (bookId === 19 && [1, 23, 27, 34, 46, 51, 91, 103, 121, 139, 150].includes(chapter)) score += 0.7;
  if (bookId === 20 && chapter >= 10 && chapter <= 29) score += 0.35;
  if (bookId === 49 || bookId === 50 || bookId === 59 || bookId === 62) score += 0.25;

  const texture = ((bookId * 17 + chapter * 7 + verse * 3) % 7 - 3) * 0.12;
  return Math.max(1, Math.min(10, Math.round(score + texture)));
}

export function getBaselineVerseRating(bookId, chapter, verse) {
  const normalizedBookId = Number(bookId);
  const normalizedChapter = Number(chapter);
  const normalizedVerse = Number(verse);
  const referenceKey = key(normalizedBookId, normalizedChapter, normalizedVerse);

  const rawScore = anchorRatings.get(referenceKey)
    ?? notableRatings.get(referenceKey)
    ?? baselineFormula(normalizedBookId, normalizedChapter, normalizedVerse);

  return bufferBaselineScore(rawScore);
}

export function getBaselineChapterRating(bookId, chapter) {
  const verseCount = getChapterVerseCount(bookId, chapter);
  if (!verseCount) return null;

  const total = Array.from({ length: verseCount }, (_, index) => (
    getBaselineVerseRating(bookId, chapter, index + 1)
  )).reduce((sum, score) => sum + score, 0);

  return Number((total / verseCount).toFixed(2));
}

export function getBaselineBookRating(bookId) {
  const book = getBook(bookId);
  if (!book) return null;

  const total = book.verses.reduce((bookSum, verseCount, chapterIndex) => (
    bookSum + Array.from({ length: verseCount }, (_, verseIndex) => (
      getBaselineVerseRating(book.id, chapterIndex + 1, verseIndex + 1)
    )).reduce((chapterSum, score) => chapterSum + score, 0)
  ), 0);

  return Number((total / getBookVerseCount(book.id)).toFixed(2));
}

export function getBaselineBibleRatings() {
  return books.flatMap((book) => (
    book.verses.flatMap((verseCount, chapterIndex) => (
      Array.from({ length: verseCount }, (_, verseIndex) => ({
        bookId: book.id,
        bookName: book.name,
        chapter: chapterIndex + 1,
        verse: verseIndex + 1,
        score: getBaselineVerseRating(book.id, chapterIndex + 1, verseIndex + 1),
      }))
    ))
  ));
}

export { anchorRatings };
