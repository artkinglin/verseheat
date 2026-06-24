import React from 'react';

export function RatingControl({ disabled, onRate, selectedScore }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
        <button
          key={score}
          type="button"
          disabled={disabled}
          onClick={() => onRate(score)}
          className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-semibold ${
            selectedScore === score
              ? 'border-yellow-500 bg-yellow-100 text-slate-950'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={`Rate ${score} out of 10`}
          title={`Rate ${score} out of 10`}
        >
          {score}
        </button>
      ))}
    </div>
  );
}
