import { Compass, Home } from 'lucide-react';
import { Button } from './Button';

export function NotFoundPage({ onNavigateHome }) {
  return (
    <div className="page-shell">
      <div className="cs-empty-state" style={{ minHeight: '380px', marginTop: '40px' }}>
        <div className="cs-empty-icon" style={{ width: '56px', height: '56px' }}>
          <Compass size={30} />
        </div>

        <h1 className="cs-empty-title" style={{ fontSize: '22px' }}>
          404 &mdash; Surveillance Page Not Found
        </h1>

        <p className="cs-empty-desc">
          The requested surveillance view or resource does not exist in CropShield or may have moved.
        </p>

        <Button
          variant="primary"
          size="md"
          icon={Home}
          onClick={() => onNavigateHome?.('farmer')}
        >
          Return to Submit Case
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
