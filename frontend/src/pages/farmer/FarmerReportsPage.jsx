import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Image as ImageIcon, PlusCircle, Search } from 'lucide-react';
import { useCases } from '../../services/queries';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';

export default function FarmerReportsPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useCases({ limit: 50 });

  const cases = useMemo(() => {
    return data?.items || (Array.isArray(data) ? data : []);
  }, [data]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchFilter =
        filter === 'ALL'
          ? true
          : filter === 'VERIFIED'
          ? c.status === 'VERIFIED'
          : c.status !== 'VERIFIED';
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (c.crop || '').toLowerCase().includes(q) ||
        (c.disease || '').toLowerCase().includes(q) ||
        (c.location_name || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [cases, filter, search]);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>
            My Crop Reports
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Track officer verification and disease diagnosis
          </p>
        </div>
        <Link
          to="/farmer/report"
          className="btn btn-primary btn-sm"
          style={{ minHeight: '40px', padding: '8px 14px' }}
        >
          <PlusCircle size={15} className="icon-mr" />
          New Report
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by crop or disease..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cs-input mb-2"
          style={{ minHeight: '44px' }}
          aria-label="Search my reports"
        />
        <div className="filter-chips">
          {[
            { id: 'ALL', label: 'All Reports' },
            { id: 'VERIFIED', label: 'Verified Cases' },
            { id: 'PENDING', label: 'Under Review' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`chip ${filter === tab.id ? 'chip-active' : ''}`}
              style={{ minHeight: '36px', padding: '6px 14px' }}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {isError ? (
        <ErrorState
          title="Could not load reports"
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton height="88px" width="100%" />
          <Skeleton height="88px" width="100%" />
          <Skeleton height="88px" width="100%" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No crop reports found"
          description="You haven't filed any crop reports matching your filters."
          action={
            <Link to="/farmer/report" className="btn btn-primary btn-md">
              Submit Field Report
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((item) => (
            <Link
              key={item.id}
              to={`/farmer/reports/${item.id}`}
              style={{
                textDecoration: 'none',
                background: '#ffffff',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                boxShadow: 'var(--shadow-xs)',
                minHeight: '72px',
              }}
            >
              {/* Photo Thumbnail */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.crop}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon size={22} className="text-muted" />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>
                  {item.crop}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
                  {item.disease || 'Pending AI Diagnosis'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {new Date(item.created_at).toLocaleDateString()} &bull; {item.location_name}
                </div>
              </div>

              {/* Status and Arrow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <StatusBadge status={item.status} size="sm" />
                {item.risk_level && <RiskBadge level={item.risk_level} size="sm" showScore={false} />}
                <ArrowRight size={14} className="text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
