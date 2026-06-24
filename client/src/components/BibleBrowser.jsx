import { ArrowLeft, Search } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { aggregateKey, toAggregateMap } from '../lib/ratings.js';
import { HeatGrid } from './HeatGrid.jsx';
import { RatingControl } from './RatingControl.jsx';

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} response was malformed`);
  }
  return value;
}

export function BibleBrowser({ user, onAuthRequired }) {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [bookRatings, setBookRatings] = useState([]);
  const [chapterRatings, setChapterRatings] = useState([]);
  const [verseRatings, setVerseRatings] = useState([]);
  const [query, setQuery] = useState('');
  const [passage, setPassage] = useState('');
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [favoriteDrafts, setFavoriteDrafts] = useState({});

  const loadBookRatings = useCallback(async () => {
    const data = await api('/api/ratings/aggregates?scope=book');
    setBookRatings(requireArray(data.aggregates, 'Book ratings'));
  }, []);

  const loadChapterRatings = useCallback(async (book) => {
    const data = await api(`/api/ratings/aggregates?scope=chapter&bookId=${book.id}`);
    setChapterRatings(requireArray(data.aggregates, 'Chapter ratings'));
  }, []);

  const loadVerseRatings = useCallback(async (book, chapter) => {
    const data = await api(`/api/ratings/aggregates?scope=verse&bookId=${book.id}&chapter=${chapter.chapter}`);
    setVerseRatings(requireArray(data.aggregates, 'Verse ratings'));
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const bookData = await api('/api/bible/books');
        if (ignore) return;
        const nextBooks = requireArray(bookData.books, 'Bible books');
        setBooks(nextBooks);

        try {
          if (ignore) return;
          await loadBookRatings();
          setLoadError('');
        } catch (error) {
          if (ignore) return;
          setBookRatings([]);
          setLoadError(`Ratings are unavailable: ${error.message}`);
        }
      } catch (error) {
        if (ignore) return;
        setBooks([]);
        setBookRatings([]);
        setChapterRatings([]);
        setVerseRatings([]);
        setLoadError(`Bible data is unavailable: ${error.message}`);
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [loadBookRatings]);

  useEffect(() => {
    if (!selectedBook || !selectedChapter) {
      setPassage('');
      return;
    }
    api(`/api/esv/passage?q=${encodeURIComponent(`${selectedBook.name} ${selectedChapter.chapter}`)}`)
      .then((data) => setPassage(data.passages?.[0] || ''))
      .catch((error) => setPassage(error.message));
  }, [selectedBook, selectedChapter]);

  const bookRatingMap = useMemo(() => new Map(bookRatings.map((item) => [item.bookId, item])), [bookRatings]);
  const chapterRatingMap = useMemo(() => toAggregateMap(chapterRatings), [chapterRatings]);
  const verseRatingMap = useMemo(() => toAggregateMap(verseRatings), [verseRatings]);
  const filteredBooks = useMemo(
    () => books.filter((book) => book.name.toLowerCase().includes(query.toLowerCase())),
    [books, query],
  );

  const bookItems = filteredBooks.map((book) => {
    const rating = bookRatingMap.get(book.id);
    return {
      key: book.id,
      title: book.name,
      averageRating: rating?.averageRating,
      ratingCount: rating?.ratingCount,
      book,
    };
  });

  const chapterItems = Array.isArray(selectedBook?.chapters) ? selectedBook.chapters.map((chapter) => {
    const aggregate = chapterRatingMap.get(aggregateKey({
      scope: 'chapter',
      bookId: selectedBook.id,
      chapter: chapter.chapter,
    }));
    return {
      key: chapter.chapter,
      title: `${selectedBook.name} ${chapter.chapter}`,
      averageRating: aggregate?.averageRating,
      ratingCount: aggregate?.ratingCount,
      chapter,
    };
  }) : [];

  const verseItems = selectedChapter ? Array.from({ length: selectedChapter.verseCount }, (_, index) => {
    const verse = index + 1;
    const aggregate = verseRatingMap.get(aggregateKey({
      scope: 'verse',
      bookId: selectedBook.id,
      chapter: selectedChapter.chapter,
      verse,
    }));
    return {
      key: verse,
      title: `Verse ${verse}`,
      averageRating: aggregate?.averageRating,
      ratingCount: aggregate?.ratingCount,
      verse,
    };
  }) : [];

  async function rate(payload) {
    if (!user) {
      onAuthRequired();
      return;
    }
    setMessage('');
    await api('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ ...payload, scope: 'verse' }),
    });
    await Promise.all([
      loadBookRatings(),
      selectedBook ? loadChapterRatings(selectedBook) : Promise.resolve(),
      selectedBook && selectedChapter ? loadVerseRatings(selectedBook, selectedChapter) : Promise.resolve(),
    ]);
    setMessage('Rating saved');
  }

  function favoriteKey(scope, chapter, verse) {
    return `${scope}:${selectedBook?.id}:${chapter}:${verse}`;
  }

  async function selectBook(book) {
    setSelectedChapter(null);
    setMessage('');
    setLoadError('');
    setSelectedBook({ ...book, chapters: [] });
    setChapterRatings([]);
    setVerseRatings([]);
    setBookLoading(true);

    try {
      const data = await api(`/api/bible/books/${book.id}`);
      setSelectedBook(data.book);
      await loadChapterRatings(data.book);
    } catch (error) {
      setSelectedBook(null);
      setChapterRatings([]);
      setLoadError(`Book details are unavailable: ${error.message}`);
    } finally {
      setBookLoading(false);
    }
  }

  async function selectChapter(chapter) {
    setSelectedChapter(chapter);
    setVerseRatings([]);
    try {
      await loadVerseRatings(selectedBook, chapter);
    } catch (error) {
      setVerseRatings([]);
      setLoadError(`Verse ratings are unavailable: ${error.message}`);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Bible heat map</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Rate verses from 1 to 10. Chapter and book heat update automatically.</p>
        </div>
        <label className="relative block w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Filter by book"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {loadError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {loadError}
        </div>
      )}
      {message && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-100">{message}</div>}

      {!selectedBook && (
        <HeatGrid
          items={bookItems}
          onSelect={(item) => selectBook(item.book)}
        />
      )}

      {selectedBook && !selectedChapter && (
        <div className="space-y-4">
          <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300" onClick={() => setSelectedBook(null)}>
            <ArrowLeft size={16} /> All books
          </button>
          <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h3 className="text-xl font-semibold">{selectedBook.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose a chapter to rate individual verses.</p>
            </div>
          </div>
          {bookLoading ? (
            <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              Loading chapters...
            </div>
          ) : (
            <HeatGrid items={chapterItems} onSelect={(item) => selectChapter(item.chapter)} />
          )}
        </div>
      )}

      {selectedBook && selectedChapter && (
        <div className="space-y-4">
          <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300" onClick={() => setSelectedChapter(null)}>
            <ArrowLeft size={16} /> {selectedBook.name}
          </button>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-semibold">{selectedBook.name} {selectedChapter.chapter}</h3>
              </div>
              <pre className="max-h-[34rem] whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{passage || 'Loading passage...'}</pre>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold">Verses</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {verseItems.map((item) => (
                  <div key={item.key} className="rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-2 text-sm font-semibold">{item.title}</div>
                    <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">{item.averageRating ? `${item.averageRating} avg, ${item.ratingCount} ratings` : 'Unrated'}</div>
                    <RatingControl
                      disabled={!user}
                      onRate={(score) => rate({
                        scope: 'verse',
                        bookId: selectedBook.id,
                        chapter: selectedChapter.chapter,
                        verse: item.verse,
                        score,
                        favorite: Boolean(favoriteDrafts[favoriteKey('verse', selectedChapter.chapter, item.verse)]),
                      })}
                    />
                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={Boolean(favoriteDrafts[favoriteKey('verse', selectedChapter.chapter, item.verse)])}
                        onChange={(event) => setFavoriteDrafts({
                          ...favoriteDrafts,
                          [favoriteKey('verse', selectedChapter.chapter, item.verse)]: event.target.checked,
                        })}
                      />
                      Favorite
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
