import { Loader2 } from 'lucide-react';

const variants = {
  primary: `
    bg-primary hover:bg-primary-dark active:bg-primary-700 text-white
    shadow-sm hover:shadow-md hover:shadow-primary/25
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
  `,
  secondary: `
    border border-secondary-200 bg-white hover:bg-secondary-50 active:bg-secondary-100 text-secondary
    shadow-sm hover:border-secondary-300
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/30 focus-visible:ring-offset-2
  `,
  danger: `
    bg-danger hover:bg-danger-dark active:bg-red-700 text-white
    shadow-sm hover:shadow-md hover:shadow-danger/25
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2
  `,
  ghost: `
    hover:bg-secondary-100 active:bg-secondary-200 text-secondary-700
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400/30 focus-visible:ring-offset-2
  `,
  link: `
    text-primary hover:text-primary-dark hover:underline underline-offset-2
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded
  `,
  success: `
    bg-success hover:bg-success-dark active:bg-green-700 text-white
    shadow-sm hover:shadow-md hover:shadow-success/25
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50 focus-visible:ring-offset-2
  `,
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs gap-1.5',
  sm: 'px-3 py-2 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
  xl: 'px-6 py-3.5 text-base gap-2.5',
  icon: 'p-2.5',
  'icon-sm': 'p-2',
  'icon-lg': 'p-3',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  as: Component = 'button',
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
    active:scale-[0.98]
  `;

  const iconSize = size === 'xs' || size === 'sm' || size === 'icon-sm' ? 16 : size === 'lg' || size === 'xl' || size === 'icon-lg' ? 20 : 18;

  return (
    <Component
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={iconSize} />}
      {!loading && Icon && iconPosition === 'left' && <Icon size={iconSize} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={iconSize} />}
    </Component>
  );
};

export default Button;
