import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import './Search.css';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState({ posts: [], pages: [] });
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  useEffect(() => {
    // Handle clicks outside autocomplete
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (q) => {
    if (!q.trim()) {
      setResults({ posts: [], pages: [] });
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setHighlightedIndex(-1);

    // Clear existing timer
    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current);
    }

    if (value.length >= 2) {
      // Debounce autocomplete
      autocompleteTimerRef.current = setTimeout(() => {
        fetchAutocomplete(value);
      }, 300);
    } else {
      setAutocomplete([]);
      setShowAutocomplete(false);
    }
  };

  const fetchAutocomplete = async (q) => {
    try {
      const res = await api.get(`/search/autocomplete?q=${encodeURIComponent(q)}`);
      setAutocomplete(res.data.data);
      setShowAutocomplete(true);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowAutocomplete(false);
    setSearchParams({ q: searchQuery });
    performSearch(searchQuery);
  };

  const handleAutocompleteSelect = (suggestion) => {
    setSearchQuery(suggestion.title);
    setShowAutocomplete(false);
    setSearchParams({ q: suggestion.title });
    performSearch(suggestion.title);
    searchInputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!showAutocomplete || autocomplete.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < autocomplete.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleAutocompleteSelect(autocomplete[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i}>{part}</mark>
      ) : part
    );
  };

  return (
    <div className="search-page">
      <div className="search-container">
        <h1>Search</h1>
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-wrapper" ref={autocompleteRef}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery.length >= 2 && setShowAutocomplete(true)}
              placeholder="Search posts and pages..."
              className="search-input"
            />
            {showAutocomplete && autocomplete.length > 0 && (
              <div className="autocomplete-dropdown">
                {autocomplete.map((item, index) => (
                  <div
                    key={item._id}
                    className={`autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                    onClick={() => handleAutocompleteSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="autocomplete-title">
                      {highlightText(item.title, searchQuery)}
                    </div>
                    {item.excerpt && (
                      <div className="autocomplete-excerpt">
                        {highlightText(item.excerpt.substring(0, 100), searchQuery)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="search-button">
            Search
          </button>
        </form>

        {loading && <div className="loading">Searching...</div>}

        {!loading && query && (
          <div className="search-results">
            <div className="results-header">
              <h2>Search Results for "{query}"</h2>
              <div className="results-count">
                {results.postsTotal || 0} posts, {results.pagesTotal || 0} pages
              </div>
            </div>

            {results.posts && results.posts.length > 0 && (
              <section className="results-section">
                <h3>Posts</h3>
                <div className="results-list">
                  {results.posts.map(post => (
                    <article key={post._id} className="result-item">
                      <Link to={`/posts/${post.slug}`}>
                        <h4>{highlightText(post.title, query)}</h4>
                      </Link>
                      {post.excerpt && (
                        <p className="result-excerpt">
                          {highlightText(post.excerpt, query)}
                        </p>
                      )}
                      <div className="result-meta">
                        <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                        {post.categories && post.categories.length > 0 && (
                          <span className="result-categories">
                            {post.categories.map(cat => cat.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {results.pages && results.pages.length > 0 && (
              <section className="results-section">
                <h3>Pages</h3>
                <div className="results-list">
                  {results.pages.map(page => (
                    <article key={page._id} className="result-item">
                      <Link to={`/pages/${page.slug}`}>
                        <h4>{highlightText(page.title, query)}</h4>
                      </Link>
                      {page.excerpt && (
                        <p className="result-excerpt">
                          {highlightText(page.excerpt, query)}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {(!results.posts || results.posts.length === 0) && 
             (!results.pages || results.pages.length === 0) && (
              <div className="no-results">
                <p>No results found for "{query}"</p>
                <p>Try different keywords or check your spelling.</p>
              </div>
            )}
          </div>
        )}

        {!query && !loading && (
          <div className="search-placeholder">
            <p>Enter a search query to find posts and pages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
