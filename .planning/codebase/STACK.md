# Technology Stack

**Analysis Date:** 2026-05-05

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code, API routes, components, and utilities
- JavaScript (Node.js) - Build scripts, configuration files, build pipeline

**Secondary:**
- CSS/Tailwind CSS - Styling via Tailwind CSS 4.1.17
- SQL - Database operations via Supabase SDK (queries abstracted through JS client)

## Runtime

**Environment:**
- Node.js (latest LTS) - Server-side runtime for Next.js 16
- Browser (modern Chrome/Firefox/Safari/Edge) - Client-side runtime

**Package Manager:**
- npm (implicit via package.json)
- Lockfile: Not examined, but assumed to be package-lock.json

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack framework with App Router, API routes, middleware
- React 19.2.0 - UI component framework
- React DOM 19.2.0 - DOM rendering for React components

**Styling:**
- Tailwind CSS 4.1.17 - Utility-first CSS framework
- @tailwindcss/forms 0.5.10 - Form styling utilities
- @tailwindcss/postcss 4.1.17 - PostCSS integration

**UI Components & Libraries:**
- FullCalendar 6.1.19 - Calendar component for appointments/scheduling
  - @fullcalendar/core
  - @fullcalendar/react
  - @fullcalendar/daygrid
  - @fullcalendar/timegrid
  - @fullcalendar/list
  - @fullcalendar/interaction

**Drag & Drop:**
- react-dnd 16.0.1 - Drag and drop framework for CRM pipeline Kanban
- react-dnd-html5-backend 16.0.1 - HTML5 backend for drag and drop

**Data Visualization:**
- ApexCharts 4.7.0 - Charts and analytics
- react-apexcharts 1.8.0 - React wrapper for ApexCharts
- @react-jvectormap/core 1.0.4 - World maps visualization
- @react-jvectormap/world 1.1.2 - World map data

**Animation:**
- framer-motion 12.38.0 - React animation library
- Swiper 12.1.3 - Carousel/slider component

**Form & Input:**
- flatpickr 4.6.13 - Date picker component
- react-dropzone 14.3.8 - File upload/drop zone

**Utilities:**
- tailwind-merge 2.6.0 - Merge Tailwind CSS classes intelligently
- mammoth 1.12.0 - DOCX file parsing (for contract template extraction)

**Testing:**
- Vitest 2.1.9 - Unit test runner
- @vitejs/plugin-react 4.7.0 - React plugin for Vitest
- jsdom 25.0.1 - DOM implementation for testing

**Build/Dev:**
- TypeScript 5.9.3 - Type checking and compilation
- ESLint 9.39.1 - JavaScript/TypeScript linting
- eslint-config-next 16.0.7 - Next.js ESLint configuration
- @svgr/webpack 8.1.0 - SVG to React component loader
- PostCSS 8.5.6 - CSS transformation framework
- Autoprefixer 10.4.22 - Add vendor prefixes to CSS

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.100.1 - Supabase client (database, auth, real-time)
- @supabase/ssr 0.9.0 - Supabase server-side rendering helpers for Next.js

**Infrastructure:**
- next-env.d.ts - Next.js type definitions (auto-generated)

## Configuration

**Environment:**
- `.env.local` - Local development secrets (must contain NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_YZI_API_URL, NEXT_PUBLIC_JUREMA_TENANT_ID, NEXT_PUBLIC_CAFE_PAM_TENANT_ID, NEXT_PUBLIC_APP_URL, FACTORY_N8N_WEBHOOK_URL, EVOLUTION_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME, WEBHOOK_IMOVEIS_SECRET, NEXT_PUBLIC_DEV_BYPASS)
- `.env.example` - Template for required environment variables

**Build:**
- `next.config.ts` - Next.js configuration with Webpack and Turbopack rules for SVG (@svgr/webpack)
- `tsconfig.json` - TypeScript compiler options with path alias @/* → src/*
- `vitest.config.ts` - Vitest test runner configuration (jsdom environment, tests in tests/ directory)
- `eslint.config.mjs` - ESLint configuration (flat config format)
- `prettier.config.js` - Code formatter configuration
- `postcss.config.js` - PostCSS configuration for CSS transforming
- `package.json` - Project dependencies and scripts

**Dev Scripts:**
```bash
npm run dev          # Start Next.js dev server on port 3002 with --webpack flag
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking (tsc --noEmit)
npm run test         # Run Vitest in run mode
npm run test:watch   # Run Vitest in watch mode
```

## Platform Requirements

**Development:**
- Node.js LTS (latest)
- npm or Yarn package manager
- Git for version control
- .env.local file with required secrets

**Production:**
- Vercel (primary deployment target - mentioned in NEXT_PUBLIC_APP_URL comments)
- Node.js runtime (20+ LTS)
- Environment variables via Vercel dashboard or .env.production

**Database:**
- Supabase PostgreSQL instance (remote or local via Supabase CLI)
- Tables: leads, imoveis, corretores, contracts, appointments, profiles, jurema_deals, jurema_property_matches, jurema_appointments, agent_metrics_events, café_pam_projects, café_pam_payments, café_pam_briefings

---

*Stack analysis: 2026-05-05*
