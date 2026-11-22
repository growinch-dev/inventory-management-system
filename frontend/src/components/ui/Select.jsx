import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({
  label,
  error,
  helperText,
  options = [],
  placeholder = 'Select an option',
  className = '',
  required = false,
  size = 'md',
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'px-3 py-2 pr-9 text-sm',
    md: 'px-4 py-2.5 pr-10 text-sm',
    lg: 'px-4 py-3 pr-11 text-base',
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-secondary mb-1.5">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full rounded-lg border appearance-none bg-white cursor-pointer
            transition-all duration-200
            ${sizeStyles[size]}
            ${error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-secondary-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
            }
            disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id || props.name}-error` : helperText ? `${props.id || props.name}-helper` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={iconSizes[size]}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none"
        />
      </div>
      {error && (
        <p id={`${props.id || props.name}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </p>
      )}
      {helperText && !error && (
        <p id={`${props.id || props.name}-helper`} className="mt-1.5 text-sm text-secondary-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
