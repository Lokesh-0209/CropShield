import { useState } from 'react';
import { Calendar, User, ClipboardCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export default function AssignInspectionModal({ field, onClose, onAssigned }) {
  const [officerName, setOfficerName] = useState('Dr. Suresh Patil (Zone Lead)');
  const [scheduledDate, setScheduledDate] = useState(() => {
    return new Date(Date.now() + 86400000).toISOString().split('T')[0];
  });
  const [priorityNote, setPriorityNote] = useState(
    `Inspect ${field?.crop || 'crop'} foliage for early infection spots and issue containment protocol.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      if (onAssigned) {
        onAssigned({
          fieldId: field.field_id,
          assignedTo: officerName,
          date: scheduledDate,
          note: priorityNote,
        });
      }
      onClose();
    }, 400);
  };

  return (
    <Modal
      isOpen={Boolean(field)}
      onClose={onClose}
      title={`Assign Sentinel Inspection • #${field?.rank} ${field?.name}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3" style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Target Field Plot:</div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>
            {field?.name} ({field?.crop})
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {field?.location_name} &bull; {field?.distance_to_cluster}
          </div>
        </div>

        <div className="cs-field-group mb-3">
          <label htmlFor="assign-officer" className="cs-field-label">
            Assigned Field Officer
          </label>
          <div className="search-wrap">
            <User size={16} className="search-icon" aria-hidden="true" />
            <input
              id="assign-officer"
              type="text"
              className="cs-input"
              style={{ paddingLeft: '36px' }}
              required
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
            />
          </div>
        </div>

        <div className="cs-field-group mb-3">
          <label htmlFor="assign-date" className="cs-field-label">
            Target Inspection Date
          </label>
          <div className="search-wrap">
            <Calendar size={16} className="search-icon" aria-hidden="true" />
            <input
              id="assign-date"
              type="date"
              className="cs-input"
              style={{ paddingLeft: '36px' }}
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
        </div>

        <div className="cs-field-group mb-4">
          <label htmlFor="assign-notes" className="cs-field-label">
            Inspection Protocol & Instructions
          </label>
          <textarea
            id="assign-notes"
            className="cs-textarea"
            rows={3}
            value={priorityNote}
            onChange={(e) => setPriorityNote(e.target.value)}
          />
        </div>

        <div className="flex-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} icon={ClipboardCheck}>
            Confirm Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
