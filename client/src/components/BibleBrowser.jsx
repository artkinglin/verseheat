import { ArrowLeft, BookOpen, Heart, Search, SlidersHorizontal, X } from 'lucide-react';
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
  const [myRatings, setMyRatings] = useState([]);
  const [query, setQuery] = useState('');
  const [passage, setPassage] = useState('');
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [favoriteDrafts, setFavoriteDrafts] = useState({});
  const [struggleGroups, setStruggleGroups] = useState([]);
  const [selectedStruggles, setSelectedStruggles] = useState([]);
  const [struggleVerses, setStruggleVerses] = useState([]);
  const [struggleLoading, setStruggleLoading] = useState(false);

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

  const loadMyRatings = useCallback(async () => {
    if (!user) {
      setMyRatings([]);
      return;
    }

    const data = await api('/api/ratings/mine');
    setMyRatings(requireArray(data.ratings, 'My ratings'));
  }, [user]);

  const fetchStruggleVerses = useCallback(async () => {
    if (selectedStruggles.length === 0) {
      return [];
    }

    const params = new window.URLSearchParams();
    selectedStruggles.forEach((struggle) => params.append('struggle', struggle));
    const data = await api(`/api/ratings/struggles?${params.toString()}`);
    return requireArray(data.verses, 'Struggle verses');
  }, [selectedStruggles]);

  const loadStruggleVerses = useCallback(async () => {
    setStruggleVerses(await fetchStruggleVerses());
  }, [fetchStruggleVerses]);

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
          const struggleData = await api('/api/ratings/struggles');
          if (ignore) return;
          setStruggleGroups(requireArray(struggleData.struggles, 'Struggles'));
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

  useEffect(() => {
    loadMyRatings().catch(() => setMyRatings([]));
  }, [loadMyRatings]);

  useEffect(() => {
    let ignore = false;

    async function refreshStruggleVerses() {
      if (selectedStruggles.length === 0) {
        setStruggleVerses([]);
        return;
      }

      setStruggleLoading(true);

      try {
        const verses = await fetchStruggleVerses();
        if (ignore) return;
        setStruggleVerses(verses);
        setLoadError('');
      } catch (error) {
        if (ignore) return;
        setStruggleVerses([]);
        setLoadError(`Struggle verses are unavailable: ${error.message}`);
      } finally {
        if (!ignore) {
          setStruggleLoading(false);
        }
      }
    }

    refreshStruggleVerses();

    return () => {
      ignore = true;
    };
  }, [fetchStruggleVerses, selectedStruggles.length]);

  const bookRatingMap = useMemo(() => new Map(bookRatings.map((item) => [item.bookId, item])), [bookRatings]);
  const chapterRatingMap = useMemo(() => toAggregateMap(chapterRatings), [chapterRatings]);
  const verseRatingMap = useMemo(() => toAggregateMap(verseRatings), [verseRatings]);
  const myRatingMap = useMemo(() => toAggregateMap(myRatings), [myRatings]);
  const filteredBooks = useMemo(
    () => books.filter((book) => book.name.toLowerCase().includes(query.toLowerCase())),
    [books, query],
  );
  const struggleLabel = selectedStruggles.length === 1
    ? selectedStruggles[0]
    : selectedStruggles.join(', ');

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
    const myRating = myRatingMap.get(aggregateKey({
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
      myRating,
      verse,
    };
  }) : [];

  const struggleItems = struggleVerses.map((item) => ({
    key: `${item.bookId}:${item.chapter}:${item.verse}`,
    title: `${item.bookName} ${item.chapter}:${item.verse}`,
    averageRating: item.averageRating,
    ratingCount: item.ratingCount,
    taggedVerse: item,
  }));

  function toggleStruggle(struggle) {
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedStruggles((current) => (
      current.includes(struggle)
        ? current.filter((item) => item !== struggle)
        : [...current, struggle]
    ));
  }

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
      loadMyRatings(),
      selectedStruggles.length > 0 ? loadStruggleVerses() : Promise.resolve(),
    ]);
    setMessage('Rating saved');
  }

  async function cancelRating(item) {
    if (!user) {
      onAuthRequired();
      return;
    }

    setMessage('');
    await api(`/api/ratings/verse/${selectedBook.id}/${selectedChapter.chapter}/${item.verse}`, {
      method: 'DELETE',
    });
    await Promise.all([
      loadBookRatings(),
      loadChapterRatings(selectedBook),
      loadVerseRatings(selectedBook, selectedChapter),
      loadMyRatings(),
    ]);
    setMessage('Rating removed');
  }

  function favoriteKey(scope, chapter, verse) {
    return `${scope}:${selectedBook?.id}:${chapter}:${verse}`;
  }

  async function saveFavorite(item, favorite) {
    if (!user) {
      onAuthRequired();
      return;
    }

    const key = favoriteKey('verse', selectedChapter.chapter, item.verse);
    setFavoriteDrafts((drafts) => ({
      ...drafts,
      [key]: favorite,
    }));

    if (!item.myRating) {
      setMessage('Choose a rating to save this favorite');
      return;
    }

    setMessage('');
    await api('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'verse',
        bookId: selectedBook.id,
        chapter: selectedChapter.chapter,
        verse: item.verse,
        score: item.myRating.score,
        favorite,
      }),
    });
    await loadMyRatings();
    setMessage(favorite ? 'Favorite saved' : 'Favorite removed');
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

  async function selectTaggedVerse(item) {
    const bookSummary = books.find((book) => book.id === item.bookId);
    if (!bookSummary) return;

    setMessage('');
    setLoadError('');
    setBookLoading(true);

    try {
      const data = await api(`/api/bible/books/${bookSummary.id}`);
      const chapter = data.book.chapters.find((entry) => entry.chapter === item.chapter);
      if (!chapter) {
        throw new Error('Chapter not found');
      }
      setSelectedBook(data.book);
      setSelectedChapter(chapter);
      await Promise.all([
        loadChapterRatings(data.book),
        loadVerseRatings(data.book, chapter),
      ]);
    } catch (error) {
      setSelectedBook(null);
      setSelectedChapter(null);
      setLoadError(`Tagged verse is unavailable: ${error.message}`);
    } finally {
      setBookLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase text-amber-700 dark:text-amber-300">
            <BookOpen size={14} aria-hidden="true" />
            Bible browser
          </div>
          <h2 className="section-heading text-2xl font-extrabold">Bible heat map</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Rate verses from 1 to 10. Chapter and book heat update automatically.</p>
        </div>
        <label className="relative block w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-300" size={17} />
          <input
            className="app-input w-full py-2.5 pl-9 pr-3 text-sm"
            placeholder="Filter by book"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-400/30 dark:bg-red-950/50 dark:text-red-100">
          {loadError}
        </div>
      )}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-100">{message}</div>}

      <div className="app-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-amber-50">
            <SlidersHorizontal size={16} className="text-purple-700 dark:text-purple-300" aria-hidden="true" />
            Struggles filter
          </h3>
          {selectedStruggles.length > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white/80 px-2 py-1 text-xs font-bold text-purple-800 transition hover:-translate-y-px hover:bg-purple-100 dark:border-purple-300/30 dark:bg-purple-950/40 dark:text-purple-100 dark:hover:bg-purple-900/60"
              onClick={() => setSelectedStruggles([])}
            >
              <X size={13} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {struggleGroups.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{group.category}</div>
              <div className="flex flex-wrap gap-1.5">
                {group.struggles.map((struggle) => {
                  const active = selectedStruggles.includes(struggle);
                  return (
                    <button
                      key={struggle}
                      type="button"
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition hover:-translate-y-px ${
                        active
                          ? 'border-purple-700 bg-purple-700 text-white shadow-sm dark:border-amber-300 dark:bg-amber-300 dark:text-slate-950'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-indigo-950/70'
                      }`}
                      onClick={() => toggleStruggle(struggle)}
                    >
                      {struggle}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!selectedBook && selectedStruggles.length === 0 && (
        <HeatGrid
          items={bookItems}
          onSelect={(item) => selectBook(item.book)}
        />
      )}

      {!selectedBook && selectedStruggles.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="section-heading text-xl font-extrabold">Top-rated for {struggleLabel}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Showing verses tagged with any selected struggle.</p>
            </div>
            {struggleLoading && <div className="text-xs font-bold uppercase text-purple-700 dark:text-purple-200">Loading...</div>}
          </div>
          <HeatGrid
            items={struggleItems}
            emptyLabel="No tagged verses found for the selected struggles."
            onSelect={(item) => selectTaggedVerse(item.taggedVerse)}
          />
        </div>
      )}

      {selectedBook && !selectedChapter && (
        <div className="space-y-4">
          <button type="button" className="btn-soft" onClick={() => setSelectedBook(null)}>
            <ArrowLeft size={16} /> All books
          </button>
          <div className="app-card bg-gradient-to-r from-white to-amber-50/70 p-4 dark:from-slate-950/80 dark:to-indigo-950/50">
            <div>
              <h3 className="section-heading text-xl font-extrabold">{selectedBook.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Choose a chapter to rate individual verses.</p>
            </div>
          </div>
          {bookLoading ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center text-sm font-medium text-amber-800 dark:border-amber-300/30 dark:bg-amber-950/20 dark:text-amber-200">
              Loading chapters...
            </div>
          ) : (
            <HeatGrid items={chapterItems} onSelect={(item) => selectChapter(item.chapter)} />
          )}
        </div>
      )}

      {selectedBook && selectedChapter && (
        <div className="space-y-4">
          <button type="button" className="btn-soft" onClick={() => setSelectedChapter(null)}>
            <ArrowLeft size={16} /> {selectedBook.name}
          </button>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="app-card p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="section-heading text-xl font-extrabold">{selectedBook.name} {selectedChapter.chapter}</h3>
              </div>
              <pre className="max-h-[34rem] whitespace-pre-wrap rounded-lg bg-amber-50/50 p-3 text-sm leading-6 text-slate-700 dark:bg-indigo-950/30 dark:text-slate-200">{passage || 'Loading passage...'}</pre>
            </div>
            <div className="space-y-3">
              <h4 className="inline-flex items-center gap-2 font-bold text-slate-900 dark:text-amber-50">
                <BookOpen size={16} aria-hidden="true" />
                Verses
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {verseItems.map((item) => (
                  (() => {
                    const key = favoriteKey('verse', selectedChapter.chapter, item.verse);
                    const isFavorite = favoriteDrafts[key] ?? item.myRating?.favorite ?? false;

                    return (
                      <div key={item.key} className="app-card p-3 transition hover:-translate-y-px hover:shadow-md hover:shadow-amber-950/10">
                        <div className="mb-2 text-sm font-bold text-slate-900 dark:text-amber-50">{item.title}</div>
                        <div className="mb-2 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{item.averageRating ? `${item.averageRating} avg, ${item.ratingCount} ratings` : 'Unrated'}</div>
                        <RatingControl
                          disabled={!user}
                          onClear={item.myRating ? () => cancelRating(item) : undefined}
                          selectedScore={item.myRating?.score}
                          onRate={(score) => rate({
                            scope: 'verse',
                            bookId: selectedBook.id,
                            chapter: selectedChapter.chapter,
                            verse: item.verse,
                            score,
                            favorite: isFavorite,
                          })}
                        />
                        <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-200">
                          <input
                            type="checkbox"
                            className="h-3 w-3 accent-purple-700"
                            checked={Boolean(isFavorite)}
                            onChange={(event) => saveFavorite(item, event.target.checked)}
                          />
                          <Heart size={13} aria-hidden="true" />
                          Favorite
                        </label>
                      </div>
                    );
                  })()
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
