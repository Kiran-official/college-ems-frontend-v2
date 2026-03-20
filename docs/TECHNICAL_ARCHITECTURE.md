# SICM EMS — Technical Architecture

The application is built using a modern, serverless-first architecture focusing on developer productivity, real-time capabilities, and scalability.

## 💻 Frontend Stack
- **Framework**: [Next.js 14/15](https://nextjs.org/) (App Router, Server Actions)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI / Shadcn UI
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **PDF Generation**: [pdf-lib](https://pdf-lib.js.org/) (Client-side and Server-side generation)

## ☁️ Backend & Infrastructure (Supabase)
The project heavily leverages [Supabase](https://supabase.com/) for its backend services:
- **Authentication**: Email/Password login, session management, and role-based access control (RBAC).
- **Database**: PostgreSQL with Row Level Security (RLS) policies for data protection.
- **Storage**: Used for storing certificate backgrounds and generated PDFs.
- **Server Actions**: Next.js Server Actions are used for database mutations, replacing traditional REST/GraphQL APIs.

## 🏗️ Key Architectural Patterns

### 1. Unified Data Types
All database entities are strictly typed in `lib/types/db.ts`, ensuring end-to-end type safety from the database to the UI components.

### 2. Role-Based Routing
Routes are organized into logical groups using Next.js Route Groups:
- `(admin)`: Restricted to users with the `admin` role.
- `(teacher)`: Restricted to users with the `teacher` role.
- `(student)`: Accessible to all students.
- `(auth)`: Public routes for login, registration, and password recovery.

### 3. Middleware Security
A custom `middleware.ts` handles session validation and role-based redirection, ensuring that users can only access their authorized segments of the application.

### 4. Real-time Notifications
Web Push API integration (`web-push` library) coupled with Supabase allows the system to send browser notifications to users even when the application is not focused.

---

## 🛠️ Development Tools
- **ESLint**: Linting and code quality.
- **Prettier**: Code formatting.
- **Supabase CLI**: Local development and migrations.
- **Cross-env**: Environment variable management.
