import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TransactionPagination = ({ itemCount, itemsPerPage, currentPage, setCurrentPage }) => {
  const totalPages = Math.ceil(itemCount / itemsPerPage);

  if (totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-dark-800">
      <div className="text-sm text-dark-400">
        Page <span className="font-semibold text-dark-200">{currentPage}</span> of <span className="font-semibold text-dark-200">{totalPages}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-dark-300" />
        </button>

        <div className="flex gap-1">
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 py-1 text-dark-400">...</span>
              ) : (
                <button
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-500 text-dark-900'
                      : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4 text-dark-300" />
        </button>
      </div>

      <div className="text-sm text-dark-400">
        Showing {itemsPerPage} per page
      </div>
    </div>
  );
};

export default TransactionPagination;
