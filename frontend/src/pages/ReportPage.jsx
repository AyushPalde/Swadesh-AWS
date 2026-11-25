import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { createIssue } from '../api/issues.js';
import { uploadImage } from '../api/uploads.js';
import { useToast } from '../components/primitives/Toast.jsx';
import ImageUploader from '../components/domain/ImageUploader.jsx';
import Button from '../components/primitives/Button.jsx';
import { CATEGORY, CATEGORY_LABELS } from '../constants.js';
import {
  AlertTriangle,
  Trash2,
  Lightbulb,
  Droplets,
  Waves,
  Tag,
  MapPin,
  Navigation,
  Check,
  ArrowLeft,
  Send,
  Sparkles,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';

const CATEGORY_TILES = [
  {
    id: CATEGORY.POTHOLE,
    title: 'Pothole & Road Hazard',
    desc: 'Craters, collapsed asphalt, open trenches',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  },
  {
    id: CATEGORY.GARBAGE,
    title: 'Garbage & Waste',
    desc: 'Uncollected bins, plastic dumps, open burning',
    icon: <Trash2 className="w-5 h-5 text-stone-500" />,
  },
  {
    id: CATEGORY.STREETLIGHT,
    title: 'Street Lighting & Power',
    desc: 'Dark roads, broken fixtures, exposed live wires',
    icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
  },
  {
    id: CATEGORY.WATER_LEAKAGE,
    title: 'Water Pipe Leakage',
    desc: 'Burst municipal mains, broken public taps',
    icon: <Droplets className="w-5 h-5 text-sky-500" />,
  },
  {
    id: CATEGORY.DRAINAGE,
    title: 'Drainage & Sewage',
    desc: 'Open manholes, blocked culverts, flooded lanes',
    icon: <Waves className="w-5 h-5 text-teal-500" />,
  },
  {
    id: CATEGORY.OTHER,
    title: 'Other Civic Concern',
    desc: 'Illegal hoardings, damaged public park equipment',
    icon: <Tag className="w-5 h-5 text-stone-400" />,
  },
];

export default function ReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(() => searchParams.get('category') || CATEGORY.POTHOLE);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [imageFile, setImageFile] = useState(null);

  // Status state
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const catParam = searchParams.get('category');
    if (catParam && Object.values(CATEGORY).includes(catParam)) {
      setCategory(catParam);
    }
  }, [searchParams]);

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser', 'Location');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: parseFloat(latitude.toFixed(5)), lng: parseFloat(longitude.toFixed(5)) });
        if (!address.trim()) {
          setAddress(`Near current location (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Ward K-West, Mumbai`);
        }
        setLocating(false);
        toast.success('Coordinates acquired via GPS', 'Location Verified');
      },
      (err) => {
        setLocating(false);
        // Fallback realistic demo coordinates
        const fallback = { lat: 19.1197, lng: 72.8464 };
        setCoords(fallback);
        if (!address.trim()) {
          setAddress('Andheri Subway East Approach, S.V. Road, Ward K-West, Mumbai');
        }
        toast.info('Using default ward coordinates for demonstration', 'GPS Fallback');
      },
      { timeout: 8000 }
    );
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate Title (5 - 100)
    if (!title.trim() || title.trim().length < 5 || title.trim().length > 100) {
      newErrors.title = 'Title must be between 5 and 100 characters';
    }

    // Validate Category
    if (!category || !Object.values(CATEGORY).includes(category)) {
      newErrors.category = 'Please choose an issue category';
    }

    // Validate Description (10 - 1000)
    if (!description.trim() || description.trim().length < 10 || description.trim().length > 1000) {
      newErrors.description = 'Description must be between 10 and 1000 characters';
    }

    // Validate Address
    if (!address.trim()) {
      newErrors.address = 'Street address or landmark is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the highlighted errors before submitting.', 'Validation Error');
      return;
    }

    setSubmitting(true);
    try {
      let imageKey = null;

      // Step 1: Upload image if selected
      if (imageFile) {
        setUploadStep('Uploading photo to storage...');
        imageKey = await uploadImage(imageFile);
      }

      // Step 2: Create issue
      setUploadStep('Registering grievance with municipal dispatch...');
      const created = await createIssue({
        title: title.trim(),
        description: description.trim(),
        category,
        location: {
          address: address.trim(),
          lat: coords?.lat || 19.1197,
          lng: coords?.lng || 72.8464,
        },
        imageKey,
      });

      toast.success(
        `Grievance ${created.issueId} logged into municipal triage queue!`,
        'Issue Submitted'
      );
      navigate(`/issues/${created.issueId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to submit issue', 'Submission Error');
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
      setUploadStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-surface-lowest p-6 rounded-3xl border border-outline-variant shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono block">
            Public Redressal Dispatch
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text mt-0.5">
            Report a Civic Issue
          </h1>
          <p className="text-xs text-muted mt-1">
            Fill in the details below. Our municipal triage officers will verify and assign an engineering team.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-1.5 rounded-xl">
          <Sparkles className="w-4 h-4 text-accent shrink-0" />
          <span>Average SLA: <strong>48 hours</strong></span>
        </div>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-surface-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-card space-y-7">

        {/* Global Error message */}
        {errors.form && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* 1. Category Icon Tile Picker (Matches Stitch 02_report_an_issue) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text">
              1. Select Issue Category <span className="text-error">*</span>
            </label>
            <span className="text-xs text-muted">Choose the closest infrastructure domain</span>
          </div>

          <div
            role="radiogroup"
            aria-label="Issue Category Selector"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {CATEGORY_TILES.map((tile) => {
              const isSelected = category === tile.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setCategory(tile.id)}
                  className={`relative p-4 rounded-2xl border text-left transition-all flex flex-col justify-between select-none cursor-pointer ${
                    isSelected
                      ? 'bg-primary-container text-white border-primary shadow-subtle'
                      : 'bg-surface-low hover:bg-surface-high/60 text-text border-outline-variant/60'
                  }`}
                >
                  {/* Selected checkmark indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent text-accent-dark flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-white/10 text-white' : 'bg-surface-lowest shadow-subtle'}`}>
                      {tile.icon}
                    </div>
                    <span className="font-bold text-xs leading-tight">
                      {tile.title}
                    </span>
                  </div>

                  <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-primary-light' : 'text-muted'}`}>
                    {tile.desc}
                  </p>
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="text-xs font-medium text-error mt-1.5">{errors.category}</p>
          )}
        </div>

        {/* 2. Issue Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="issue-title" className="text-xs font-bold uppercase tracking-wider text-text">
              2. Brief Issue Title <span className="text-error">*</span>
            </label>
            <span className="text-[11px] text-muted">{title.length}/100</span>
          </div>
          <input
            id="issue-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="e.g. Deep crater pothole near Andheri Subway entrance"
            className={`w-full bg-surface-low text-text text-sm rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
              errors.title
                ? 'border-error focus:border-error'
                : 'border-outline-variant focus:border-primary'
            }`}
          />
          {errors.title ? (
            <p className="text-xs font-medium text-error mt-1">{errors.title}</p>
          ) : (
            <p className="text-[11px] text-muted mt-1">
              Be specific with location details or landmarks (5 to 100 characters).
            </p>
          )}
        </div>

        {/* 3. Description with Character Counter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="issue-desc" className="text-xs font-bold uppercase tracking-wider text-text">
              3. Detailed Description <span className="text-error">*</span>
            </label>
            <span className="text-[11px] text-muted">{description.length}/1000</span>
          </div>
          <textarea
            id="issue-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Explain the hazard, approximate depth/length, danger to vehicles or pedestrians, and any landmark nearby..."
            className={`w-full bg-surface-low text-text text-sm rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y ${
              errors.description
                ? 'border-error focus:border-error'
                : 'border-outline-variant focus:border-primary'
            }`}
          />
          {errors.description ? (
            <p className="text-xs font-medium text-error mt-1">{errors.description}</p>
          ) : (
            <p className="text-[11px] text-muted mt-1">
              Minimum 10 characters. Mention if this is an active life risk.
            </p>
          )}
        </div>

        {/* 4. Photo Proof (ImageUploader) */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-text block mb-1">
            4. Photographic Proof (Optional but Recommended)
          </label>
          <ImageUploader
            value={imageFile}
            onChange={(file) => setImageFile(file)}
          />
          <p className="text-[11px] text-muted mt-1">
            Grievances with clear photos receive 70% faster initial verification by ward superintendents.
          </p>
        </div>

        {/* 5. Location & Geotag */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="address-field" className="text-xs font-bold uppercase tracking-wider text-text">
              5. Incident Address & Geotag <span className="text-error">*</span>
            </label>

            {/* GPS Locate Button */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors py-1 px-2 rounded-lg hover:bg-primary/5 active:scale-95 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Acquiring GPS...' : 'Use my current location'}</span>
            </button>
          </div>

          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-muted pointer-events-none" />
            <input
              id="address-field"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. S.V. Road near Andheri Subway, Ward K-West, Mumbai"
              className={`w-full bg-surface-low text-text text-sm rounded-xl border pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                errors.address
                  ? 'border-error focus:border-error'
                  : 'border-outline-variant focus:border-primary'
              }`}
            />
          </div>

          {/* Coordinates indicator */}
          {coords && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                GPS Geotag: Lat <strong>{coords.lat}</strong>, Lng <strong>{coords.lng}</strong> (Geocoded to Ward Grid)
              </span>
            </div>
          )}

          {errors.address && (
            <p className="text-xs font-medium text-error mt-1">{errors.address}</p>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            By filing, you certify this grievance represents a genuine civic problem.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/"
              className="flex-1 sm:flex-none text-center px-4 py-2.5 text-xs font-semibold rounded-xl border border-outline-variant text-text hover:bg-surface-high transition-colors"
            >
              Cancel
            </Link>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              startIcon={<Send className="w-4 h-4 text-accent" />}
              className="flex-1 sm:flex-none px-6"
            >
              {submitting ? uploadStep || 'Submitting...' : 'Submit Grievance'}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
