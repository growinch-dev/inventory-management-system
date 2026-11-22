import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

const PageHeader = ({
  title,
  subtitle,
  backButton = false,
  backTo,
  actions,
  children,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-4">
        {backButton && (
          <Button
            variant="secondary"
            size="icon"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-500 mt-1">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
