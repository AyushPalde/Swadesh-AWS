import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  FilterChip,
  Avatar,
  Modal,
  useToast,
  Skeleton,
  EmptyState,
  Spinner,
  StatusBadge,
  PriorityBadge,
  CategoryTag,
  IssueCard,
  StatusTimeline,
  ProgressStepper,
  StatCard,
  ImageUploader,
  Navbar,
  CitizenSidebar,
  AuthoritySidebar,
} from '../components';
import {
  STATUS,
  PRIORITY,
  CATEGORY,
  ROLES,
} from '../constants';
import {
  Search,
  Plus,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Inbox,
  Clock,
  Wrench,
  ThumbsUp,
  MapPin,
  TrendingUp,
} from 'lucide-react';

export default function ComponentShowcase() {
  const toast = useToast();

  // Component state toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [selectedChip, setSelectedChip] = useState('pothole');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [stepperStatus, setStepperStatus] = useState(STATUS.IN_PROGRESS);

  // Sample Issue for IssueCard
  const [sampleIssue, setSampleIssue] = useState({
    issueId: 'iss_8f3a1c2b9d04',
    title: 'Deep pothole causing severe traffic near Andheri Subway',
    description:
      'Continuous monsoon downpour has washed out asphalt near the east entrance. Multiple two-wheelers slipping during morning peak hours.',
    category: CATEGORY.POTHOLE,
    location: { address: 'Andheri Subway, S.V. Road, Ward K-West', lat: 19.1197, lng: 72.8464 },
    imageUrl:
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    status: STATUS.IN_PROGRESS,
    priority: PRIORITY.HIGH,
    department: 'ROADS',
    reporterName: 'Asha Patil',
    upvoteCount: 14,
    viewerHasUpvoted: false,
    createdAt: new Date(Date.now() - 3600 * 4 * 1000).toISOString(),
  });

  const handleSupport = () => {
    setSampleIssue((prev) => ({
      ...prev,
      viewerHasUpvoted: !prev.viewerHasUpvoted,
      upvoteCount: prev.viewerHasUpvoted ? prev.upvoteCount - 1 : prev.upvoteCount + 1,
    }));
    toast.success(
      sampleIssue.viewerHasUpvoted ? 'Support removed' : 'Thank you for supporting this issue!',
      'Grievance Support'
    );
  };

  const sampleTimeline = [
    {
      status: STATUS.PENDING_VERIFICATION,
      by: 'Asha Patil',
      note: 'Grievance submitted with geotag and photographic proof.',
      at: '2026-10-28T09:30:00Z',
    },
    {
      status: STATUS.VERIFIED,
      by: 'Rajesh Kumar (Authority)',
      note: 'High traffic risk verified; assigned HIGH priority SLA window (24h).',
      at: '2026-10-28T10:15:00Z',
    },
    {
      status: STATUS.ASSIGNED,
      by: 'Municipal Dispatcher',
      note: 'Assigned to Roads & Infrastructure department field crew 4B.',
      at: '2026-10-28T11:00:00Z',
    },
    {
      status: STATUS.IN_PROGRESS,
      by: 'Vikram Shinde (Site Supervisor)',
      note: 'Cold-mix asphalt patch crew deployed on site.',
      at: '2026-10-28T12:30:00Z',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      {/* Navbar Showcase */}
      <Navbar
        user={{ name: 'Asha Patil', role: ROLES.CITIZEN }}
        onSearch={(q) => toast.info(`Search submitted: "${q}"`)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        {/* Page Banner */}
        <div className="bg-surface-lowest border border-outline-variant rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
              SWADESH Component Library Style Guide
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text mt-1">
              Design System & Component Showcase
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Presentational UI primitives, domain components, and responsive layout pieces matching Stitch.
            </p>
          </div>
          <a
            href="/"
            className="px-4 py-2 text-xs font-bold rounded-lg bg-surface-low border border-outline-variant hover:bg-surface-high transition-colors"
          >
            &larr; Back to Home
          </a>
        </div>

        {/* SECTION 1: PRIMITIVES */}
        <section className="space-y-6">
          <div className="border-b border-outline-variant pb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> 1. UI Primitives
            </h2>
            <span className="text-xs text-muted">Reusable, state-agnostic</span>
          </div>

          {/* 1.1 Buttons */}
          <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
              Buttons (Variants, Sizes & States)
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary (Accent)</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button
                variant="primary"
                loading={buttonLoading}
                onClick={() => {
                  setButtonLoading(true);
                  setTimeout(() => setButtonLoading(false), 1500);
                }}
              >
                {buttonLoading ? 'Saving...' : 'Click for Loading'}
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="primary" size="sm" startIcon={<Plus className="w-4 h-4" />}>
                Small Icon
              </Button>
              <Button variant="secondary" size="lg" endIcon={<Send className="w-4 h-4" />}>
                Large Action
              </Button>
            </div>
          </div>

          {/* 1.2 Form Controls */}
          <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-5">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
              Form Controls (Input, Textarea, Select, FilterChips)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input
                label="Standard Input"
                placeholder="Enter road name or landmark..."
                helperText="Provide recognizable location markers"
              />
              <Input
                label="Input with Icon & Error"
                startIcon={<Search className="w-4 h-4" />}
                placeholder="Search wards..."
                error="Location is mandatory"
                defaultValue="Unknown"
              />
              <Select
                label="Select Dropdown"
                options={[
                  { value: 'ROADS', label: 'Roads & Infrastructure' },
                  { value: 'SANITATION', label: 'Sanitation & Waste' },
                  { value: 'ELECTRICAL', label: 'Street Lighting & Electrical' },
                ]}
                helperText="Target department"
              />
            </div>

            <Textarea
              label="Issue Description (Textarea)"
              placeholder="Describe the problem, hazard level, and exact landmark..."
              rows={3}
              showCount
              maxLength={500}
              defaultValue="Large pothole near subway exit that collects rainwater during morning commute."
            />

            <div>
              <label className="text-xs font-semibold text-text block mb-2">
                Filter Chips (Interactive)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Issues', count: 48 },
                  { id: 'pothole', label: 'Potholes', count: 18 },
                  { id: 'garbage', label: 'Garbage', count: 12 },
                  { id: 'lighting', label: 'Streetlights', count: 9 },
                  { id: 'water', label: 'Water Leaks', count: 9 },
                ].map((chip) => (
                  <FilterChip
                    key={chip.id}
                    label={chip.label}
                    count={chip.count}
                    active={selectedChip === chip.id}
                    onClick={() => setSelectedChip(chip.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 1.3 Avatars & Badges */}
          <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
              Avatars & Fallbacks
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <Avatar name="Asha Patil" size="sm" />
              <Avatar name="Rajesh Kumar" size="md" />
              <Avatar name="Municipal Dispatcher" size="lg" />
              <Avatar name="Vikram Shinde" size="xl" />
              <Avatar
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                name="Sita Sharma"
                size="lg"
              />
            </div>
          </div>

          {/* 1.4 Modals & Toasts */}
          <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
              Feedback Systems (Modal & Toasts)
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Sample Modal
              </Button>

              <Button
                variant="ghost"
                onClick={() => toast.success('Grievance status updated to VERIFIED', 'Status Updated')}
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="ghost"
                onClick={() => toast.error('Failed to upload image. Max size 5 MB.', 'Upload Error')}
              >
                Trigger Error Toast
              </Button>
              <Button
                variant="ghost"
                onClick={() => toast.warning('SLA breach impending for Ward K-West', 'SLA Warning')}
              >
                Trigger Warning Toast
              </Button>
              <Button
                variant="ghost"
                onClick={() => toast.info('New community issue reported nearby', 'Civic Update')}
              >
                Trigger Info Toast
              </Button>
            </div>

            {/* Modal Demonstration */}
            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Verify & Prioritize Issue"
              description="Authority action for Issue iss_8f3a1c2b9d04"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsModalOpen(false);
                      toast.success('Issue verified and scheduled for dispatch');
                    }}
                  >
                    Confirm Verification
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                <p className="text-sm text-text">
                  You are verifying <strong>Deep pothole near Andheri Subway</strong>. Priority is required to transition from PENDING_VERIFICATION to VERIFIED.
                </p>
                <Select
                  label="Select Priority Level"
                  options={[
                    { value: 'HIGH', label: 'HIGH — Threat to life/arterial road' },
                    { value: 'MEDIUM', label: 'MEDIUM — Commuter inconvenience' },
                    { value: 'LOW', label: 'LOW — Minor cosmetic damage' },
                  ]}
                  defaultValue="HIGH"
                />
                <Textarea
                  label="Internal Review Note (Optional)"
                  placeholder="Field notes for inspection crew..."
                  rows={2}
                />
              </div>
            </Modal>
          </div>

          {/* 1.5 Skeleton, Spinner & EmptyState */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-4">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
                Loaders & Skeletons
              </h3>
              <div className="flex items-center gap-4">
                <Spinner size="sm" color="primary" />
                <Spinner size="md" color="accent" />
                <Spinner size="lg" color="primary" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="90%" />
                <Skeleton variant="text" width="40%" />
              </div>
            </div>

            <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant">
              <EmptyState
                icon={<Inbox className="w-8 h-8 text-muted" />}
                title="No Pending Grievances"
                description="All issues for Ward K-West have been triaged and assigned."
                action={
                  <Button variant="primary" size="sm">
                    Refresh Feed
                  </Button>
                }
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: DOMAIN COMPONENTS */}
        <section className="space-y-6">
          <div className="border-b border-outline-variant pb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> 2. SWADESH Domain Components
            </h2>
            <span className="text-xs text-muted">Driven by docs/BLUEPRINT.md</span>
          </div>

          {/* 2.1 Badges & Tags */}
          <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
              StatusBadges, PriorityBadges & CategoryTags
            </h3>

            <div>
              <span className="text-xs text-muted block mb-2 font-semibold">StatusBadges:</span>
              <div className="flex flex-wrap gap-2">
                {Object.values(STATUS).map((st) => (
                  <StatusBadge key={st} status={st} />
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted block mb-2 font-semibold">PriorityBadges:</span>
              <div className="flex flex-wrap gap-2">
                {Object.values(PRIORITY).map((p) => (
                  <PriorityBadge key={p} priority={p} />
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted block mb-2 font-semibold">CategoryTags:</span>
              <div className="flex flex-wrap gap-2">
                {Object.values(CATEGORY).map((c) => (
                  <CategoryTag key={c} category={c} />
                ))}
              </div>
            </div>
          </div>

          {/* 2.2 ProgressStepper */}
          <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
                ProgressStepper (5-Stage Horizontal Tracker)
              </h3>
              <div className="flex gap-1.5">
                {[
                  STATUS.PENDING_VERIFICATION,
                  STATUS.VERIFIED,
                  STATUS.ASSIGNED,
                  STATUS.IN_PROGRESS,
                  STATUS.RESOLVED,
                  STATUS.REJECTED,
                ].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStepperStatus(st)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      stepperStatus === st
                        ? 'bg-primary text-white'
                        : 'bg-surface-low text-muted border border-outline-variant'
                    }`}
                  >
                    {st.split('_')[0]}
                  </button>
                ))}
              </div>
            </div>

            <ProgressStepper currentStatus={stepperStatus} />
          </div>

          {/* 2.3 KPI StatCards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
              StatCards (Municipal Dashboard KPIs)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Reports"
                value="1,248"
                icon={<Inbox className="w-5 h-5" />}
                trend="+14% this month"
                subtitle="Ward K-West"
                variant="primary"
              />
              <StatCard
                title="Pending Triage"
                value="34"
                icon={<Clock className="w-5 h-5" />}
                trend="Requires action"
                trendDirection="down"
                subtitle="Avg wait: 4.2h"
                variant="accent"
              />
              <StatCard
                title="In Progress"
                value="58"
                icon={<Wrench className="w-5 h-5" />}
                subtitle="Dispatched to crews"
                variant="blue"
              />
              <StatCard
                title="Resolved SLA"
                value="94.2%"
                icon={<TrendingUp className="w-5 h-5" />}
                trend="+2.1% compliance"
                subtitle="Target: 90%"
                variant="emerald"
              />
            </div>
          </div>

          {/* 2.4 IssueCard & ImageUploader */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IssueCard */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
                IssueCard (Interactive Social Feed Card)
              </h3>
              <IssueCard
                issue={sampleIssue}
                onSupport={handleSupport}
                onClick={(id) => toast.info(`Navigating to issue detail for ${id}`)}
              />
            </div>

            {/* ImageUploader */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
                ImageUploader (Drag-and-Drop, Preview & 5MB Check)
              </h3>
              <div className="bg-surface-lowest p-5 rounded-2xl border border-outline-variant">
                <ImageUploader
                  value={uploadedFile}
                  onChange={(file) => {
                    setUploadedFile(file);
                    if (file) {
                      toast.success(`Loaded file: ${file.name} (${Math.round(file.size / 1024)} KB)`);
                    } else {
                      toast.info('Image removed');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2.5 StatusTimeline */}
          <div className="bg-surface-lowest p-6 rounded-2xl border border-outline-variant space-y-4">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">
              StatusTimeline (Vertical Status Audit Trail)
            </h3>
            <StatusTimeline statusHistory={sampleTimeline} />
          </div>
        </section>

        {/* SECTION 3: LAYOUT PIECES */}
        <section className="space-y-6">
          <div className="border-b border-outline-variant pb-2">
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> 3. Layout Sidebars (Citizen vs Authority)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                CitizenSidebar Preview
              </h3>
              <CitizenSidebar
                activeTab="feed"
                onSelectTab={(tab) => toast.info(`Citizen navigated to: ${tab}`)}
              />
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                AuthoritySidebar Preview
              </h3>
              <AuthoritySidebar
                activeTab="dashboard"
                onSelectTab={(tab) => toast.info(`Authority navigated to: ${tab}`)}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-low border-t border-outline-variant/40 py-6 px-4 text-xs text-muted text-center mt-12">
        SWADESH Component Library Style Guide &bull; Access anytime via <code className="font-mono">/_components</code>
      </footer>
    </div>
  );
}

