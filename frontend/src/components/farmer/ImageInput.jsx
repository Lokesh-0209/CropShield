import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Link as LinkIcon, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MAX_MB = 10;
const MAX_DIM = 1280; // downscale large phone photos before upload for fast rural performance

/**
 * Resize + compress so uploads stay small on rural 2G/3G connections
 */
async function compressImage(file) {
  // If createImageBitmap is available, use it; otherwise fallback to HTMLImageElement
  let width, height, source;

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } else {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
    width = source.width;
    height = source.height;
  }

  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, targetW, targetH);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  const baseName = (file.name || 'crop_photo').replace(/\.\w+$/, '');

  const compressedFile = new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  return { file: compressedFile, dataUrl };
}

/**
 * Farmer ImageInput Component
 * Supports Camera (getUserMedia rear-facing with mobile file fallback),
 * File Upload, Drag & Drop, and Remote URL.
 */
export default function ImageInput({ value, onChange, error: externalError }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(value || null);
  const [error, setError] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileRef = useRef(null);
  const mobileCamRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Sync with external value changes (e.g. sample loaded or draft restored)
  useEffect(() => {
    if (value && typeof value === 'string') {
      setPreview(value);
    } else if (!value) {
      setPreview(null);
    }
  }, [value]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function handleFile(file) {
    setError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('photo.errors.invalidType', 'Please choose an image file (JPG, PNG, WebP).'));
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(
        t('photo.errors.tooLarge', `Photo must be under ${MAX_MB} MB. We will automatically compress it.`)
      );
      return;
    }

    try {
      setIsCompressing(true);
      const { file: small, dataUrl } = await compressImage(file);
      setPreview(dataUrl);
      onChange?.({ file: small, url: dataUrl, previewUrl: dataUrl });
    } catch (err) {
      console.error('Image compression failed:', err);
      // Fallback: convert to Data URL with FileReader
      const reader = new FileReader();
      reader.onload = () => {
        const resUrl = reader.result;
        setPreview(resUrl);
        onChange?.({ file, url: resUrl, previewUrl: resUrl });
      };
      reader.onerror = () => {
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        onChange?.({ file, url: objectUrl, previewUrl: objectUrl });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  }

  function handleUrlSubmit(e) {
    if (e) e.preventDefault();
    setError('');
    const trimmed = urlValue.trim();
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      setError(t('photo.errors.invalidUrl', 'Please enter a valid image web address.'));
      return;
    }

    setPreview(trimmed);
    onChange?.({ file: null, url: trimmed, previewUrl: trimmed });
    setShowUrlInput(false);
  }

  async function openCamera() {
    setError('');
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Direct fallback to native picker with capture
      mobileCamRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Rear camera on phones
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setCameraOpen(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (err) {
      console.warn('getUserMedia camera access denied or unavailable, falling back to native picker:', err);
      // Fall back to native camera picker
      mobileCamRef.current?.click();
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  function snapPhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `crop_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleFile(file);
        }
        stopCamera();
      },
      'image/jpeg',
      0.9
    );
  }

  function clearPhoto() {
    setPreview(null);
    setUrlValue('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
    if (mobileCamRef.current) mobileCamRef.current.value = '';
    onChange?.({ file: null, url: null, previewUrl: null });
  }

  const activeError = error || externalError;

  return (
    <div className="cs-image-input-container">
      {/* 1. Preview State */}
      {preview ? (
        <div className="cs-image-preview-card">
          <div className="cs-image-preview-frame">
            <img
              src={preview}
              alt="Selected crop leaf"
              className="cs-image-preview-img"
              onError={() => setError(t('photo.errors.readError', 'Could not load image.'))}
            />
            <div className="cs-image-preview-badge">
              <CheckCircle2 size={16} />
              <span>{t('photo.photoAttached', 'Photo Attached & Compressed')}</span>
            </div>
          </div>

          <div className="cs-image-preview-actions">
            <button
              type="button"
              className="cs-btn cs-btn-secondary cs-btn-block"
              style={{ minHeight: '48px', fontSize: '15px', fontWeight: 700 }}
              onClick={clearPhoto}
            >
              <RotateCcw size={18} className="icon-mr" />
              {t('photo.removeRetake', 'Remove / retake photo')}
            </button>
          </div>
        </div>
      ) : cameraOpen ? (
        /* 2. Active Camera View */
        <div className="cs-camera-view-box">
          <div className="cs-camera-frame">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="cs-camera-video"
            />
            <div className="cs-camera-crosshair" aria-hidden="true">
              <div className="crosshair-center" />
            </div>
          </div>

          <div className="cs-camera-controls">
            <button
              type="button"
              className="cs-btn cs-btn-primary"
              style={{ minHeight: '52px', padding: '12px 24px', fontSize: '16px', fontWeight: 700, flex: 1 }}
              onClick={snapPhoto}
            >
              <Camera size={20} className="icon-mr" />
              {t('photo.capture', 'Take Photo')}
            </button>
            <button
              type="button"
              className="cs-btn cs-btn-secondary"
              style={{ minHeight: '52px', padding: '12px 18px' }}
              onClick={stopCamera}
            >
              {t('photo.cancelCamera', 'Cancel')}
            </button>
          </div>
        </div>
      ) : (
        /* 3. Empty / Upload Zone */
        <div
          className={`cs-dropzone ${isDragOver ? 'is-drag-over' : ''} ${isCompressing ? 'is-loading' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
        >
          <div className="cs-dropzone-icon-wrap" aria-hidden="true">
            <Camera size={36} className="text-primary" />
          </div>

          <h3 className="cs-dropzone-title">
            {t('photo.dragDrop', 'Drag a leaf photo here, or:')}
          </h3>

          <p className="cs-dropzone-helper">
            {t('photo.helper', 'Take a clear close-up of spots, discoloration or damaged leaves.')}
          </p>

          {/* Big touch action buttons (>= 48px touch targets) */}
          <div className="cs-dropzone-actions">
            <button
              type="button"
              className="cs-btn cs-btn-primary cs-btn-lg"
              style={{ minHeight: '52px', width: '100%', fontSize: '16px' }}
              onClick={openCamera}
            >
              <Camera size={20} className="icon-mr" />
              {t('photo.takePhoto', 'Take photo with camera')}
            </button>

            <button
              type="button"
              className="cs-btn cs-btn-secondary cs-btn-lg"
              style={{ minHeight: '48px', width: '100%', fontSize: '15px' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={18} className="icon-mr" />
              {t('photo.uploadDevice', 'Upload from device')}
            </button>
          </div>

          {/* Paste Image URL Accordion */}
          <div className="cs-url-toggle-wrap">
            {!showUrlInput ? (
              <button
                type="button"
                className="cs-btn cs-btn-ghost cs-btn-sm"
                style={{ minHeight: '48px', color: 'var(--text-muted)' }}
                onClick={() => setShowUrlInput(true)}
              >
                <LinkIcon size={15} className="icon-mr" />
                {t('photo.pasteUrl', '...or paste an image URL')}
              </button>
            ) : (
              <form onSubmit={handleUrlSubmit} className="cs-url-input-form">
                <input
                  type="url"
                  placeholder="https://example.com/leaf-photo.jpg"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  className="cs-input"
                  style={{ minHeight: '48px', fontSize: '14px' }}
                />
                <button
                  type="submit"
                  className="cs-btn cs-btn-secondary"
                  style={{ minHeight: '48px', padding: '0 18px', fontWeight: 600 }}
                >
                  {t('photo.useUrl', 'Use URL')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hidden file pickers */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />
      <input
        ref={mobileCamRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />

      {/* Specific Error Message */}
      {activeError && (
        <div className="cs-input-error-banner" role="alert">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}
