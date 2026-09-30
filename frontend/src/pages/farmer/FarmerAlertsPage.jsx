import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  Calendar,
  MapPin,
  Share2,
  Check,
  Filter,
  AlertTriangle,
  Sprout,
} from 'lucide-react';

import { useAlerts } from '../../services/queries';
import { useAuth } from '../../context/AuthContext';
import RiskBadge from '../../components/RiskBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';

export default function FarmerAlertsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userDistrict = user?.district || 'Kolar';

  const [districtFilter, setDistrictFilter] = useState('MY_DISTRICT'); // 'MY_DISTRICT' | 'ALL'
  const [copiedId, setCopiedId] = useState(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useAlerts({ eps_km: 2.0, min_samples: 3 });

  const rawAlerts = useMemo(() => {
    return data?.alerts || [];
  }, [data]);

  const filteredAlerts = useMemo(() => {
    if (districtFilter === 'ALL') return rawAlerts;
    // Filter alerts that mention the farmer's district in title, message, or affected area
    return rawAlerts.filter((a) => {
      const text = `${a.title} ${a.message} ${a.dominant_disease}`.toLowerCase();
      return text.includes(userDistrict.toLowerCase()) || text.includes('kolar') || text.includes('karnataka');
    });
  }, [rawAlerts, districtFilter, userDistrict]);

  const handleShare = async (alert) => {
    const shareData = {
      title: `CropShield Alert: ${alert.title}`,
      text: `⚠️ Crop Health Alert for ${alert.dominant_disease}: ${alert.message}. Advice by CropShield Kisan.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Share cancelled or rejected, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      setCopiedId(alert.warning_id || alert.cluster_id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      alert('Could not copy link.');
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          {t('alerts.title', 'Regional Outbreak Warnings')}
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          {t('alerts.subtitle', 'Active alerts and preventive advisories for your crops')}
        </p>
      </div>

      {/* District Toggle */}
      <div className="farmer-alert-filter-bar mb-3">
        <button
          type="button"
          className={`district-filter-btn ${districtFilter === 'MY_DISTRICT' ? 'is-active' : ''}`}
          onClick={() => setDistrictFilter('MY_DISTRICT')}
          style={{ minHeight: '48px', fontWeight: 700 }}
        >
          <MapPin size={15} className="icon-mr" />
          <span>{t('alerts.filterDistrict', { district: userDistrict })}</span>
        </button>

        <button
          type="button"
          className={`district-filter-btn ${districtFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setDistrictFilter('ALL')}
          style={{ minHeight: '48px', fontWeight: 700 }}
        >
          <Filter size={15} className="icon-mr" />
          <span>{t('alerts.filterAll', 'All Districts')}</span>
        </button>
      </div>

      {/* Alerts list */}
      {isError ? (
        <ErrorState
          title={t('alerts.errorTitle', 'Could not load outbreak alerts')}
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Skeleton height="140px" width="100%" />
          <Skeleton height="140px" width="100%" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title={t('alerts.noAlerts', 'No active disease alerts in this area right now.')}
          description={t('alerts.noAlertsDesc', 'Your monitored zone currently shows safe micro-climate indicators with no active disease outbreaks.')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAlerts.map((alert) => {
            const severity = (alert.outbreak_level || 'LOW').toLowerCase();
            const alertId = alert.warning_id || alert.cluster_id;
            const isCopied = copiedId === alertId;

            return (
              <div
                key={alertId}
                className="farmer-severity-card"
                style={{
                  background: '#ffffff',
                  border: `1px solid ${
                    severity === 'high'
                      ? 'var(--severity-high-border)'
                      : severity === 'medium'
                      ? 'var(--severity-medium-border)'
                      : 'var(--severity-low-border)'
                  }`,
                  borderLeft: `6px solid ${
                    severity === 'high'
                      ? 'var(--severity-high)'
                      : severity === 'medium'
                      ? 'var(--severity-medium)'
                      : 'var(--severity-low)'
                  }`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '18px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {/* Header: Severity Icon + Label + Risk Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {severity === 'high' ? (
                      <ShieldAlert size={22} className="text-danger flex-shrink-0" />
                    ) : (
                      <AlertTriangle size={22} style={{ color: 'var(--severity-medium)' }} className="flex-shrink-0" />
                    )}
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color:
                          severity === 'high'
                            ? 'var(--severity-high-text)'
                            : 'var(--severity-medium-text)',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {severity === 'high' ? t('alerts.highSeverity', 'High Risk Outbreak Alert') : t('alerts.mediumSeverity', 'Moderate Advisory Warning')}
                    </span>
                  </div>

                  <RiskBadge level={alert.outbreak_level} size="sm" showScore={false} />
                </div>

                {/* Title */}
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px', lineHeight: 1.3 }}>
                  {alert.title}
                </h2>

                {/* Plain-Language Advisory Message */}
                <p style={{ fontSize: '14px', color: 'var(--text-body)', marginTop: '8px', lineHeight: 1.5 }}>
                  {alert.message}
                </p>

                {/* Metadata Row: Dominant disease + Affected Area + Date */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sprout size={14} className="text-primary flex-shrink-0" />
                    <strong>{alert.dominant_disease || 'Tomato Early Blight'}</strong>
                  </span>
                  <span>&bull;</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} className="flex-shrink-0" />
                    <span>{t('alerts.cluster', { id: alert.cluster_id })} &bull; {userDistrict}</span>
                  </span>
                  <span>&bull;</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} className="flex-shrink-0" />
                    <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                  </span>
                </div>

                {/* Share Action */}
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="cs-btn cs-btn-secondary cs-btn-sm"
                    style={{ minHeight: '48px', padding: '10px 18px', fontWeight: 700 }}
                    onClick={() => handleShare(alert)}
                  >
                    {isCopied ? (
                      <>
                        <Check size={16} className="text-primary icon-mr" />
                        <span className="text-primary">{t('common.copied', 'Link copied to clipboard!')}</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} className="icon-mr" />
                        <span>{t('alerts.shareAlert', 'Share Alert')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
