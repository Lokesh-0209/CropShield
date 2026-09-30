import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  Cpu,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { listCases, analyzeCase } from '../api/cases';
import { CaseStatus } from '../types/enums';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import VerificationModal from '../components/VerificationModal';
import CaseDetailModal from '../components/CaseDetailModal';

export default function OfficerDashboardPage({ highlightCaseId = null }) {
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeVerifyCase, setActiveVerifyCase] = useState(null);
  const [activeDetailCase, setActiveDetailCase] = useState(null);
  const [analyzingCaseId, setAnalyzingCaseId] = useState(null);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await listCases({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setCases(items);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load cases from CropShield API.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleRunAnalysis = async (caseId) => {
    setAnalyzingCaseId(caseId);
    try {
      const updated = await analyzeCase(caseId);
      setCases((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, ...updated } : c))
      );
    } catch (err) {
      alert(`AI Analysis failed: ${err.message}`);
    } finally {
      setAnalyzingCaseId(null);
    }
  };

  const handleCaseVerified = (updatedCase) => {
    setCases((prev) =>
      prev.map((c) => (c.id === updatedCase.id ? { ...c, ...updatedCase } : c))
    );
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
    const total = cases.length;
    const needsVerification = cases.filter(
      (c) => c.status === CaseStatus.NEEDS_VERIFICATION || c.status === CaseStatus.ANALYZED
    ).length;
    const verified = cases.filter((c) => c.status === CaseStatus.VERIFIED).length;
    const highRisk = cases.filter((c) => (c.risk_level || '').toUpperCase() === 'HIGH').length;
    return { total, needsVerification, verified, highRisk };
  }, [cases]);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-heading">Cases</h1>
          <p className="page-lead">
            Review surveillance reports, inspect AI computer vision diagnoses, and verify field cases.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchCases}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={`icon-mr ${isLoading ? 'spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Ribbon */}
      <div className="stats-row">
        <div className="metric-card">
          <div className="metric-title">Total Cases</div>
          <div className="metric-number">{stats.total}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Needs Verification</div>
          <div className="metric-number text-amber">{stats.needsVerification}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Verified Outbreaks</div>
          <div className="metric-number text-primary">{stats.verified}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">High Risk Cases</div>
          <div className="metric-number text-danger">{stats.highRisk}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-field"
            placeholder="Search by crop, disease, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Error state */}
      {errorMessage && (
        <div className="alert-box alert-box-error mb-4" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-xs btn-secondary ml-auto"
            onClick={fetchCases}
          >
            Retry
          </button>
        </div>
      )}

      {/* Cases Table */}
      <div className="panel table-panel">
        {isLoading ? (
          <div className="panel-loading">
            <span className="spinner" />
            <p>Loading cases from CropShield...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="panel-empty">
            <Inbox size={40} className="text-muted" />
            <h3 className="empty-heading">No cases match your filters</h3>
            <p className="empty-body">
              {cases.length === 0
                ? 'No field cases have been registered yet. Head to Submit Case to file the first report.'
                : 'Try adjusting your search query or status filter.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Location</th>
                  <th>AI Diagnosis</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
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
        )}
      </div>

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
