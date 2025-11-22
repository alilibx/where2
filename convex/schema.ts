import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Places (venues) in Dubai
  places: defineTable({
    name: v.string(),
    nameAr: v.optional(v.string()), // Arabic name for bilingual support
    coverImage: v.string(),
    gallery: v.array(v.string()),

    // Location
    latitude: v.number(),
    longitude: v.number(),
    area: v.string(), // e.g., "Marina", "Downtown", "Business Bay"

    // Metro information
    nearMetro: v.boolean(),
    metroStation: v.optional(v.string()),
    metroWalkTime: v.optional(v.number()), // in minutes

    // Core attributes
    tags: v.array(v.string()), // family-friendly, kid-friendly, outdoor, indoor, waterfront, etc.
    cuisine: v.array(v.string()),
    priceLevel: v.string(), // "Low", "Mid", "High", "Lux"
    rating: v.number(), // 0-5
    noise: v.optional(v.string()), // "Quiet", "Moderate", "Lively"

    // Operational details
    openingHours: v.object({
      monday: v.string(),
      tuesday: v.string(),
      wednesday: v.string(),
      thursday: v.string(),
      friday: v.string(),
      saturday: v.string(),
      sunday: v.string(),
    }),

    // Contact & booking
    phone: v.optional(v.string()),
    bookingUrl: v.optional(v.string()),
    website: v.optional(v.string()),

    // Details
    highlights: v.string(), // Short "why this place" summary
    parkingNote: v.optional(v.string()),
    seatingTypes: v.optional(v.array(v.string())), // high-chair, sofa, outdoor, etc.

    // Metadata
    category: v.string(), // cafe, restaurant, etc.
    verified: v.boolean(),
    lastUpdated: v.number(), // timestamp

    // Vector search (semantic search)
    embedding: v.optional(v.array(v.float64())), // 1536 dimensions (OpenAI text-embedding-3-small)
    embeddingModel: v.optional(v.string()), // e.g., "text-embedding-3-small"
    lastEmbedded: v.optional(v.number()), // timestamp of last embedding generation
  })
  .index("by_area", ["area"])
  .index("by_category", ["category"])
  .index("by_rating", ["rating"])
  .index("by_near_metro", ["nearMetro"])
  .vectorIndex("by_semantic_search", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["category", "priceLevel", "area", "nearMetro"],
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
});
