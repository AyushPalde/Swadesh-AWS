import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getIssue, toggleUpvote } from '../api/issues.js';
import { useToast } from '../components/primitives/Toast.jsx';
import StatusBadge from '../components/domain/StatusBadge.jsx';
import PriorityBadge from '../components/domain/PriorityBadge.jsx';
import CategoryTag from '../components/domain/CategoryTag.jsx';
import StatusTimeline from '../components/domain/StatusTimeline.jsx';
import ProgressStepper from '../components/domain/ProgressStepper.jsx';
import Avatar from '../components/primitives/Avatar.jsx';
import Button from '../components/primitives/Button.jsx';
import Skeleton from '../components/primitives/Skeleton.jsx';
import { DEPARTMENTS } from '../constants.js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ArrowLeft,
  MapPin,
  ThumbsUp,
  Building2,
  UserCheck,
  Clock,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

dayjs.extend(relativeTime);

export default function IssueDetailPage() {
  const { id } = useParams();
  const toast = useToast();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supporting, setSupporting] = useState(false);

  const fetchIssueDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIssue(id);
      setIssue(data);
    } catch (err) {
      setError(err.message || 'Issue not found');
      toast.error(err.message || 'Failed to load issue details', 'Not Found');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchIssueDetail();
  }, [fetchIssueDetail]);

  // Optimistic Support Action
  const handleSupport = async () => {
    if (!issue || supporting) return;

    const previousIssue = { ...issue };
    const wasUpvoted = issue.viewerHasUpvoted;

    // 1. Optimistic update
    setIssue((prev) => ({
      ...prev,
      viewerHasUpvoted: !wasUpvoted,
      upvoteCount: wasUpvoted ? Math.max(0, prev.upvoteCount - 1) : prev.upvoteCount + 1,
    }));

    // 2. Call API
    setSupporting(true);
    try {
      const res = await toggleUpvote(id);
      setIssue((prev) => ({
        ...prev,
        viewerHasUpvoted: res.upvoted,
        upvoteCount: res.upvoteCount,
      }));
      toast.success(
        res.upvoted
          ? 'You supported this issue. Ward engineers have been notified.'
          : 'Support removed.',
        'Civic Support'
      );
    } catch (err) {
      setIssue(previousIssue);
      toast.error('Could not update support status. Please try again.', 'Action Failed');
    } finally {
      setSupporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="card" height="18rem" />
        <Skeleton variant="text" count={3} />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-surface-lowest border border-outline-variant shadow-card text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-text">Grievance Not Found</h2>
        <p className="text-xs text-muted leading-relaxed">
          The requested issue ID <code className="font-mono font-bold text-primary">{id}</code> could not be located.
        </p>
        <Link to="/">
          <Button variant="primary" size="sm" startIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Feed
          </Button>
        </Link>
      </div>
    );
  }

  const departmentName = DEPARTMENTS[issue.department] || issue.department;
  const timeAgo = issue.createdAt ? dayjs(issue.createdAt).fromNow() : 'Recently';
  const formattedCreated = issue.createdAt ? dayjs(issue.createdAt).format('MMMM D, YYYY · h:mm A') : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>
        <span className="text-[11px] font-mono text-muted">ID: {issue.issueId}</span>
      </div>

      {/* Main Issue Card */}
      <div className="bg-surface-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-card space-y-6">

        {/* Top Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryTag category={issue.category} size="md" />
            {issue.priority && <PriorityBadge priority={issue.priority} size="md" />}
          </div>
          <StatusBadge status={issue.status} size="md" />
        </div>

        {/* Issue Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight leading-snug">
          {issue.title}
        </h1>

        {/* Reporter Info & Timestamp */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-low border border-outline-variant/40 text-xs">
          <div className="flex items-center gap-3">
            <Avatar name={issue.reporterName} size="md" />
            <div>
              <div className="flex items-center gap-1.5 font-bold text-text">
                <span>{issue.reporterName}</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.2 rounded-full">
                  Resident
                </span>
              </div>
              <span className="text-[11px] text-muted">Reported {timeAgo} &bull; {formattedCreated}</span>
            </div>
          </div>

          {/* Upvote Button in Header */}
          <button
            type="button"
            onClick={handleSupport}
            aria-pressed={issue.viewerHasUpvoted}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              issue.viewerHasUpvoted
                ? 'bg-accent/20 border-accent text-accent-dark shadow-subtle'
                : 'bg-surface-lowest border-outline-variant text-text hover:bg-surface-high active:scale-95'
            } cursor-pointer`}
          >
            <ThumbsUp
              className={`w-4 h-4 ${
                issue.viewerHasUpvoted ? 'fill-accent text-accent-dark' : 'text-muted'
              }`}
            />
            <span>{issue.viewerHasUpvoted ? 'Supported' : 'Support'}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                issue.viewerHasUpvoted ? 'bg-accent text-accent-dark' : 'bg-surface-low text-muted'
              }`}
            >
              {issue.upvoteCount}
            </span>
          </button>
        </div>

        {/* Large Image Preview (if present) */}
        {issue.imageUrl && (
          <div className="w-full max-h-96 rounded-2xl overflow-hidden bg-surface-low border border-outline-variant/50 shadow-inner">
            <img
              src={issue.imageUrl}
              alt={issue.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Full Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Grievance Description
          </h3>
          <p className="text-sm text-text leading-relaxed whitespace-pre-line bg-surface-low/50 p-4 rounded-2xl border border-outline-variant/30">
            {issue.description}
          </p>
        </div>

        {/* Location & GPS Coords */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Incident Location & Geotag
          </h3>
          <div className="p-4 rounded-2xl bg-surface-low border border-outline-variant/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary text-white">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-text text-sm block">{issue.location?.address}</span>
                <span className="text-[11px] text-muted">Ward K-West Municipal Jurisdiction</span>
              </div>
            </div>

            {issue.location?.lat && issue.location?.lng && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-end sm:self-auto font-mono">
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>{issue.location.lat.toFixed(4)}, {issue.location.lng.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Municipal Assignment Details (when assigned) */}
        {(departmentName || issue.assignedTo) && (
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-primary font-bold">
              <Building2 className="w-4 h-4" />
              <span>Municipal Work Order Dispatch</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {departmentName && (
                <div>
                  <span className="text-muted block text-[11px]">Responsible Department:</span>
                  <strong className="text-text text-xs">{departmentName}</strong>
                </div>
              )}
              {issue.assignedTo && (
                <div>
                  <span className="text-muted block text-[11px]">Assigned Engineer / Crew:</span>
                  <strong className="text-text text-xs">{issue.assignedTo}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5-Stage Lifecycle Stepper */}
        <div className="pt-2">
          <ProgressStepper currentStatus={issue.status} />
        </div>

        {/* Status Audit Log Timeline */}
        <div className="space-y-3 pt-4 border-t border-outline-variant/40">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" /> Official Status Audit Trail
            </h3>
            <span className="text-xs text-muted">{issue.statusHistory?.length || 0} transitions</span>
          </div>

          <StatusTimeline statusHistory={issue.statusHistory || []} />
        </div>

      </div>
    </div>
  );
}
