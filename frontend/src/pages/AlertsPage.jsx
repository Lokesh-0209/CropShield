import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Layers,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Info,
  Share2,
  Check,
  MapPin,
  Clock,
} from 'lucide-react';
import { useAlerts } from '../services/queries';
import { RiskLevel, formatErrorMessage } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Toast } from '../components/common/Toast';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';
import useDocumentMetadata from '../hooks/useDocumentMetadata';

// Curated officer advisories for Karnataka agricultural zones
const CURATED_ADVISORIES = {
  1: {
    zone: 'Kolar Agro Basin (Sector 4 & Vemgal)',
    crop: 'Tomato',
    advisory:
      'Immediate containment protocol: Prohibit overhead sprinkler irrigation across adjacent Solanaceous plots. Apply copper oxychloride 50% WP (2.5g/L) as a protective barrier spray within 2.5km of cluster centroid.',
  },
  2: {
    zone: 'Chikkaballapur North & Nandi Foothills',
    crop: 'Potato',
    advisory:
      'Emergency phytosanitary warning: Phytophthora infestans sporulation accelerated by >90% humidity. Initiate curative systemic spray of Cymoxanil 8% + Mancozeb 64% WP (2.0g/L). Scout downwind tuber beds daily.',
  },
  3: {
    zone: 'Hoskote - Devanahalli Corn Belt',
    crop: 'Corn',
    advisory:
      'Preventive scouting protocol: Cinnamon rust pustules detected on lower leaves. Recommend prophylactic azoxystrobin spray for hybrid seed crops at tasseling stage.',
  },
  4: {
    zone: 'Sidlaghatta Horticultural Belt',
    crop: 'Tomato',
    advisory:
      'Foliar canopy advisory: High fruit rot vulnerability in depression plots. Aerate row spacing and apply preventive chlorothalonil fungicide before forecasted rain.',
  },
  101: {
    zone: 'Bengaluru Rural East',
    crop: 'Tomato',
    advisory:
      'Early season weather alert: Morning dew point condensation requires standard cultural aeration for sensitive greenhouse and nursery tomato seedlings.',
  },
  102: {
    zone: 'Malur Taluk Perimeter',
    crop: 'Corn',
    advisory:
      'Sentinel notice: Isolated pustules require routine monitoring by local extension workers. No mandatory quarantine currently required.',
  },
};

