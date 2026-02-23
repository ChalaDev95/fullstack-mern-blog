import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, basePath = '' }) => {
  const [searchParams] = useSearchParams();
  
  if (totalPages <= 1) return null;

  const getPageUrl = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    return `${basePath}?${params.toString()}`;
  };

  const pages = [];
  const maxVisible = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // Previous button
  pages.push(
    <li key="prev" className={`pagination-item ${currentPage === 1 ? 'disabled' : ''}`}>
      {currentPage > 1 ? (
        <Link to={getPageUrl(currentPage - 1)} className="pagination-link">
          Previous
        </Link>
      ) : (
        <span className="pagination-link disabled">Previous</span>
      )}
    </li>
  );

  // First page
  if (startPage > 1) {
    pages.push(
      <li key={1} className="pagination-item">
        <Link to={getPageUrl(1)} className="pagination-link">1</Link>
      </li>
    );
    if (startPage > 2) {
      pages.push(
        <li key="ellipsis-start" className="pagination-item ellipsis">
          <span>...</span>
        </li>
      );
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    pages.push(
      <li key={i} className={`pagination-item ${i === currentPage ? 'active' : ''}`}>
        {i === currentPage ? (
          <span className="pagination-link active" aria-current="page">
            {i}
          </span>
        ) : (
          <Link to={getPageUrl(i)} className="pagination-link">
            {i}
          </Link>
        )}
      </li>
    );
  }

  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push(
        <li key="ellipsis-end" className="pagination-item ellipsis">
          <span>...</span>
        </li>
      );
    }
    pages.push(
      <li key={totalPages} className="pagination-item">
        <Link to={getPageUrl(totalPages)} className="pagination-link">
          {totalPages}
        </Link>
      </li>
    );
  }

  // Next button
  pages.push(
    <li key="next" className={`pagination-item ${currentPage === totalPages ? 'disabled' : ''}`}>
      {currentPage < totalPages ? (
        <Link to={getPageUrl(currentPage + 1)} className="pagination-link">
          Next
        </Link>
      ) : (
        <span className="pagination-link disabled">Next</span>
      )}
    </li>
  );

  return (
    <nav className="pagination" aria-label="Pagination">
      <ul className="pagination-list">
        {pages}
      </ul>
    </nav>
  );
};

export default Pagination;

