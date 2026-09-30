import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ShieldAlert,
  MapPin,
  Compass,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useCases, useOutbreaks, useAlerts, useSurveillanceQueue } from '../../services/queries';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardBody } from '../../components/common/Card';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { CaseStatus } from '../../services/api';

export default function OfficerDashboardSummaryPage() {
  const { data: casesData, isLoading: casesLoading, isError: casesError } = useCases({ limit: 100 });
  const { data: outbreakData, isLoading: outbreaksLoading, isError: outbreaksError } = useOutbreaks();
  const { data: alertsData, isLoading: alertsLoading, isError: alertsError } = useAlerts();
  const { data: survData, isLoading: survLoading } = useSurveillanceQueue();

  const cases = casesData?.items || [];
  const clusters = outbreakData?.clusters || [];
  const alerts = alertsData?.alerts || [];
  const survQueue = survData?.queue || [];

  const pendingVerification = cases.filter(
    (c) => c.status === CaseStatus.NEEDS_VERIFICATION || c.status === CaseStatus.ANALYZED
  );
  const verifiedCount = cases.filter((c) => c.status === CaseStatus.VERIFIED).length;
  const highRiskCount = cases.filter((c) => (c.risk_level || '').toUpperCase() === 'HIGH').length;

  return (
    <div className="page-shell">
      {/* Header */}
      <PageHeader
        heading="Surveillance Command Center"
        lead="Outbreak density tracking, officer verification pipeline, and geospatial early warning analytics."
      />

      {/* KPI Ribbon */}
      <div className="stats-row mb-6">
        <StatCard
          title="Pending Verification"
          value={pendingVerification.length}
          loading={casesLoading}
          error={casesError}
          icon={ClipboardList}
          variant="medium"
          subtext="Requires field confirmation"
        />
        <StatCard
          title="Active Clusters"
          value={clusters.length}
          loading={outbreaksLoading}
          error={outbreaksError}
          icon={MapPin}
          variant="primary"
          subtext="DBSCAN density zones"
        />
        <StatCard
          title="Active Advisories"
          value={alerts.length}
          loading={alertsLoading}
          error={alertsError}
          icon={ShieldAlert}
          variant="high"
          subtext="Regional warning notices"
        />
        <StatCard
          title="Verified Invasions"
          value={verifiedCount}
          loading={casesLoading}
          error={casesError}
          icon={TrendingUp}
          variant="low"
          subtext="Feeding outbreak engine"
        />
      </div>

      {/* Grid: Action Cards */}
      <div className="page-layout-two-col mb-6">
        {/* Left: Pending Verification Triage */}
        <Card>
          <div className="cs-card-header">
            <div>
              <h2 className="cs-card-title">Urgent Case Verification</h2>
              <p className="cs-card-subtitle">
                Field reports flagged with high risk or uncertain AI confidence
              </p>
            </div>
            <Link to="/officer/queue" className="btn btn-secondary btn-xs">
              View Queue ({pendingVerification.length})
            </Link>
          </div>
          <CardBody>
            {pendingVerification.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">
                No cases currently pending verification.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingVerification.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <strong>{c.crop}</strong> &bull; {c.disease || 'Analyzed'}
                      <div className="text-muted text-xs">{c.location_name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RiskBadge level={c.risk_level} size="sm" showScore={false} />
                      <Link to={`/officer/cases/${c.id}`} className="btn btn-secondary btn-xs">
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right: Active Surveillance Ranking Highlights */}
        <Card>
          <div className="cs-card-header">
            <div>
              <h2 className="cs-card-title">Active Surveillance Priority</h2>
              <p className="cs-card-subtitle">
                Top predicted outbreak propagation perimeters
              </p>
            </div>
            <Link to="/officer/inspect" className="btn btn-secondary btn-xs">
              View All ({survQueue.length})
            </Link>
          </div>
          <CardBody>
            {survQueue.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">
                Active surveillance queue empty.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {survQueue.slice(0, 4).map((item) => (
                  <div
                    key={item.field_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span className="badge-primary" style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', marginRight: '6px' }}>
                        #{item.rank}
                      </span>
                      <strong>{item.name}</strong>
                      <div className="text-muted text-xs">{item.distance_to_cluster}</div>
                    </div>
                    <RiskBadge level={item.risk_level} score={item.urgency_score} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Next Phase Placeholder Note */}
      <div
        className="mt-6"
        style={{
          padding: '14px 18px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Sparkles size={16} className="text-primary flex-shrink-0" />
        <span>
          <strong>Coming in next phase:</strong> Interactive epidemiological transmission forecasting, spatial pathogen velocity vector maps, and automatic drone inspection scheduling.
        </span>
      </div>
    </div>
  );
}
