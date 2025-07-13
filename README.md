# Employee Time Tracking System

A comprehensive time tracking system built with Next.js, Supabase, and Tailwind CSS. Features offline support, real-time alerts, and a responsive PWA interface.

## Features

- **Time Clock Interface**: Simple clock-in/clock-out functionality
- **Manager Dashboard**: View all clock entries and alerts
- **Offline Support**: Works without internet connection with automatic sync
- **PWA Ready**: Installable on mobile devices and desktops
- **Real-time Alerts**: Automatic detection of overtime and missed clock-outs
- **Audit Logging**: Complete audit trail of all actions
- **Row Level Security**: Secure data access with Supabase RLS

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **PWA**: Service Worker, Web App Manifest
- **Offline Storage**: LocalStorage with automatic sync

## Quick Start

### 1. Prerequisites

- Node.js 18+ 
- A Supabase account and project

### 2. Setup Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration to create the database schema:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

3. Deploy the Edge Functions:
   ```bash
   supabase functions deploy alert-processor
   supabase functions deploy offline-sync
   ```

### 3. Install and Run

1. Clone the repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd time-tracker
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Supabase Setup

The system requires the following Supabase components:

1. **Database Tables**: Created by the migration file
2. **Row Level Security (RLS)**: Configured in the migration
3. **Edge Functions**: Two functions for alert processing and offline sync

## Database Schema

The system includes the following tables:

- **employees**: Employee information and settings
- **terminals**: Clock-in terminals/locations
- **clock_entries**: Individual time entries
- **schedules**: Employee work schedules
- **alerts**: System-generated alerts
- **audit_logs**: Complete audit trail

## API Routes

### POST /api/sync
Syncs offline clock entries with the server.

**Request Body:**
```json
{
  "entries": [
    {
      "employee_id": "EMP001",
      "terminal_id": "TERM001",
      "clock_in": "2024-01-01T09:00:00Z",
      "clock_out": "2024-01-01T17:00:00Z",
      "notes": "Regular shift",
      "offline_timestamp": "2024-01-01T09:00:00Z"
    }
  ]
}
```

## Supabase Edge Functions

### alert-processor
Automatically detects and creates alerts for:
- Employees who forgot to clock out
- Overtime situations
- Schedule violations

### offline-sync  
Handles synchronization of offline clock entries with validation and duplicate detection.

## PWA Features

The application is a Progressive Web App (PWA) with:

- **Offline Functionality**: Works without internet connection
- **Installable**: Can be installed on devices like a native app
- **Background Sync**: Automatically syncs when connection returns
- **Push Notifications**: Ready for alert notifications (requires setup)

## Usage

### For Employees

1. **Clock In/Out**: Select your name and click Clock In or Clock Out
2. **Add Notes**: Optional notes for each time entry
3. **Offline Support**: The app works offline and syncs when connection returns

### For Managers

1. **View Entries**: See all clock entries for any date
2. **Monitor Alerts**: Review and resolve system alerts
3. **Manage Data**: Edit clock entries and resolve issues

## Development

### Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── ClockPad.tsx    # Time clock interface
│   ├── ManagerTable.tsx # Manager dashboard
│   └── Layout.tsx      # App layout
├── lib/               # Utilities and services
│   ├── supabase.ts    # Supabase client
│   └── utils.ts       # Helper functions
└── types/             # TypeScript types
    └── index.ts       # Type definitions

supabase/
├── functions/         # Edge Functions
│   ├── alert-processor/
│   └── offline-sync/
└── migrations/        # Database migrations
    └── 20240101000000_initial_schema.sql
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. **Database Changes**: Add migration files in `supabase/migrations/`
2. **API Endpoints**: Add routes in `src/app/api/`
3. **Components**: Add React components in `src/components/`
4. **Types**: Update TypeScript types in `src/types/`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- Digital Ocean
- AWS
- Google Cloud

## Troubleshooting

### Common Issues

1. **Supabase Connection Errors**
   - Verify your environment variables
   - Check your Supabase project status
   - Ensure RLS policies are properly configured

2. **Migration Failures**
   - Check for syntax errors in SQL files
   - Verify database permissions
   - Review Supabase logs

3. **Offline Sync Issues**
   - Check browser console for errors
   - Verify the offline-sync Edge Function is deployed
   - Test API route manually

### Getting Help

1. Check the browser console for error messages
2. Review Supabase project logs
3. Verify all environment variables are set correctly
4. Test Edge Functions individually

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on GitHub or contact the development team.