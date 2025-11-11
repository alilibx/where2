import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper to check if a place is open at a given time
function isOpenAt(place: Doc<"places">, time: Date): boolean {
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
      places = places.filter(p => isOpenAt(p, now));
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
    openingHours: v.object({
      monday: v.string(),
      tuesday: v.string(),
      wednesday: v.string(),
      thursday: v.string(),
      friday: v.string(),
      saturday: v.string(),
      sunday: v.string(),
    }),
    phone: v.optional(v.string()),
    bookingUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    highlights: v.string(),
    parkingNote: v.optional(v.string()),
    seatingTypes: v.optional(v.array(v.string())),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const placeId = await ctx.db.insert("places", {
      ...args,
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
    const areas = [...new Set(places.map(p => p.area))];
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
