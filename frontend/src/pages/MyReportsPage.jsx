import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listIssues } from '../api/issues.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/primitives/Toast.jsx';
import StatusBadge from '../components/domain/StatusBadge.jsx';
import CategoryTag from '../components/domain/CategoryTag.jsx';
import ProgressStepper from '../components/domain/ProgressStepper.jsx';
import Button from '../components/primitives/Button.jsx';
import Skeleton from '../components/primitives/Skeleton.jsx';
import EmptyState from '../components/primitives/EmptyState.jsx';
import { STATUS } from '../constants.js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  FileText,
  Clock,
  CheckCircle2,
  PlusCircle,
  MapPin,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  RotateCw,
  FolderOpen,
} from 'lucide-react';

dayjs.extend(relativeTime);

export default function MyReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'open' | 'resolved'

  const fetchMyReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listIssues({ mine: true, limit: 50 });
      setIssues(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load your reports');
      toast.error(err.message || 'Error fetching user reports', 'Network Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  // Compute KPI counts from user's reports
  const totalCount = issues.length;
  const inProgressCount = useMemo(
    () =>
      issues.filter((i) =>
        [STATUS.VERIFIED, STATUS.ASSIGNED, STATUS.IN_PROGRESS].includes(i.status)
      ).length,
    [issues]
  );
  const resolvedCount = useMemo(
    () => issues.filter((i) => i.status === STATUS.RESOLVED).length,
    [issues]
  );

  // Filter issues based on active tab
  const filteredIssues = useMemo(() => {
    if (activeTab === 'open') {
      return issues.filter((i) =>
        [STATUS.PENDING_VERIFICATION, STATUS.VERIFIED, STATUS.ASSIGNED, STATUS.IN_PROGRESS].includes(
          i.status
        )
      );
    }
    if (activeTab === 'resolved') {
      return issues.filter((i) =>
        [STATUS.RESOLVED, STATUS.REJECTED].includes(i.status)
      );
    }
    return issues;
  }, [issues, activeTab]);

  return (
    <div className="max-w-5xl mx-auto space-y-7 text-left">
      {/* 1. Header & Title Banner */}
      <div className="bg-surface-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono block">
            Resident Profile &bull; Grievance Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text mt-0.5">
            My Reported Issues
          </h1>
          <p className="text-xs text-muted mt-1">
            Track real-time progress on problems you reported in Ward K-West.
          </p>
        </div>

        <Link to="/report">
          <Button
            variant="primary"
            size="md"
            startIcon={<PlusCircle className="w-4 h-4 text-accent" />}
          >
            Report New Issue
          </Button>
        </Link>
      </div>

      {/* 2. Three Summary KPI Tiles (Matches Stitch 03_my_reports) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tile 1: Total Reports */}
        <div className="bg-surface-lowest p-5 rounded-2xl border border-outline-variant shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Total Filed
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-text mt-3">
            {loading ? '...' : totalCount}
          </div>
          <span className="text-[11px] text-muted mt-1">All-time citizen grievances</span>
        </div>

        {/* Tile 2: In Progress */}
        <div className="bg-[#FEF3E2] p-5 rounded-2xl border border-amber-200/80 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2 rounded-xl bg-amber-200/60 text-amber-900">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-950 mt-3">
            {loading ? '...' : inProgressCount}
          </div>
          <span className="text-[11px] text-amber-900/80 mt-1">Under verification / work orders</span>
        </div>

        {/* Tile 3: Resolved */}
        <div className="bg-[#DCFCE7]/60 p-5 rounded-2xl border border-emerald-200 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Resolved & Fixed
            </span>
            <div className="p-2 rounded-xl bg-emerald-200/70 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-950 mt-3">
            {loading ? '...' : resolvedCount}
          </div>
          <span className="text-[11px] text-emerald-900/80 mt-1">Inspected and cleared</span>
        </div>
      </div>

      {/* 3. Filter Tabs (All / Open / Resolved) */}
      <div className="bg-surface-lowest p-2 rounded-2xl border border-outline-variant shadow-subtle flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-primary-container text-white shadow-xs'
                : 'text-muted hover:text-text hover:bg-surface-low'
            }`}
          >
            All Reports ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'open'
                ? 'bg-primary-container text-white shadow-xs'
                : 'text-muted hover:text-text hover:bg-surface-low'
            }`}
          >
            Open / Active ({inProgressCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'resolved'
                ? 'bg-primary-container text-white shadow-xs'
                : 'text-muted hover:text-text hover:bg-surface-low'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <button
          type="button"
          onClick={fetchMyReports}
          aria-label="Refresh reports"
          className="p-2 text-muted hover:text-text hover:bg-surface-low rounded-xl transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4. Compact Report Cards with ProgressStepper */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton variant="card" height="10rem" />
          <Skeleton variant="card" height="10rem" />
        </div>
      ) : error ? (
        <div className="bg-surface-lowest rounded-2xl border border-rose-200 p-8 text-center space-y-3">
          <h3 className="text-base font-bold text-text">Failed to load reports</h3>
          <p className="text-xs text-muted">{error}</p>
          <Button variant="primary" size="sm" onClick={fetchMyReports}>
            Retry
          </Button>
        </div>
      ) : filteredIssues.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-10 h-10 text-muted" />}
          title="No reports in this tab"
          description={
            activeTab === 'all'
              ? 'You have not submitted any civic grievances yet.'
              : `You have zero reports currently under "${activeTab}" status.`
          }
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/report')}>
              File a Report Now
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const latestNote =
              issue.statusHistory?.[issue.statusHistory.length - 1]?.note ||
              'Awaiting initial municipal inspection.';
            const timeAgo = issue.createdAt ? dayjs(issue.createdAt).fromNow() : 'Recently';

            return (
              <article
                key={issue.issueId}
                className="bg-surface-lowest rounded-2xl border border-outline-variant p-5 sm:p-6 shadow-card hover:shadow-elevated transition-all flex flex-col gap-4 text-left"
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <CategoryTag category={issue.category} size="sm" />
                    <span className="text-[11px] text-muted">&bull; Filed {timeAgo}</span>
                  </div>
                  <StatusBadge status={issue.status} size="sm" />
                </div>

                {/* Title & Location */}
                <div className="space-y-1">
                  <Link
                    to={`/issues/${issue.issueId}`}
                    className="font-bold text-base sm:text-lg text-text hover:text-primary transition-colors block leading-snug"
                  >
                    {issue.title}
                  </Link>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{issue.location?.address}</span>
                  </div>
                </div>

                {/* Latest Status History Note */}
                <div className="bg-surface-low/80 border border-outline-variant/40 rounded-xl p-3 text-xs text-text flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold block text-[11px] text-muted">Latest Municipal Update:</span>
                    <p className="italic text-text mt-0.5">"{latestNote}"</p>
                  </div>
                </div>

                {/* 5-Step Horizontal Progress Tracker */}
                <div className="pt-1">
                  <ProgressStepper currentStatus={issue.status} />
                </div>

                {/* Footer link */}
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
                  <span className="text-muted font-mono text-[11px]">ID: {issue.issueId}</span>
                  <Link
                    to={`/issues/${issue.issueId}`}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    View Full Audit Trail <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
