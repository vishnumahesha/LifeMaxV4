# LifeMAX - AI-Powered Self-Improvement Platform

LifeMAX is a self-improvement web app that provides clarity through AI-powered analysis:

1. **Face Analyzer** - Golden ratio harmony analysis, feature scoring, and personalized styling recommendations
2. **Body Analyzer** - Proportions, posture signals, Kibbe body type assessment, and composition insights
3. **Action Plan** - Custom workout splits, macro targets, and priority areas tailored to your body

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 with custom dark purple theme
- **Backend**: Next.js API Routes
- **Auth & Database**: Supabase (Auth + PostgreSQL + Storage)
- **AI**: Google Gemini API (server-side only)
- **Validation**: Zod schemas

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google AI Studio account (for Gemini API key)

### Installation

1. Clone the repository and install dependencies:

```bash
cd lifemax-app
npm install
```

2. Create a `.env.local` file with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic/Claude API Key (SERVER-SIDE ONLY)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Site URL (for auth redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Set up your Supabase database:
   - Go to your Supabase project's SQL Editor
   - Run the contents of `supabase-schema.sql`

4. Configure Google OAuth (optional):
   - In Supabase Dashboard → Authentication → Providers
   - Enable Google provider and add your OAuth credentials

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key (server-side only!) |
| `NEXT_PUBLIC_SITE_URL` | Optional | Your site URL for auth callbacks |

## Security Notes

- **ANTHROPIC_API_KEY is NEVER exposed to the client**. It's only used in API routes (server-side).
- All API routes validate input with Zod schemas
- Supabase RLS policies ensure users can only access their own data
- Photo processing happens server-side through the Gemini Vision API

## Features

### Face Analyzer
- Upload front photo (required) and side photo (optional)
- Get comprehensive analysis including:
  - Golden ratio harmony index
  - Symmetry and thirds balance
  - Individual feature scores
  - Face shape detection
  - Top 3 improvement levers
  - Styling recommendations (haircuts, glasses, grooming)

### Body Analyzer
- Upload front photo (required), side and back (optional)
- Analysis includes:
  - Body proportions (shoulder-waist, waist-hip ratios)
  - Frame size and vertical line assessment
  - Posture signals (if side photo provided)
  - Muscle balance evaluation
  - Body composition insights
  - Kibbe body type probabilities
  - Personalized styling notes

### Action Plan Generator
- Enter your stats (height, weight, goal, experience level)
- Receive:
  - Daily macro targets (calories, protein, carbs, fats, fiber)
  - Custom workout split
  - Day-by-day exercise programs
  - Training notes and timeline

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (server-side)
│   │   ├── face/
│   │   │   ├── scan/
│   │   │   └── preview/
│   │   ├── body/
│   │   │   └── scan/
│   │   └── action/
│   │       └── generate/
│   ├── auth/          # Auth pages
│   ├── face/          # Face analyzer pages
│   ├── body/          # Body analyzer pages
│   └── action/        # Action plan page
├── components/
│   ├── ui/            # Reusable UI components
│   ├── face/          # Face-specific components
│   └── body/          # Body-specific components
├── lib/
│   ├── supabase/      # Supabase client setup
│   ├── validations/   # Zod schemas
│   ├── prompts/       # AI prompt templates
│   └── utils.ts       # Utility functions
└── types/             # TypeScript types
```

## Mobile-First Design

The app is optimized for iPhone usage via QR code:
- Touch-friendly interface
- Camera-first photo upload
- Progressive disclosure with accordions
- Single-column layout on mobile
- Two-column layout on desktop

## Content Safety

- No harsh language or body-shaming
- Constructive framing (strengths, what limits appeal, top levers)
- Age-appropriate restrictions (sensitive metrics hidden for minors)
- Medical disclaimers where appropriate
- No fake precision - always shows confidence levels

## Development Commands

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

## Deployment

The app is ready to deploy to Vercel:

```bash
vercel
```

Make sure to set environment variables in your Vercel project settings.

## License

MIT
