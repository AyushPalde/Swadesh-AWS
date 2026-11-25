import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { listIssues, toggleUpvote } from '../api/issues.js';
import { useToast } from '../components/primitives/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import IssueCard from '../components/domain/IssueCard.jsx';
import StatusBadge from '../components/domain/StatusBadge.jsx';
import CategoryTag from '../components/domain/CategoryTag.jsx';
import FilterChip from '../components/primitives/FilterChip.jsx';
import Button from '../components/primitives/Button.jsx';
import Skeleton from '../components/primitives/Skeleton.jsx';
import EmptyState from '../components/primitives/EmptyState.jsx';
import Avatar from '../components/primitives/Avatar.jsx';
import { CATEGORY, CATEGORY_LABELS, STATUS } from '../constants.js';
import {
  PlusCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RotateCw,
  Flame,
  CheckCircle2,
  Inbox,
  Filter,
} from 'lucide-react';

const CATEGORY_CHIPS = [
  { id: '', label: 'All Issues' },
  { id: CATEGORY.POTHOLE, label: 'Potholes' },
  { id: CATEGORY.GARBAGE, label: 'Garbage' },
  { id: CATEGORY.STREETLIGHT, label: 'Streetlights' },
  { id: CATEGORY.WATER_LEAKAGE, label: 'Water Leaks' },
  { id: CATEGORY.DRAINAGE, label: 'Drainage' },
  { id: CATEGORY.OTHER, label: 'Other' },
];

