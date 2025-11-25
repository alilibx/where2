import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Helper to check if a place is open at a given time
// Returns null if opening hours are not available (e.g., Google-sourced venues without stored hours)
function isOpenAt(place: Doc<"places">, time: Date): boolean | null {
  // If no opening hours stored, return null (fetch from Google in real-time)
  if (!place.openingHours) {
    return null;
  }

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = days[time.getDay()] as keyof typeof place.openingHours;
  const hours = place.openingHours[dayName];

  if (hours === "Closed" || hours === "closed") return false;
  if (hours === "24/7") return true;

  // Parse hours like "8:00-22:00" or "8:00-14:00, 17:00-23:00"
  const currentHour = time.getHours();
  const currentMinute = time.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const ranges = hours.split(",").map(r => r.trim());
  for (const range of ranges) {
    const [start, end] = range.split("-");
    if (!start || !end) continue;

    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime >= startTime && currentTime <= endTime) {
      return true;
    }
  }

  return false;
}

// Calculate distance between two coordinates (simplified)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get current weather context (simplified - in production would use real weather API)
function getWeatherContext(month: number): { temp: string; outdoor: boolean } {
  // Dubai is pleasant outdoors Oct-Mar (months 10,11,12,1,2,3)
  const isPleasant = month >= 10 || month <= 3;
  return {
    temp: isPleasant ? "pleasant" : "hot",
    outdoor: isPleasant,
  };
}

// Search places with filters and context
export const searchPlaces = query({
  args: {
    query: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priceLevel: v.optional(v.string()),
    area: v.optional(v.string()),
    nearMetro: v.optional(v.boolean()),
    minRating: v.optional(v.number()),
    cuisine: v.optional(v.array(v.string())),
    noise: v.optional(v.string()),
    openNow: v.optional(v.boolean()),
    userLat: v.optional(v.number()),
    userLon: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let places = await ctx.db.query("places").collect();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const weather = getWeatherContext(currentMonth);

    // Apply filters
    if (args.category) {
      places = places.filter(p => p.category.toLowerCase() === args.category!.toLowerCase());
    }

    if (args.tags && args.tags.length > 0) {
      places = places.filter(p =>
        args.tags!.some(tag => p.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()))
      );
    }

    if (args.priceLevel) {
      places = places.filter(p => p.priceLevel === args.priceLevel);
    }

    if (args.area) {
      places = places.filter(p => p.area.toLowerCase() === args.area!.toLowerCase());
    }

    if (args.nearMetro === true) {
      places = places.filter(p => p.nearMetro);
    }

    if (args.minRating !== undefined) {
      places = places.filter(p => p.rating >= args.minRating!);
    }

    if (args.cuisine && args.cuisine.length > 0) {
      places = places.filter(p =>
        args.cuisine!.some(c => p.cuisine.map(pc => pc.toLowerCase()).includes(c.toLowerCase()))
      );
    }

    if (args.noise) {
      places = places.filter(p => p.noise === args.noise);
    }

    if (args.openNow) {
      places = places.filter(p => {
        const open = isOpenAt(p, now);
        return open === true; // Only include confirmed open places, skip unknowns (null)
      });
    }

    // Get user preferences if userId provided
    let userPrefs = null;
    if (args.userId) {
      userPrefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", q => q.eq("userId", args.userId!))
        .first();
    }

    // Calculate scores and add metadata
    const scoredPlaces = places.map(place => {
      let score = 0;
      const reasons: string[] = [];

      // Base score from rating
      score += place.rating * 20;

      // Distance bonus (if user location provided)
      let distance = 0;
      if (args.userLat !== undefined && args.userLon !== undefined) {
        distance = calculateDistance(args.userLat, args.userLon, place.latitude, place.longitude);
        if (distance < 2) {
          score += 30;
          reasons.push("Nearby");
        } else if (distance < 5) {
          score += 15;
        }
      }

      // Open now bonus
      const isOpen = isOpenAt(place, now);
      if (isOpen && args.openNow) {
        score += 25;
        reasons.push("Open now");
      }

      // Weather context bonus
      if (weather.outdoor && place.tags.includes("outdoor")) {
        score += 20;
        reasons.push("Outdoor");
      } else if (!weather.outdoor && place.tags.includes("indoor")) {
        score += 15;
        reasons.push("Indoor");
      }

      // Near Metro bonus
      if (place.nearMetro) {
        if (args.nearMetro) {
          score += 20;
          reasons.push(`Near ${place.metroStation} Metro`);
        } else {
          score += 5;
        }
      }

      // User preference bonus
      if (userPrefs && userPrefs.memoryEnabled) {
        const matchedTags = userPrefs.preferredTags.filter(pt =>
          place.tags.includes(pt.tag)
        );
        matchedTags.forEach(mt => {
          score += Math.min(mt.count * 2, 20);
        });

        if (userPrefs.preferredPriceLevel === place.priceLevel) {
          score += 10;
        }
      }

      // Add matched filter tags to reasons
      if (args.tags) {
        args.tags.forEach(tag => {
          if (place.tags.includes(tag)) {
            const formatted = tag.charAt(0).toUpperCase() + tag.slice(1);
            if (!reasons.includes(formatted)) {
              reasons.push(formatted);
            }
          }
        });
      }

      // Add price level to reasons
      reasons.push(`${place.priceLevel} price`);

      return {
        ...place,
        score,
        distance,
        isOpen,
        reasons: reasons.join(" • "),
      };
    });

    // Sort by score
    scoredPlaces.sort((a, b) => b.score - a.score);

    // Determine best match (if top result has significantly higher score)
    let bestMatch = null;
    if (scoredPlaces.length > 0 && scoredPlaces[0].score > (scoredPlaces[1]?.score || 0) + 15) {
      bestMatch = scoredPlaces[0];
    }

    return {
      places: scoredPlaces.slice(0, 10), // Top 10 results
      bestMatch,
      totalCount: scoredPlaces.length,
      weatherContext: weather,
    };
  },
});

