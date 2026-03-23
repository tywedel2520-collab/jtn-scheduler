# JTN Scheduler

A client progress and queue tracking app with admin management, customer records, and secure share links.

## Features

- **Admin Login** – Manage customers, jobs, queue order, and share links
- **Client Portal** – View their own jobs via a shareable link (read-only)
- **Job Calendar** – Interactive calendar for job creation/editing by admins
- **Customer Info** – Manage customer details (name, email, phone, address) for admins
- **Shareable Client Link** – Each customer gets a unique link to view their scheduled jobs

## Setup

1. **Install dependencies** (requires Node.js 18+):

   ```bash
   npm install
   ```

2. **Set up the database**:

   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

3. **Run the dev server**:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Auth Flow (Production-style)

- Login UI only shows **Sign In** and **Create Account**.
- Role selection is removed from UI; role is resolved server-side.
- New public signups are auto-created as **client** accounts.
- Admin role is internal/hidden and managed outside public signup.
- Admin can always sign in through `/admin-login` for local testing.

### Admin Login

- **Admin**
  - **Email:** `admin@example.com`
  - **Password:** `admin123`

## Auth Troubleshooting (local)

- If login fails after schema changes, run:
  - `npx prisma generate`
  - `npx prisma db push`
  - `npm run db:seed`
- On Windows, if `prisma generate` shows `EPERM ... query_engine-windows.dll.node`, stop the dev server and run `npx prisma generate` again, then restart `npm run dev`.

## Tech Stack

- Next.js 14 (App Router)
- Prisma + SQLite
- Tailwind CSS
- React Big Calendar
- bcryptjs for password hashing

## Shareable Links

Admin can generate a tokenized client link per job from the job editor (click a job on the calendar).
Send that link to the client: they can view the job at `/share/[token]` without logging in.
