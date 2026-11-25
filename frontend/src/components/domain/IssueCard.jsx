import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Avatar from '../primitives/Avatar';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import CategoryTag from './CategoryTag';
import { MapPin, ThumbsUp, ArrowRight, Building2 } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';

dayjs.extend(relativeTime);

export default function IssueCard({
  issue,
  onSupport,
  onClick,
  isSupporting = false,
  className = '',
}) {
  if (!issue) return null;

  const {
    issueId,
    title,
    description,
    category,
    location,
    imageUrl,
    status,
    priority,
    department,
    reporterName = 'Citizen',
    upvoteCount = 0,
    viewerHasUpvoted = false,
    createdAt,
  } = issue;

  const timeAgo = createdAt ? dayjs(createdAt).fromNow() : 'Recently';
  const address = location?.address || 'Location unavailable';
  const departmentName = DEPARTMENTS[department] || department;

  const handleSupportClick = (e) => {
    e.stopPropagation();
    if (onSupport) {
      onSupport(issueId, e);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(issueId);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group bg-surface-lowest rounded-2xl border border-outline-variant p-5 shadow-card hover:shadow-elevated transition-all flex flex-col gap-3.5 text-left cursor-pointer ${className}`}
    >
      {/* Top Metadata Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={reporterName} size="sm" />
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-text truncate max-w-[140px] sm:max-w-[200px]">
                {reporterName}
              </span>
              <span className="text-[11px] text-muted">&bull;</span>
              <span className="text-[11px] text-muted whitespace-nowrap">{timeAgo}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted truncate mt-0.5">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          </div>
        </div>

        {/* Status & Priority */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {priority && <PriorityBadge priority={priority} size="sm" />}
          <StatusBadge status={status} size="sm" />
        </div>
      </div>

      {/* Category Tag */}
      <div>
        <CategoryTag category={category} size="sm" />
      </div>

      {/* Title & Description */}
      <div className="space-y-1">
        <h3 className="font-bold text-base md:text-lg text-text leading-snug group-hover:text-primary transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-text/80 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Image Preview (if present) */}
      {imageUrl && (
        <div className="w-full h-48 sm:h-56 rounded-xl overflow-hidden bg-surface-low border border-outline-variant/50 relative">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-300"
          />
        </div>
      )}

      {/* Bottom Bar: Support Action & Department Info */}
      <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between gap-3 text-xs">
        {/* Support Button */}
        <button
          type="button"
          onClick={handleSupportClick}
          disabled={isSupporting}
          aria-pressed={viewerHasUpvoted}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold border transition-all ${
            viewerHasUpvoted
              ? 'bg-accent/20 border-accent text-accent-dark shadow-subtle'
              : 'bg-surface-low border-outline-variant text-text hover:bg-surface-high hover:border-outline active:scale-95'
          } ${isSupporting ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
        >
          <ThumbsUp
            className={`w-3.5 h-3.5 ${
              viewerHasUpvoted ? 'fill-accent text-accent-dark' : 'text-muted'
            }`}
          />
          <span>{viewerHasUpvoted ? 'Supported' : 'Support'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              viewerHasUpvoted ? 'bg-accent text-accent-dark' : 'bg-surface-high text-muted'
            }`}
          >
            {upvoteCount}
          </span>
        </button>

        {/* Assigned Department or View Action */}
        <div className="flex items-center gap-2 text-muted text-[11px]">
          {departmentName && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-surface-low px-2 py-1 rounded-md border border-outline-variant/40">
              <Building2 className="w-3 h-3 text-primary" />
              <span className="truncate max-w-[130px]">{departmentName}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            View Details <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