// Get a single place by ID
export const getPlace = query({
  args: { placeId: v.id("places") },
  handler: async (ctx, args) => {
    const place = await ctx.db.get(args.placeId);

    if (!place) return null;

    const now = new Date();
    const isOpen = isOpenAt(place, now);

    return {
      ...place,
      isOpen,
    };
  },
});

// Alias for semantic search compatibility
export const getPlaceById = getPlace;

// Add a new place (for admin/owner use)
export const addPlace = mutation({
  args: {
    name: v.string(),
    nameAr: v.optional(v.string()),
    coverImage: v.string(),
    gallery: v.array(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    area: v.string(),
    nearMetro: v.boolean(),
    metroStation: v.optional(v.string()),
    metroWalkTime: v.optional(v.number()),
    tags: v.array(v.string()),
    cuisine: v.array(v.string()),
    priceLevel: v.string(),
    rating: v.number(),
    noise: v.optional(v.string()),
    openingHours: v.optional(v.object({
      monday: v.string(),
      tuesday: v.string(),
      wednesday: v.string(),
      thursday: v.string(),
      friday: v.string(),
      saturday: v.string(),
      sunday: v.string(),
    })),
    phone: v.optional(v.string()),
    bookingUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    highlights: v.string(),
    parkingNote: v.optional(v.string()),
    seatingTypes: v.optional(v.array(v.string())),
    category: v.string(),
    googlePlaceId: v.optional(v.string()),
    dataSource: v.optional(v.string()), // "manual", "google", "hybrid"
  },
  handler: async (ctx, args) => {
    const placeId = await ctx.db.insert("places", {
      ...args,
      dataSource: args.dataSource || "manual", // Default to manual if not specified
      verified: false,
      lastUpdated: Date.now(),
    });
    return placeId;
  },
});

// Get all unique areas
export const getAreas = query({
  args: {},
  handler: async (ctx) => {
    const places = await ctx.db.query("places").collect();
    const areas = Array.from(new Set(places.map(p => p.area)));
    return areas.sort();
  },
});

// Get all unique cuisines
export const getCuisines = query({
  args: {},
  handler: async (ctx) => {
    const places = await ctx.db.query("places").collect();
    const cuisines = new Set<string>();
    places.forEach(p => p.cuisine.forEach(c => cuisines.add(c)));
    return Array.from(cuisines).sort();
  },
});

// ============================================================================
// Google Places Integration Helper Functions
// ============================================================================

/**
 * Get a place by Google Place ID
 * Used to check if a place_id already exists in database
 */
export const getPlaceByGoogleId = query({
  args: { googlePlaceId: v.string() },
  handler: async (ctx, args) => {
    const place = await ctx.db
      .query("places")
      .withIndex("by_google_place_id", (q) => q.eq("googlePlaceId", args.googlePlaceId))
      .first();
    return place;
  },
});

/**
 * Create a minimal venue placeholder from Google discovery
 * Only stores place_id + reference data (ToS compliant)
 * Custom enrichment (tags, metro info, etc.) added later via admin interface
 */
export const createPlaceholder = mutation({
  args: {
    googlePlaceId: v.string(),
    name: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    category: v.string(),
    dataSource: v.string(), // "manual", "google", "hybrid"
  },
  handler: async (ctx, args) => {
    // Create minimal placeholder
    const placeId = await ctx.db.insert("places", {
      googlePlaceId: args.googlePlaceId,
      dataSource: args.dataSource,
      lastGoogleSync: Date.now(),
      name: args.name,
      latitude: args.latitude,
      longitude: args.longitude,
      area: "Unknown", // To be enriched manually
      category: args.category,
      coverImage: "", // To be enriched
      gallery: [],
      tags: [], // CUSTOM - to be enriched
      cuisine: [], // To be enriched
      priceLevel: "Mid", // Default, to be enriched
      rating: 0, // Will be fetched live from Google
      nearMetro: false, // CUSTOM - to be enriched
      highlights: "", // CUSTOM - to be enriched
      verified: false,
      lastUpdated: Date.now(),
      enrichmentComplete: false,
    });
    return placeId;
  },
});

/**
 * Update Google Place ID for a venue (refresh annually)
 */
export const updatePlaceGoogleId = internalMutation({
  args: {
    placeId: v.id("places"),
    googlePlaceId: v.string(),
    lastGoogleSync: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.placeId, {
      googlePlaceId: args.googlePlaceId,
      lastGoogleSync: args.lastGoogleSync,
    });
  },
});

