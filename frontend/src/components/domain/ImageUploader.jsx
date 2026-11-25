import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ImageUploader({
  value = null, // Can be existing URL or File
  onChange,
  disabled = false,
  className = '',
}) {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Sync initial or updated value
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    if (typeof value === 'string') {
      setPreviewUrl(value);
    } else if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [value]);

  const validateAndHandleFile = (file) => {
    setError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid format. Please upload JPEG, PNG, or WebP images only.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('File size exceeds the 5 MB limit. Please select a smaller photo.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    if (onChange) {
      onChange(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndHandleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    validateAndHandleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className={`flex flex-col gap-2 w-full text-left ${className}`}>
      {/* Upload Dropzone Container */}
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center p-6 text-center select-none ${
          disabled
            ? 'opacity-60 bg-surface-high/40 cursor-not-allowed border-outline-variant'
            : dragOver
            ? 'border-primary bg-primary/5 scale-[1.005]'
            : 'border-outline-variant hover:border-primary/80 bg-surface-low/70 hover:bg-surface-low'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload issue photo"
        />

        {previewUrl ? (
          /* Preview State */
          <div className="relative w-full h-56 rounded-xl overflow-hidden bg-black/5 group">
            <img
              src={previewUrl}
              alt="Uploaded issue preview"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <span className="text-white text-xs font-semibold">Click to replace</span>
              <button
                type="button"
                onClick={handleRemove}
                aria-label="Remove image"
                className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-transform active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Direct Close Button in top right */}
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove image"
              className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Empty / Picker State */
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-lowest text-primary shadow-subtle border border-outline-variant/40 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-text">
              <span className="text-primary hover:underline">Click to upload</span> or drag and drop photo
            </p>
            <p className="text-xs text-muted mt-1">
              Supports JPEG, PNG, WebP (Max 5 MB)
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-error mt-0.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

