import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Image as ImageIcon,
  PlusCircle,
  Search,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import { useCases, useSubmitCase } from '../../services/queries';
import { getQueuedReports, syncOfflineReports } from '../../services/offlineQueue';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';

/**
 * Status timeline component:
 * 1. Submitted -> 2. AI checked -> 3. Officer reviewing -> 4. Verified
 */
function StatusTimeline({ status }) {
  const { t } = useTranslation();
  const currentStep = (() => {
    if (status === 'VERIFIED') return 4;
    if (status === 'NEEDS_VERIFICATION' || status === 'PENDING') return 3;
    if (status === 'ANALYZED') return 2;
    if (status === 'WAITING_SYNC') return 0;
    return 1; // Submitted
  })();

  const steps = [
    { label: t('reports.timelineSubmitted', 'Submitted'), step: 1 },
    { label: t('reports.timelineAiChecked', 'AI Checked'), step: 2 },
    { label: t('reports.timelineOfficerReview', 'Reviewing'), step: 3 },
    { label: t('reports.timelineVerified', 'Verified'), step: 4 },
  ];

  if (status === 'WAITING_SYNC') {
    return (
      <div className="farmer-card-timeline">
        <span className="timeline-offline-pill">
          <CloudOff size={11} className="icon-mr" />
          <span>{t('reports.waitingForInternet', 'Waiting for internet to upload')}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="farmer-card-timeline" aria-label={`Report timeline progress: step ${currentStep} of 4`}>
      {steps.map((st, i) => {
        const isDone = st.step <= currentStep;
        const isCurrent = st.step === currentStep;

        return (
          <div key={st.label} className="timeline-step-wrap">
            <div className={`timeline-dot ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`} />
            <span className={`timeline-label ${isDone ? 'is-done' : ''}`}>{st.label}</span>
            {i < steps.length - 1 && (
              <div className={`timeline-bar ${st.step < currentStep ? 'is-done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FarmerReportsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [offlineReports, setOfflineReports] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const submitMutation = useSubmitCase();
  const { data, isLoading, isError, error, refetch, isFetching } = useCases({ limit: 50 });

  // Load offline queued reports
  const refreshOfflineQueue = async () => {
    const queued = await getQueuedReports();
    setOfflineReports(queued);
  };

  useEffect(() => {
    refreshOfflineQueue();

    const handleQueueChange = () => refreshOfflineQueue();
    const handleSyncComplete = () => {
      refreshOfflineQueue();
      refetch();
    };

    window.addEventListener('cropshield:offline-queue-changed', handleQueueChange);
    window.addEventListener('cropshield:sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('cropshield:offline-queue-changed', handleQueueChange);
      window.removeEventListener('cropshield:sync-complete', handleSyncComplete);
    };
  }, [refetch]);

  const handleManualSync = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatusMsg(t('reports.offlineCannotSync', 'Cannot sync while offline. Please connect to internet.'));
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      const res = await syncOfflineReports(submitMutation.mutateAsync);
      await refreshOfflineQueue();
      refetch();
      if (res.synced > 0) {
        setSyncStatusMsg(t('common.syncedSuccess', 'Reports synced successfully!'));
      }
    } catch {
      setSyncStatusMsg(t('reports.syncRetryMsg', 'Some reports could not be synced. Will retry automatically.'));
    } finally {
      setIsSyncing(false);
    }
  };

  const serverCases = useMemo(() => {
    return data?.items || (Array.isArray(data) ? data : []);
  }, [data]);

  // Combine offline items and server cases
  const allCases = useMemo(() => {
    return [...offlineReports, ...serverCases];
  }, [offlineReports, serverCases]);

  const filtered = useMemo(() => {
    return allCases.filter((c) => {
      const matchFilter =
        filter === 'ALL'
          ? true
          : filter === 'OFFLINE'
          ? c.is_offline
          : filter === 'VERIFIED'
          ? c.status === 'VERIFIED'
          : c.status !== 'VERIFIED' && !c.is_offline;

      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (c.crop || '').toLowerCase().includes(q) ||
        (c.disease || '').toLowerCase().includes(q) ||
        (c.location_name || '').toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [allCases, filter, search]);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            {t('reports.title', 'My Crop Reports')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {t('reports.subtitle', 'Track officer verification and disease diagnosis')}
          </p>
        </div>
        <Link
          to="/farmer/report"
          className="cs-btn cs-btn-primary cs-btn-sm"
          style={{ minHeight: '44px', padding: '10px 16px', fontWeight: 700 }}
        >
          <PlusCircle size={16} className="icon-mr" />
          {t('reports.newReport', 'New Report')}
        </Link>
      </div>

      {/* Offline Pending Banner & Sync Action */}
      {offlineReports.length > 0 && (
        <div className="farmer-offline-sync-card mb-3">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudOff size={20} className="text-muted flex-shrink-0" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                  {offlineReports.length} {offlineReports.length === 1 ? 'Report' : 'Reports'} {t('common.waitingToSync', 'Waiting to sync')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Stored locally on this device.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cs-btn cs-btn-secondary cs-btn-sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{ minHeight: '48px', padding: '10px 18px', fontWeight: 700 }}
            >
              <RefreshCw size={14} className={`icon-mr ${isSyncing ? 'spin' : ''}`} />
              <span>{isSyncing ? t('common.submitting', 'Syncing...') : t('common.syncNow', 'Sync Now')}</span>
            </button>
          </div>
          {syncStatusMsg && (
            <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '8px', fontWeight: 600 }}>
              {syncStatusMsg}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search */}
      <div className="mb-3">
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder={t('reports.searchPlaceholder', 'Search by crop or disease...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cs-input mb-2"
            style={{ minHeight: '48px', paddingLeft: '38px', fontSize: '14px' }}
            aria-label="Search my reports"
          />
          <Search size={16} className="text-muted" style={{ position: 'absolute', left: '12px', top: '16px' }} />
        </div>

        <div className="filter-chips">
          {[
            { id: 'ALL', label: t('reports.tabAll', 'All Reports') },
            { id: 'VERIFIED', label: t('reports.tabVerified', 'Verified Cases') },
            { id: 'PENDING', label: t('reports.tabPending', 'Under Review') },
            ...(offlineReports.length > 0 ? [{ id: 'OFFLINE', label: `${t('reports.tabOffline', 'Offline Queue')} (${offlineReports.length})` }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`chip ${filter === tab.id ? 'chip-active' : ''}`}
              style={{ minHeight: '48px', padding: '10px 18px', fontWeight: 600 }}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card List */}
      {isError && serverCases.length === 0 && offlineReports.length === 0 ? (
        <ErrorState
          title={t('reports.errorTitle', 'Could not load reports')}
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      ) : isLoading && offlineReports.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton height="110px" width="100%" />
          <Skeleton height="110px" width="100%" />
          <Skeleton height="110px" width="100%" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('reports.emptyTitle', 'No crop reports found')}
          description={t('reports.emptyDesc', "You haven't filed any crop reports matching your filters.")}
          action={
            <Link to="/farmer/report" className="cs-btn cs-btn-primary cs-btn-md" style={{ minHeight: '48px', padding: '0 20px' }}>
              <PlusCircle size={16} className="icon-mr" />
              {t('reports.newReport', 'New Report')}
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((item) => {
            const isOfflineItem = item.is_offline;
            const isVerified = item.status === 'VERIFIED';

            return (
              <div
                key={item.id}
                className="farmer-report-card"
                style={{
                  background: '#ffffff',
                  border: isOfflineItem
                    ? '1px dashed #f59e0b'
                    : isVerified
                    ? '1px solid #bbf7d0'
                    : '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '16px',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Top Row: Thumbnail + Info + Badge */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {/* Photo Thumbnail */}
                  <div
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: 'var(--radius-lg)',
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
                      <ImageIcon size={26} className="text-muted" />
                    )}
                  </div>

                  {/* Crop & Disease Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)' }}>
                        {item.crop}
                      </div>
                      {/* Badge */}
                      {isOfflineItem ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <CloudOff size={11} />
                          <span>{t('common.waitingToSync', 'Waiting to sync')}</span>
                        </span>
                      ) : isVerified ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={11} />
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
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <AlertTriangle size={11} />
                          <span>{t('common.suspected', 'Suspected')}</span>
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13.5px', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>
                      {item.disease || t('reports.pendingDiagnosis', 'Pending AI Diagnosis')}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(item.created_at).toLocaleDateString()} &bull; {item.location_name}
                    </div>
                  </div>
                </div>

                {/* Status Timeline Progress Bar */}
                <StatusTimeline status={item.status} />

                {/* Link to Detail View */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                  <Link
                    to={`/farmer/reports/${item.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isOfflineItem ? '#b45309' : 'var(--primary)',
                      padding: '4px 0',
                    }}
                  >
                    <span>{isOfflineItem ? t('reports.viewOfflineReport', 'View Saved Offline Report') : t('reports.viewDiagnosis', 'View Diagnosis & Treatments')}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
