import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  Cpu,
  AlertCircle,
  Clock,
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

  // Handle running AI analysis on a pending case
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

  // Callback when a case has been verified
  const handleCaseVerified = (updatedCase) => {
    setCases((prev) =>
      prev.map((c) => (c.id === updatedCase.id ? { ...c, ...updatedCase } : c))
    );
  };

  // Filter & search
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchCrop = (c.crop || '').toLowerCase().includes(q);
      const matchDisease = (c.disease || '').toLowerCase().includes(q);
      const matchLoc = (c.location_name || '').toLowerCase().includes(q);
      const matchSymptoms = (c.symptoms || '').toLowerCase().includes(q);
      const matchId = (c.id || '').toLowerCase().includes(q);
      return matchCrop || matchDisease || matchLoc || matchSymptoms || matchId;
    });
  }, [cases, searchQuery]);

  // Stats calculation
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
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <Users className="title-icon text-amber" />
            Agricultural Officer Verification Queue
          </h1>
          <p className="page-description">
            Triage reported field infections, examine AI diagnostic predictions, and execute official
            verification to establish epidemiologically confirmed outbreak clusters.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-refresh"
          onClick={fetchCases}
          disabled={isLoading}
          title="Refresh cases from server"
        >
          <RefreshCw size={15} className={`icon-mr ${isLoading ? 'spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Stats Ribbon */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Surveillance Cases</div>
          <div className="stat-number">{stats.total}</div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-label">Awaiting Verification</div>
          <div className="stat-number text-amber">{stats.needsVerification}</div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-label">Verified Confirmed Cases</div>
          <div className="stat-number text-emerald">{stats.verified}</div>
        </div>
        <div className="stat-card stat-card-danger">
          <div className="stat-label">High Outbreak Vulnerability</div>
          <div className="stat-number text-danger">{stats.highRisk}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon text-muted" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by crop, pathogen, location or case ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pill-group">
          <Filter size={15} className="filter-icon text-muted" />
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
              className={`filter-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="form-error-banner mb-4" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary ml-auto"
            onClick={fetchCases}
          >
            Retry
          </button>
        </div>
      )}

      {/* Cases Table */}
      <div className="card table-card">
        {isLoading ? (
          <div className="loading-state">
            <span className="spinner" />
            <p>Fetching cases from CropShield API...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="empty-state">
            <Clock size={36} className="text-muted" />
            <h3>No Cases Found</h3>
            <p>
              {cases.length === 0
                ? 'No field cases have been registered yet. Head to Farmer Submission to submit the first case.'
                : 'No cases match your active filter or search criteria.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Crop & Stage</th>
                  <th>Location</th>
                  <th>AI Detection</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Submitted</th>
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
                      className={`table-row ${isHighlighted ? 'row-highlighted' : ''}`}
                    >
                      <td>
                        <div className="crop-cell">
                          <strong>{c.crop}</strong>
                          <span className="crop-sub">{c.growth_stage}</span>
                        </div>
                      </td>
                      <td>
                        <div className="location-cell">
                          <span className="loc-name">{c.location_name}</span>
                          <span className="loc-coords font-mono">
                            {typeof c.latitude === 'number' ? c.latitude.toFixed(2) : '-'}°,{' '}
                            {typeof c.longitude === 'number' ? c.longitude.toFixed(2) : '-'}°
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="ai-cell">
                          {c.disease ? (
                            <>
                              <span className="ai-disease-name">{c.disease}</span>
                              {c.confidence && (
                                <span className="ai-conf">
                                  {Math.round(c.confidence * 100)}% conf.
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted italic">Unanalyzed</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                      </td>
                      <td>
                        <StatusBadge status={c.status} size="sm" />
                      </td>
                      <td>
                        <span className="date-cell font-mono">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => setActiveDetailCase(c)}
                            title="Inspect complete case details"
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
                              title="Run AI inference and risk assessment"
                            >
                              <Cpu size={13} className="icon-mr" />
                              {analyzingCaseId === c.id ? 'Analyzing...' : 'Run AI'}
                            </button>
                          )}

                          {canVerify && (
                            <button
                              type="button"
                              className="btn btn-xs btn-verify-action"
                              onClick={() => setActiveVerifyCase(c)}
                              title="Review case and issue verification"
                            >
                              <ShieldCheck size={13} className="icon-mr" />
                              Review & Verify
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
