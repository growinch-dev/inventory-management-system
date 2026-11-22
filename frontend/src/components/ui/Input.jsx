import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  required = false,
  size = 'md',
  ...props
}, ref) => {
  const hasIcon = Boolean(Icon);

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const iconPadding = {
    sm: iconPosition === 'left' ? 'pl-9' : 'pr-9',
    md: iconPosition === 'left' ? 'pl-10' : 'pr-10',
    lg: iconPosition === 'left' ? 'pl-11' : 'pr-11',
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
        {hasIcon && iconPosition === 'left' && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none">
            <Icon size={iconSizes[size]} />
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg border bg-white
            transition-all duration-200
            placeholder:text-secondary-400
            ${sizeStyles[size]}
            ${hasIcon ? iconPadding[size] : ''}
            ${error
              ? 'border-danger text-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-secondary-200 text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20'
            }
            disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id || props.name}-error` : helperText ? `${props.id || props.name}-helper` : undefined}
          {...props}
        />
        {hasIcon && iconPosition === 'right' && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none">
            <Icon size={iconSizes[size]} />
          </div>
        )}
      </div>
      {error && (
        <p id={`${props.id || props.name}-error`} className="mt-1.5 text-sm text-danger flex items-center gap-1" role="alert">
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

Input.displayName = 'Input';

export default Input;
