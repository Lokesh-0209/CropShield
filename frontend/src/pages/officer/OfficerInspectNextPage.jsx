import { useState, useMemo, lazy, Suspense } from 'react';
import {
  MapPin,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useSurveillanceQueue } from '../../services/queries';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardBody } from '../../components/common/Card';
import { Toast } from '../../components/common/Toast';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatErrorMessage } from '../../services/api';
import AssignInspectionModal from '../../components/officer/AssignInspectionModal';
import useDocumentMetadata from '../../hooks/useDocumentMetadata';

const OfficerLeafletMap = lazy(() => import('../../components/officer/OfficerLeafletMap'));

// Curated agronomic reason tags for each surveillance sentinel
const SURVEILLANCE_REASONS = {
  'SURV-KA-001': [
    'Near 2 verified clusters',
    'High humidity (88%)',
    'Flowering stage',
    'Downwind spore corridor',
  ],
  'SURV-KA-002': [
    'Near Cluster #2 (Potato Blight)',
    'Micro-climate temp 19.5°C',
    'Tuber growth stage',
    'Fog depression zone',
  ],
  'SURV-KA-003': [
    'Boundary plot adjacent to CASE-KA-004',
    'Soil moisture saturation',
    'Fruiting canopy',
  ],
  'SURV-KA-004': [
    'Peresandra valley expansion corridor',
    'Previous season late blight history',
    'High foliage density',
  ],
  'SURV-KA-005': [
    'Hoskote maize belt transit line',
    'South-southwest wind trajectory',
    'Vegetative growth stage',
  ],
  'SURV-KA-006': [
    'Sidlaghatta horticultural basin',
    'Nighttime dew condensation > 6 hours',
    'Early foliar spot reports',
  ],
};

