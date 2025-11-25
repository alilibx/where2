import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Hybrid search combining filter-based and semantic search
 * Runs both in parallel for fastest results
 */
export const hybridSearch = action({
  args: {
    query: v.string(),
    userId: v.optional(v.string()),
    userLat: v.optional(v.number()),
    userLon: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    places: any[];
    bestMatch: any;
    totalCount: number;
    searchType: string;
    parseResult: any;
    latencyMs: number;
  }> => {
    const startTime = Date.now();

    // Run LLM parsing and semantic search in parallel
    const [parseResult, semanticResult]: [any, any] = await Promise.all([
      ctx.runAction(api.ai.parseSearchQuery, { query: args.query }),
      ctx.runAction(api.semanticSearch.semanticSearch, {
        query: args.query,
        userLat: args.userLat,
        userLon: args.userLon,
        limit: 20,
      }),
    ]);

    // Extract filters from LLM parsing
    const filters = parseResult.success ? parseResult.result.filters : {};

    // Run filter-based search with extracted filters
    const filterResult: any = await ctx.runQuery(api.places.searchPlaces, {
      ...filters,
      category: filters.category === "any" ? undefined : filters.category,
      userLat: args.userLat,
      userLon: args.userLon,
      userId: args.userId,
    });

    // Merge results: prioritize semantic matches, add filter-only matches
    const semanticIds = new Set(semanticResult.places.map((p: any) => p._id));
    const mergedPlaces: any[] = [...semanticResult.places];

    // Add filter results not already in semantic results
    for (const place of filterResult.places) {
      if (!semanticIds.has(place._id)) {
        mergedPlaces.push({
          ...place,
          semanticScore: 0,
          combinedScore: place.score / 100, // Normalize filter score
        });
      }
    }

    // Re-rank merged results
    // Semantic results get 60% weight, filter results get 40%
    const rankedPlaces: any[] = mergedPlaces
      .map((place: any) => ({
        ...place,
        finalScore: place.combinedScore * 0.6 + (place.score || 0) / 100 * 0.4,
      }))
      .sort((a: any, b: any) => b.finalScore - a.finalScore)
      .slice(0, 10);

    const endTime = Date.now();

    return {
      places: rankedPlaces,
      bestMatch: rankedPlaces[0] || null,
      totalCount: rankedPlaces.length,
      searchType: "hybrid",
      parseResult: parseResult.result,
      latencyMs: endTime - startTime,
    };
  },
});
