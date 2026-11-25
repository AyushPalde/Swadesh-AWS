import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  LayoutDashboard,
  Layers,
  Clock,
  Hammer,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  Shield,
  Download,
  Filter,
  RefreshCw,
  MapPin,
  ThumbsUp,
  ExternalLink,
} from 'lucide-react';

import { getStats } from '../api/stats.js';
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
import StatCard from '../components/domain/StatCard.jsx';
import StatusBadge from '../components/domain/StatusBadge.jsx';
import PriorityBadge from '../components/domain/PriorityBadge.jsx';
import CategoryTag from '../components/domain/CategoryTag.jsx';
import Skeleton from '../components/primitives/Skeleton.jsx';
import EmptyState from '../components/primitives/EmptyState.jsx';
import Button from '../components/primitives/Button.jsx';

dayjs.extend(relativeTime);

// Semantic Color Mappings for Recharts
const CATEGORY_COLORS = {
  [CATEGORY.POTHOLE]: '#0F5C5C',
  [CATEGORY.GARBAGE]: '#F59E0B',
  [CATEGORY.STREETLIGHT]: '#4F46E5',
  [CATEGORY.WATER_LEAKAGE]: '#0284C7',
  [CATEGORY.DRAINAGE]: '#E11D48',
  [CATEGORY.OTHER]: '#64748B',
};

const STATUS_COLORS = {
  [STATUS.PENDING_VERIFICATION]: '#F59E0B',
  [STATUS.VERIFIED]: '#0284C7',
  [STATUS.ASSIGNED]: '#8B5CF6',
  [STATUS.IN_PROGRESS]: '#EA580C',
  [STATUS.RESOLVED]: '#10B981',
  [STATUS.REJECTED]: '#E11D48',
};

