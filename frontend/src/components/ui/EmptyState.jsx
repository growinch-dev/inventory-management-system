import { Link } from 'react-router-dom';
import Button from './Button';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  actionText,
  actionLink,
  actionIcon,
  compact = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'} ${className}`}>
      {Icon && (
        <div className={`bg-secondary-100 rounded-2xl flex items-center justify-center ${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-5'}`}>
          <Icon size={compact ? 24 : 28} className="text-secondary-400" />
        </div>
      )}
      <h3 className={`font-heading font-semibold text-secondary ${compact ? 'text-sm mb-1' : 'text-lg mb-2'}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-secondary-500 max-w-sm ${compact ? 'text-xs' : 'text-sm mb-6'}`}>
          {description}
        </p>
      )}
      {actionLink && !compact && (
        <Button as={Link} to={actionLink} icon={actionIcon}>
          {actionText}
        </Button>
      )}
      {action && !actionLink && !compact && (
        <Button icon={actionIcon} onClick={action}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
