import {
  FilePlus,
  Cpu,
  UserCheck,
  CheckCircle2,
  Share2,
  Radar,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

const STEPS = [
  { id: 'submit', label: '1. Farmer Submits Case', icon: FilePlus, tab: 'farmer', subtitle: 'Field report & image' },
  { id: 'analyze', label: '2. AI & Risk Analysis', icon: Cpu, tab: 'farmer', subtitle: 'CV disease & risk score' },
  { id: 'review', label: '3. Officer Reviews', icon: UserCheck, tab: 'officer', subtitle: 'Triage verification queue' },
  { id: 'verify', label: '4. Officer Verifies', icon: CheckCircle2, tab: 'officer', subtitle: 'Confirm / Reject / More Info' },
  { id: 'clusters', label: '5. Spatial Clusters', icon: Share2, tab: 'outbreaks', subtitle: 'DBSCAN geographic grouping' },
  { id: 'intel', label: '6. Outbreak Intelligence', icon: Radar, tab: 'outbreaks', subtitle: 'Dominant disease & severity' },
  { id: 'alerts', label: '7. Warning Alerts', icon: AlertTriangle, tab: 'alerts', subtitle: 'Phytosanitary advisories' },
];

export default function DemoFlowStepper({ currentTab, onSelectTab }) {
  return (
    <div className="demo-stepper-container" aria-label="CropShield Hackathon Demo Flow">
      <div className="stepper-header">
        <span className="stepper-badge">Interactive Demo Pipeline</span>
        <span className="stepper-hint">End-to-End Surveillance & Outbreak Prevention Lifecycle</span>
      </div>
      <div className="stepper-track">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = step.tab === currentTab;

          return (
            <div key={step.id} className="stepper-step-wrapper">
              <button
                type="button"
                className={`stepper-node ${isActive ? 'stepper-node-active' : ''}`}
                onClick={() => onSelectTab(step.tab)}
                title={`Switch to ${step.label} (${step.subtitle})`}
              >
                <div className="stepper-icon-circle">
                  <StepIcon size={16} />
                </div>
                <div className="stepper-info">
                  <span className="stepper-title">{step.label}</span>
                  <span className="stepper-desc">{step.subtitle}</span>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div className="stepper-arrow" aria-hidden="true">
                  <ChevronRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