export default function FeedPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [issues, setIssues] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Sort
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || 'recent'; // 'recent' | 'top'
  const searchQuery = searchParams.get('search') || '';

  // Right-rail data (Trending & Resolved)
  const [trendingIssues, setTrendingIssues] = useState([]);
  const [recentlyResolved, setRecentlyResolved] = useState([]);

  // Fetch feed issues
  const fetchFeed = useCallback(
    async (isInitial = true, cursorToUse = null) => {
      if (isInitial) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await listIssues({
          category: currentCategory || undefined,
          sort: currentSort,
          limit: 10,
          cursor: cursorToUse || undefined,
        });

        if (isInitial) {
          let items = res.items || [];
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(
              (i) =>
                i.title.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q) ||
                (i.location?.address && i.location.address.toLowerCase().includes(q))
            );
          }
          setIssues(items);
        } else {
          setIssues((prev) => [...prev, ...(res.items || [])]);
        }
        setNextCursor(res.nextCursor || null);
      } catch (err) {
        setError(err.message || 'Failed to load issues feed');
        toast.error(err.message || 'Error loading issues', 'Feed Error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentCategory, currentSort, searchQuery, toast]
  );

  // Fetch right rail widgets once
  const fetchRightRail = useCallback(async () => {
    try {
      // Top 3 by supports
      const topRes = await listIssues({ sort: 'top', limit: 3 });
      setTrendingIssues(topRes.items || []);

      // Recently resolved
      const resolvedRes = await listIssues({ status: STATUS.RESOLVED, limit: 3 });
      setRecentlyResolved(resolvedRes.items || []);
    } catch {
      // Silently fail right-rail widgets without disrupting main feed
    }
  }, []);

  useEffect(() => {
    fetchFeed(true, null);
  }, [fetchFeed]);

  useEffect(() => {
    fetchRightRail();
  }, [fetchRightRail]);

  const handleCategorySelect = (catId) => {
    const nextParams = new URLSearchParams(searchParams);
    if (catId) {
      nextParams.set('category', catId);
    } else {
      nextParams.delete('category');
    }
    setSearchParams(nextParams);
  };

  const handleSortToggle = (newSort) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('sort', newSort);
    setSearchParams(nextParams);
  };

  // Optimistic Support / Upvote
  const handleSupportToggle = async (issueId) => {
    // 1. Snapshot previous state
    const previousIssues = [...issues];
    const previousTrending = [...trendingIssues];

    // 2. Optimistic state mutation
    const updateList = (list) =>
      list.map((item) => {
        if (item.issueId === issueId) {
          const wasUpvoted = item.viewerHasUpvoted;
          return {
            ...item,
            viewerHasUpvoted: !wasUpvoted,
            upvoteCount: wasUpvoted ? Math.max(0, item.upvoteCount - 1) : item.upvoteCount + 1,
          };
        }
        return item;
      });

    setIssues(updateList(previousIssues));
    setTrendingIssues(updateList(previousTrending));

    // 3. Call API
    try {
      const result = await toggleUpvote(issueId);
      // Re-sync with authoritative server count
      const syncList = (list) =>
        list.map((item) => {
          if (item.issueId === issueId) {
            return {
              ...item,
              viewerHasUpvoted: result.upvoted,
              upvoteCount: result.upvoteCount,
            };
          }
          return item;
        });
      setIssues(syncList);
      setTrendingIssues(syncList);

      toast.success(
        result.upvoted
          ? 'You supported this grievance. Authority priority increased!'
          : 'Support removed.',
        'Civic Support'
      );
    } catch (err) {
      // Rollback on failure
      setIssues(previousIssues);
      setTrendingIssues(previousTrending);
      toast.error('Failed to register support. Please try again.', 'Action Failed');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ============================================================ */}
      {/* MAIN FEED COLUMN (8 cols on lg) */}
      {/* ============================================================ */}
      <div className="lg:col-span-8 space-y-5 text-left">

        {/* 1. Composer Card (Matches Stitch 01_home_feed) */}
        <div className="bg-surface-lowest rounded-2xl border border-outline-variant p-4 sm:p-5 shadow-card hover:shadow-elevated transition-all flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name || 'Asha Patil'} size="md" />
            <button
              type="button"
              onClick={() => navigate('/report')}
              className="flex-1 bg-surface-low hover:bg-surface-high/70 text-muted hover:text-text rounded-xl px-4 py-2.5 text-xs sm:text-sm text-left transition-colors border border-outline-variant/50 cursor-pointer flex items-center justify-between"
            >
              <span className="truncate">Report a pothole, broken streetlight or civic hazard...</span>
              <Sparkles className="w-4 h-4 text-accent shrink-0 ml-2" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
            <div className="hidden sm:flex items-center gap-2 text-muted text-[11px]">
              <span className="font-semibold text-text">Quick tags:</span>
              <button
                type="button"
                onClick={() => navigate('/report?category=POTHOLE')}
                className="hover:text-primary transition-colors font-medium"
              >
                #Pothole
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => navigate('/report?category=GARBAGE')}
                className="hover:text-primary transition-colors font-medium"
              >
                #Garbage
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => navigate('/report?category=STREETLIGHT')}
                className="hover:text-primary transition-colors font-medium"
              >
                #Streetlight
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/report')}
              startIcon={<PlusCircle className="w-4 h-4 text-accent" />}
              className="ml-auto"
            >
              Report Issue
            </Button>
          </div>
        </div>

        {/* 2. Filter & Sort Bar */}
        <div className="bg-surface-lowest rounded-2xl border border-outline-variant p-3 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Category Filter Chips Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORY_CHIPS.map((chip) => (
              <FilterChip
                key={chip.id}
                label={chip.label}
                active={currentCategory === chip.id}
                onClick={() => handleCategorySelect(chip.id)}
              />
            ))}
          </div>

          {/* Sort Toggle (Recent vs Top) */}
          <div className="flex items-center gap-1 bg-surface-low p-1 rounded-xl border border-outline-variant/60 shrink-0 self-end sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => handleSortToggle('recent')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currentSort === 'recent'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Recent
            </button>
            <button
              type="button"
              onClick={() => handleSortToggle('top')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                currentSort === 'top'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-accent" />
              <span>Most Supported</span>
            </button>
          </div>
        </div>

        {/* Search Query Pill (if active) */}
        {searchQuery && (
          <div className="flex items-center justify-between bg-surface-low px-4 py-2 rounded-xl text-xs text-text border border-outline-variant/60">
            <span>
              Showing results for: <strong className="text-primary">"{searchQuery}"</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('search');
                setSearchParams(nextParams);
              }}
              className="font-bold text-error hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* 3. Issue Cards List */}
        {loading ? (
          /* Skeleton Loading State */
          <div className="space-y-4">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        ) : error ? (
          /* Error State with Retry */
          <div className="bg-surface-lowest rounded-2xl border border-rose-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-text">Failed to Load Feed</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">{error}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fetchFeed(true, null)}
              startIcon={<RotateCw className="w-4 h-4" />}
            >
              Retry
            </Button>
          </div>
        ) : issues.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={<Inbox className="w-10 h-10 text-muted" />}
            title="No grievances found"
            description={
              currentCategory
                ? `No issues reported under "${CATEGORY_LABELS[currentCategory] || currentCategory}".`
                : 'No issues match your current filters. Be the first to report an issue in your ward!'
            }
            action={
              <Button variant="primary" size="sm" onClick={() => navigate('/report')}>
                Report New Issue
              </Button>
            }
          />
        ) : (
          /* Feed Cards */
          <div className="space-y-4">
            {issues.map((issue) => (
              <IssueCard
                key={issue.issueId}
                issue={issue}
                onSupport={() => handleSupportToggle(issue.issueId)}
                onClick={() => navigate(`/issues/${issue.issueId}`)}
              />
            ))}

            {/* Load More Button */}
            {nextCursor && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="md"
                  loading={loadingMore}
                  onClick={() => fetchFeed(false, nextCursor)}
                  className="w-full sm:w-auto px-8"
                >
                  Load More Issues
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RIGHT RAIL: Trending in your ward & Recently resolved (4 cols) */}
      {/* ============================================================ */}
      <aside className="lg:col-span-4 space-y-5 text-left sticky top-22">

        {/* 1. Trending in your ward */}
        <div className="bg-surface-lowest rounded-2xl border border-outline-variant p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/20 text-accent-dark">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-text">Trending in Ward</h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Most Voted
            </span>
          </div>

          <div className="space-y-3">
            {trendingIssues.length > 0 ? (
              trendingIssues.map((item, idx) => (
                <div
                  key={item.issueId}
                  onClick={() => navigate(`/issues/${item.issueId}`)}
                  className="p-3 rounded-xl bg-surface-low hover:bg-surface-high/60 transition-all cursor-pointer flex flex-col gap-1.5 group"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <CategoryTag category={item.category} size="sm" />
                    <span className="font-extrabold text-accent-dark flex items-center gap-1">
                      👍 {item.upvoteCount} supports
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-muted truncate">
                    {item.location?.address}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">No trending issues yet.</p>
            )}
          </div>
        </div>

        {/* 2. Recently Resolved Card */}
        <div className="bg-surface-lowest rounded-2xl border border-outline-variant p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-text">Recently Resolved</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Fixed
            </span>
          </div>

          <div className="space-y-3">
            {recentlyResolved.length > 0 ? (
              recentlyResolved.map((item) => (
                <div
                  key={item.issueId}
                  onClick={() => navigate(`/issues/${item.issueId}`)}
                  className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col gap-1.5 group"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <StatusBadge status={item.status} size="sm" />
                    <span className="text-[10px] text-muted truncate">
                      {item.department ? item.department : 'Municipal Corp'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  {item.statusHistory?.[item.statusHistory.length - 1]?.note && (
                    <p className="text-[11px] text-emerald-900/80 line-clamp-1 italic">
                      "{item.statusHistory[item.statusHistory.length - 1].note}"
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">No recently resolved issues.</p>
            )}
          </div>
        </div>

      </aside>
    </div>
  );
}
