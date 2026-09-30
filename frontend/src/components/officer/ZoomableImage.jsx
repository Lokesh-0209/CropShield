import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Image as ImageIcon } from 'lucide-react';

/**
 * Zoomable and Pannable Specimen Image Inspector.
 * Enables officers to examine foliar lesions with wheel zoom, pinch, pan drag, and reset.
 */
export default function ZoomableImage({ src, alt = 'Field Specimen Photograph', minZoom = 1, maxZoom = 4 }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomStep = 0.25;
      const delta = e.deltaY < 0 ? zoomStep : -zoomStep;
      setZoom((prev) => {
        const next = Math.min(Math.max(prev + delta, minZoom), maxZoom);
        if (next === minZoom) {
          setOffset({ x: 0, y: 0 });
        }
        return next;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [minZoom, maxZoom]);

  // Drag pan handlers
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom control buttons
  const zoomIn = () => setZoom((z) => Math.min(z + 0.5, maxZoom));
  const zoomOut = () => {
    setZoom((z) => {
      const next = Math.max(z - 0.5, minZoom);
      if (next === minZoom) setOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  if (!src) {
    return (
      <div className="zoom-image-empty">
        <ImageIcon size={42} className="text-muted mb-2" />
        <p className="text-muted text-sm">No photo was uploaded with this field specimen.</p>
      </div>
    );
  }

  return (
    <div className="zoom-image-container">
      {/* Zoom Controls Bar */}
      <div className="zoom-controls-overlay">
        <div className="zoom-btn-group">
          <button
            type="button"
            className="zoom-btn"
            onClick={zoomIn}
            disabled={zoom >= maxZoom}
            title="Zoom In (or scroll wheel up)"
            aria-label="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={zoomOut}
            disabled={zoom <= minZoom}
            title="Zoom Out (or scroll wheel down)"
            aria-label="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={resetZoom}
            disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
            title="Reset Zoom & Position"
            aria-label="Reset View"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <span className="zoom-level-badge">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Pannable Image Viewport */}
      <div
        ref={containerRef}
        className={`zoom-viewport ${isDragging ? 'is-dragging' : ''} ${zoom > 1 ? 'is-zoomed' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          width="600"
          height="400"
          loading="eager"
          className="zoom-img"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          draggable={false}
        />
      </div>

      {/* Helper guide */}
      <div className="zoom-hint">
        {zoom > 1 ? (
          <span className="flex-center gap-1">
            <Move size={12} /> Drag to pan across foliar surface
          </span>
        ) : (
          <span>Scroll wheel or pinch to zoom into specimen lesions</span>
        )}
      </div>
    </div>
  );
}
