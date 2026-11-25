import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ThumbsUp,
  AlertCircle,
  CheckCircle,
  Building2,
  UserCheck,
  Send,
  Shield,
  Layers,
  Lock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  RotateCw,
  Printer,
  Compass,
} from 'lucide-react';

import { getIssue, updateStatus, assignIssue } from '../api/issues.js';
import {
  STATUS,
  STATUS_LABELS,
  PRIORITY,
  PRIORITY_LABELS,
  CATEGORY,
  CATEGORY_LABELS,
  DEPARTMENTS,
  getNextStatuses,
} from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/primitives/Toast.jsx';
import StatusBadge from '../components/domain/StatusBadge.jsx';
import PriorityBadge from '../components/domain/PriorityBadge.jsx';
import CategoryTag from '../components/domain/CategoryTag.jsx';
import StatusTimeline from '../components/domain/StatusTimeline.jsx';
import Button from '../components/primitives/Button.jsx';
import Modal from '../components/primitives/Modal.jsx';
import Select from '../components/primitives/Select.jsx';
import Input from '../components/primitives/Input.jsx';
import Textarea from '../components/primitives/Textarea.jsx';
import Skeleton from '../components/primitives/Skeleton.jsx';
import EmptyState from '../components/primitives/EmptyState.jsx';

dayjs.extend(relativeTime);

