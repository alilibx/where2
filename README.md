# Where2 Dubai — Voice-First City Guide MVP

A hyper-filtered, voice-first city guide application for Dubai that helps users discover the perfect venue based on their mood, constraints, and context.

## 🎯 Product Vision

Remove decision fatigue by matching a user's intent (mood, constraints, timing, weather) to 5-10 high-quality venue options in Dubai, ready to act on (navigate, call, book, share).

## ✨ Features

### Core Functionality
- **Voice & Text Search**: Speak or type free-form queries to find venues
- **Smart Filtering**: Family-friendly, outdoor/indoor, near Metro, waterfront, price bands, and more
- **Context-Aware Results**: Considers time of day, weather, and user location
- **Best Match Algorithm**: Intelligent ranking based on relevance and user preferences
- **Preference Learning**: Remembers user choices to improve future recommendations
- **Action Buttons**: Navigate, call, book, and share venues directly

### Search Filters
- Family-friendly / Kid-friendly
- Outdoor / Indoor
- Near Metro (with station name and walk time)
- Waterfront
- Price levels (Low, Mid, High, Lux)
- Cuisine types
- Noise levels (Quiet, Moderate, Lively)
- Open now

### User Experience
- Voice search with visual feedback
- Best Match highlighting for top recommendations
- Detailed venue pages with galleries and highlights
- Real-time "Open Now" status
- Metro proximity information
- Preference memory toggle with vibe summary

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (React 18) with TypeScript
- **Backend**: Convex (serverless backend platform)
- **Styling**: Custom CSS with responsive design
- **Icons**: Lucide React
- **Voice**: Web Speech API (Chrome/Safari)

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- A Convex account (free at [convex.dev](https://convex.dev))

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd alilibx
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Convex

```bash
# Login to Convex
npx convex dev

# Follow the prompts to create a new project or link to an existing one
```

This will:
- Create a new Convex project (or link to existing)
- Generate a `.env.local` file with your `NEXT_PUBLIC_CONVEX_URL`
- Start the Convex development server
- Deploy your schema and functions

### 4. Seed the database with sample data

In a new terminal, while `npx convex dev` is running:

```bash
# Open the Convex dashboard
npx convex dashboard

# In the dashboard, go to Functions and run the mutation:
# seedData.seedPlaces()
```

Alternatively, you can run it from code:

```bash
# Create a seed script or use the Convex CLI
npx convex run seedData:seedPlaces
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
alilibx/
├── app/                          # Next.js app directory
│   ├── components/              # React components
│   │   ├── SearchBar.tsx       # Voice & text search
│   │   ├── FilterChips.tsx     # Filter selection UI
│   │   ├── ResultsList.tsx     # Search results display
│   │   ├── PlaceCard.tsx       # Venue card component
│   │   └── PreferenceToggle.tsx # User preferences UI
│   ├── place/[id]/             # Dynamic venue detail pages
│   │   └── page.tsx
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── globals.css             # Global styles
│   └── ConvexClientProvider.tsx
├── convex/                      # Convex backend
│   ├── schema.ts               # Database schema
│   ├── places.ts               # Place queries & mutations
│   ├── preferences.ts          # User preference functions
│   └── seedData.ts             # Sample data seeder
├── lib/                         # Utilities
│   └── translations.ts         # Bilingual support
└── README.md
```

## 🗄️ Data Model

### Places
- Name, cover image, gallery
- Location (lat/long, area)
- Metro info (station, walk time)
- Tags (family-friendly, outdoor, etc.)
- Cuisine types
- Price level, rating, noise
- Opening hours
- Contact (phone, booking URL, website)
- Highlights and parking notes

### User Preferences
- User ID
- Preferred tags (learned from selections)
- Preferred price levels and areas
- Memory enabled/disabled toggle
- Language preference

### Search History
- User queries
- Applied filters
- Selected venues (for learning)

## 🎨 Key Features Implementation

### Voice Search
Uses the Web Speech Recognition API. Works best in Chrome and Safari. Falls back to text input in unsupported browsers.

### Best Match Algorithm
Scores venues based on:
- Rating (base score)
- Distance from user
- Open/closed status
- Weather context (outdoor preference in pleasant months)
- Metro proximity
- User's learned preferences

### Preference Learning
When memory is enabled:
- Tracks selected venues
- Learns preferred tags (outdoor, family-friendly, etc.)
- Learns preferred price levels and areas
- Biases future results toward learned preferences

### Context Awareness
- **Time**: Checks opening hours against current time
- **Weather**: Pleasant months (Oct-Mar) bias outdoor suggestions
- **Location**: Sorts by distance when user location is available

## 🌍 Bilingual Support (English/Arabic)

The app is structured for bilingual support:
- Translations defined in `lib/translations.ts`
- Arabic names stored in database (`nameAr` field)
- RTL CSS support ready
- Language toggle can be added to preferences

Current status: English is live, Arabic translations are ready for implementation.

## 🧪 Testing Acceptance Scenarios

From the functional spec, test these scenarios:

1. **Family outdoor dining near Metro**
   - Query: "Family-friendly cafe near Metro, outdoor"
   - Expected: Results show outdoor, family-friendly venues with Metro info

2. **Waterfront dinner tonight**
   - Query: "Family dinner by the water, quiet, tonight at 8"
   - Expected: Waterfront restaurants, quieter atmosphere, open at 8 PM

3. **Budget breakfast indoor**
   - Query: "Affordable breakfast, indoor, Marina"
   - Expected: Low-price indoor breakfast spots in Marina

4. **No matches fallback**
   - Apply many strict filters
   - Expected: Clear message with suggestions to relax filters

5. **Preference learning**
   - Enable memory, select outdoor venues
   - Search again next session
   - Expected: Outdoor venues ranked higher

## 📊 Success Metrics (from spec)

- Search-to-tap rate on Top 3 results ≥ 45%
- Navigation action rate ≥ 25% of sessions
- Time to first result ≤ 10 seconds median
- User satisfaction (1-5) average ≥ 4.2

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import the project to Vercel
3. Add environment variable: `NEXT_PUBLIC_CONVEX_URL` (from your `.env.local`)
4. Deploy!

### Deploy Convex

```bash
npx convex deploy
```

This will give you a production Convex URL. Update your Vercel environment variables accordingly.

## 🔐 Privacy & Data

- User IDs are generated client-side and stored in localStorage
- No personal information is collected
- Preference memory can be disabled anytime
- One-tap preference clearing available
- Location is only requested on first search and used per-session

## 🛣️ Roadmap (Post-MVP)

- Real-time table booking with availability
- Arabic language UI toggle
- Multi-city expansion beyond Dubai
- Social features (shared itineraries)
- Advanced dietary filters
- Real weather API integration
- Owner dashboard for venue updates

## 📝 License

Proprietary - Where2 Dubai MVP

## 🙋‍♂️ Support

For issues or questions about the codebase, please refer to the functional specification document or contact the development team.

---

**Built with Convex** — The only backend service used in this MVP, as per the specification.
