import { query } from './db.js';
import { getBaselineBibleRatings } from './data/baselineRatings.js';

const baselineUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'baseline@verseheat.local',
  passwordHash: 'baseline-ratings-system-user',
  displayName: 'Baseline Ratings',
  username: 'baseline-ratings',
};

const batchSize = 1000;

function valuePlaceholders(rowCount) {
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const offset = rowIndex * 5;
    return `($1, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, false)`;
  }).join(', ');
}

async function ensureBaselineUser() {
  await query(
    `insert into users (id, email, password_hash, display_name, username)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update
     set display_name = excluded.display_name,
         username = excluded.username`,
    [
      baselineUser.id,
      baselineUser.email,
      baselineUser.passwordHash,
      baselineUser.displayName,
      baselineUser.username,
    ],
  );
}

async function seedBaselineRatings() {
  const ratings = getBaselineBibleRatings();
  await ensureBaselineUser();

  let insertedOrUpdated = 0;
  for (let index = 0; index < ratings.length; index += batchSize) {
    const batch = ratings.slice(index, index + batchSize);
    const params = [
      baselineUser.id,
      ...batch.flatMap((rating) => [
        rating.bookId,
        rating.bookName,
        rating.chapter,
        rating.verse,
        rating.score,
      ]),
    ];

    const result = await query(
      `insert into verse_ratings (user_id, book_id, book_name, chapter, verse, score, favorite)
       values ${valuePlaceholders(batch.length)}
       on conflict (user_id, book_id, chapter, verse) do update
       set book_name = excluded.book_name,
           score = excluded.score,
           favorite = false,
           updated_at = now()`,
      params,
    );

    insertedOrUpdated += result.rowCount;
  }

  return insertedOrUpdated;
}

seedBaselineRatings()
  .then((count) => {
    console.log(`Seeded ${count} baseline verse ratings.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
