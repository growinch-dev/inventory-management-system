const FormSection = ({
  title,
  description,
  children,
  columns = 2,
  className = '',
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`mb-8 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-secondary">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className={`grid ${gridCols[columns]} gap-4`}>{children}</div>
    </div>
  );
};

// Form actions footer
const FormActions = ({
  children,
  align = 'right',
  className = '',
}) => {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`
        flex items-center gap-3 pt-6 border-t border-gray-200 mt-8
        ${alignClass[align]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

FormSection.Actions = FormActions;

export default FormSection;