export default function AlertsPage() {
  useDocumentMetadata({
    title: 'Alerts Center — Officer Portal',
    description: 'Real-time epidemic alerts, quarantine advisories, and containment broadcasts.',
  });

  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [toast, setToast] = useState(null);
  const [sharedAlertId, setSharedAlertId] = useState(null);

  // TanStack Query for alerts
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAlerts({ eps_km: 2.0, min_samples: 3 });

  const alerts = useMemo(() => {
    return data?.alerts || [];
  }, [data]);

  // Mark alerts as read in localStorage when viewing the page
  useEffect(() => {
    if (alerts.length > 0) {
      try {
        const alertIds = alerts.map((a) => a.warning_id || String(a.cluster_id));
        localStorage.setItem('cropshield_read_alerts', JSON.stringify(alertIds));
        // Dispatch custom event to notify layout navbar bell immediately
        window.dispatchEvent(new Event('cropshield_alerts_read'));
      } catch {}
    }
  }, [alerts]);

  // Available districts
  const districts = ['Kolar', 'Chikkaballapur', 'Bengaluru Rural'];

  // Counts by severity
  const severityCounts = useMemo(() => {
    const counts = { ALL: alerts.length, HIGH: 0, MEDIUM: 0, LOW: 0 };
    alerts.forEach((a) => {
      const lvl = (a.outbreak_level || 'LOW').toUpperCase();
      if (counts[lvl] !== undefined) counts[lvl] += 1;
    });
    return counts;
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // Severity filter
      if (severityFilter !== 'ALL') {
        if ((a.outbreak_level || '').toUpperCase() !== severityFilter) return false;
      }

      // District filter
      if (districtFilter !== 'ALL') {
        const directDistrictMatch = a.district && a.district.toLowerCase() === districtFilter.toLowerCase();
        const text = `${a.title} ${a.message} ${a.zone_name || ''} ${a.district || ''}`.toLowerCase();
        if (!directDistrictMatch && !text.includes(districtFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [alerts, severityFilter, districtFilter]);

  // Share Advisory Action (Web Share API or clipboard fallback)
  const handleShareAlert = async (alert) => {
    const shareText = `[CropShield Outbreak Advisory] ${alert.title}\nSeverity: ${alert.outbreak_level}\nZone: ${alert.zone_name || 'Karnataka'}\nPathogen: ${alert.dominant_disease}\nRecommended Action: ${CURATED_ADVISORIES[alert.cluster_id]?.advisory || alert.message}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: alert.title,
          text: shareText,
          url: window.location.href,
        });
        setSharedAlertId(alert.warning_id || alert.cluster_id);
        setTimeout(() => setSharedAlertId(null), 3000);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setSharedAlertId(alert.warning_id || alert.cluster_id);
      setToast({
        type: 'success',
        message: 'Advisory details copied to clipboard!',
      });
      setTimeout(() => setSharedAlertId(null), 3000);
    } catch {
      setToast({
        type: 'info',
        message: 'Share URL: ' + window.location.href,
      });
    }
  };

  const getSeverityIcon = (level) => {
    switch ((level || '').toUpperCase()) {
      case RiskLevel.HIGH:
        return <Flame size={18} className="text-danger flex-shrink-0" />;
      case RiskLevel.MEDIUM:
        return <AlertTriangle size={18} className="text-warning flex-shrink-0" />;
      case RiskLevel.LOW:
      default:
        return <Info size={18} className="text-success flex-shrink-0" />;
    }
  };

  return (
    <div className="page-shell">
      {/* Toast Alert */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999 }}>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        heading="Alerts & Outbreak Advisories"
        lead="Actionable regional biosecurity notices generated from validated disease clusters to contain epidemic propagation."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            icon={RefreshCw}
          >
            Refresh Advisories
          </Button>
        }
      />

      {/* Filter Bar with Severity Counts & District Filter */}
      <div className="panel mb-4" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Severity filter chips with exact counts */}
          <div className="filter-chips">
            {[
              { id: 'ALL', label: `All Alerts (${severityCounts.ALL})` },
              { id: RiskLevel.HIGH, label: `High Severity (${severityCounts.HIGH})` },
              { id: RiskLevel.MEDIUM, label: `Medium Severity (${severityCounts.MEDIUM})` },
              { id: RiskLevel.LOW, label: `Low Severity (${severityCounts.LOW})` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip ${severityFilter === item.id ? 'chip-active' : ''}`}
                onClick={() => setSeverityFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* District Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={15} className="text-muted" />
            <label htmlFor="district-filter" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
              District:
            </label>
            <select
              id="district-filter"
              className="cs-select"
              style={{ padding: '4px 10px', fontSize: '13px', height: '32px' }}
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
            >
              <option value="ALL">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      {isError ? (
        <ErrorState
          title="Unable to load outbreak alerts"
          message={formatErrorMessage(error)}
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton height="160px" width="100%" className="mb-3" />
          <Skeleton height="160px" width="100%" className="mb-3" />
          <Skeleton height="160px" width="100%" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Active Advisories"
          description={
            alerts.length === 0
              ? 'No active outbreak alerts in your monitoring zones. Alerts are dispatched once verified cases form geographic clusters.'
              : 'No alerts match your selected severity level or district filter.'
          }
        />
      ) : (
        <div className="incident-feed-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAlerts.map((alert) => {
            const severity = (alert.outbreak_level || 'LOW').toUpperCase();
            const curated = CURATED_ADVISORIES[alert.cluster_id] || {
              zone: alert.zone_name || 'Karnataka Horticultural Belt',
              crop: alert.crop || 'Field Crop',
              advisory: alert.message,
            };
            const isShared = sharedAlertId === (alert.warning_id || alert.cluster_id);

            return (
              <div
                key={alert.warning_id || alert.cluster_id}
                className={`incident-card severity-${severity.toLowerCase()}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 24px',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                  borderLeft: `5px solid ${
                    severity === 'HIGH'
                      ? 'var(--severity-high)'
                      : severity === 'MEDIUM'
                      ? 'var(--severity-medium)'
                      : 'var(--severity-low)'
                  }`,
                }}
              >
                {/* Header Row: Severity Icon, Title, Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {getSeverityIcon(severity)}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background:
                              severity === 'HIGH'
                                ? 'var(--severity-high-bg)'
                                : severity === 'MEDIUM'
                                ? 'var(--severity-medium-bg)'
                                : 'var(--severity-low-bg)',
                            color:
                              severity === 'HIGH'
                                ? 'var(--severity-high-text)'
                                : severity === 'MEDIUM'
                                ? 'var(--severity-medium-text)'
                                : 'var(--severity-low-text)',
                          }}
                        >
                          {severity} Severity Advisory
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Ref: {alert.warning_id || `WRN-${alert.cluster_id}`} &bull; Cluster #{alert.cluster_id}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1.3 }}>
                        {alert.title}
                      </h3>
                    </div>
                  </div>

                  <RiskBadge
                    level={alert.outbreak_level}
                    score={alert.average_risk_score}
                    size="md"
                  />
                </div>

                {/* Primary Message */}
                <p style={{ fontSize: '13.5px', color: 'var(--text-body)', lineHeight: 1.5, margin: '8px 0 14px' }}>
                  {alert.message}
                </p>

                {/* Curated Officer Extension Advisory Box */}
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Curated Biosecurity Protocol & Advisory:
                  </strong>
                  <span style={{ color: 'var(--text-body)' }}>{curated.advisory}</span>
                </div>

                {/* Metadata Row: Affected Area, Crop & Disease, Issue Time */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '12px',
                    fontSize: '12.5px',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '14px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                      Affected Monitoring Zone
                    </span>
                    <strong style={{ color: 'var(--text-main)' }}>{curated.zone}</strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                      Crop & Pathogen
                    </span>
                    <strong style={{ color: 'var(--primary)' }}>
                      {curated.crop} &bull; {alert.dominant_disease || 'Early Blight'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                      Cluster Case Count
                    </span>
                    <strong>{alert.case_count} confirmed specimens</strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                      Issued Time
                    </span>
                    <span className="font-mono text-muted">
                      {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Active Alert'}
                    </span>
                  </div>
                </div>

                {/* Footer with Share and Map actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '12px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    Auto-generated by Outbreak Intelligence Engine
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Share Action */}
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      onClick={() => handleShareAlert(alert)}
                      title="Share advisory via Web Share API or copy to clipboard"
                    >
                      {isShared ? (
                        <>
                          <Check size={13} className="text-success icon-mr" />
                          Shared!
                        </>
                      ) : (
                        <>
                          <Share2 size={13} className="icon-mr" />
                          Share Advisory
                        </>
                      )}
                    </button>

                    {/* View on Map */}
                    <Link
                      to="/officer/outbreaks"
                      className="btn btn-xs btn-outline-primary"
                      title="View active cluster on interactive map"
                    >
                      <Layers size={13} className="icon-mr" />
                      View on Outbreak Map
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
