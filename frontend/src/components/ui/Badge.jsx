const variants = {
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  info: 'bg-info-light text-info-dark',
  gray: 'bg-secondary-100 text-secondary-700',
  primary: 'bg-primary-50 text-primary-700',
  // Solid variants for more emphasis
  'success-solid': 'bg-success text-white',
  'warning-solid': 'bg-warning text-white',
  'danger-solid': 'bg-danger text-white',
  'info-solid': 'bg-info text-white',
  'primary-solid': 'bg-primary text-white',
};

const dotColors = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  gray: 'bg-secondary-500',
  primary: 'bg-primary',
  'success-solid': 'bg-white',
  'warning-solid': 'bg-white',
  'danger-solid': 'bg-white',
  'info-solid': 'bg-white',
  'primary-solid': 'bg-white',
};

const sizes = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const Badge = ({
  children,
  variant = 'gray',
  size = 'md',
  icon: Icon,
  className = '',
  dot = false,
  pill = true,
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium capitalize
        ${pill ? 'rounded-full' : 'rounded-md'}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {Icon && <Icon size={size === 'xs' || size === 'sm' ? 10 : 12} aria-hidden="true" />}
      {children}
    </span>
  );
};

export default Badge;
