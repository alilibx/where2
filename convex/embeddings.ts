import { action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";

// Initialize OpenAI client configured for OpenRouter
const getOpenAIClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Where2 Dubai",
    },
  });
};

/**
 * Generate embedding text from venue data
 */
function buildEmbeddingText(place: any): string {
  const parts = [
    place.name,
    place.nameAr, // Include Arabic name for bilingual support
    place.highlights,
    `Tags: ${place.tags.join(", ")}`,
    `Cuisine: ${place.cuisine.join(", ")}`,
    `Area: ${place.area}`,
    place.noise ? `Atmosphere: ${place.noise}` : null,
    place.seatingTypes ? `Seating: ${place.seatingTypes.join(", ")}` : null,
  ];

  return parts.filter(Boolean).join(". ");
}

/**
 * Generate embedding for a single place
 */
export const generatePlaceEmbedding = internalAction({
  args: {
    placeId: v.id("places"),
  },
  handler: async (ctx, args) => {
    // Get the place data
    const place = await ctx.runQuery(internal.embeddings.getPlace, {
      placeId: args.placeId,
    });

    if (!place) {
      throw new Error(`Place ${args.placeId} not found`);
    }

    // Build the text to embed
    const embeddingText = buildEmbeddingText(place);

    // Generate embedding using OpenAI
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: "openai/text-embedding-3-small", // Use embedding model, not chat model
      input: embeddingText,
    });

    const embedding = response.data[0].embedding;

    // Store the embedding
    await ctx.runMutation(internal.embeddings.updatePlaceEmbedding, {
      placeId: args.placeId,
      embedding,
      model: "openai/text-embedding-3-small",
    });

    return {
      success: true,
      placeId: args.placeId,
      embeddingLength: embedding.length,
    };
  },
});

/**
 * Internal query to get place data
 */
export const getPlace = internalQuery({
  args: {
    placeId: v.id("places"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.placeId);
  },
});

/**
 * Internal mutation to update place with embedding
 */
export const updatePlaceEmbedding = internalMutation({
  args: {
    placeId: v.id("places"),
    embedding: v.array(v.float64()),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.placeId, {
      embedding: args.embedding,
      embeddingModel: args.model,
      lastEmbedded: Date.now(),
    });
  },
});

/**
 * Internal query to get places without embeddings
 */
export const getPlacesWithoutEmbeddings = internalQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const allPlaces = await ctx.db.query("places").collect();
    const placesWithoutEmbeddings = allPlaces.filter((place) => !place.embedding);
    return placesWithoutEmbeddings.slice(0, args.limit);
  },
});

/**
 * Public action to trigger batch embedding generation
 */
export const triggerBatchEmbeddings = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ total: number; successful: number; failed: number; results: any[] }> => {
    const limit = args.limit || 100;

    // Get all places
    const allPlaces: any = await ctx.runQuery(api.places.searchPlaces, {});
    const places: any[] = allPlaces.places.filter((place: any) => !place.embedding).slice(0, limit);

    console.log(`Found ${places.length} places without embeddings`);

    const results = [];
    for (const place of places) {
      try {
        const result = await ctx.runAction(internal.embeddings.generatePlaceEmbedding, {
          placeId: place._id,
        });
        results.push(result);
        console.log(`Generated embedding for ${place.name}`);
      } catch (error) {
        console.error(`Failed to generate embedding for ${place.name}:`, error);
        results.push({
          success: false,
          placeId: place._id,
          error: (error as Error).message,
        });
      }
    }

    return {
      total: places.length,
      successful: results.filter((r: any) => r.success).length,
      failed: results.filter((r: any) => !r.success).length,
      results,
    };
  },
});

/**
 * Generate query embedding for search
 */
export const generateQueryEmbedding = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const client = getOpenAIClient();

    const response = await client.embeddings.create({
      model: "openai/text-embedding-3-small",
      input: args.query,
    });

    return {
      embedding: response.data[0].embedding,
      model: "openai/text-embedding-3-small",
    };
  },
});
