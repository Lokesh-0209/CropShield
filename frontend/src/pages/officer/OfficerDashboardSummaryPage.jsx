import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  Flame,
  ArrowRight,
  Compass,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useCases, useOutbreaks, useAlerts, useSurveillanceQueue } from '../../services/queries';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardBody } from '../../components/common/Card';
import RiskBadge from '../../components/RiskBadge';
import { CaseStatus } from '../../services/api';
import CaseTrendChart from '../../components/officer/CaseTrendChart';

export default function OfficerDashboardSummaryPage() {
  const { data: casesData, isLoading: casesLoading, isError: casesError } = useCases({ limit: 100 });
  const { data: outbreakData, isLoading: outbreaksLoading, isError: outbreaksError } = useOutbreaks();
  const { data: alertsData, isLoading: alertsLoading, isError: alertsError } = useAlerts();
  const { data: survData, isLoading: survLoading, isError: survError } = useSurveillanceQueue();

  const cases = useMemo(() => {
    return casesData?.items || (Array.isArray(casesData) ? casesData : []);
  }, [casesData]);

  const survQueue = survData?.queue || [];

  // Compute 4 key stats (Total Cases, Needs Verification, Verified Outbreaks, High Risk)
  const stats = useMemo(() => {
    if (casesError || (!casesData && !casesLoading)) {
      return { total: null, needsVerification: null, verified: null, highRisk: null };
    }
    const total = cases.length;
    const needsVerification = cases.filter(
      (c) => c.status === CaseStatus.NEEDS_VERIFICATION || c.status === CaseStatus.ANALYZED
    ).length;
    const verified = outbreakData?.clusters
      ? outbreakData.clusters.length
      : cases.filter((c) => c.status === CaseStatus.VERIFIED).length;
    const highRisk = cases.filter((c) => (c.risk_level || '').toUpperCase() === 'HIGH').length;

    return { total, needsVerification, verified, highRisk };
  }, [cases, casesError, casesData, casesLoading, outbreakData]);

  // "Pending verification" preview (Top 5, lowest confidence first)
  const pendingCasesTop5 = useMemo(() => {
    const pending = cases.filter(
      (c) =>
        c.status === CaseStatus.NEEDS_VERIFICATION ||
        c.status === CaseStatus.ANALYZED ||
        c.status === CaseStatus.MORE_INFO_REQUIRED
    );

    // Sort lowest confidence first (default to 0.5 if missing)
    pending.sort((a, b) => {
      const confA = a.confidence ?? 0.5;
      const confB = b.confidence ?? 0.5;
      return confA - confB;
    });

    return pending.slice(0, 5);
  }, [cases]);

  // Top priority field from Inspect Next
  const topSurvField = survQueue.length > 0 ? survQueue[0] : null;

  return (
    <div className="page-shell">
      {/* Page Header */}
      <PageHeader
        heading="Surveillance Command Center"
        lead="Regional outbreak tracking, AI diagnosis triage pipeline, and proactive field inspection dispatch."
      />

      {/* Prominent Headline Feature Banner: Inspect Next */}
      <div className="inspect-next-banner">
        <div className="inspect-banner-content">
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Compass size={24} className="text-white" aria-hidden="true" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span className="inspect-banner-badge">Active Surveillance</span>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>
                {survQueue.length} Sentinel Field Targets Flagged
              </span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>
              Inspect Next &mdash; {topSurvField ? `#1 Priority: ${topSurvField.name}` : 'Priority Outbreak Containment Queue'}
            </div>
            {topSurvField && (
              <div style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '2px' }}>
                Buffer perimeter {topSurvField.distance_to_cluster} &bull; Urgency Score: {topSurvField.urgency_score}/100
              </div>
            )}
          </div>
        </div>

        <Link to="/officer/inspect" className="inspect-banner-btn" id="inspect-next-banner-btn">
          <span>Open Inspect Next Queue</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* 4 Stat Cards: Total Cases, Needs Verification, Verified Outbreaks, High Risk */}
      <div className="stats-row mb-6">
        <StatCard
          title="Total Cases"
          value={stats.total}
          loading={casesLoading}
          error={casesError}
          icon={ClipboardList}
          variant="neutral"
          subtext="Recorded surveillance reports"
        />
        <StatCard
          title="Needs Verification"
          value={stats.needsVerification}
          loading={casesLoading}
          error={casesError}
          icon={AlertTriangle}
          variant="medium"
          subtext="Requires officer validation"
        />
        <StatCard
          title="Verified Outbreaks"
          value={stats.verified}
          loading={casesLoading || outbreaksLoading}
          error={casesError && outbreaksError}
          icon={ShieldCheck}
          variant="low"
          subtext="Confirmed pathogen focal points"
        />
        <StatCard
          title="High Risk Cases"
          value={stats.highRisk}
          loading={casesLoading}
          error={casesError}
          icon={Flame}
          variant="high"
          subtext="Accelerated transmission pressure"
        />
      </div>

      {/* Trend Chart: Cases Over the Last 30 Days */}
      <div className="mb-6">
        <CaseTrendChart cases={cases} isLoading={casesLoading} />
      </div>

      {/* Two Column Grid: Pending Verification Triage & Quick Surveillance Access */}
      <div className="page-layout-two-col mb-6">
        {/* Left: Pending Verification (Top 5, lowest confidence first) */}
        <Card>
          <div className="cs-card-header">
            <div>
              <h2 className="cs-card-title">Pending Verification &bull; Lowest Confidence First</h2>
              <p className="cs-card-subtitle">
                Prioritize field reports where AI uncertainty requires human expert review
              </p>
            </div>
            <Link to="/officer/queue" className="btn btn-secondary btn-xs">
              View Full Queue ({stats.needsVerification ?? 0})
            </Link>
          </div>
          <CardBody>
            {pendingCasesTop5.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">
                No cases currently pending verification.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingCasesTop5.map((c) => {
                  const confPct = Math.round((c.confidence ?? 0.5) * 100);
                  const confClass = confPct >= 80 ? 'conf-high' : confPct >= 50 ? 'conf-medium' : 'conf-low';

                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Photo Thumbnail + Crop */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.crop}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                              border: '1px solid var(--border-card)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                              flexShrink: 0,
                            }}
                          >
                            <ClipboardList size={18} />
                          </div>
                        )}

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong>{c.crop}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                              &bull; {c.disease || 'Analyzed'}
                            </span>
                          </div>
                          <div className="text-muted text-xs">{c.location_name}</div>
                        </div>
                      </div>

                      {/* Confidence Meter + Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div className="confidence-bar-wrap" style={{ width: '90px' }} title={`AI Confidence: ${confPct}%`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span className="text-muted">Conf</span>
                            <strong className="font-mono">{confPct}%</strong>
                          </div>
                          <div className="confidence-bar-track">
                            <div className={`confidence-bar-fill ${confClass}`} style={{ width: `${confPct}%` }} />
                          </div>
                        </div>

                        <RiskBadge level={c.risk_level} size="sm" showScore={false} />

                        <Link
                          to={`/officer/cases/${c.id}`}
                          className="btn btn-secondary btn-xs"
                          title="Open Case Review"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right: Active Outbreak Clusters Summary */}
        <Card>
          <div className="cs-card-header">
            <div>
              <h2 className="cs-card-title">Geospatial Outbreak Clusters</h2>
              <p className="cs-card-subtitle">
                Active spatial disease hotspots detected by DBSCAN clustering
              </p>
            </div>
            <Link to="/officer/outbreaks" className="btn btn-secondary btn-xs">
              View Map ({outbreakData?.clusters?.length || 0})
            </Link>
          </div>
          <CardBody>
            {outbreakData?.clusters?.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">
                No active outbreak clusters detected.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(outbreakData?.clusters || []).slice(0, 4).map((cl) => (
                  <div
                    key={cl.cluster_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge-primary" style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px' }}>
                          Cluster #{cl.cluster_id}
                        </span>
                        <strong>{cl.dominant_disease || 'Outbreak'}</strong>
                      </div>
                      <div className="text-muted text-xs mt-1">
                        {cl.zone_name || `${cl.case_count} verified cases within ${cl.radius_km || 1.8}km`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RiskBadge level={cl.outbreak_level} score={cl.average_risk_score} size="sm" />
                      <Link to="/officer/outbreaks" className="btn btn-secondary btn-xs">
                        Map
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Surveillance Intel Note */}
      <div
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
          <strong>Automated Outbreak Surveillance:</strong> System recalculates pathogen transmission vectors every hour using micro-climatic humidity and verified field specimen assays.
        </span>
      </div>
    </div>
  );
}
