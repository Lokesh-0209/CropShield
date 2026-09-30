import { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  Cpu,
  Inbox,
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { useCases } from '../services/queries';
import { analyzeCase } from '../api/cases';
import { CaseStatus, formatErrorMessage } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import VerificationModal from '../components/VerificationModal';
import CaseDetailModal from '../components/CaseDetailModal';
import { StatCard } from '../components/common/StatCard';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';

export default function OfficerDashboardPage({ highlightCaseId = null }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeVerifyCase, setActiveVerifyCase] = useState(null);
  const [activeDetailCase, setActiveDetailCase] = useState(null);
  const [analyzingCaseId, setAnalyzingCaseId] = useState(null);

  // TanStack Query for cases
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCases({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 100,
  });

  const cases = useMemo(() => {
    const items = data?.items;
    if (Array.isArray(items)) return items;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  const handleRunAnalysis = async (caseId) => {
    setAnalyzingCaseId(caseId);
    try {
      await analyzeCase(caseId);
      refetch();
    } catch (err) {
      alert(`AI Analysis failed: ${formatErrorMessage(err)}`);
    } finally {
      setAnalyzingCaseId(null);
    }
  };

  const handleCaseVerified = () => {
    refetch();
  };

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.crop || '').toLowerCase().includes(q) ||
        (c.disease || '').toLowerCase().includes(q) ||
        (c.location_name || '').toLowerCase().includes(q) ||
        (c.symptoms || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q)
      );
    });
  }, [cases, searchQuery]);

  const stats = useMemo(() => {
    if (isError || !data) return { total: null, needsVerification: null, verified: null, highRisk: null };
    const total = cases.length;
    const needsVerification = cases.filter(
      (c) => c.status === CaseStatus.NEEDS_VERIFICATION || c.status === CaseStatus.ANALYZED
    ).length;
    const verified = cases.filter((c) => c.status === CaseStatus.VERIFIED).length;
    const highRisk = cases.filter((c) => (c.risk_level || '').toUpperCase() === 'HIGH').length;
    return { total, needsVerification, verified, highRisk };
  }, [cases, isError, data]);

  return (
    <div className="page-shell">
      {/* Page Header with Action */}
      <PageHeader
        heading="Cases"
        lead="Review surveillance reports, inspect AI computer vision diagnoses, and verify field cases."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        }
      />

      {/* Metrics Ribbon with error and loading handling (never misleading 0) */}
      <div className="stats-row">
        <StatCard
          title="Total Cases"
          value={stats.total}
          loading={isLoading}
          error={isError}
          icon={ClipboardList}
          variant="neutral"
        />
        <StatCard
          title="Needs Verification"
          value={stats.needsVerification}
          loading={isLoading}
          error={isError}
          icon={AlertTriangle}
          variant="medium"
        />
        <StatCard
          title="Verified Outbreaks"
          value={stats.verified}
          loading={isLoading}
          error={isError}
          icon={ShieldCheck}
          variant="low"
        />
        <StatCard
          title="High Risk Cases"
          value={stats.highRisk}
          loading={isLoading}
          error={isError}
          icon={Flame}
          variant="high"
        />
      </div>

      {/* Search and Filters */}
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-field"
            placeholder="Search by crop, disease, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search cases by crop, disease, or location"
          />
        </div>

        <div className="filter-chips">
          {[
            { id: 'ALL', label: 'All Cases' },
            { id: CaseStatus.NEEDS_VERIFICATION, label: 'Needs Verification' },
            { id: CaseStatus.ANALYZED, label: 'Analyzed' },
            { id: CaseStatus.VERIFIED, label: 'Verified' },
            { id: CaseStatus.PENDING_ANALYSIS, label: 'Pending AI' },
            { id: CaseStatus.REJECTED, label: 'Rejected' },
            { id: CaseStatus.MORE_INFO_REQUIRED, label: 'More Info' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`chip ${statusFilter === tab.id ? 'chip-active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Cases Container: SEPARATE Error, Loading, Empty, and Success states */}
      {isError ? (
        <ErrorState
          title="Unable to load field surveillance cases"
          message={formatErrorMessage(error)}
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div className="panel table-panel">
          <div className="p-6" style={{ padding: '24px' }}>
            <Skeleton height="36px" width="100%" className="mb-3" />
            <Skeleton height="48px" width="100%" className="mb-2" />
            <Skeleton height="48px" width="100%" className="mb-2" />
            <Skeleton height="48px" width="100%" className="mb-2" />
            <Skeleton height="48px" width="100%" />
          </div>
        </div>
      ) : filteredCases.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No cases match your filters"
          description={
            cases.length === 0
              ? 'No field cases have been registered yet. Head to Submit Case to file the first report.'
              : 'Try adjusting your search query or status filter.'
          }
        />
      ) : (
        <div className="panel table-panel">
          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th scope="col">Crop</th>
                  <th scope="col">Location</th>
                  <th scope="col">AI Diagnosis</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const isHighlighted = highlightCaseId && highlightCaseId === c.id;
                  const canVerify =
                    c.status === CaseStatus.NEEDS_VERIFICATION ||
                    c.status === CaseStatus.ANALYZED ||
                    c.status === CaseStatus.MORE_INFO_REQUIRED;
                  const isPendingAnalysis = c.status === CaseStatus.PENDING_ANALYSIS;

                  return (
                    <tr
                      key={c.id}
                      className={isHighlighted ? 'row-highlighted' : ''}
                    >
                      <td>
                        <div className="cell-crop">
                          <strong>{c.crop}</strong>
                          <span className="cell-sub">{c.growth_stage}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-location">
                          <span>{c.location_name}</span>
                          <span className="cell-sub font-mono">
                            {typeof c.latitude === 'number' ? c.latitude.toFixed(2) : '-'}°,{' '}
                            {typeof c.longitude === 'number' ? c.longitude.toFixed(2) : '-'}°
                          </span>
                        </div>
                      </td>
                      <td>
                        {c.disease ? (
                          <div className="cell-disease">
                            <span className="disease-title">{c.disease}</span>
                            {c.confidence !== null && (
                              <span className="disease-conf">
                                {Math.round(c.confidence * 100)}% conf.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted text-sm">Pending analysis</span>
                        )}
                      </td>
                      <td>
                        <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                      </td>
                      <td>
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td>
                        <span className="cell-date">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => setActiveDetailCase(c)}
                            title="View case details"
                          >
                            <Eye size={13} className="icon-mr" />
                            Details
                          </button>

                          {isPendingAnalysis && (
                            <button
                              type="button"
                              className="btn btn-xs btn-primary"
                              disabled={analyzingCaseId === c.id}
                              onClick={() => handleRunAnalysis(c.id)}
                            >
                              <Cpu size={13} className="icon-mr" />
                              {analyzingCaseId === c.id ? 'Analyzing...' : 'Run AI'}
                            </button>
                          )}

                          {canVerify && (
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-primary"
                              onClick={() => setActiveVerifyCase(c)}
                            >
                              <CheckCircle size={13} className="icon-mr" />
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {activeVerifyCase && (
        <VerificationModal
          caseItem={activeVerifyCase}
          onClose={() => setActiveVerifyCase(null)}
          onVerified={handleCaseVerified}
        />
      )}

      {/* Case Detail Modal */}
      {activeDetailCase && (
        <CaseDetailModal
          caseItem={activeDetailCase}
          onClose={() => setActiveDetailCase(null)}
          onVerifyClick={(c) => setActiveVerifyCase(c)}
        />
      )}
    </div>
  );
}
