# PCPP - Pakistan Country Project Platform

A full-stack web platform connecting Pakistan development projects with strategic investors.

## Tech Stack
- **Frontend:** React.js + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL + Sequelize ORM
- **Auth:** JWT + bcryptjs

## Quick Start

### Prerequisites
- Node.js >= 16
- PostgreSQL >= 13
- npm or yarn

### 1. Clone & Setup

```bash
git clone <repo-url>
cd bcpp
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials and secrets
```

### 3. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE bcpp_db;"

# Run migrations
psql -U postgres -d bcpp_db -f migrations/001_initial_schema.sql

# Seed sample data
npm run seed
```

### 4. Start Backend

```bash
npm run dev   # Development (port 5000)
npm start     # Production
```

### 5. Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:5000/api
npm start     # Development (port 3000)
npm run build # Production build
```

## Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bcpp.gov.pk | Admin@123456 |
| Investor | investor@hbl.com | Test@123456 |
| Project Owner | energy@balochistan.gov.pk | Test@123456 |

## API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Forgot password
- `PUT /api/auth/reset-password/:token` - Reset password
- `PUT /api/auth/update-profile` - Update profile
- `PUT /api/auth/update-password` - Change password

### Projects
- `GET /api/projects` - List projects (public)
- `GET /api/projects/:id` - Get project (public)
- `POST /api/projects` - Create project (auth)
- `PUT /api/projects/:id` - Update project (auth)
- `DELETE /api/projects/:id` - Delete project (auth)
- `POST /api/projects/:id/submit` - Submit for review (auth)
- `GET /api/projects/my` - My projects (auth)
- `GET /api/projects/saved` - Saved projects (auth)
- `POST /api/projects/:id/save` - Toggle save (auth)
- `POST /api/projects/:id/updates` - Post update (auth)
- `GET /api/projects/stats` - Platform stats (public)

### Interests
- `POST /api/interests/:projectId` - Express interest (auth)
- `GET /api/interests/my` - My interests (auth)
- `GET /api/interests/project/:projectId` - Project interests (auth/owner)
- `PUT /api/interests/:id/respond` - Respond to interest (auth/owner)

### Admin (admin role required)
- `PUT /api/admin/projects/:id/review` - Review project
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/users` - All users
- `PUT /api/admin/users/:id/status` - Update user status

### Notifications
- `GET /api/notifications` - Get notifications (auth)
- `PUT /api/notifications/:id/read` - Mark read (auth)
- `PUT /api/notifications/read-all` - Mark all read (auth)

## Project Structure

```
bcpp/
├── backend/
│   ├── src/
│   │   ├── config/         # DB config
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, error, upload
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # Express routes
│   │   └── utils/          # JWT, email, helpers
│   ├── migrations/         # SQL schema
│   ├── seeds/              # Sample data
│   └── server.js           # Entry point
└── frontend/
    └── src/
        ├── components/     # Reusable UI components
        │   ├── common/     # Button, Input, Badge, Modal...
        │   ├── layout/     # Navbar, Sidebar, Layouts
        │   └── public/     # ProjectCard...
        ├── context/        # AuthContext
        ├── pages/
        │   ├── public/     # Home, Projects, Login, Register
        │   ├── dashboard/  # User dashboard pages
        │   └── admin/      # Admin panel pages
        ├── services/       # API calls
        └── utils/          # Constants, helpers
```

## Features
- ✅ Public project browsing with filters
- ✅ User registration/login with JWT
- ✅ 14-section project submission form
- ✅ Project review workflow (Admin)
- ✅ Investment interest system
- ✅ Real-time notifications
- ✅ Analytics dashboard
- ✅ User management
- ✅ File upload support
- ✅ Email notifications
- ✅ Fully responsive design

## License
Government of Pakistan - All Rights Reserved
