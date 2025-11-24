# **Mouoj (Waves) — Dubai City Guide — MVP Scope Document**

## **1. Overview**
Mouoj (Waves) — Dubai City Guide is an AI-powered city discovery application designed to reduce decision fatigue by helping users find the perfect venues in Dubai based on natural-language input. The MVP focuses on delivering fast, accurate recommendations using AI parsing, intelligent filtering, and a dual-interface experience (Search Mode + Chat Mode).

This scope document defines the boundaries, objectives, features, deliverables, constraints, and acceptance criteria for the Minimum Viable Product.

---

## **2. MVP Objectives**

### **Primary Goals**
1. Allow users to find relevant Dubai venues using natural-language queries.
2. Provide accurate, fast, and context-aware search results.
3. Offer two complementary modes of interaction: traditional AI-enhanced search and conversational chat.
4. Establish the backend infrastructure (Convex + AI integration) needed for future scalability.
5. Ship a polished, mobile-friendly UI suitable for public testing.

### **Secondary Goals (If Time Permits)**
- Lightweight preference memory.
- "Best Match" highlighting.
- Metro proximity metadata.

---

## **3. User Personas**

### **1. Residents**
People living in Dubai seeking suggestions for dining, cafés, workspaces, or outings.

### **2. Tourists**
Visitors looking for curated, high-quality venue recommendations with minimal effort.

### **3. Busy Professionals**
Users who want fast, relevant recommendations ("quiet place for meetings", "coffee near Metro" etc.).

---

## **4. Core MVP Features**

### **A. AI-Powered Parsing & Search (Core MVP)**
- Natural-language query interpretation using GPT-4o.
- Structured filter generation (tags, cuisine, price, area, noise, outdoor/indoor).
- Context awareness for time-based queries ("tonight", "breakfast").
- AI confidence scoring.
- Clarifying question generation for low-confidence queries.
- Zod schema validation for guaranteed structured output.

### **B. Search & Ranking Algorithm**
- Filtering based on parsed attributes.
- Baseline ranking using rating + relevance.
- Opening-hours awareness.
- Basic location/area matching.
- Return 5–10 venues per query.

### **C. Dual Interaction Modes**

#### **1. Search Mode (Primary)**
- Search bar with text + voice input.
- AI toggle (on/off).
- Filter chips applied automatically.
- Results list layout.
- Venue detail page.

#### **2. Chat Mode (Conversational)**
- Multi-turn conversational interface.
- Chat memory for last 10–20 messages.
- Inline results within chat.
- Quick replies for refinement.

### **D. Venue Detail Pages**
- Cover image + gallery.
- Basic metadata: price, tags, area, noise.
- Contact actions (call, navigate).
- "Open Now" indicator.

### **E. Voice Search**
- Web Speech API integration.
- Automatic fallback to text if unavailable.

### **F. Database and Backend**
- Convex functions:
  - `ai.parseQuery`
  - `places.searchPlaces`
  - `conversations.addMessage`
- Collections:
  - `places`
  - `conversations`
  - `searchHistory`
- Seeder for 150–300 places.

---

## **5. Out-of-Scope (Post-MVP)**
- Full Arabic user interface.
- Advanced preference learning.
- Real weather API integration.
- Live table booking/inventory.
- Distance-based real-time scoring.
- Owner dashboard.
- Social sharing itineraries.
- Deep dietary filtering.
- Multi-city expansion.
- Metro walking-time calculation.

These will be future feature phases.

---

## **6. System Architecture (MVP)**
- **Frontend**: Next.js 14, React 18, TypeScript.
- **Backend**: Convex serverless backend.
- **AI Layer**: OpenRouter API (GPT-4o for parsing, GPT-4o-mini for chat).
- **Data Storage**: Convex collections.
- **Voice**: Web Speech Recognition API.

---

## **7. Functional Requirements**

### **AI Parsing**
- Parse user queries into structured filters.
- Return confidence score.
- Trigger clarifying question when ambiguity is high.

### **Search Execution**
- Accept parsed filters.
- Match against venue dataset.
- Rank results.
- Return 5–10 items.

### **Chat Mode**
- Persist conversation state.
- Accept user and AI messages.
- Trigger search from conversation.

### **Search Mode**
- Display search bar.
- Display results with filters applied.
- Support manual search with AI off.

### **Venue Details**
- Show metadata and gallery.
- Support call, map navigation.

### **Logging**
- Store searchHistory entries minimally.
- Track last 20 messages per conversation.

---