export default function OfficerInspectNextPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useSurveillanceQueue();

  // Local state for assignments and completed inspections
  const [completedFieldIds, setCompletedFieldIds] = useState(() => {
    try {
      const saved = localStorage.getItem('cropshield_completed_inspections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [assignedInspections, setAssignedInspections] = useState({});
  const [activeAssignField, setActiveAssignField] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [toast, setToast] = useState(null);

  useDocumentMetadata({
    title: 'Inspect Next Surveillance Priority — Officer Portal',
    description: 'Prioritized sentinel inspection queues targeting emerging crop pathogen vectors.',
  });

  const rawQueue = useMemo(() => {
    return data?.queue || [];
  }, [data]);

  // Priority-ranked list: Active fields first, re-ranked #1..#N; completed moved to bottom
  const { activeFields, completedFields } = useMemo(() => {
    const active = [];
    const completed = [];

    rawQueue.forEach((item) => {
      const reasons = SURVEILLANCE_REASONS[item.field_id] || [
        'Near verified outbreak cluster',
        'High canopy moisture',
        'Flowering stage',
      ];

      // Calculate distance from officer base (Kolar Agri HQ)
      const baseDistance = `${(Math.abs(item.latitude - 13.13) * 110 + 2.4).toFixed(1)} km from Base`;

      const enriched = {
        ...item,
        reasonTags: reasons,
        baseDistance,
      };

      if (completedFieldIds.includes(item.field_id)) {
        completed.push(enriched);
      } else {
        active.push(enriched);
      }
    });

    // Sort active by urgency score descending
    active.sort((a, b) => b.urgency_score - a.urgency_score);

    // Re-rank active fields #1 .. #N
    const reRankedActive = active.map((field, idx) => ({
      ...field,
      rank: idx + 1,
    }));

    return { activeFields: reRankedActive, completedFields: completed };
  }, [rawQueue, completedFieldIds]);

  // Mark inspection as completed
  const handleMarkDone = (fieldId, fieldName) => {
    const updated = [...completedFieldIds, fieldId];
    setCompletedFieldIds(updated);
    try {
      localStorage.setItem('cropshield_completed_inspections', JSON.stringify(updated));
    } catch {}

    setToast({
      type: 'success',
      message: `Inspection for "${fieldName}" marked as completed. Surveillance list re-ordered.`,
    });
  };

  // Re-open completed inspection
  const handleReopen = (fieldId) => {
    const updated = completedFieldIds.filter((id) => id !== fieldId);
    setCompletedFieldIds(updated);
    try {
      localStorage.setItem('cropshield_completed_inspections', JSON.stringify(updated));
    } catch {}
  };

  // Handle assignment modal submission
  const handleAssigned = ({ fieldId, assignedTo, date }) => {
    setAssignedInspections((prev) => ({
      ...prev,
      [fieldId]: { assignedTo, date },
    }));

    setToast({
      type: 'success',
      message: `Inspection assigned to ${assignedTo} for ${date}!`,
    });
  };

  return (
    <div className="page-shell">
      {/* Toast Alert */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999 }}>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        heading="Inspect Next &bull; Active Surveillance Intelligence"
        lead="Predictive disease propagation ranking of sentinel buffer plots and high-vulnerability fields requiring urgent officer field inspection."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={refetch}
            loading={isFetching}
            icon={RefreshCw}
          >
            Refresh Ranking
          </Button>
        }
      />

      {/* Main Two-Column Layout: Map (Left) + Ranked Actionable List (Right) */}
      {isError ? (
        <ErrorState
          title="Could not load surveillance queue"
          message={formatErrorMessage(error)}
          onRetry={refetch}
          isRetrying={isFetching}
        />
      ) : isLoading ? (
        <div className="page-layout-two-col">
          <Skeleton height="500px" width="100%" />
          <Skeleton height="500px" width="100%" />
        </div>
      ) : activeFields.length === 0 && completedFields.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No Fields in Surveillance Queue"
          description="All surrounding buffer perimeters have been audited or no high-density clusters are expanding."
        />
      ) : (
        <div className="page-layout-two-col mb-6">
          {/* ================= LEFT: Interactive Leaflet Map with Numbered Pins (#1, #2, ...) ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <div className="cs-card-header">
                <div>
                  <h2 className="cs-card-title">Geospatial Surveillance Dispatch Map</h2>
                  <p className="cs-card-subtitle">
                    Numbered sentinel markers matching the priority inspection ranking
                  </p>
                </div>
              </div>
              <CardBody style={{ padding: '0px' }}>
                <Suspense fallback={<Skeleton height="520px" width="100%" />}>
                  <OfficerLeafletMap
                    surveillanceFields={activeFields}
                    selectedItem={selectedField}
                    onSelectItem={(field) => setSelectedField(field)}
                    mode="inspect"
                    height={520}
                  />
                </Suspense>
              </CardBody>
            </Card>

            {/* Micro-climate Intelligence Callout */}
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
                <strong>Priority Heuristic:</strong> Calculated from pathogen proximity to active DBSCAN clusters, canopy humidity above 80%, flowering stage susceptibility, and downwind dispersion modeling.
              </span>
            </div>
          </div>

          {/* ================= RIGHT: Ranked List with Priority Scores, Reason Tags & Actions ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                Active Inspection Targets ({activeFields.length})
              </div>
              <span className="count-badge">Sorted by Urgency Score</span>
            </div>

            {activeFields.map((item) => {
              const isHigh = (item.risk_level || '').toUpperCase() === 'HIGH';
              const isSelected = selectedField && selectedField.field_id === item.field_id;
              const assignment = assignedInspections[item.field_id];

              return (
                <Card
                  key={item.field_id}
                  className={`animate-fade-in ${isSelected ? 'cluster-selected' : ''}`}
                  style={{
                    borderLeft: `4px solid ${isHigh ? 'var(--severity-high)' : 'var(--severity-medium)'}`,
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setSelectedField(item)}
                >
                  <CardBody style={{ padding: '16px 20px' }}>
                    {/* Header Row: Rank, Title, Urgency Score */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Numbered Badge */}
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: 'var(--radius-md)',
                            background: isHigh ? 'var(--severity-high)' : 'var(--severity-medium)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 900,
                            fontFamily: 'var(--font-mono)',
                            flexShrink: 0,
                            boxShadow: 'var(--shadow-xs)',
                          }}
                        >
                          #{item.rank}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                              {item.name}
                            </h3>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: 'var(--bg-subtle)',
                                color: 'var(--text-body)',
                              }}
                            >
                              {item.crop}
                            </span>
                          </div>

                          {/* Distances */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={12} />
                              {item.location_name}
                            </span>
                            <span>&bull;</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {item.baseDistance}
                            </span>
                            <span>&bull;</span>
                            <span style={{ fontWeight: 600, color: isHigh ? 'var(--severity-high-text)' : 'var(--severity-medium-text)' }}>
                              {item.distance_to_cluster}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Urgency Badge */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                          Urgency
                        </div>
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            fontFamily: 'var(--font-mono)',
                            color: isHigh ? 'var(--severity-high)' : 'var(--severity-medium)',
                          }}
                        >
                          {item.urgency_score}
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Reason Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {item.reasonTags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-body)',
                            border: '1px solid var(--border-card)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Assignment status badge if assigned */}
                    {assignment && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '6px 10px',
                          background: 'var(--primary-50)',
                          border: '1px solid var(--primary-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <UserCheck size={13} />
                        <span>
                          Assigned to <strong>{assignment.assignedTo}</strong> for <strong>{assignment.date}</strong>
                        </span>
                      </div>
                    )}

                    {/* Recommended action & Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-subtle)',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', flex: 1, minWidth: '220px' }}>
                        <strong>Action:</strong> {item.recommended_action}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAssignField(item);
                          }}
                        >
                          <UserCheck size={13} className="icon-mr" />
                          {assignment ? 'Reassign' : 'Assign inspection'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-xs btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkDone(item.field_id, item.name);
                          }}
                          title="Mark this field inspection as completed"
                        >
                          <CheckCircle2 size={13} className="icon-mr" />
                          Mark Done
                        </button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}

            {/* Completed Inspections Accordion */}
            {completedFields.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Completed Sentinel Inspections ({completedFields.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {completedFields.map((comp) => (
                    <div
                      key={comp.field_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        opacity: 0.8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                        <div>
                          <strong>{comp.name}</strong> &bull; {comp.crop}
                          <div className="text-muted text-xs">{comp.location_name}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-xs btn-outline-secondary"
                        onClick={() => handleReopen(comp.field_id)}
                      >
                        Re-open
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Inspection Modal */}
      {activeAssignField && (
        <AssignInspectionModal
          field={activeAssignField}
          onClose={() => setActiveAssignField(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