/**
 * Update venue enrichment data (custom tags, metro info, etc.)
 * Used by admin interface to add custom value-add data
 */
export const updatePlaceEnrichment = mutation({
  args: {
    placeId: v.id("places"),
    tags: v.optional(v.array(v.string())),
    noise: v.optional(v.string()),
    nearMetro: v.optional(v.boolean()),
    metroStation: v.optional(v.string()),
    metroWalkTime: v.optional(v.number()),
    area: v.optional(v.string()),
    cuisine: v.optional(v.array(v.string())),
    priceLevel: v.optional(v.string()),
    highlights: v.optional(v.string()),
    parkingNote: v.optional(v.string()),
    seatingTypes: v.optional(v.array(v.string())),
    coverImage: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { placeId, ...updates } = args;

    // Filter out undefined values
    const validUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(placeId, {
      ...validUpdates,
      enrichmentComplete: true,
      lastUpdated: Date.now(),
    } as any);
  },
});

/**
 * Get unenriched venues (for admin enrichment interface)
 */
export const getUnenrichedPlaces = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const places = await ctx.db
      .query("places")
      .withIndex("by_enrichment_status", (q) => q.eq("enrichmentComplete", false))
      .take(limit);

    return places;
  },
});

/**
 * Get places that need Google Place ID refresh (older than 12 months)
 */
export const getPlacesNeedingRefresh = query({
  args: {},
  handler: async (ctx) => {
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

    const places = await ctx.db.query("places").collect();

    const needsRefresh = places.filter(
      (p) =>
        p.googlePlaceId &&
        (!p.lastGoogleSync || p.lastGoogleSync < oneYearAgo)
    );

    return needsRefresh;
  },
});

/**
 * Get places with Google Place ID for batch sync
 */
