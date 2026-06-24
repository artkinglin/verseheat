import React from 'react';
import { heatColor, scoreLabel } from '../lib/heat.js';

export function HeatGrid({ items, onSelect, emptyLabel = 'No items found' }) {
  if (!items.length) {
    return <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">{emptyLabel}</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect?.(item)}
          className="heat-tile min-h-24 rounded border border-slate-200 p-3 text-left text-slate-950 shadow-sm dark:border-slate-800"
          style={{ backgroundColor: heatColor(item.averageRating) }}
        >
          <span className="block text-sm font-semibold leading-tight">{item.title}</span>
          <span className="mt-2 block text-xl font-bold">{scoreLabel(item.averageRating)}</span>
          <span className="mt-1 block text-xs">{item.ratingCount || 0} ratings</span>
        </button>
      ))}
    </div>
  );
}