export default function AuthorityReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Issue State
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action Panel Form State
  // 1. Pending Verification actions
  const [verifyPriority, setVerifyPriority] = useState(PRIORITY.HIGH);
  const [verifyNote, setVerifyNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  // 2. Assign action
  const [assignDept, setAssignDept] = useState('ROADS');
  const [assignedTo, setAssignedTo] = useState('JE Nilesh Sawant / Gangman Crew Alpha-4');

  // 3. In Progress action
  const [inProgressNote, setInProgressNote] = useState('');

  // 4. Resolve action
  const [resolveNote, setResolveNote] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    actionType: null, // 'VERIFY' | 'REJECT' | 'ASSIGN' | 'IN_PROGRESS' | 'RESOLVE'
    title: '',
    description: '',
  });
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Fetch issue details
  const fetchIssueDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIssue(id);
      setIssue(data);

      // Prepopulate department based on issue category if empty
      if (!data.department) {
        if (data.category === CATEGORY.POTHOLE) setAssignDept('ROADS');
        else if (data.category === CATEGORY.GARBAGE) setAssignDept('SANITATION');
        else if (data.category === CATEGORY.STREETLIGHT) setAssignDept('ELECTRICAL');
        else if (data.category === CATEGORY.WATER_LEAKAGE) setAssignDept('WATER');
        else if (data.category === CATEGORY.DRAINAGE) setAssignDept('WATER');
        else setAssignDept('ROADS');
      } else {
        setAssignDept(data.department);
      }

      if (data.assignedTo) {
        setAssignedTo(data.assignedTo);
      }
    } catch (err) {
      console.error('Failed to load issue for review:', err);
      setError(err.message || 'Issue not found');
      toast.error(err.message || 'Failed to load grievance details', 'Error');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchIssueDetail();
  }, [fetchIssueDetail]);

  // Allowed next statuses
  const allowedNextStatuses = useMemo(() => {
    return issue ? getNextStatuses(issue.status) : [];
  }, [issue]);

  // Open Confirmation Modal with context
  const handleInitiateAction = (actionType) => {
    if (actionType === 'VERIFY') {
      if (!verifyPriority) {
        toast.error('Please select a priority (Low, Medium, High)', 'Validation Error');
        return;
      }
      setConfirmModal({
        isOpen: true,
        actionType: 'VERIFY',
        title: 'Approve & Verify Grievance?',
        description: `This will mark grievance #${issue.issueId || issue.id} as VERIFIED with ${PRIORITY_LABELS[verifyPriority] || verifyPriority
          }. The ticket will advance to departmental dispatch queue.`,
      });
    } else if (actionType === 'REJECT') {
      if (!rejectNote.trim()) {
        toast.error('A rejection justification note is required', 'Validation Error');
        return;
      }
      setConfirmModal({
        isOpen: true,
        actionType: 'REJECT',
        title: 'Reject Grievance Ticket?',
        description: `Are you sure you want to REJECT grievance #${issue.issueId || issue.id
          }? This is a terminal action and will close the ticket with your justification note.`,
      });
    } else if (actionType === 'ASSIGN') {
      if (!assignDept || !DEPARTMENTS[assignDept]) {
        toast.error('Please select a valid municipal department', 'Validation Error');
        return;
      }
      if (!assignedTo.trim() || assignedTo.trim().length < 2) {
        toast.error('Please specify the designated field officer or repair crew', 'Validation Error');
        return;
      }
      setConfirmModal({
        isOpen: true,
        actionType: 'ASSIGN',
        title: `Dispatch to ${DEPARTMENTS[assignDept]}?`,
        description: `A municipal work order will be created and assigned to ${assignedTo.trim()} under ${DEPARTMENTS[assignDept]
          } with a statutory 24-hr turnaround SLA.`,
      });
    } else if (actionType === 'IN_PROGRESS') {
      setConfirmModal({
        isOpen: true,
        actionType: 'IN_PROGRESS',
        title: 'Mark Field Work In Progress?',
        description: `This will record that the assigned repair crew has mobilized to the site and commenced physical remediation.`,
      });
    } else if (actionType === 'RESOLVE') {
      if (!resolveNote.trim()) {
        toast.error('A resolution note describing completion is required', 'Validation Error');
        return;
      }
      setConfirmModal({
        isOpen: true,
        actionType: 'RESOLVE',
        title: 'Mark Grievance Resolved & Close?',
        description: `Are you sure you want to mark this grievance as RESOLVED? This certifies the work has been completed and closes the ticket.`,
      });
    }
  };

  // Execute Action via API
  const handleConfirmAction = async () => {
    if (!issue || !confirmModal.actionType) return;
    setActionSubmitting(true);

    const issueKey = issue.issueId || issue.id;

    try {
      if (confirmModal.actionType === 'VERIFY') {
        await updateStatus(issueKey, {
          status: STATUS.VERIFIED,
          priority: verifyPriority,
          note:
            verifyNote.trim() ||
            `Physically inspected and approved as ${PRIORITY_LABELS[verifyPriority] || verifyPriority}`,
        });
        toast.success(`Grievance #${issueKey.slice(-6).toUpperCase()} verified successfully`);
      } else if (confirmModal.actionType === 'REJECT') {
        await updateStatus(issueKey, {
          status: STATUS.REJECTED,
          note: rejectNote.trim(),
        });
        toast.success(`Grievance #${issueKey.slice(-6).toUpperCase()} rejected and closed`);
      } else if (confirmModal.actionType === 'ASSIGN') {
        await assignIssue(issueKey, {
          department: assignDept,
          assignedTo: assignedTo.trim(),
        });
        toast.success(
          `Dispatched work order to ${DEPARTMENTS[assignDept]} (${assignedTo.trim()})`
        );
      } else if (confirmModal.actionType === 'IN_PROGRESS') {
        await updateStatus(issueKey, {
          status: STATUS.IN_PROGRESS,
          note: inProgressNote.trim() || 'Field crew commenced work on site',
        });
        toast.success(`Status updated to IN PROGRESS`);
      } else if (confirmModal.actionType === 'RESOLVE') {
        await updateStatus(issueKey, {
          status: STATUS.RESOLVED,
          note: resolveNote.trim(),
        });
        toast.success(`Grievance successfully RESOLVED and closed`);
      }

      // Close modal and refresh issue details
      setConfirmModal({ isOpen: false, actionType: null, title: '', description: '' });
      await fetchIssueDetail();
    } catch (err) {
      console.error('Action failed:', err);
      if (err.status === 409 || err.code === 'INVALID_TRANSITION') {
        toast.error(
          'This issue was already updated by someone else - reloading...',
          'Conflict'
        );
        setConfirmModal({ isOpen: false, actionType: null, title: '', description: '' });
        await fetchIssueDetail();
      } else if (err.status === 403 || err.code === 'FORBIDDEN') {
        toast.error('Unauthorized: Only municipal authorities can execute this action', 'Forbidden');
      } else {
        toast.error(err.message || 'Action failed to execute', 'Error');
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left pb-16">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="space-y-6 text-left py-12">
        <EmptyState
          title="Grievance Record Not Found"
          description={error || `Could not find any grievance ticket with ID "${id}".`}
          actionLabel="Back to All Issues"
          onAction={() => navigate('/authority/issues')}
        />
      </div>
    );
  }

  const issueKey = issue.issueId || issue.id;
  const timeAgo = dayjs(issue.createdAt).fromNow();

  return (
    <div className="space-y-6 text-left pb-16">
      {/* 1. SUB-HEADER / COMMAND STRIP (Matches Stitch 07_authority_issue_review lines 7-44) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-lowest p-5 rounded-2xl border border-outline-variant shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to="/authority" className="hover:text-primary transition-colors">
              Grievance Central
            </Link>
            <span>/</span>
            <Link to="/authority/issues" className="hover:text-primary transition-colors">
              Ward K-West
            </Link>
            <span>/</span>
            <span className="font-mono font-bold text-text">#{issueKey.slice(-6).toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <StatusBadge status={issue.status} size="md" />
            {issue.priority && <PriorityBadge priority={issue.priority} size="md" />}
            <span className="text-xs text-muted font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-accent-dark" />
              Statutory SLA: <strong>24h turnaround window</strong>
            </span>
          </div>
        </div>

        {/* Quick Tool Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            startIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Dossier
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchIssueDetail}
            startIcon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Reload
          </Button>
        </div>
      </div>

      {/* 2. PRIMARY 2-COLUMN RESPONSIVE WORKSPACE (Stitch 07 lines 46-390) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Dossier, Coordinates, Timeline (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Card 1: Issue Dossier */}
          <div className="rounded-2xl bg-surface-lowest border border-outline-variant shadow-card p-5 sm:p-6 space-y-4">
            {/* Photographic Evidence Banner */}
            {issue.imageUrl ? (
              <div className="relative w-full rounded-xl overflow-hidden bg-surface-high border border-outline-variant">
                <img
                  src={issue.imageUrl}
                  alt={issue.title}
                  className="w-full h-72 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Image EXIF / Sensor Metadata Overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-white text-[11px] font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span>Camera GPS Validated</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-white text-[11px] font-mono">
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {issue.location?.lat?.toFixed(4) || '19.1197'}° N,{' '}
                      {issue.location?.lng?.toFixed(4) || '72.8468'}° E
                    </span>
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono">
                  <div className="flex items-center gap-1 text-white/90">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Captured: {dayjs(issue.createdAt).format('DD MMM YYYY, HH:mm [IST]')}</span>
                  </div>
                  <span className="text-white/70 hidden sm:inline">SWADESH Citizen Mobile Verification</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-44 rounded-xl bg-surface-low border border-dashed border-outline-variant flex flex-col items-center justify-center text-muted text-xs gap-2">
                <AlertCircle className="w-8 h-8 opacity-40" />
                <span>No photo evidence attached to this report</span>
              </div>
            )}

            {/* Badges & Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryTag category={issue.category} size="md" />
                {issue.priority && <PriorityBadge priority={issue.priority} size="md" />}
                <StatusBadge status={issue.status} size="md" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-text leading-tight">
                {issue.title}
              </h1>
            </div>

            {/* Citizen Narrative Description */}
            <div className="bg-surface-low rounded-xl p-4 border border-outline-variant/60">
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                {issue.description}
              </p>
            </div>

            {/* Reporter Metadata & Community Endorsement Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-outline-variant/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-extrabold text-sm">
                  {(issue.reporterName || 'Citizen')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-text">
                      {issue.reporterName || 'Citizen Resident'}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      KYC Verified
                    </span>
                  </div>
                  <span className="text-xs text-muted block">
                    Reported {timeAgo} • Citizen PRN #{issue.reporterId || 'CIT-491'}
                  </span>
                </div>
              </div>

              {/* Social Validation Chip */}
              <div className="flex items-center gap-2 bg-accent/15 border border-accent/30 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                <ThumbsUp className="w-4 h-4 text-accent-dark" />
                <div className="text-left">
                  <span className="text-xs font-bold text-accent-dark block">
                    {issue.upvoteCount || 0} Citizens Backed
                  </span>
                  <span className="text-[10px] text-muted">Community Upvotes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Geospatial & Cadastral Verification */}
          <div className="rounded-2xl bg-surface-lowest border border-outline-variant shadow-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-text">Geospatial Ward Jurisdiction</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                BMC Ward K-West Confirmed
              </span>
            </div>

            {/* Location Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-low p-4 rounded-xl border border-outline-variant/60">
              <div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Physical Landmark Address
                </span>
                <span className="text-xs font-semibold text-text mt-1 block">
                  {issue.location?.address || 'Near SV Road, Andheri West, Mumbai'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  GPS Coordinates & Division
                </span>
                <span className="text-xs font-mono font-bold text-primary mt-1 block">
                  {issue.location?.lat?.toFixed(4) || '19.1197'}° N,{' '}
                  {issue.location?.lng?.toFixed(4) || '72.8468'}° E
                </span>
                <span className="text-[11px] text-muted">Zone 4 Maintenance Grid #44B</span>
              </div>
            </div>

            {/* GIS Styled Map Mockup Container (Stitch 07 line 154) */}
            <div className="w-full h-44 rounded-xl bg-gradient-to-br from-teal-900/10 via-emerald-800/10 to-cyan-900/15 border border-outline-variant relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0F5C5C_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg animate-bounce">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="mt-1 px-2.5 py-0.5 rounded bg-surface-lowest text-text text-[11px] font-mono font-bold shadow-md border border-outline-variant">
                  {issue.location?.address?.split(',')[0] || 'Ward K-West Location'}
                </div>
              </div>
              <div className="absolute bottom-2.5 right-2.5 bg-surface-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded text-text text-[10px] font-bold flex items-center gap-1.5 border border-outline-variant">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Ward Cadastre Boundary Valid</span>
              </div>
            </div>
          </div>

          {/* Card 3: Official Statutory Audit Trail (StatusTimeline) */}
          <div className="rounded-2xl bg-surface-lowest border border-outline-variant shadow-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-text">Official Audit Trail</h2>
              </div>
              <span className="text-[11px] text-muted font-medium">
                Public Record Log • RTS Sec 4(1)
              </span>
            </div>

            <StatusTimeline statusHistory={issue.statusHistory || []} />
          </div>
        </div>

        {/* RIGHT COLUMN: Action Panel & Workflow Execution (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 sticky top-20">
          <div className="rounded-2xl bg-surface-lowest border border-outline-variant shadow-elevated p-5 sm:p-6 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-text">Take Action</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-low border border-outline-variant text-muted font-mono">
                  Municipal Redressal
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Sequential status state machine governed by docs/BLUEPRINT.md
              </p>
            </div>

            {/* Stage Progress Tracker */}
            <div className="grid grid-cols-4 gap-1.5 py-1">
              <div
                className={`h-2 rounded-full transition-all ${issue.status !== STATUS.PENDING_VERIFICATION ? 'bg-primary' : 'bg-accent'
                  }`}
                title="Stage 1: Verify"
              />
              <div
                className={`h-2 rounded-full transition-all ${issue.status === STATUS.VERIFIED
                    ? 'bg-accent animate-pulse'
                    : [STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.RESOLVED].includes(issue.status)
                      ? 'bg-primary'
                      : 'bg-surface-high'
                  }`}
                title="Stage 2: Assign"
              />
              <div
                className={`h-2 rounded-full transition-all ${issue.status === STATUS.ASSIGNED
                    ? 'bg-accent animate-pulse'
                    : [STATUS.IN_PROGRESS, STATUS.RESOLVED].includes(issue.status)
                      ? 'bg-primary'
                      : 'bg-surface-high'
                  }`}
                title="Stage 3: In Progress"
              />
              <div
                className={`h-2 rounded-full transition-all ${issue.status === STATUS.IN_PROGRESS
                    ? 'bg-accent animate-pulse'
                    : issue.status === STATUS.RESOLVED
                      ? 'bg-emerald-600'
                      : 'bg-surface-high'
                  }`}
                title="Stage 4: Resolved"
              />
            </div>

            {/* =========================================================================
                ACTION PANEL RENDERED STRICTLY BASED ON CURRENT STATUS
               ========================================================================= */}

            {/* CASE 1: PENDING_VERIFICATION */}
            {issue.status === STATUS.PENDING_VERIFICATION && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Pending Field Verification
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Inspect evidence and assign statutory urgency priority (Low / Medium / High), or reject if invalid.
                  </p>
                </div>

                {/* Priority Selection (Required for VERIFIED) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text uppercase tracking-wider block">
                    Select Triage Priority <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: PRIORITY.LOW, label: 'Low', color: 'border-emerald-300 text-emerald-800' },
                      { key: PRIORITY.MEDIUM, label: 'Medium', color: 'border-amber-300 text-amber-800' },
                      { key: PRIORITY.HIGH, label: 'High', color: 'border-rose-300 text-rose-800' },
                    ].map((p) => {
                      const isSelected = verifyPriority === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setVerifyPriority(p.key)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${isSelected
                              ? 'bg-primary text-white border-primary shadow-subtle'
                              : 'bg-surface-low border-outline-variant text-text hover:bg-surface-high'
                            }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Verification Note (Optional) */}
                <Textarea
                  label="Verification Notes (Optional)"
                  rows={2}
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  placeholder="e.g. Physical site inspection confirmed depth > 1 ft. Approved for immediate cold-mix patch."
                />

                {/* Approve Button */}
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleInitiateAction('VERIFY')}
                  startIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve & Verify Grievance
                </Button>

                {/* Reject Section */}
                <div className="pt-4 border-t border-outline-variant/60 space-y-3">
                  <span className="text-xs font-bold text-rose-700 block">
                    Reject Grievance
                  </span>
                  <Textarea
                    label="Rejection Reason (Required for rejection)"
                    rows={2}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Provide detailed statutory reason why this complaint cannot be verified..."
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => handleInitiateAction('REJECT')}
                    startIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject Grievance
                  </Button>
                </div>
              </div>
            )}

            {/* CASE 2: VERIFIED */}
            {issue.status === STATUS.VERIFIED && (
              <div className="space-y-4">
                {/* Completed Step 1 Summary */}
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Step 1: Verification Completed</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Verified priority:{' '}
                    <strong>{PRIORITY_LABELS[issue.priority] || issue.priority}</strong>
                  </p>
                </div>

                {/* Step 2 Form: Assign Redressal Crew */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-text uppercase tracking-wider">
                      Step 2: Assign Department & Crew
                    </span>
                    <span className="text-[10px] font-bold text-accent-dark bg-accent/20 px-2 py-0.5 rounded-full">
                      Ready for Dispatch
                    </span>
                  </div>

                  <Select
                    label="Municipal Department"
                    required
                    value={assignDept}
                    onChange={(e) => setAssignDept(e.target.value)}
                  >
                    {Object.entries(DEPARTMENTS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="Designated Field Officer & Crew"
                    required
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="e.g. JE Nilesh Sawant / Gangman Crew Alpha-4"
                    helperText="Includes personnel and vehicle compactor allocations"
                  />

                  {/* SLA Callout */}
                  <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-accent-dark block">Mandated Repair SLA</span>
                      <span className="text-[10px] text-muted">Maharashtra RTS Act 2015</span>
                    </div>
                    <span className="font-mono font-bold text-accent-dark">Within 24 Hours</span>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleInitiateAction('ASSIGN')}
                    startIcon={<Send className="w-4 h-4" />}
                  >
                    Assign to {DEPARTMENTS[assignDept] || 'Department'}
                  </Button>
                </div>
              </div>
            )}

            {/* CASE 3: ASSIGNED */}
            {issue.status === STATUS.ASSIGNED && (
              <div className="space-y-4">
                {/* Completed Assignments Summary */}
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-purple-800">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    Work Order Dispatched
                  </span>
                  <p className="text-[11px] text-purple-900">
                    Assigned to{' '}
                    <strong>{DEPARTMENTS[issue.department] || issue.department}</strong>
                  </p>
                  <p className="text-[11px] text-purple-900">
                    Lead Field Officer: <strong>{issue.assignedTo}</strong>
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-text uppercase tracking-wider block">
                    Step 3: Mobilize & Update Progress
                  </span>

                  <Textarea
                    label="Work Mobilization Note (Optional)"
                    rows={2}
                    value={inProgressNote}
                    onChange={(e) => setInProgressNote(e.target.value)}
                    placeholder="e.g. Field crew Alpha-4 reached location with asphalt mixture; commenced traffic diversion."
                  />

                  <Button
                    variant="primary"
                    className="w-full bg-status-in-progress hover:opacity-90"
                    onClick={() => handleInitiateAction('IN_PROGRESS')}
                    startIcon={<Clock className="w-4 h-4" />}
                  >
                    Mark In Progress
                  </Button>
                </div>
              </div>
            )}

            {/* CASE 4: IN_PROGRESS */}
            {issue.status === STATUS.IN_PROGRESS && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-xs">
                  <p className="font-bold flex items-center gap-1.5 text-orange-800">
                    <Clock className="w-4 h-4 text-orange-600" />
                    Remediation In Progress
                  </p>
                  <p className="text-[11px] text-orange-900 mt-1">
                    Crews actively working on site. Complete repairs and provide resolution certification note.
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-text uppercase tracking-wider block">
                    Step 4: Resolve & Close Grievance
                  </span>

                  <Textarea
                    label="Resolution Completion Note"
                    required
                    rows={3}
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="Describe completed work, materials used (e.g. cold mix asphalt tonnage), and final site clearance..."
                  />

                  <Button
                    variant="primary"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleInitiateAction('RESOLVE')}
                    startIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Mark Resolved & Close Ticket
                  </Button>
                </div>
              </div>
            )}

            {/* CASE 5: RESOLVED OR REJECTED (Terminal Read-Only Summary) */}
            {(issue.status === STATUS.RESOLVED || issue.status === STATUS.REJECTED) && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${issue.status === STATUS.RESOLVED
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {issue.status === STATUS.RESOLVED ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Grievance Successfully Resolved</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <span>Grievance Rejected</span>
                    </>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed">
                  This grievance ticket is in its final state and closed under municipal guidelines.
                </p>

                {issue.statusHistory && issue.statusHistory.length > 0 && (
                  <div className="p-3 rounded-lg bg-white/70 border border-black/5 mt-2 space-y-1">
                    <span className="font-bold block text-[11px]">Final Closure Record:</span>
                    <p className="italic text-[11px]">
                      "{issue.statusHistory[issue.statusHistory.length - 1]?.note || 'Grievance closed'}"
                    </p>
                    <span className="text-[10px] text-muted block pt-1">
                      By {issue.statusHistory[issue.statusHistory.length - 1]?.by || 'Municipal Authority'} •{' '}
                      {dayjs(issue.statusHistory[issue.statusHistory.length - 1]?.at).format(
                        'DD MMM YYYY, HH:mm'
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Escalation Callout (Stitch 07 line 377) */}
          <div className="rounded-2xl bg-surface-lowest p-4 border border-outline-variant shadow-card flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-text block">Escalation Protocol</span>
                <span className="text-muted text-[11px]">
                  Auto-escalates to Ward Executive Engineer if incomplete past 24 hrs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONFIRMATION MODAL (Using Modal component) */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => !actionSubmitting && setConfirmModal({ isOpen: false, actionType: null, title: '', description: '' })}
        title={confirmModal.title}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="secondary"
              onClick={() =>
                setConfirmModal({ isOpen: false, actionType: null, title: '', description: '' })
              }
              disabled={actionSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={confirmModal.actionType === 'REJECT' ? 'danger' : 'primary'}
              onClick={handleConfirmAction}
              isLoading={actionSubmitting}
            >
              Confirm & Execute Action
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs leading-relaxed text-text">
          <p>{confirmModal.description}</p>
          <div className="p-3 rounded-xl bg-surface-low border border-outline-variant/60 font-mono text-[11px] space-y-1">
            <div>
              <span className="text-muted">Target Ticket:</span> #{issueKey}
            </div>
            <div>
              <span className="text-muted">Action Type:</span>{' '}
              <strong className="text-primary">{confirmModal.actionType}</strong>
            </div>
            {confirmModal.actionType === 'VERIFY' && (
              <div>
                <span className="text-muted">Selected Priority:</span>{' '}
                <strong className="text-amber-700">{verifyPriority}</strong>
              </div>
            )}
            {confirmModal.actionType === 'ASSIGN' && (
              <>
                <div>
                  <span className="text-muted">Department:</span>{' '}
                  <strong>{DEPARTMENTS[assignDept] || assignDept}</strong>
                </div>
                <div>
                  <span className="text-muted">Assigned Crew:</span>{' '}
                  <strong>{assignedTo}</strong>
                </div>
              </>
            )}
            {confirmModal.actionType === 'RESOLVE' && (
              <div>
                <span className="text-muted">Closure Note:</span> {resolveNote}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
