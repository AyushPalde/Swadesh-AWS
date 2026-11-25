import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ClipboardList,
  Search,
  Filter,
  ArrowUpDown,
  ArrowLeft,
  RotateCcw,
  MapPin,
  ThumbsUp,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';

import { listIssues } from '../api/issues.js';
import {
  STATUS,
  STATUS_LABELS,
  CATEGORY,
  CATEGORY_LABELS,
  PRIORITY,
  PRIORITY_LABELS,
} from '../constants.js';
import { useToast } from '../components/primitives/Toast.jsx';
import StatusBadge from '../components/domain/StatusBadge.jsx';
import PriorityBadge from '../components/domain/PriorityBadge.jsx';
import CategoryTag from '../components/domain/CategoryTag.jsx';
import Button from '../components/primitives/Button.jsx';
import Skeleton from '../components/primitives/Skeleton.jsx';
import EmptyState from '../components/primitives/EmptyState.jsx';

dayjs.extend(relativeTime);

export default function AuthorityIssuesPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // Issue data and pagination state
  const [issues, setIssues] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortOption, setSortOption] = useState('recent'); // 'recent' | 'oldest' | 'top'

  // Fetch initial or reset page
  const fetchIssuesList = useCallback(
    async (cursor = null, isAppend = false) => {
      if (isAppend) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const apiSort = sortOption === 'top' ? 'top' : 'recent';
        const params = {
          limit: 20,
          cursor,
          sort: apiSort,
        };

        if (statusFilter) params.status = statusFilter;
        if (categoryFilter) params.category = categoryFilter;

        const res = await listIssues(params);
        let items = res?.items || [];

        // If sorting oldest on client when sortOption === 'oldest'
        if (sortOption === 'oldest') {
          items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }

        if (isAppend) {
          setIssues((prev) => [...prev, ...items]);
        } else {
          setIssues(items);
        }

        setNextCursor(res?.nextCursor || null);
      } catch (err) {
        console.error('Failed to list issues for authority:', err);
        setError(err.message || 'Failed to load issues');
        toast.error(err.message || 'Failed to load issues list', 'Error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, categoryFilter, sortOption, toast]
  );

  // Trigger initial fetch or re-fetch on filter change
  useEffect(() => {
    fetchIssuesList();
  }, [fetchIssuesList]);

  // Handle Load More
  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchIssuesList(nextCursor, true);
    }
  };

  // Client-side search and priority filtering on loaded items
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Priority filter
      if (priorityFilter && issue.priority !== priorityFilter) {
        return false;
      }

      // Text search query: matches title, address, reporter, or ticket ID
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = issue.title?.toLowerCase().includes(query);
        const addressMatch = issue.location?.address?.toLowerCase().includes(query);
        const idMatch = (issue.issueId || issue.id || '').toLowerCase().includes(query);
        const reporterMatch = issue.reporterName?.toLowerCase().includes(query);
        if (!titleMatch && !addressMatch && !idMatch && !reporterMatch) {
          return false;
        }
      }

      return true;
    });
  }, [issues, priorityFilter, searchQuery]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setSortOption('recent');
  };

  const hasActiveFilters = Boolean(
    searchQuery || statusFilter || categoryFilter || priorityFilter || sortOption !== 'recent'
  );

  return (
    <div className="space-y-6 text-left pb-16">
      {/* 1. PAGE HEADER (Matches Stitch 05 / 07 style) */}
      <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/authority"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono block">
            Ward K-West Municipal Central
          </span>
          <h1 className="text-2xl font-extrabold text-text mt-1">All Ward Grievances</h1>
          <p className="text-xs text-muted mt-1">
            Search, filter by department, verify hazard priority, and assign maintenance teams.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-4 py-2 rounded-xl bg-surface-low border border-outline-variant flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-primary" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted block">
                Total Loaded Issues
              </span>
              <span className="text-base font-extrabold text-text font-mono">
                {filteredIssues.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR (Robust Stitch Grid Filter) */}
      <div className="bg-surface-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket ID, title, landmark..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-low border border-outline-variant text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-low border border-outline-variant text-text focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-low border border-outline-variant text-text focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="lg:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-low border border-outline-variant text-text focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="lg:col-span-2">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-low border border-outline-variant text-text focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="recent">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="top">Most Supported</option>
            </select>
          </div>
        </div>

        {/* Filter Badges & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60 text-xs">
            <span className="text-muted">
              Filtered to <strong className="text-text">{filteredIssues.length}</strong> of{' '}
              {issues.length} grievances
            </span>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 font-bold text-rose-600 hover:text-rose-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* 3. ERROR STATE */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="danger" onClick={() => fetchIssuesList()}>
            Retry
          </Button>
        </div>
      )}

      {/* 4. ISSUES TABLE (DESKTOP) & CARDS (MOBILE) */}
      <div className="bg-surface-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-card space-y-4">
        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredIssues.length === 0 ? (
          <EmptyState
            title="No Grievances Found"
            description={
              hasActiveFilters
                ? 'No issues match the selected filter criteria. Try adjusting search or reset filters.'
                : 'There are no civic grievances logged in this queue.'
            }
            actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
            onAction={handleResetFilters}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-low text-muted uppercase text-[10px] font-bold tracking-wider border-y border-outline-variant">
                  <tr>
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4 min-w-[260px]">Issue Summary</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 min-w-[160px]">Ward Location</th>
                    <th className="py-3 px-4">Reported</th>
                    <th className="py-3 px-4">Backing</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 text-text">
                  {filteredIssues.map((issue) => {
                    const issueKey = issue.issueId || issue.id;
                    const timeAgo = dayjs(issue.createdAt).fromNow();

                    return (
                      <tr
                        key={issueKey}
                        className="hover:bg-surface-low/80 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/authority/issues/${issueKey}`)}
                      >
                        {/* Ticket ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                          #{issueKey.slice(-6).toUpperCase()}
                        </td>

                        {/* Summary */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {issue.imageUrl ? (
                              <img
                                src={issue.imageUrl}
                                alt=""
                                className="w-11 h-11 rounded-lg object-cover bg-surface-high shrink-0 border border-outline-variant"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-surface-high flex items-center justify-center shrink-0 border border-outline-variant text-muted">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-text truncate max-w-[240px] group-hover:text-primary transition-colors">
                                {issue.title}
                              </p>
                              <p className="text-muted text-[11px] truncate max-w-[240px]">
                                {issue.description}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CategoryTag category={issue.category} size="sm" />
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                            <span className="truncate max-w-[180px] text-muted">
                              {issue.location?.address || 'Ward K-West'}
                            </span>
                          </div>
                        </td>

                        {/* Reported */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold block">{timeAgo}</span>
                          <span className="text-muted text-[11px] block truncate max-w-[120px]">
                            {issue.reporterName || 'Citizen'}
                          </span>
                        </td>

                        {/* Backing */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent-dark font-bold font-mono text-[11px]">
                            <ThumbsUp className="w-3 h-3" />
                            {issue.upvoteCount || 0}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {issue.priority ? (
                            <PriorityBadge priority={issue.priority} size="sm" />
                          ) : (
                            <span className="text-[10px] font-semibold text-muted bg-surface-high px-2 py-0.5 rounded border border-outline-variant">
                              Pending Triage
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={issue.status} size="sm" />
                        </td>

                        {/* Review Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link
                            to={`/authority/issues/${issueKey}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden space-y-3">
              {filteredIssues.map((issue) => {
                const issueKey = issue.issueId || issue.id;
                const timeAgo = dayjs(issue.createdAt).fromNow();

                return (
                  <div
                    key={issueKey}
                    onClick={() => navigate(`/authority/issues/${issueKey}`)}
                    className="p-4 rounded-xl border border-outline-variant bg-surface-low/50 space-y-3 active:bg-surface-low"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        #{issueKey.slice(-6).toUpperCase()}
                      </span>
                      <StatusBadge status={issue.status} size="sm" />
                    </div>

                    <div className="flex items-start gap-3">
                      {issue.imageUrl && (
                        <img
                          src={issue.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0 border border-outline-variant"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-text line-clamp-1">{issue.title}</h4>
                        <p className="text-xs text-muted line-clamp-2 mt-0.5">
                          {issue.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/60">
                      <CategoryTag category={issue.category} size="sm" />
                      {issue.priority && <PriorityBadge priority={issue.priority} size="sm" />}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted ml-auto">
                        <ThumbsUp className="w-3 h-3 text-accent" /> {issue.upvoteCount || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                      <span>{timeAgo}</span>
                      <Link
                        to={`/authority/issues/${issueKey}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary font-bold hover:underline"
                      >
                        Review Issue →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {nextCursor && (
              <div className="pt-4 text-center">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleLoadMore}
                  isLoading={loadingMore}
                  className="w-full sm:w-auto px-8"
                >
                  Load More Grievances
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
