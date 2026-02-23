import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-dark text-light mt-5 py-4">
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <h5>CMS Blog</h5>
            <p className="mb-0">A modern content management system built with React and Node.js</p>
          </div>
          <div className="col-md-6 text-md-end">
            <h5>Quick Links</h5>
            <ul className="list-unstyled mb-0">
              <li>
                <a href="/posts" className="text-light text-decoration-none">All Posts</a>
              </li>
              <li>
                <a href="/search" className="text-light text-decoration-none">Search</a>
              </li>
              <li>
                <a href="/admin/login" className="text-light text-decoration-none">Admin Panel</a>
              </li>
            </ul>
          </div>
        </div>
        <hr className="bg-light my-3" />
        <div className="text-center">
          <p className="mb-0">&copy; {new Date().getFullYear()} CMS Blog. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

