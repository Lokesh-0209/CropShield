import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  CloudSun,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCases, useWeather, useAlerts } from '../../services/queries';
import RiskBadge from '../../components/RiskBadge';
import { Card, CardBody } from '../../components/common/Card';
import { Skeleton } from '../../components/common/Skeleton';

export default function FarmerHomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: casesData, isLoading: casesLoading } = useCases({ limit: 5 });
  const { data: weatherData } = useWeather();
  const { data: alertsData } = useAlerts({ limit: 2 });

  const recentCases = casesData?.items || [];
  const nearbyAlerts = alertsData?.alerts || [];

  // Determine field risk level from weather + alerts
  const fieldRiskLevel = (() => {
    if (nearbyAlerts.some((a) => a.outbreak_level === 'HIGH')) return 'HIGH';
    if (weatherData?.humidity > 80 || weatherData?.rainfall > 10) return 'HIGH';
    if (weatherData?.humidity > 65) return 'MEDIUM';
    return 'LOW';
  })();

  const fieldRiskAdvice = (() => {
    if (fieldRiskLevel === 'HIGH') {
      return t(
        'home.riskHighAdvice',
        'High humidity and rain expected. Fungal blight spreading rapidly nearby. Check leaves now.'
      );
    }
    if (fieldRiskLevel === 'MEDIUM') {
      return t(
        'home.riskMediumAdvice',
        'Moderate humidity. Inspect tomato and potato leaves for spots.'
      );
    }
    return t(
      'home.riskLowAdvice',
      'Weather is dry and sunny. Low risk of fungal infection today.'
    );
  })();

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Welcome Greeting */}
      <div className="mb-4">
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          {t('home.greeting', 'Namaskara')}, {user?.name || t('common.farmerRole', 'Farmer')}!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '2px' }}>
          {user?.district || 'Kolar'} {t('home.subtitle', 'District • Crop Health Sentinel')}
        </p>
      </div>

      {/* Large Primary Action: "Scan my crop" */}
      <Link
        to="/farmer/report"
        className="farmer-hero-scan-cta"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          color: '#ffffff',
          padding: '22px 20px',
          borderRadius: 'var(--radius-xl)',
          textDecoration: 'none',
          boxShadow: 'var(--shadow-md)',
          minHeight: '96px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Camera size={30} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px' }}>
            {t('home.scanCrop', 'Scan my crop')}
          </div>
          <div style={{ fontSize: '13.5px', opacity: 0.95, marginTop: '3px' }}>
            {t('home.scanSubtitle', 'Take a photo of diseased leaf • Instant diagnosis')}
          </div>
        </div>
        <ArrowRight size={24} style={{ opacity: 0.85, flexShrink: 0 }} />
      </Link>

      {/* "Risk for my field today" card */}
      <Card
        className="mb-4"
        style={{
          borderLeft: `5px solid ${
            fieldRiskLevel === 'HIGH'
              ? 'var(--severity-high)'
              : fieldRiskLevel === 'MEDIUM'
              ? 'var(--severity-medium)'
              : 'var(--severity-low)'
          }`,
        }}
      >
        <CardBody style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {fieldRiskLevel === 'HIGH' ? (
                <ShieldAlert size={22} className="text-danger flex-shrink-0" />
              ) : fieldRiskLevel === 'MEDIUM' ? (
                <AlertTriangle size={22} style={{ color: 'var(--severity-medium)' }} className="flex-shrink-0" />
              ) : (
                <CheckCircle2 size={22} className="text-primary flex-shrink-0" />
              )}
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                {t('home.riskCardTitle', 'Risk for my field today')}
              </h2>
            </div>
            <RiskBadge level={fieldRiskLevel} size="md" showScore={false} />
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-body)', marginTop: '8px', lineHeight: 1.45 }}>
            {fieldRiskAdvice}
          </p>

          {/* Micro weather line */}
          {weatherData && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-card)',
                fontSize: '12.5px',
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CloudSun size={14} className="text-primary" />
                <span>{weatherData.location}</span>
              </span>
              <span>&bull;</span>
              <span>
                <strong>{weatherData.temperature}°C</strong>
              </span>
              <span>&bull;</span>
              <span>{weatherData.humidity}% {t('home.humidity', 'humidity')}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Nearby Alerts Preview */}
      {nearbyAlerts.length > 0 && (
        <div className="mb-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              {t('home.nearbyAlerts', 'Nearby Crop Health Alerts')}
            </h2>
            <Link to="/farmer/alerts" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
              {t('common.viewAll', 'View all')}
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nearbyAlerts.slice(0, 2).map((alert) => (
              <Link
                key={alert.warning_id || alert.cluster_id}
                to="/farmer/alerts"
                style={{
                  textDecoration: 'none',
                  background: '#ffffff',
                  border: '1px solid var(--border-card)',
                  borderLeft: `4px solid ${
                    alert.outbreak_level === 'HIGH'
                      ? 'var(--severity-high)'
                      : 'var(--severity-medium)'
                  }`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  minHeight: '60px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-main)' }}>
                    {alert.title}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {alert.message?.slice(0, 90)}...
                  </div>
                </div>
                <RiskBadge level={alert.outbreak_level} size="sm" showScore={false} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Last 3 Reports Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
          {t('home.recentReports', 'Recent Crop Reports')}
        </h2>
        <Link to="/farmer/reports" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
          {t('common.viewAll', 'View all')}
        </Link>
      </div>

      {/* Last 3 Reports with clearly differentiated badges */}
      {casesLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Skeleton height="76px" width="100%" />
          <Skeleton height="76px" width="100%" />
        </div>
      ) : recentCases.length === 0 ? (
        <Card>
          <CardBody style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {t('home.noReports', 'No crop reports filed yet. Scan your first crop to get an instant diagnosis.')}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recentCases.slice(0, 3).map((item) => {
            const isVerified = item.status === 'VERIFIED';

            return (
              <Link
                key={item.id}
                to={`/farmer/reports/${item.id}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: '#ffffff',
                  border: isVerified ? '1px solid #bbf7d0' : '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  minHeight: '64px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>
                    {item.crop} &mdash; {item.disease || t('home.underAiAnalysis', 'Under AI Analysis')}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(item.created_at).toLocaleDateString()} &bull; {item.location_name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Distinct Suspected vs Verified styling */}
                  {isVerified ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '4px 9px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>{t('common.verified', 'Verified')}</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#fffbeb',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        padding: '4px 9px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                      }}
                    >
                      <AlertTriangle size={13} />
                      <span>{t('common.suspected', 'Suspected')}</span>
                    </span>
                  )}
                  <ArrowRight size={15} className="text-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