export default function AuthorityDashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [pendingIssues, setPendingIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter toolbar for table
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch stats and pending issues
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsData, issuesData] = await Promise.all([
        getStats(),
        listIssues({ status: STATUS.PENDING_VERIFICATION, sort: 'recent' }),
      ]);

      setStats(statsData);

      // Sort pending issues: oldest first so SLA priority tickets appear first
      const items = (issuesData?.items || []).slice();
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setPendingIssues(items);

      if (isRefresh) {
        toast.success('Dashboard metrics refreshed successfully');
      }
    } catch (err) {
      console.error('Failed to load authority dashboard data:', err);
      setError(err.message || 'Unable to load dashboard data');
      toast.error(err.message || 'Failed to load authority data', 'Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Prepare Category Bar Chart Data
  const categoryChartData = useMemo(() => {
    if (!stats?.byCategory) return [];
    return Object.entries(stats.byCategory).map(([catKey, count]) => ({
      name: CATEGORY_LABELS[catKey] ? CATEGORY_LABELS[catKey].split(' ')[0] : catKey,
      fullName: CATEGORY_LABELS[catKey] || catKey,
      categoryKey: catKey,
      count: count || 0,
      fill: CATEGORY_COLORS[catKey] || '#64748B',
    }));
  }, [stats]);

  // Total Category Count for % calculation
  const totalCategoryIssues = useMemo(() => {
    return categoryChartData.reduce((acc, item) => acc + item.count, 0) || 1;
  }, [categoryChartData]);

  // Prepare Status Pie/Donut Chart Data
  const statusChartData = useMemo(() => {
    if (!stats?.byStatus) return [];
    const validStatuses = [
      STATUS.PENDING_VERIFICATION,
      STATUS.VERIFIED,
      STATUS.ASSIGNED,
      STATUS.IN_PROGRESS,
      STATUS.RESOLVED,
      STATUS.REJECTED,
    ];

    return validStatuses
      .map((st) => ({
        name: STATUS_LABELS[st] || st,
        statusKey: st,
        value: stats.byStatus[st] || 0,
        color: STATUS_COLORS[st] || '#64748B',
      }))
      .filter((item) => item.value > 0);
  }, [stats]);

  const totalStatusIssues = useMemo(() => {
    return statusChartData.reduce((acc, item) => acc + item.value, 0) || 0;
  }, [statusChartData]);

  // Filter pending attention table items
  const filteredPendingIssues = useMemo(() => {
    return pendingIssues.filter((issue) => {
      if (categoryFilter && issue.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = issue.title?.toLowerCase().includes(query);
        const addressMatch = issue.location?.address?.toLowerCase().includes(query);
        const idMatch = (issue.issueId || issue.id || '').toLowerCase().includes(query);
        const reporterMatch = issue.reporterName?.toLowerCase().includes(query);
        if (!titleMatch && !addressMatch && !idMatch && !reporterMatch) return false;
      }
      return true;
    }).slice(0, 8); // Top 8 oldest pending
  }, [pendingIssues, categoryFilter, searchQuery]);

  // Export CSV Action Simulation
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Ticket ID,Title,Category,Status,Priority,Reporter,Location,Date']
        .concat(
          pendingIssues.map(
            (i) =>
              `"${i.issueId || i.id}","${(i.title || '').replace(/"/g, '""')}","${
                i.category
              }","${i.status}","${i.priority || 'UNASSIGNED'}","${
                i.reporterName || 'Citizen'
              }","${(i.location?.address || '').replace(/"/g, '""')}","${i.createdAt}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `swadesh_ward_kwest_triage_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Ward triage CSV dossier downloaded');
  };

  return (
    <div className="space-y-6 text-left pb-12">
      {/* 1. TOP MUNICIPAL COMMAND HEADER BAR (Matches Stitch 05_authority_dashboard lines 7-35) */}
      <div className="bg-surface-lowest p-5 rounded-2xl border border-outline-variant shadow-card flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-low border border-outline-variant text-text">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-muted uppercase font-mono">
              Command Grid Active
            </span>
          </div>
          <div className="flex items-center gap-2 text-text">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="text-sm sm:text-base font-extrabold block">
                Brihanmumbai Municipal Corporation (BMC)
              </span>
              <span className="text-xs text-muted">
                Ward K-West Operations (Andheri West, Juhu, Versova)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadDashboardData(true)}
            isLoading={refreshing}
            startIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            startIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Ward CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/authority/issues')}
            endIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            All Ward Issues
          </Button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="danger" onClick={() => loadDashboardData()}>
            Try Again
          </Button>
        </div>
      )}

      {/* 2. ROW OF 4 KPI STAT CARDS (Matches Stitch 05_authority_dashboard lines 37-140) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-surface-lowest border border-outline-variant space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Logged Issues"
              value={stats?.totals?.total || 0}
              variant="primary"
              subtitle="Ward K-West Registered"
              trend="+12.4% vs last week"
              trendDirection="up"
              icon={<Layers className="w-5 h-5" />}
            />

            <StatCard
              title="Pending Verification"
              value={stats?.totals?.pending || 0}
              variant="accent"
              subtitle="Awaiting Field Triage"
              trend={stats?.totals?.pending > 0 ? `${stats.totals.pending} SLA attention` : 'Queue cleared'}
              trendDirection={stats?.totals?.pending > 0 ? 'up' : 'down'}
              icon={<Clock className="w-5 h-5" />}
            />

            <StatCard
              title="Active In-Progress"
              value={stats?.totals?.inProgress || 0}
              variant="blue"
              subtitle="Field Crews Dispatched"
              trend="Active maintenance crews"
              trendDirection="up"
              icon={<Hammer className="w-5 h-5" />}
            />

            <StatCard
              title="Resolved Grievances"
              value={stats?.totals?.resolved || 0}
              variant="emerald"
              subtitle="Civic Rectification"
              trend="+18.2% on-time"
              trendDirection="up"
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
          </>
        )}
      </div>

      {/* 3. TWO RECHARTS CARDS SIDE-BY-SIDE (Matches Stitch lines 142-298) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Issues by Category */}
        <div className="bg-surface-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base sm:text-lg font-bold text-text">Issues by Category</h2>
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Ward Grievance Load
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              Distribution across municipal engineering and sanitation divisions
            </p>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-56 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(15, 92, 92, 0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-surface-lowest p-2.5 rounded-lg border border-outline-variant shadow-elevated text-xs">
                                <p className="font-bold text-text">{data.fullName}</p>
                                <p className="text-primary font-extrabold mt-0.5">
                                  {data.count} issues ({Math.round((data.count / totalCategoryIssues) * 100)}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Horizontal Breakdown Bars (from Stitch 05 lines 152-214) */}
                <div className="mt-4 space-y-2.5 pt-4 border-t border-outline-variant/60">
                  {categoryChartData.map((item) => {
                    const percentage = Math.round((item.count / totalCategoryIssues) * 100);
                    return (
                      <div key={item.categoryKey}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-2 font-medium text-text truncate max-w-[220px]">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.fill }}
                            />
                            {item.fullName}
                          </span>
                          <span className="font-bold text-text shrink-0">
                            {item.count}{' '}
                            <span className="text-muted font-normal text-[11px]">
                              ({percentage}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.fill,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 2: Issues by Status */}
        <div className="bg-surface-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base sm:text-lg font-bold text-text">Issues by Status</h2>
              <span className="text-[11px] font-semibold text-muted bg-surface-low border border-outline-variant px-2.5 py-1 rounded-full">
                Ward Lifecycle
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              Real-time civic turnaround status distribution
            </p>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-56 w-full rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Donut Chart with Center Metric */}
                <div className="sm:col-span-6 flex justify-center relative">
                  <div className="h-52 w-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const pct = totalStatusIssues
                                ? Math.round((data.value / totalStatusIssues) * 100)
                                : 0;
                              return (
                                <div className="bg-surface-lowest p-2 rounded-lg border border-outline-variant shadow-elevated text-xs">
                                  <p className="font-bold text-text">{data.name}</p>
                                  <p className="text-primary font-bold mt-0.5">
                                    {data.value} tickets ({pct}%)
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-text">
                      {totalStatusIssues}
                    </span>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      Total Tickets
                    </span>
                  </div>
                </div>

                {/* Status Legend List */}
                <div className="sm:col-span-6 space-y-1.5">
                  {statusChartData.map((item) => {
                    const pct = totalStatusIssues
                      ? Math.round((item.value / totalStatusIssues) * 100)
                      : 0;
                    return (
                      <div
                        key={item.statusKey}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-surface-low border border-outline-variant/60 text-xs"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-text truncate">{item.name}</span>
                        </span>
                        <span className="font-bold text-text shrink-0 ml-2">
                          {item.value} <span className="font-normal text-muted text-[11px]">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-outline-variant/60 flex items-center justify-between bg-surface-low p-3 rounded-xl">
            <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" /> 30-Day SLA Fulfillment:
            </span>
            <span className="text-xs font-bold text-primary">84.2% on-time resolution</span>
          </div>
        </div>
      </div>

      {/* 4. FULL-WIDTH TABLE: ISSUES NEEDING ATTENTION (Oldest PENDING_VERIFICATION first, top 8) */}
      <div className="bg-surface-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-card space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-extrabold text-text">Issues Needing Attention</h2>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                {pendingIssues.length} pending verification
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              startIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download Triage List
            </Button>
          </div>

          {/* Quick Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-surface-low p-3 rounded-xl border border-outline-variant/60">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pending issues by title, landmark, or reporter..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-lowest border border-outline-variant text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-lowest border border-outline-variant text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Data */}
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredPendingIssues.length === 0 ? (
          <EmptyState
            title="No Pending Issues Found"
            description={
              searchQuery || categoryFilter
                ? 'No issues match the selected search or category filters.'
                : 'All grievances in Ward K-West have been verified and processed!'
            }
            actionLabel={searchQuery || categoryFilter ? 'Clear Filters' : undefined}
            onAction={() => {
              setSearchQuery('');
              setCategoryFilter('');
            }}
          />
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-low text-muted uppercase text-[10px] font-bold tracking-wider border-y border-outline-variant">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4 min-w-[240px]">Issue Summary</th>
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
                {filteredPendingIssues.map((issue) => {
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
                              className="w-10 h-10 rounded-lg object-cover bg-surface-high shrink-0 border border-outline-variant"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-surface-high flex items-center justify-center shrink-0 border border-outline-variant text-muted">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-text truncate max-w-[220px] group-hover:text-primary transition-colors">
                              {issue.title}
                            </p>
                            <p className="text-muted text-[11px] truncate max-w-[220px]">
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
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
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
        )}

        {/* View All Button Footer */}
        <div className="pt-2 flex items-center justify-between text-xs text-muted border-t border-outline-variant/60">
          <span>
            Displaying top {filteredPendingIssues.length} oldest pending grievances
          </span>
          <Link
            to="/authority/issues"
            className="text-primary font-bold hover:underline inline-flex items-center gap-1"
          >
            Open Complete Ward Queue <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
