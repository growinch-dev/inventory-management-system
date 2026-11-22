import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Table = ({ children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full">{children}</table>
  </div>
);

const TableHead = ({ children, className = '' }) => (
  <thead className={`bg-secondary-200/60 ${className}`}>{children}</thead>
);

const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-secondary-100 ${className}`}>{children}</tbody>
);

const TableRow = ({ children, className = '', onClick, hover = true, selected = false }) => (
  <tr
    className={`
      bg-white
      ${hover ? 'hover:bg-secondary-50' : ''}
      ${selected ? 'bg-primary-50/50' : ''}
      ${onClick ? 'cursor-pointer' : ''}
      transition-colors duration-150
      ${className}
    `}
    onClick={onClick}
  >
    {children}
  </tr>
);

const TableHeader = ({ children, className = '', align = 'left', sortable = false, sorted = null }) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th
      className={`
        px-4 py-3.5 text-xs font-semibold text-secondary-500 uppercase tracking-wider
        first:rounded-tl-lg last:rounded-tr-lg
        ${sortable ? 'cursor-pointer hover:text-secondary-700 select-none' : ''}
        ${alignClass[align]}
        ${className}
      `}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {sortable && sorted !== null && (
          <span className="text-primary">{sorted === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );
};

const TableCell = ({ children, className = '', align = 'left', truncate = false }) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td
      className={`
        px-4 py-4 text-sm text-secondary-700
        ${truncate ? 'max-w-[200px] truncate' : ''}
        ${alignClass[align]}
        ${className}
      `}
    >
      {children}
    </td>
  );
};

const TablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  className = '',
  showFirstLast = true,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const PaginationButton = ({ onClick, disabled, children, label }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2 border border-secondary-200 rounded-lg bg-white hover:bg-secondary-50
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
                 transition-all duration-150 text-secondary-600 hover:text-secondary
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
      aria-label={label}
    >
      {children}
    </button>
  );

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-secondary-100 bg-secondary-50/30 ${className}`}>
      <p className="text-sm text-secondary-500">
        {totalItems > 0 ? (
          <>
            Showing <span className="font-semibold text-secondary">{startItem}</span> to{' '}
            <span className="font-semibold text-secondary">{endItem}</span> of{' '}
            <span className="font-semibold text-secondary">{totalItems.toLocaleString()}</span> results
          </>
        ) : (
          'No results'
        )}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {showFirstLast && (
            <PaginationButton
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              label="First page"
            >
              <ChevronsLeft size={16} />
            </PaginationButton>
          )}

          <PaginationButton
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            label="Previous page"
          >
            <ChevronLeft size={16} />
          </PaginationButton>

          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`
                  min-w-[36px] h-9 px-2 text-sm font-medium rounded-lg transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1
                  ${currentPage === page
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-secondary-600 hover:bg-secondary-100'
                  }
                `}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          <span className="sm:hidden px-3 py-1.5 text-sm font-medium text-secondary bg-white border border-secondary-200 rounded-lg">
            {currentPage} / {totalPages}
          </span>

          <PaginationButton
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            label="Next page"
          >
            <ChevronRight size={16} />
          </PaginationButton>

          {showFirstLast && (
            <PaginationButton
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              label="Last page"
            >
              <ChevronsRight size={16} />
            </PaginationButton>
          )}
        </div>
      )}
    </div>
  );
};

Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Header = TableHeader;
Table.Cell = TableCell;
Table.Pagination = TablePagination;

export default Table;
