import { Link } from 'react-router-dom';
import { PlusCircle, ShieldAlert, CheckCircle2, CloudSun, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCases, useWeather, useAlerts } from '../../services/queries';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { Card, CardBody } from '../../components/common/Card';
import { Skeleton } from '../../components/common/Skeleton';

export default function FarmerHomePage() {
  const { user } = useAuth();
  const { data: casesData, isLoading: casesLoading } = useCases({ limit: 5 });
  const { data: weatherData } = useWeather();
  const { data: alertsData } = useAlerts({ limit: 1 });

  const recentCases = casesData?.items || [];
  const topAlert = alertsData?.alerts?.[0];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Welcome Greeting */}
      <div className="mb-4">
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.4px' }}>
          Namaskara, {user?.name || 'Farmer'}!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '2px' }}>
          {user?.district || 'Kolar'} District &bull; Crop Health Sentinel
        </p>
      </div>

      {/* Prominent Emergency / Top Advisory Banner */}
      {topAlert && (
        <div
          className="mb-4"
          style={{
            background: 'var(--severity-high-bg)',
            border: '1px solid var(--severity-high-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <ShieldAlert size={22} className="text-danger flex-shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--severity-high-text)' }}>
              Outbreak Notice for {user?.district || 'Your Area'}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-body)', marginTop: '2px', lineHeight: 1.4 }}>
              {topAlert.title}
            </p>
            <Link
              to="/farmer/alerts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--severity-high-text)',
                marginTop: '6px',
              }}
            >
              <span>Read safety advisory</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Big Touch CTA: Report Crop Disease */}
      <Link
        to="/farmer/report"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          color: '#ffffff',
          padding: '20px 20px',
          borderRadius: 'var(--radius-xl)',
          textDecoration: 'none',
          boxShadow: 'var(--shadow-md)',
          minHeight: '88px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <PlusCircle size={28} />
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>Report Sick Crop</div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
            Take a leaf photo &bull; Get instant AI diagnosis
          </div>
        </div>
        <ArrowRight size={22} style={{ marginLeft: 'auto', opacity: 0.8 }} />
      </Link>

      {/* Local Weather Status Card */}
      {weatherData && (
        <Card className="mb-4">
          <CardBody style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CloudSun size={24} className="text-primary" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                    Local Field Climate
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {weatherData.location}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {weatherData.temperature}°C
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Humidity: {weatherData.humidity}%
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recent Submissions Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
          Recent Field Reports
        </h2>
        <Link
          to="/farmer/reports"
          style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}
        >
          View all
        </Link>
      </div>

      {/* Recent Reports List */}
      {casesLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Skeleton height="72px" width="100%" />
          <Skeleton height="72px" width="100%" />
        </div>
      ) : recentCases.length === 0 ? (
        <Card>
          <CardBody style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              No crop reports filed yet.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recentCases.slice(0, 3).map((item) => (
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
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                minHeight: '56px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-main)' }}>
                  {item.crop} &mdash; {item.disease || 'Under Analysis'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {new Date(item.created_at).toLocaleDateString()} &bull; {item.location_name}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status={item.status} size="sm" />
                <ArrowRight size={15} className="text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Next Phase Placeholder Note */}
      <div
        className="mt-4"
        style={{
          padding: '12px 14px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Sparkles size={14} className="text-primary flex-shrink-0" />
        <span>
          <strong>Coming in next phase:</strong> Voice audio symptom recorder and offline camera sync.
        </span>
      </div>
    </div>
  );
}
