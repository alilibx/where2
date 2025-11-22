import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Semantic search using vector similarity
 */
export const semanticSearch = action({
  args: {
    query: v.string(),
    filters: v.optional(
      v.object({
        category: v.optional(v.string()),
        priceLevel: v.optional(v.string()),
        area: v.optional(v.string()),
        nearMetro: v.optional(v.boolean()),
        tags: v.optional(v.array(v.string())),
        cuisine: v.optional(v.array(v.string())),
        minRating: v.optional(v.number()),
        openNow: v.optional(v.boolean()),
      })
    ),
    limit: v.optional(v.number()),
    userLat: v.optional(v.number()),
    userLon: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Generate embedding for the query
    const queryEmbeddingResult = await ctx.runAction(api.embeddings.generateQueryEmbedding, {
      query: args.query,
    });

    const queryEmbedding = queryEmbeddingResult.embedding;

    // Build filter expression for vector search
    const filterExpression = (q: any) => {
      const conditions = [];

      if (args.filters?.category) {
        conditions.push(q.eq("category", args.filters.category));
      }
      if (args.filters?.priceLevel) {
        conditions.push(q.eq("priceLevel", args.filters.priceLevel));
      }
      if (args.filters?.area) {
        conditions.push(q.eq("area", args.filters.area));
      }
      if (args.filters?.nearMetro !== undefined) {
        conditions.push(q.eq("nearMetro", args.filters.nearMetro));
      }

      return conditions.length > 0 ? q.and(...conditions) : undefined;
    };

    // Perform vector search
    const vectorResults = await ctx.vectorSearch("places", "by_semantic_search", {
      vector: queryEmbedding,
      limit,
      filter: filterExpression,
    });

    // Enrich results with full place data and scoring
    const enrichedResults = await Promise.all(
      vectorResults.map(async (result) => {
        const place = await ctx.runQuery(api.places.getPlaceById, {
          placeId: result._id,
        });

        if (!place) return null;

        // Calculate distance if user location provided
        let distance = undefined;
        if (args.userLat !== undefined && args.userLon !== undefined) {
          distance = calculateDistance(
            args.userLat,
            args.userLon,
            place.latitude,
            place.longitude
          );
        }

        // Calculate combined score
        const semanticScore = result._score; // Cosine similarity (-1 to 1)
        const distanceScore = distance !== undefined ? 1 / (1 + distance / 10) : 0.5; // Normalize distance
        const ratingScore = place.rating / 5; // Normalize rating

        // Weighted scoring: 60% semantic, 25% distance, 15% rating
        const combinedScore =
          0.6 * ((semanticScore + 1) / 2) + // Convert -1..1 to 0..1
          0.25 * distanceScore +
          0.15 * ratingScore;

        return {
          ...place,
          distance,
          semanticScore,
          combinedScore,
        };
      })
    );

    // Filter out nulls and apply additional filters
    let filteredResults = enrichedResults.filter((r) => r !== null);

    // Apply tag filters (post-filter since tags not in vector index)
    if (args.filters?.tags && args.filters.tags.length > 0) {
      filteredResults = filteredResults.filter((place) =>
        args.filters!.tags!.some((tag) => place.tags.includes(tag))
      );
    }

    // Apply cuisine filters
    if (args.filters?.cuisine && args.filters.cuisine.length > 0) {
      filteredResults = filteredResults.filter((place) =>
        args.filters!.cuisine!.some((cuisine) => place.cuisine.includes(cuisine))
      );
    }

    // Apply minimum rating filter
    if (args.filters?.minRating) {
      filteredResults = filteredResults.filter(
        (place) => place.rating >= args.filters!.minRating!
      );
    }

    // Apply openNow filter if requested
    if (args.filters?.openNow) {
      const now = new Date();
      const dayOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][now.getDay()];
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Dubai",
      });

      filteredResults = filteredResults.filter((place) => {
        const hours = (place.openingHours as any)[dayOfWeek];
        if (!hours || hours === "Closed") return false;

        const [openTime, closeTime] = hours.split("-").map((t: string) => t.trim());
        return currentTime >= openTime && currentTime <= closeTime;
      });
    }

    // Sort by combined score
    filteredResults.sort((a, b) => b.combinedScore - a.combinedScore);

    // Find best match
    const bestMatch = filteredResults.length > 0 ? filteredResults[0] : null;

    return {
      places: filteredResults,
      bestMatch,
      totalCount: filteredResults.length,
      searchType: "semantic",
    };
  },
});

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