export const getPlacesWithGoogleId = query({
  args: {
    limit: v.optional(v.number()),
    skipSynced: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const skipSynced = args.skipSynced ?? false;

    // Get all places with googlePlaceId
    const places = await ctx.db.query("places").collect();

    let filtered = places.filter((p) => p.googlePlaceId);

    // Optionally skip already synced places (have googlePhotos or googleSummary)
    if (skipSynced) {
      filtered = filtered.filter(
        (p) => !p.googlePhotos || p.googlePhotos.length === 0
      );
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Update place with full Google data from sync
 */
export const updatePlaceFromGoogle = mutation({
  args: {
    placeId: v.id("places"),
    // Basic info
    rating: v.optional(v.number()),
    userRatingCount: v.optional(v.number()),
    // Contact
    phone: v.optional(v.union(v.string(), v.null())),
    website: v.optional(v.union(v.string(), v.null())),
    // Price
    priceLevel: v.optional(v.string()),
    // Cuisine
    cuisine: v.optional(v.array(v.string())),
    // Photos
    googlePhotos: v.optional(v.array(v.string())),
    // Google AI summary
    googleSummary: v.optional(v.union(v.string(), v.null())),
    // Raw Google types
    googleTypes: v.optional(v.array(v.string())),
    // Restaurant attributes
    outdoorSeating: v.optional(v.union(v.boolean(), v.null())),
    goodForGroups: v.optional(v.union(v.boolean(), v.null())),
    goodForChildren: v.optional(v.union(v.boolean(), v.null())),
    liveMusic: v.optional(v.union(v.boolean(), v.null())),
    reservable: v.optional(v.union(v.boolean(), v.null())),
    // Service options
    dineIn: v.optional(v.union(v.boolean(), v.null())),
    takeout: v.optional(v.union(v.boolean(), v.null())),
    delivery: v.optional(v.union(v.boolean(), v.null())),
    // Menu offerings
    servesBreakfast: v.optional(v.union(v.boolean(), v.null())),
    servesBrunch: v.optional(v.union(v.boolean(), v.null())),
    servesLunch: v.optional(v.union(v.boolean(), v.null())),
    servesDinner: v.optional(v.union(v.boolean(), v.null())),
    servesBeer: v.optional(v.union(v.boolean(), v.null())),
    servesWine: v.optional(v.union(v.boolean(), v.null())),
    servesCocktails: v.optional(v.union(v.boolean(), v.null())),
    servesVegetarianFood: v.optional(v.union(v.boolean(), v.null())),
    // Sync timestamp
    lastGoogleSync: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { placeId, ...updates } = args;

    // Get current place to merge cuisines
    const place = await ctx.db.get(placeId);
    if (!place) {
      throw new Error("Place not found");
    }

    // Build update object, filtering out undefined values
    const validUpdates: Record<string, any> = {};

    // Handle simple fields
    if (updates.rating !== undefined) validUpdates.rating = updates.rating;
    if (updates.userRatingCount !== undefined) validUpdates.userRatingCount = updates.userRatingCount;
    if (updates.phone !== undefined && updates.phone !== null) validUpdates.phone = updates.phone;
    if (updates.website !== undefined && updates.website !== null) validUpdates.website = updates.website;
    if (updates.priceLevel !== undefined) validUpdates.priceLevel = updates.priceLevel;
    if (updates.googlePhotos !== undefined) validUpdates.googlePhotos = updates.googlePhotos;
    if (updates.googleSummary !== undefined && updates.googleSummary !== null) validUpdates.googleSummary = updates.googleSummary;
    if (updates.googleTypes !== undefined) validUpdates.googleTypes = updates.googleTypes;
    if (updates.lastGoogleSync !== undefined) validUpdates.lastGoogleSync = updates.lastGoogleSync;

    // Merge cuisines (keep existing, add new from Google)
    if (updates.cuisine && updates.cuisine.length > 0) {
      const existingCuisines = place.cuisine || [];
      const allCuisines = Array.from(new Set([...existingCuisines, ...updates.cuisine]));
      validUpdates.cuisine = allCuisines;
    }

    // Handle boolean fields (only set if not null)
    const booleanFields = [
      'outdoorSeating', 'goodForGroups', 'goodForChildren', 'liveMusic', 'reservable',
      'dineIn', 'takeout', 'delivery',
      'servesBreakfast', 'servesBrunch', 'servesLunch', 'servesDinner',
      'servesBeer', 'servesWine', 'servesCocktails', 'servesVegetarianFood',
    ] as const;

    for (const field of booleanFields) {
      const value = updates[field];
      if (value !== undefined && value !== null) {
        validUpdates[field] = value;
      }
    }

    // Apply updates
    validUpdates.lastUpdated = Date.now();

    await ctx.db.patch(placeId, validUpdates);

    return { success: true, updated: Object.keys(validUpdates) };
  },
});
