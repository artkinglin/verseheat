import React from 'react';
import { X } from 'lucide-react';

export function RatingControl({ disabled, onClear, onRate, selectedScore }) {
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
      {selectedScore && onClear && (
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Clear my rating"
          title="Clear my rating"
        >
          <X size={13} aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  );
}
