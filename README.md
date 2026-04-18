# SICM EMS — College Event Management System

**SICM EMS** is a modern, automated platform for managing college events, participant registrations, and digital certificate issuance.

## 📖 Documentation
Detailed documentation is available in the [`/docs`](./docs) directory:

- [**Project Overview**](./docs/PROJECT_OVERVIEW.md): Purpose, key features, and organizational structure.
- [**User Roles & Workflows**](./docs/USER_ROLES.md): Detailed explanation of Admin, Teacher, and Student roles.
- [**Technical Architecture**](./docs/TECHNICAL_ARCHITECTURE.md): Frontend/Backend stack and architectural patterns.
- [**Database Schema**](./docs/DATABASE_SCHEMA.md): Data models, relationships, and security (RLS).

## 🚀 Quick Start

### Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables in `.env.local`.
3. Run the development server:
   ```bash
   npm run dev
   ```

### Building for Production
```bash
npm run build
npm start
```

## 🛠️ Built With
- **Next.js 14/15**
- **Supabase** (Auth, DB, Storage)
- **Tailwind CSS**
- **PDF-lib**
- **Web Push API**

---
*Created for the SI-College Management (SICM) project.*
