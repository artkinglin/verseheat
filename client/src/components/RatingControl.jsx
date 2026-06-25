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
          className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold shadow-sm transition ${
            selectedScore === score
              ? 'border-amber-500 bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-amber-900/20'
              : 'border-amber-200 bg-white text-slate-700 hover:-translate-y-px hover:border-amber-400 hover:bg-amber-50 dark:border-indigo-400/30 dark:bg-slate-950 dark:text-amber-50 dark:hover:border-amber-300 dark:hover:bg-indigo-950/70'
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
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 text-xs font-bold text-purple-800 shadow-sm transition hover:-translate-y-px hover:bg-purple-100 dark:border-purple-300/30 dark:bg-purple-950/50 dark:text-purple-100 dark:hover:bg-purple-900/70 disabled:cursor-not-allowed disabled:opacity-50"
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
