import { Search, X } from 'lucide-react';
import Select from './Select';

const SearchFilter = ({
  // Search props (optional - omit to show only filters)
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  // Legacy props (for backward compatibility)
  searchValue,
  onSearchChange,
  searchPlaceholder,
  // Filter props (optional - omit to show only search)
  filters = [],
  filterValues = {},
  onFilterChange,
  className = '',
}) => {
  // Support both old and new prop names
  const currentValue = value ?? searchValue ?? '';
  const handleChange = onChange || onSearchChange;
  const searchHint = placeholder || searchPlaceholder;

  // If only filters are provided (no search props)
  const showSearch = handleChange !== undefined;
  // If filters array has filter definitions with name property (new style)
  const hasNewStyleFilters = filters.length > 0 && filters[0]?.name;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  // Filter-only mode
  if (!showSearch && filters.length > 0) {
    return (
      <div className={className}>
        {hasNewStyleFilters ? (
          filters.map((filter, index) => (
            <Select
              key={filter.name || index}
              value={filterValues[filter.name] ?? ''}
              onChange={(e) => onFilterChange?.(filter.name, e.target.value)}
              options={filter.options}
            />
          ))
        ) : (
          filters.map((filter, index) => (
            <Select
              key={index}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              options={filter.options}
              placeholder={filter.placeholder}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {/* Search Input */}
      {showSearch && (
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchHint}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            aria-label={searchHint}
          />
          {currentValue && (
            <button
              onClick={() => handleChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Filter Dropdowns */}
      {hasNewStyleFilters
        ? filters.map((filter, index) => (
            <div key={filter.name || index} className="w-full sm:w-48">
              <Select
                value={filterValues[filter.name] ?? ''}
                onChange={(e) => onFilterChange?.(filter.name, e.target.value)}
                options={filter.options}
              />
            </div>
          ))
        : filters.map((filter, index) => (
            <div key={index} className="w-full sm:w-48">
              <Select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                options={filter.options}
                placeholder={filter.placeholder}
              />
            </div>
          ))}
    </div>
  );
};

export default SearchFilter;
