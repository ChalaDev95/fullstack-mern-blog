# Full-Stack CMS Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation Steps

### 1. Install Dependencies

From the root directory, run:
```bash
npm run install-all
```

This will install dependencies for:
- Root package.json
- Server (backend)
- Client (frontend)

### 2. Set Up MongoDB

**Option A: Local MongoDB**
- Install MongoDB locally
- Start MongoDB service
- Default connection: `mongodb://localhost:27017/cms`

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at https://www.mongodb.com/cloud/atlas
- Create a cluster and get your connection string
- Update `MONGODB_URI` in `server/.env`

### 3. Configure Environment Variables

**Backend (server/.env):**
```bash
# Copy the example file
cp server/.env.example server/.env

# Edit server/.env and update:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cms
JWT_SECRET=your-super-secret-jwt-key-change-this
FRONTEND_URL=http://localhost:3000
```

**Frontend (client/.env):**
```bash
# Copy the example file
cp client/.env.example client/.env

# Edit client/.env and update:
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_FRONTEND_URL=http://localhost:3000
```

### 4. Create Uploads Directory

```bash
mkdir -p server/uploads
```

### 5. Start Development Servers

**Option A: Run both servers together**
```bash
npm run dev
```

**Option B: Run separately**

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm start
```

### 6. Access the Application

- **Frontend (Public)**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login
- **Backend API**: http://localhost:5000/api

### 7. Create Your First Admin User

You can create an admin user through the registration endpoint:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123456"
  }'
```

Then manually update the user role in MongoDB:
```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Or use the admin panel after logging in (if you have admin access).

## Project Structure

```
.
├── server/                 # Backend API
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, validation
│   ├── utils/             # Helpers
│   └── index.js           # Server entry point
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   │   ├── admin/     # Admin panel pages
│   │   │   └── public/    # Public blog pages
│   │   ├── context/       # React context
│   │   └── utils/         # Utilities
│   └── public/            # Static files
└── uploads/               # Media uploads (created at runtime)
```

## Features Implemented

### Backend ✅
- ✅ User authentication (JWT)
- ✅ Role-based access control
- ✅ Post management (CRUD)
- ✅ Comment system
- ✅ Media uploads
- ✅ Categories & Tags
- ✅ Pages management
- ✅ Search functionality
- ✅ Sitemap generation
- ✅ Security middleware (helmet, rate limiting, sanitization)

### Frontend ✅
- ✅ Admin panel layout
- ✅ Login/Authentication
- ✅ Dashboard
- ✅ Post editor with WYSIWYG
- ✅ Posts list & management
- ⚠️ Other admin pages (placeholders - ready for implementation)
- ⚠️ Public blog pages (placeholders - ready for implementation)

## Next Steps

1. **Complete Admin Pages**: Implement full CRUD for:
   - Pages management
   - Comments moderation
   - Media library
   - Users management
   - Categories & Tags management
   - Settings

2. **Public Blog**: Build the public-facing blog:
   - Post listing with pagination
   - Single post view
   - Category/Tag archives
   - Search functionality
   - Comment system
   - Responsive design

3. **Additional Features**:
   - Email notifications
   - OAuth integration
   - 2FA implementation
   - Analytics integration
   - Performance optimizations
   - SEO enhancements

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Posts
- `GET /api/posts` - List posts (with filters)
- `GET /api/posts/:slug` - Get single post
- `POST /api/posts` - Create post (auth required)
- `PUT /api/posts/:id` - Update post (auth required)
- `DELETE /api/posts/:id` - Delete post (auth required)

### Comments
- `GET /api/comments/post/:postId` - Get comments for post
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Media
- `POST /api/media/upload` - Upload file
- `GET /api/media` - List media files
- `DELETE /api/media/:id` - Delete media

### Categories, Tags, Pages, Users
- Standard CRUD operations available
- See route files for details

## Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- Verify network/firewall settings

**Port Already in Use:**
- Change `PORT` in `server/.env`
- Update `REACT_APP_API_URL` in `client/.env`

**CORS Errors:**
- Ensure `FRONTEND_URL` in server `.env` matches your frontend URL
- Check CORS configuration in `server/index.js`

**File Upload Issues:**
- Ensure `uploads` directory exists
- Check file size limits in `.env`
- Verify file type restrictions

## Production Deployment

1. Build the frontend:
```bash
cd client
npm run build
```

2. Set `NODE_ENV=production` in server `.env`

3. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start server/index.js --name cms-api
```

4. Serve frontend build with nginx or similar

5. Set up SSL/HTTPS

6. Configure environment variables for production

7. Set up database backups

8. Configure CDN for media files

## License

MIT


