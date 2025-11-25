import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Places (venues) in Dubai
  places: defineTable({
    // Google Places Integration (ToS Compliant - only place_id stored permanently)
    googlePlaceId: v.optional(v.string()), // Google's unique identifier (can store indefinitely per ToS)
    dataSource: v.optional(v.string()), // "manual", "google", "hybrid" - tracks data origin
    lastGoogleSync: v.optional(v.number()), // Last time place_id was refreshed

    name: v.string(),
    nameAr: v.optional(v.string()), // Arabic name for bilingual support
    coverImage: v.string(),
    gallery: v.array(v.string()),

    // Location (reference data - coordinates updated from Google as needed)
    latitude: v.number(),
    longitude: v.number(),
    area: v.string(), // e.g., "Marina", "Downtown", "Business Bay"

    // Metro information (CUSTOM - not from Google, our unique value-add)
    nearMetro: v.boolean(),
    metroStation: v.optional(v.string()),
    metroWalkTime: v.optional(v.number()), // in minutes

    // Core attributes (CUSTOM - our enrichment, not Google data)
    tags: v.array(v.string()), // family-friendly, kid-friendly, outdoor, indoor, waterfront, etc.
    cuisine: v.array(v.string()),
    priceLevel: v.string(), // "Low", "Mid", "High", "Lux" (more granular than Google's 4 levels)
    rating: v.number(), // 0-5 (cached from Google, updated on sync)
    noise: v.optional(v.string()), // "Quiet", "Moderate", "Lively" (CUSTOM attribute)

    // Operational details (OPTIONAL - for backward compatibility with seed data)
    // NOTE: For Google-sourced venues, hours/phone/website are fetched live (ToS compliant)
    // For manually-added venues, these can be stored directly
    // New Google venues will fetch this data in real-time
    openingHours: v.optional(v.object({
      monday: v.string(),
      tuesday: v.string(),
      wednesday: v.string(),
      thursday: v.string(),
      friday: v.string(),
      saturday: v.string(),
      sunday: v.string(),
    })),

    // Contact & booking (OPTIONAL - for backward compatibility)
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    bookingUrl: v.optional(v.string()), // Custom booking integration (not from Google)

    // Details (CUSTOM enrichment)
    highlights: v.string(), // Curated "why this place" summary (our content, not Google's)
    parkingNote: v.optional(v.string()),
    seatingTypes: v.optional(v.array(v.string())), // high-chair, sofa, outdoor, etc.

    // Metadata
    category: v.string(), // cafe, restaurant, etc.
    verified: v.boolean(), // Manual verification flag
    lastUpdated: v.number(), // timestamp
    enrichmentComplete: v.optional(v.boolean()), // Has custom tags been added?

    // Google-sourced data (synced from Places API)
    googlePhotos: v.optional(v.array(v.string())), // Photo URLs from Google
    googleSummary: v.optional(v.string()), // AI-generated summary from Google
    googleTypes: v.optional(v.array(v.string())), // Raw Google place types
    userRatingCount: v.optional(v.number()), // Number of Google reviews

    // Restaurant attributes (from Google Places API)
    outdoorSeating: v.optional(v.boolean()),
    goodForGroups: v.optional(v.boolean()),
    goodForChildren: v.optional(v.boolean()),
    liveMusic: v.optional(v.boolean()),
    reservable: v.optional(v.boolean()),

    // Service options (from Google Places API)
    dineIn: v.optional(v.boolean()),
    takeout: v.optional(v.boolean()),
    delivery: v.optional(v.boolean()),

    // Menu offerings (from Google Places API)
    servesBreakfast: v.optional(v.boolean()),
    servesBrunch: v.optional(v.boolean()),
    servesLunch: v.optional(v.boolean()),
    servesDinner: v.optional(v.boolean()),
    servesBeer: v.optional(v.boolean()),
    servesWine: v.optional(v.boolean()),
    servesCocktails: v.optional(v.boolean()),
    servesVegetarianFood: v.optional(v.boolean()),

    // Vector search (semantic search)
    embedding: v.optional(v.array(v.float64())), // 1536 dimensions (OpenAI text-embedding-3-small)
    embeddingModel: v.optional(v.string()), // e.g., "text-embedding-3-small"
    lastEmbedded: v.optional(v.number()), // timestamp of last embedding generation
  })
  .index("by_area", ["area"])
  .index("by_category", ["category"])
  .index("by_rating", ["rating"])
  .index("by_near_metro", ["nearMetro"])
  .index("by_google_place_id", ["googlePlaceId"])
  .index("by_data_source", ["dataSource"])
  .index("by_enrichment_status", ["enrichmentComplete"])
  .vectorIndex("by_semantic_search", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["category", "priceLevel", "area", "nearMetro", "goodForChildren", "delivery"],
  }),

  // User preferences
  userPreferences: defineTable({
    userId: v.string(),

    // Learned preferences
    preferredTags: v.array(v.object({
      tag: v.string(),
      count: v.number(),
    })),
    preferredPriceLevel: v.optional(v.string()),
    preferredAreas: v.array(v.string()),

    // Settings
    memoryEnabled: v.boolean(),
    language: v.string(), // "en" or "ar"

    // Metadata
    lastActive: v.number(),
  })
  .index("by_user", ["userId"]),

  // Search history for learning
  searchHistory: defineTable({
    userId: v.string(),
    query: v.string(),
    filters: v.object({
      category: v.optional(v.string()),
      tags: v.array(v.string()),
      priceLevel: v.optional(v.string()),
      area: v.optional(v.string()),
      nearMetro: v.optional(v.boolean()),
      minRating: v.optional(v.number()),
      cuisine: v.array(v.string()),
      noise: v.optional(v.string()),
      openNow: v.boolean(),
    }),
    selectedPlaceId: v.optional(v.id("places")),
    timestamp: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_timestamp", ["timestamp"]),

  // Conversations for chat mode
  conversations: defineTable({
    userId: v.string(),
    messages: v.array(
      v.object({
        role: v.string(), // "user" or "assistant"
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    lastMessage: v.number(),
    currentFilters: v.optional(
      v.object({
        category: v.optional(v.string()),
        tags: v.array(v.string()),
        priceLevel: v.optional(v.string()),
        area: v.optional(v.string()),
        nearMetro: v.optional(v.boolean()),
        minRating: v.optional(v.number()),
        cuisine: v.array(v.string()),
        noise: v.optional(v.string()),
        openNow: v.boolean(),
      })
    ),
  })
  .index("by_user", ["userId"])
  .index("by_last_message", ["lastMessage"]),

  // User feedback for venue data quality (crowdsourcing improvements)
  placeFeedback: defineTable({
    placeId: v.id("places"),
    userId: v.string(),
    feedbackType: v.string(), // "incorrect_tags", "wrong_info", "venue_closed", "missing_data", "other"
    description: v.string(), // User's explanation
    status: v.string(), // "pending", "reviewed", "resolved", "dismissed"
    reviewedBy: v.optional(v.string()), // Admin who reviewed
    reviewNotes: v.optional(v.string()),
    timestamp: v.number(),
  })
  .index("by_place", ["placeId"])
  .index("by_status", ["status"])
  .index("by_timestamp", ["timestamp"]),
});
