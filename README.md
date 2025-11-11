# Where2 Dubai — AI-Powered City Guide

A hyper-filtered, AI-powered city guide application for Dubai that helps users discover the perfect venue based on their mood, constraints, and context. Features natural language understanding, conversational chat interface, and intelligent search parsing.

## 🎯 Product Vision

Remove decision fatigue by matching a user's intent (mood, constraints, timing, weather) to 5-10 high-quality venue options in Dubai, ready to act on (navigate, call, book, share).

## 🤖 AI-Powered Features

### Natural Language Understanding
- **Structured Output Parsing**: Converts free-form queries into precise search filters using OpenRouter/GPT-4o
- **Intent Recognition**: Understands user intent even from vague descriptions
- **Context Awareness**: Considers time, weather, party size, and implicit preferences
- **Smart Defaults**: Fills in missing information intelligently

### Dual Interface Modes

#### 1. **AI-Enhanced Search Mode**
- Voice and text input with AI parsing
- Automatic filter extraction from natural language
- One-shot search with intelligent matching
- Toggle AI on/off for traditional search

#### 2. **Conversational Chat Mode**
- Full chat interface with conversation history
- Multi-turn conversations with context retention
- Clarifying questions when needed
- Results integrated into chat flow

### Example AI Capabilities
```
User: "I need a quiet place for family dinner by the water tonight"
AI Parses:
- Tags: family-friendly, waterfront
- Noise: Quiet
- OpenNow: true
- Time context: Evening (dinner time)
```

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
- **AI/LLM**: OpenRouter API with GPT-4o (structured outputs)
- **Schema Validation**: Zod with JSON Schema
- **Styling**: Custom CSS with responsive design
- **Icons**: Lucide React
- **Voice**: Web Speech API (Chrome/Safari)

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- A Convex account (free at [convex.dev](https://convex.dev))
- An OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))

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

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Convex URL (auto-generated when you run convex dev)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# OpenRouter API Key (get from https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# App URL (for OpenRouter referer header)
APP_URL=http://localhost:3000
```

### 4. Set up Convex

```bash
# Login to Convex and start dev server
npx convex dev

# Follow the prompts to create a new project or link to an existing one
```

This will:
- Create a new Convex project (or link to existing)
- Automatically update `.env.local` with your `NEXT_PUBLIC_CONVEX_URL`
- Start the Convex development server
- Deploy your schema and functions

**Important**: Make sure to add your `OPENROUTER_API_KEY` to the Convex environment variables as well:
```bash
npx convex env set OPENROUTER_API_KEY sk-or-v1-your-key-here
```

### 5. Seed the database with sample data

In a new terminal, while `npx convex dev` is running:

```bash
# Run the seed mutation
npx convex run seedData:seedPlaces
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Using the App

The app has two modes:

**Search Mode (Default)**:
- Toggle AI parsing ON/OFF in the header
- With AI ON: Natural language queries are parsed intelligently
- With AI OFF: Traditional search with manual filters

**Chat Mode**:
- Click the "Chat" button in the header
- Have a conversation to find venues
- AI asks clarifying questions when needed
- Results appear below the chat

## 📁 Project Structure

```
alilibx/
├── app/                          # Next.js app directory
│   ├── components/              # React components
│   │   ├── SearchBar.tsx       # Traditional voice & text search
│   │   ├── AISearchBar.tsx     # AI-powered search with parsing
│   │   ├── ChatInterface.tsx   # Full chat mode UI
│   │   ├── FilterChips.tsx     # Filter selection UI
│   │   ├── ResultsList.tsx     # Search results display
│   │   ├── PlaceCard.tsx       # Venue card component
│   │   └── PreferenceToggle.tsx # User preferences UI
│   ├── place/[id]/             # Dynamic venue detail pages
│   │   └── page.tsx
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (with mode toggle)
│   ├── globals.css             # Global styles
│   └── ConvexClientProvider.tsx
├── convex/                      # Convex backend
│   ├── schema.ts               # Database schema (places, prefs, conversations)
│   ├── places.ts               # Place queries & mutations
│   ├── preferences.ts          # User preference functions
│   ├── conversations.ts        # Chat conversation management
│   ├── ai.ts                   # OpenRouter AI integration
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

### Conversations
- User ID
- Message history (role, content, timestamp)
- Current filters from AI parsing
- Last message timestamp

## 🎨 Key Features Implementation

### AI-Powered Query Parsing
Uses OpenRouter's GPT-4o with structured outputs (JSON Schema mode) to achieve 100% compliance in parsing natural language to filters. Features:
- Structured output with strict JSON schema validation
- Intent extraction and confidence scoring
- Clarifying question generation
- Context-aware parsing (time, weather, location)

### Conversational Chat
Full multi-turn conversation support with:
- Message history (last 20 messages retained)
- Context carryover between messages
- Search triggering from chat
- Results displayed inline

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

## 🔑 API Costs & Usage

### OpenRouter Pricing
The app uses:
- **GPT-4o (2024-08-06)**: $2.50/M input tokens, $10/M output tokens
  - Used for: Structured query parsing
  - Average cost per query: ~$0.001-0.003

- **GPT-4o-mini**: $0.15/M input tokens, $0.60/M output tokens
  - Used for: Chat responses, conversational generation
  - Average cost per message: ~$0.0001-0.0003

**Budget-friendly alternatives** (can be configured in `convex/ai.ts`):
- **Llama 3.1 70B**: $0.35/M tokens (both ways) - Good for chat
- **Mistral 7B**: $0.06/M tokens - Very economical
- **Gemini Flash 2.0**: Free tier available

### Rate Limiting Recommendations
For production:
- Implement rate limiting per user (e.g., 50 queries/hour)
- Cache common queries
- Use cheaper models for simple clarifications
- Monitor usage via OpenRouter dashboard

## 🧪 Testing the AI Features

### Test Queries for AI Parsing
```bash
# High confidence (should trigger immediate search)
"Outdoor family cafe near Business Bay Metro, mid price, open now"
"Waterfront dinner tonight, quiet atmosphere"
"Affordable breakfast in Marina"

# Medium confidence (may ask clarifying questions)
"Something nice for a date"
"Kid-friendly place"
"Food near me"

# Complex queries
"I want to take my family of 5 including 2 kids to a place with outdoor seating, not too expensive, preferably near a Metro station, and it should be open for lunch"
```

### Chat Mode Testing
```bash
# Start vague, refine through conversation
User: "I'm hungry"
AI: "I can help! What kind of food are you in the mood for? Any preferences on location or budget?"
User: "Something with a view"
AI: "Great! Would you prefer waterfront dining or city views? And what's your budget?"
User: "Waterfront, mid price"
AI: [Triggers search with waterfront + mid price filters]
```

## 📝 License

Proprietary - Where2 Dubai

## 🙋‍♂️ Support

For issues or questions about the codebase, please refer to the functional specification document or contact the development team.

---

**Built with Convex & OpenRouter** — Serverless backend with AI-powered natural language understanding.
