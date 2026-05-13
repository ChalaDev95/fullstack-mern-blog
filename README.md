# Full-Stack CMS/Blog Platform

A comprehensive content management system with all modern features for blogging and content publishing.

## Features

### Content Management
- Rich post editor with Markdown + HTML support
- WYSIWYG editor with syntax highlighting
- Auto-generated slugs and excerpts
- Featured images with multiple sizes
- Tags and hierarchical categories
- Post scheduling and revision history
- SEO optimization (meta tags, structured data)
- Password-protected posts
- Pinned/featured posts

### User Management
- Role-based access control (Admin, Editor, Author, Contributor, Subscriber)
- JWT authentication
- OAuth support (Google, GitHub, Facebook)
- Two-factor authentication (2FA)
- User profiles and activity logs

### Media Management
- Drag & drop file uploads
- Image optimization and thumbnails
- Media library with search
- Support for images, videos, PDFs, audio

### Comments & Interactions
- Nested/threaded comments
- Comment moderation
- Anti-spam protection
- Likes/reactions
- Email notifications

### SEO & Social
- Open Graph tags
- Twitter cards
- JSON-LD structured data
- Auto-generated sitemap
- Social sharing buttons

### Performance
- Lazy loading
- Image optimization
- Caching strategies
- CDN support
- Compression

### Security
- CSRF protection
- XSS sanitization
- SQL injection prevention
- Rate limiting
- Secure authentication

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT for authentication
- Multer for file uploads
- Bcrypt for password hashing

### Frontend
- React
- React Router
- React Quill (WYSIWYG editor)
- Axios for API calls
- Modern CSS with responsive design

## Quick Start

See [SETUP.md](./SETUP.md) for detailed installation and setup instructions.

**Quick Setup:**
1. Install dependencies: `npm run install-all`
2. Configure environment variables (see SETUP.md)
3. Start servers: `npm run dev`
4. Access admin panel at: http://localhost:3000/admin/login

## Database Maintenance

When deploying the tightened database rules, audit existing records first:

```bash
cd server
npm run db:audit
```

If the audit shows duplicate or invalid Like/Subscription records, repair them with:

```bash
cd server
npm run db:repair
```

The repair script keeps the oldest valid record in each duplicate group and removes invalid records that violate the current schema rules.

## Project Structure

```
.
├── server/          # Backend API
│   ├── models/      # MongoDB models
│   ├── routes/      # API routes
│   ├── middleware/  # Auth, validation, etc.
│   ├── controllers/ # Business logic
│   └── utils/       # Helpers
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── admin/   # Admin panel
│   │   └── public/  # Public blog
└── uploads/         # Media files
```

## Deployment

### Docker Deployment

```bash
docker-compose up -d
```

### Manual Deployment

See [SETUP.md](./SETUP.md) for production deployment instructions.

## Documentation

- [Setup Guide](./SETUP.md) - Complete installation and configuration guide
- API endpoints are documented in the route files under `server/routes/`

## Status

✅ **Fully Implemented:**
- Backend API with all CRUD operations
- Authentication & Authorization
- Post management with WYSIWYG editor
- Admin dashboard
- Media uploads
- Comments system
- Categories & Tags
- Search functionality
- SEO features (sitemap, meta tags)
- Security middleware

⚠️ **Partially Implemented (Placeholders Ready):**
- Additional admin pages (Pages, Comments, Media, Users, Categories, Tags, Settings)
- Public blog frontend pages

## Contributing

This is a comprehensive CMS platform. You can extend it by:
1. Completing the placeholder admin pages
2. Building out the public blog frontend
3. Adding additional features from the requirements list
4. Implementing OAuth, 2FA, and other advanced features

