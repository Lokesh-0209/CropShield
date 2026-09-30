import { Shield } from 'lucide-react';

export default function RouteLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60dvh',
        padding: '32px 16px',
        color: 'var(--text-muted)',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading page content"
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'var(--primary-50)',
          border: '1px solid var(--primary-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: '16px',
          animation: 'pulse 1.8s ease-in-out infinite',
        }}
      >
        <Shield size={28} />
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-main)',
          marginBottom: '4px',
        }}
      >
        Loading CropShield...
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Preparing surveillance telemetry
      </div>
    </div>
  );
}
