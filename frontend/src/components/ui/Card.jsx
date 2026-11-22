const paddingStyles = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-5',
  default: 'p-6',
  lg: 'p-8',
};

const Card = ({
  children,
  className = '',
  padding = 'default',
  hover = false,
  onClick,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border-secondary-100',
    elevated: 'bg-white border-transparent shadow-md',
    outlined: 'bg-white border-secondary-200',
    ghost: 'bg-secondary-50/50 border-transparent',
  };

  return (
    <div
      className={`
        rounded-xl border shadow-card
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hover ? 'hover:shadow-card-hover hover:border-secondary-200 cursor-pointer transition-all duration-200' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', border = false }) => (
  <div className={`flex items-center justify-between ${border ? 'pb-4 mb-4 border-b border-secondary-100' : 'mb-4'} ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '', icon: Icon, subtitle }) => (
  <div className={className}>
    <h3 className="text-lg font-heading font-semibold text-secondary flex items-center gap-2.5">
      {Icon && (
        <span className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-primary" />
        </span>
      )}
      {children}
    </h3>
    {subtitle && <p className="text-sm text-secondary-500 mt-1">{subtitle}</p>}
  </div>
);

const CardContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

const CardFooter = ({ children, className = '', border = true }) => (
  <div className={`${border ? 'mt-4 pt-4 border-t border-secondary-100' : 'mt-4'} ${className}`}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
