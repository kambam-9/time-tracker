# Time Tracker Web App

A Next.js 14 time-tracking frontend application with Tailwind CSS and Supabase integration.

## Features

- **PIN-based Clock In/Out**: Employees can clock in and out using a secure PIN
- **Manager Dashboard**: View clock entries and employee data
- **Location Verification**: Uses GPS to verify employees are at the correct location
- **Responsive Design**: Works on desktop and mobile devices
- **TypeScript**: Full type safety throughout the application

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Configure your Supabase environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build

```bash
npm run build
npm start
```

## Pages

- **/** - Main PIN-based clock in/out interface
- **/login** - Manager login (demo: manager@company.com / password123)
- **/dashboard** - Manager dashboard showing clock entries
- **/clock** - Alternative clock interface

## Tech Stack

- Next.js 14.2.4
- React 18.3.1
- TypeScript
- Tailwind CSS
- Supabase Client
- SWR for data fetching
- bcryptjs for PIN hashing

## License

MIT