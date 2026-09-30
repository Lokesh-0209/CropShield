import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCases } from '../services/queries';
import { analyzeCase } from '../api/cases';
import { CaseStatus, formatErrorMessage } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import VerificationModal from '../components/VerificationModal';
import CaseDetailModal from '../components/CaseDetailModal';
import { StatCard } from '../components/common/StatCard';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';

// Format human-friendly relative age
function formatAge(dateString) {
  if (!dateString) return 'N/A';
  const past = new Date(dateString).getTime();
  if (isNaN(past)) return 'N/A';
  const diffMs = Date.now() - past;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 5) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function OfficerDashboardPage({ highlightCaseId = null }) {
  const navigate = useNavigate();

  useDocumentMetadata({
    title: 'Verification Queue — Officer Portal',
    description: 'Surveillance case verification queue with responsive card view, multi-filtering, and AI diagnostics.',
  });

  // Filters & Search state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  // Sorting state: Default sort = Needs Verification first, lowest confidence first
  const [sortOption, setSortOption] = useState('default'); // 'default' | 'conf-asc' | 'conf-desc' | 'date-desc' | 'date-asc' | 'severity-desc'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
    limit: 150,
  });

  const cases = useMemo(() => {
    const items = data?.items;
    if (Array.isArray(items)) return items;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  // Unique crops & districts for dropdown filters
  const { availableCrops, availableDistricts } = useMemo(() => {
    const cropsSet = new Set();
    const districtsSet = new Set();

    cases.forEach((c) => {
      if (c.crop) cropsSet.add(c.crop);
      if (c.location_name) {
        if (c.location_name.includes('Kolar')) districtsSet.add('Kolar');
        else if (c.location_name.includes('Chikkaballapur')) districtsSet.add('Chikkaballapur');
        else if (c.location_name.includes('Bengaluru') || c.location_name.includes('Bangalore')) {
          districtsSet.add('Bengaluru Rural');
        } else {
          districtsSet.add(c.location_name.split(',')[1]?.trim() || 'Other');
        }
      }
    });

    return {
      availableCrops: Array.from(cropsSet).sort(),
      availableDistricts: Array.from(districtsSet).sort(),
    };
  }, [cases]);

  // AI run handler
  const handleRunAnalysis = async (e, caseId) => {
    e.stopPropagation();
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

  // Filtered & Sorted Cases
  const processedCases = useMemo(() => {
    let result = cases.filter((c) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (c.crop || '').toLowerCase().includes(q) ||
          (c.disease || '').toLowerCase().includes(q) ||
          (c.location_name || '').toLowerCase().includes(q) ||
          (c.symptoms || '').toLowerCase().includes(q) ||
          (c.id || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Crop filter
      if (cropFilter !== 'ALL' && c.crop !== cropFilter) {
        return false;
      }

      // District filter
      if (districtFilter !== 'ALL') {
        const loc = (c.location_name || '').toLowerCase();
        if (!loc.includes(districtFilter.toLowerCase())) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'default') {
        // Needs Verification first, then lowest confidence first
        const isNeedA =
          a.status === CaseStatus.NEEDS_VERIFICATION || a.status === CaseStatus.ANALYZED ? 1 : 0;
        const isNeedB =
          b.status === CaseStatus.NEEDS_VERIFICATION || b.status === CaseStatus.ANALYZED ? 1 : 0;

        if (isNeedA !== isNeedB) return isNeedB - isNeedA;

        // If both same status, lowest confidence first
        const confA = a.confidence ?? 0.5;
        const confB = b.confidence ?? 0.5;
        return confA - confB;
      }

      if (sortOption === 'conf-asc') {
        return (a.confidence ?? 0.5) - (b.confidence ?? 0.5);
      }
      if (sortOption === 'conf-desc') {
        return (b.confidence ?? 0.5) - (a.confidence ?? 0.5);
      }
      if (sortOption === 'date-desc') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortOption === 'date-asc') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortOption === 'severity-desc') {
        const scoreA = a.risk_score ?? 0;
        const scoreB = b.risk_score ?? 0;
        return scoreB - scoreA;
      }

      return 0;
    });

    return result;
  }, [cases, searchQuery, cropFilter, districtFilter, sortOption]);

  // Pagination calculation
  const totalPages = Math.ceil(processedCases.length / pageSize) || 1;
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedCases.slice(start, start + pageSize);
  }, [processedCases, currentPage, pageSize]);

  // Overall KPI metrics
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
      {/* Page Header */}
      <PageHeader
        heading="Verification Queue"
        lead="Inspect AI computer vision diagnoses, assess micro-climate telemetry, and officially verify or reclassify field surveillance specimens."
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

      {/* Metrics Ribbon with error and loading handling */}
      <div className="stats-row mb-6">
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

      {/* Search, Status Chips & Advanced Filters */}
      <div className="panel mb-4" style={{ padding: '16px' }}>
        {/* Search & Status Filter Chips */}
        <div className="filter-bar mb-3" style={{ marginBottom: '14px' }}>
          <div className="search-wrap">
            <Search size={16} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-field"
              placeholder="Search by crop, disease, symptoms, or location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
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
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sorting, Crop Filter, District Filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Sort Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpDown size={14} className="text-muted" />
              <label htmlFor="sort-cases" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Sort:
              </label>
              <select
                id="sort-cases"
                className="cs-select"
                style={{ padding: '4px 10px', fontSize: '13px', height: '32px' }}
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="default">Default (Needs Verification &bull; Lowest Confidence)</option>
                <option value="conf-asc">Confidence: Lowest First</option>
                <option value="conf-desc">Confidence: Highest First</option>
                <option value="severity-desc">Risk Severity: High to Low</option>
                <option value="date-desc">Reported Date: Newest First</option>
                <option value="date-asc">Reported Date: Oldest First</option>
              </select>
            </div>

            {/* Crop Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="filter-crop" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Crop:
              </label>
              <select
                id="filter-crop"
                className="cs-select"
                style={{ padding: '4px 10px', fontSize: '13px', height: '32px' }}
                value={cropFilter}
                onChange={(e) => {
                  setCropFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Crops</option>
                {availableCrops.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="filter-district" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                District:
              </label>
              <select
                id="filter-district"
                className="cs-select"
                style={{ padding: '4px 10px', fontSize: '13px', height: '32px' }}
                value={districtFilter}
                onChange={(e) => {
                  setDistrictFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Districts</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Showing <strong>{processedCases.length}</strong> matching report{processedCases.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Cases Table / Responsive Card Layout */}
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
          <div style={{ padding: '24px' }}>
            <Skeleton height="36px" width="100%" className="mb-3" />
            <Skeleton height="56px" width="100%" className="mb-2" />
            <Skeleton height="56px" width="100%" className="mb-2" />
            <Skeleton height="56px" width="100%" className="mb-2" />
            <Skeleton height="56px" width="100%" />
          </div>
        </div>
      ) : processedCases.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No cases match your filters"
          description={
            cases.length === 0
              ? 'No field cases have been registered yet. Reports submitted by farmers will appear here for verification.'
              : 'Try adjusting your search query, crop, district, or status filter.'
          }
        />
      ) : (
        <div className="panel table-panel">
          <div className="table-responsive">
            <table className="clean-table table-cards-mobile">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '60px' }}>Photo</th>
                  <th scope="col">Crop</th>
                  <th scope="col">AI Diagnosis</th>
                  <th scope="col" style={{ width: '130px' }}>Confidence</th>
                  <th scope="col">Location</th>
                  <th scope="col">Age</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCases.map((c) => {
                  const isHighlighted = highlightCaseId && highlightCaseId === c.id;
                  const canVerify =
                    c.status === CaseStatus.NEEDS_VERIFICATION ||
                    c.status === CaseStatus.ANALYZED ||
                    c.status === CaseStatus.MORE_INFO_REQUIRED;
                  const isPendingAnalysis = c.status === CaseStatus.PENDING_ANALYSIS;

                  const confPct = c.confidence !== null && c.confidence !== undefined ? Math.round(c.confidence * 100) : null;
                  const confClass =
                    confPct !== null
                      ? confPct >= 80
                        ? 'conf-high'
                        : confPct >= 50
                        ? 'conf-medium'
                        : 'conf-low'
                      : '';

                  return (
                    <tr
                      key={c.id}
                      className={isHighlighted ? 'row-highlighted' : ''}
                      onClick={() => navigate(`/officer/cases/${c.id}`)}
                      style={{ cursor: 'pointer' }}
                      title="Click row to open Case Review"
                    >
                      {/* Photo Thumbnail */}
                      <td data-label="Specimen Photo">
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={`Specimen photo of ${c.crop}`}
                            width="44"
                            height="44"
                            loading="lazy"
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                              border: '1px solid var(--border-card)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <ClipboardList size={18} />
                          </div>
                        )}
                      </td>

                      {/* Crop & Growth stage */}
                      <td data-label="Crop">
                        <div className="cell-crop">
                          <strong>{c.crop}</strong>
                          <span className="cell-sub">{c.growth_stage}</span>
                        </div>
                      </td>

                      {/* AI Diagnosis & Risk */}
                      <td data-label="AI Diagnosis">
                        {c.disease ? (
                          <div className="cell-disease">
                            <span className="disease-title">{c.disease}</span>
                            <span className="cell-sub">{c.id}</span>
                          </div>
                        ) : (
                          <span className="text-muted text-sm">Pending AI analysis</span>
                        )}
                      </td>

                      {/* CONFIDENCE BAR */}
                      <td data-label="Confidence">
                        {confPct !== null ? (
                          <div className="confidence-bar-wrap" title={`AI Confidence: ${confPct}%`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                              <span className="text-muted">Confidence</span>
                              <strong className="font-mono">{confPct}%</strong>
                            </div>
                            <div className="confidence-bar-track">
                              <div
                                className={`confidence-bar-fill ${confClass}`}
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* Location */}
                      <td data-label="Location">
                        <div className="cell-location">
                          <span>{c.location_name}</span>
                          <span className="cell-sub font-mono">
                            {typeof c.latitude === 'number' ? c.latitude.toFixed(2) : '-'}°,{' '}
                            {typeof c.longitude === 'number' ? c.longitude.toFixed(2) : '-'}°
                          </span>
                        </div>
                      </td>

                      {/* Age */}
                      <td data-label="Age">
                        <span className="cell-date font-mono text-xs" title={c.created_at ? new Date(c.created_at).toLocaleString() : ''}>
                          {formatAge(c.created_at)}
                        </span>
                      </td>

                      {/* Status */}
                      <td data-label="Status">
                        <StatusBadge status={c.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="text-right" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                        <div className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => setActiveDetailCase(c)}
                            title="Quick preview modal"
                          >
                            <Eye size={13} className="icon-mr" />
                            Quick
                          </button>

                          <Link
                            to={`/officer/cases/${c.id}`}
                            className="btn btn-xs btn-primary"
                            title="Open full interactive case review"
                          >
                            Review
                          </Link>

                          {isPendingAnalysis && (
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-primary"
                              disabled={analyzingCaseId === c.id}
                              onClick={(e) => handleRunAnalysis(e, c.id)}
                            >
                              <Cpu size={13} className="icon-mr" />
                              {analyzingCaseId === c.id ? 'Analyzing...' : 'Run AI'}
                            </button>
                          )}

                          {canVerify && (
                            <button
                              type="button"
                              className="btn btn-xs btn-outline-secondary"
                              onClick={() => setActiveVerifyCase(c)}
                              title="Quick verify popup"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border-card)', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({processedCases.length} total cases)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                  if (
                    pg === 1 ||
                    pg === totalPages ||
                    (pg >= currentPage - 1 && pg <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pg}
                        type="button"
                        className={`btn btn-xs ${currentPage === pg ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ minWidth: '28px' }}
                        onClick={() => setCurrentPage(pg)}
                      >
                        {pg}
                      </button>
                    );
                  }
                  if (pg === 2 || pg === totalPages - 1) {
                    return <span key={pg} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>;
                  }
                  return null;
                })}

                <Button
                  variant="secondary"
                  size="xs"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  <span>Next</span>
                  <ChevronRight size={13} className="icon-ml" />
                </Button>
              </div>
            </div>
          )}
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