## **8. Non-Functional Requirements**
- **Performance**: Results under 10 seconds median.
- **Accuracy**: 80%+ useful parsing accuracy.
- **Responsiveness**: 100% mobile friendly.
- **Reliability**: Convex uptime and retry mechanisms.
- **AI Cost Control**:
  - GPT-4o for parsing only.
  - GPT-4o-mini for conversation.
  - Rate-limit 50 queries/hour per user.

---

## **9. MVP Deliverables**
1. Fully functional Next.js web application.
2. Convex backend deployed to production.
3. AI parsing pipeline integrated.
4. Search mode with results & details.
5. Chat mode with multi-turn support.
6. Seeded Dubai venue dataset.
7. Deployments on Vercel + Convex Cloud.
8. Technical documentation:
   - Setup guide
   - API usage
   - Deployment steps
   - Testing checklist

---

## **10. Testing Plan**

### **Test Scenarios**
1. "Family-friendly cafe near Metro" → Filters + valid results.
2. "Waterfront dinner tonight" → Open-now + waterfront.
3. "Affordable breakfast indoor Marina" → Indoor + price.
4. Empty or vague queries → Clarifying questions.
5. Chat flow: vague → refine → results.
6. Voice search recognition.
7. No results → Retry suggestions.

---

## **11. Acceptance Criteria**
- User submits natural text query and receives accurate results.
- At least 80% parsing accuracy during testing.
- Chat mode handles multi-step clarification.
- All venue cards have working action buttons.
- Mobile layout renders correctly on iOS and Android.
- Loading and error states present.
- Deployment accessible via public domain.

---

## **12. Timeline (4 Weeks)**

### **Week 1**
- Set up architecture
- Build search mode UI
- Seed database

### **Week 2**
- AI parsing integration
- Filter chips

### **Week 3**
- Chat mode
- Multi-turn support

### **Week 4**
- Voice search
- Polish, QA, deployment

---

## **13. Risks & Mitigations**
- **AI misinterpretation** → Add clarifying question mechanism.
- **Sparse data** → Seed with manually curated 150–300 venues.
- **Costs** → Use GPT-4o-mini for chat, limit GPT-4o usage.
- **User confusion** → Clear toggle between search/chat modes.

---

## **14. Post-MVP Enhancements**

### **A. Social Media Video Review Integration**
Mouoj will include a powerful social-layer that enhances venue discovery with real social sentiment and video-based insights.

#### **1. Data Sources**
- YouTube (Shorts + long-form reviews)
- TikTok
- Instagram Reels

#### **2. Capabilities**
- Fetch and aggregate video reviews per location (restaurants, cafés, attractions).
- Automatic transcription (via platform captions or ASR).
- LLM-powered extraction of:
  - Sentiment (1–5)
  - Common themes (e.g., great view, crowded, loud music, kid-friendly)
  - Vibe descriptors (romantic, lively, luxury, budget)
  - Pros/cons summary
- Compute a **Social Buzz Score** based on:
  - Recency of videos
  - Sentiment
  - Engagement metrics

#### **3. Data Model Additions**
- `socialVideos` collection storing video metadata + summaries.
- `socialAggregates` storing per-place sentiment & buzz insights.

#### **4. UI Enhancements**
- "From Social Media" section on place detail pages with thumbnails.
- Social Summary box:
  - Strong points
  - Weak points
  - Trending status
- Badges on result cards:
  - "Trending on Social"
  - "Popular in TikTok Reviews"

#### **5. Ranking Improvements**
- Social Buzz Score becomes a secondary signal in “Best Match”.
- Recent, highly positive venues appear higher.

#### **6. Chat Mode Integration**
AI responds with:
> "People on TikTok love the views but mention long wait times on weekends."

#### **7. Phased Rollout**
- **Phase 1:** YouTube only, no transcription.
- **Phase 2:** Add transcription + LLM summaries.
- **Phase 3:** Add TikTok/Instagram + full enrichment.

---

## **15. Conclusion**
This updated MVP scope ensures Mouoj launches with a powerful, fast, and intuitive discovery experience, while also laying the foundation for advanced social-driven insights that differentiate it from every other Dubai guide. Future phases introduce a unique social intelligence layer that surfaces real-world sentiment and vibe directly from video content, elevating the platform into a next-generation city discovery tool.**
This MVP scope delivers a focused, powerful, and user-friendly discovery tool for Dubai venues using AI. It ensures a polished and testable version of the product that validates the core concept before scaling into weather integration, booking flows, preference learning, and broader geographic coverage.

