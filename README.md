# 🎓 Academic Debate Platform

Full-stack debate platform with structured rounds, threaded arguments, voting, moderation tools, archive, bookmarks, and notifications.

## Tech stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (`/public`)
- Backend: Node.js + Express (`server.js`, `/src`)
- Database: MongoDB + Mongoose

## Features

- Auth: signup/login, bcrypt password hashing, JWT auth, token in `localStorage`
- Roles: `user`, `moderator`, `admin`
- Homepage: premium glass navbar, hero CTA, trending debates, categories, leaderboard
- Debates: create, approve, start/end/advance rounds, archive completed
- Arguments: one post per user per round, threaded replies, votes, reports
- Moderator: delete arguments, ban/unban users, approve debates, round controls
- Profile: bio/name edit, participation history, reputation, bookmarks, notifications

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env` from `.env.example`:

```bash
copy .env.example .env
```

Update `MONGODB_URI` if needed.

### 3) Start MongoDB

Make sure MongoDB is running locally (or point `MONGODB_URI` to your cluster).

### 4) Seed demo accounts + debates (recommended)

```bash
npm run seed
```

Creates:
- `admin@adp.local` / `Password123!`
- `moderator@adp.local` / `Password123!`

### 5) Run the app

Dev mode:

```bash
npm run dev
```

Open:
- `http://localhost:3000`

## API (core)

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/debates`
- `POST /api/debates`
- `POST /api/arguments`
- `POST /api/vote`
- `GET /api/archive`

## Folder structure

- `public/` → HTML/CSS/JS frontend
- `src/routes/` → API routes
- `src/controllers/` → controllers
- `src/models/` → Mongoose models
- `src/middleware/` → auth/validation middleware
- `server.js` → app entry point

