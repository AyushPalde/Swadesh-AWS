import React from 'react';
import { CATEGORY, CATEGORY_LABELS } from '../../constants';
import {
  AlertTriangle,
  Trash2,
  Lightbulb,
  Droplets,
  Waves,
  Tag,
} from 'lucide-react';

const CATEGORY_ICONS = {
  [CATEGORY.POTHOLE]: <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />,
  [CATEGORY.GARBAGE]: <Trash2 className="w-3.5 h-3.5 text-stone-700" />,
  [CATEGORY.STREETLIGHT]: <Lightbulb className="w-3.5 h-3.5 text-yellow-700" />,
  [CATEGORY.WATER_LEAKAGE]: <Droplets className="w-3.5 h-3.5 text-sky-700" />,
  [CATEGORY.DRAINAGE]: <Waves className="w-3.5 h-3.5 text-teal-700" />,
  [CATEGORY.OTHER]: <Tag className="w-3.5 h-3.5 text-muted" />,
};

const CATEGORY_COLORS = {
  [CATEGORY.POTHOLE]: 'bg-amber-100/70 text-amber-900 border-amber-200/80',
  [CATEGORY.GARBAGE]: 'bg-stone-200/70 text-stone-900 border-stone-300',
  [CATEGORY.STREETLIGHT]: 'bg-yellow-100/80 text-yellow-900 border-yellow-200',
  [CATEGORY.WATER_LEAKAGE]: 'bg-sky-100/70 text-sky-900 border-sky-200',
  [CATEGORY.DRAINAGE]: 'bg-teal-100/70 text-teal-900 border-teal-200',
  [CATEGORY.OTHER]: 'bg-surface-high text-text border-outline-variant',
};

export default function CategoryTag({
  category,
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const label = CATEGORY_LABELS[category] || category || 'Other';
  const icon = CATEGORY_ICONS[category] || <Tag className="w-3.5 h-3.5" />;
  const colorClass = CATEGORY_COLORS[category] || 'bg-surface-high text-text border-outline-variant';

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border ${colorClass} ${sizeClass} ${className}`}
    >
      {showIcon && <span className="inline-flex shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  );
}

