import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';

const ActionMenu = ({
  items = [],
  trigger,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Trigger */}
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Open actions menu"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <MoreVertical size={18} />
        </button>
      )}

      {/* Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-dropdown mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-secondary-100 py-1.5 animate-scale-in origin-top-right
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="border-t border-secondary-100 my-1.5" />;
            }

            const Icon = item.icon;
            const baseStyles = `
              w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left font-medium
              transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg
            `;

            const variantStyles = item.disabled
              ? 'text-secondary-300 cursor-not-allowed'
              : item.variant === 'danger'
                ? 'text-danger hover:bg-danger-light'
                : 'text-secondary-700 hover:bg-secondary-50';

            // If it's a link
            if (item.href && !item.disabled) {
              return (
                <Link
                  key={index}
                  to={item.href}
                  className={`${baseStyles} ${variantStyles}`}
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                >
                  {Icon && <Icon size={16} className="flex-shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`${baseStyles} ${variantStyles}`}
                role="menuitem"
              >
                {Icon && <Icon size={16} className="flex-shrink-0" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
