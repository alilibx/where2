/**
 * AI-Assisted Venue Enrichment
 *
 * Uses GPT-4o to analyze Google reviews and suggest custom tags
 * Helps admin quickly enrich venues with Dubai-specific attributes
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Generate enrichment suggestions for a venue using AI
 * Analyzes venue type, Google data, and (optionally) reviews
 */
export const suggestEnrichment = action({
  args: {
    placeId: v.id("places"),
    includeReviews: v.optional(v.boolean()), // Fetch reviews from Google (costs more)
  },
  handler: async (ctx, args) => {
    // Get place data
    const place: any = await ctx.runQuery(api.places.getPlace, { placeId: args.placeId });
    if (!place) {
      return { success: false, error: "Place not found" };
    }

    // Fetch Google Place Details if available
    let googleData: any = null;
    if (place.googlePlaceId) {
      const result: any = await ctx.runAction(api.googlePlaces.fetchPlaceDetails, {
        googlePlaceId: place.googlePlaceId,
      });
      if (result.success) {
        googleData = result.details;
      }
    }

    // Build context for AI
    const context = {
      name: place.name,
      category: place.category,
      types: googleData?.types || [],
      currentTags: place.tags,
      priceLevel: googleData?.priceLevel || place.priceLevel,
      rating: googleData?.rating || place.rating,
      area: place.area,
    };

    // Call OpenRouter GPT-4o-mini for suggestions (faster and cheaper for this task)
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      const prompt = `You are a Dubai city guide expert helping enrich venue data with custom tags.

Venue Information:
- Name: ${context.name}
- Category: ${context.category}
- Google Types: ${context.types.join(", ")}
- Current Tags: ${context.currentTags.length > 0 ? context.currentTags.join(", ") : "None"}
- Price Level: ${context.priceLevel}
- Rating: ${context.rating}/5
- Area: ${context.area}

Available Custom Tags:
- family-friendly, kid-friendly, pet-friendly
- outdoor, indoor, waterfront, rooftop
- quiet, romantic, lively, casual, upscale
- good-for-groups, good-for-dates, good-for-meetings
- late-night, breakfast-spot, brunch-spot

Your Task:
1. Suggest 3-5 appropriate custom tags from the list above
2. Suggest a noise level: "Quiet", "Moderate", or "Lively"
3. Suggest a detailed price category: "Low", "Mid", "High", or "Lux"
4. Write a short highlight (1-2 sentences) about why someone should visit
5. Provide confidence scores (0-100) for each suggestion

Respond in JSON format:
{
  "suggestedTags": ["tag1", "tag2", ...],
  "tagConfidence": 85,
  "noiseLevel": "Moderate",
  "noiseLevelConfidence": 80,
  "priceLevel": "Mid",
  "priceLevelConfidence": 90,
  "highlights": "A great place to...",
  "highlightsConfidence": 75,
  "reasoning": "Brief explanation of suggestions"
}`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Where2 Dubai Enrichment",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini", // Cheaper model for enrichment suggestions
          messages: [
            {
              role: "system",
              content: "You are an expert Dubai venue curator. Provide accurate, helpful enrichment suggestions in valid JSON format.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3, // Lower temperature for more consistent suggestions
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const suggestions = JSON.parse(data.choices[0].message.content);

      return {
        success: true,
        placeId: args.placeId,
        placeName: place.name,
        suggestions,
        currentData: {
          tags: place.tags,
          noise: place.noise,
          priceLevel: place.priceLevel,
          highlights: place.highlights,
        },
      };
    } catch (error: any) {
      console.error("Error generating enrichment suggestions:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Batch generate suggestions for multiple unenriched venues
 * Useful for processing newly discovered Google Places venues
 */
export const batchSuggestEnrichment = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get unenriched places
    const places: any[] = await ctx.runQuery(api.places.getUnenrichedPlaces, { limit });

    const results = [];
    for (const place of places) {
      const suggestion: any = await ctx.runAction(api.enrichment.suggestEnrichment, {
        placeId: place._id,
        includeReviews: false,
      });

      results.push(suggestion);

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  },
});

/**
 * Auto-apply high-confidence suggestions
 * Only applies suggestions with confidence >= 90%
 */
export const autoApplyHighConfidenceSuggestions = action({
  args: {
    placeId: v.id("places"),
    suggestions: v.object({
      suggestedTags: v.array(v.string()),
      tagConfidence: v.number(),
      noiseLevel: v.string(),
      noiseLevelConfidence: v.number(),
      priceLevel: v.string(),
      priceLevelConfidence: v.number(),
      highlights: v.string(),
      highlightsConfidence: v.number(),
    }),
    confidenceThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.confidenceThreshold || 90;
    const updates: any = {};

    // Apply tags if high confidence
    if (args.suggestions.tagConfidence >= threshold) {
      updates.tags = args.suggestions.suggestedTags;
    }

    // Apply noise level if high confidence
    if (args.suggestions.noiseLevelConfidence >= threshold) {
      updates.noise = args.suggestions.noiseLevel;
    }

    // Apply price level if high confidence
    if (args.suggestions.priceLevelConfidence >= threshold) {
      updates.priceLevel = args.suggestions.priceLevel;
    }

    // Apply highlights if high confidence
    if (args.suggestions.highlightsConfidence >= threshold) {
      updates.highlights = args.suggestions.highlights;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await ctx.runMutation(api.places.updatePlaceEnrichment, {
        placeId: args.placeId,
        ...updates,
      });

      return {
        success: true,
        applied: Object.keys(updates),
        message: `Auto-applied ${Object.keys(updates).length} high-confidence suggestions`,
      };
    }

    return {
      success: true,
      applied: [],
      message: "No suggestions met confidence threshold",
    };
  },
});

/**
 * Generate area suggestions based on coordinates
 * Uses Dubai's known neighborhoods
 */
/**
 * Batch enrich and apply suggestions for multiple venues
 * Combines suggestion generation, area assignment, and application in one step
 */
export const batchEnrichAndApply = action({
  args: {
    limit: v.optional(v.number()),
    confidenceThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const threshold = args.confidenceThreshold || 75;

    // Get unenriched places
    const places: any[] = await ctx.runQuery(api.places.getUnenrichedPlaces, { limit });

    const results = [];
    for (const place of places) {
      try {
        // Get AI suggestions
        const suggestion: any = await ctx.runAction(api.enrichment.suggestEnrichment, {
          placeId: place._id,
          includeReviews: false,
        });

        if (!suggestion.success) {
          results.push({ placeId: place._id, name: place.name, success: false, error: suggestion.error });
          continue;
        }

        // Get area suggestion based on coordinates
        const areaSuggestion: any = await ctx.runAction(api.enrichment.suggestArea, {
          latitude: place.latitude,
          longitude: place.longitude,
        });

        // Build updates based on threshold
        const updates: any = {};
        const s = suggestion.suggestions;

        if (s.tagConfidence >= threshold) {
          updates.tags = s.suggestedTags;
        }
        if (s.noiseLevelConfidence >= threshold) {
          updates.noise = s.noiseLevel;
        }
        if (s.priceLevelConfidence >= threshold) {
          updates.priceLevel = s.priceLevel;
        }
        if (s.highlightsConfidence >= threshold) {
          updates.highlights = s.highlights;
        }
        if (areaSuggestion.confidence >= 60) {
          updates.area = areaSuggestion.suggestedArea;
        }

        // Apply updates
        if (Object.keys(updates).length > 0) {
          await ctx.runMutation(api.places.updatePlaceEnrichment, {
            placeId: place._id,
            ...updates,
          });
        }

        results.push({
          placeId: place._id,
          name: place.name,
          success: true,
          applied: Object.keys(updates),
          suggestions: s,
          area: areaSuggestion.suggestedArea,
        });

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error: any) {
        results.push({ placeId: place._id, name: place.name, success: false, error: error.message });
      }
    }

    return {
      success: true,
      processed: results.length,
      enriched: results.filter(r => r.success && (r as any).applied?.length > 0).length,
      results,
    };
  },
});

export const suggestArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    // Dubai neighborhood boundaries (simplified)
    const areas = [
      { name: "Downtown Dubai", lat: 25.1972, lon: 55.2744, radius: 2 },
      { name: "Dubai Marina", lat: 25.0806, lon: 55.1400, radius: 2 },
      { name: "Business Bay", lat: 25.1867, lon: 55.2636, radius: 1.5 },
      { name: "JBR", lat: 25.0783, lon: 55.1283, radius: 1 },
      { name: "Palm Jumeirah", lat: 25.1124, lon: 55.1390, radius: 3 },
      { name: "DIFC", lat: 25.2125, lon: 55.2805, radius: 1 },
      { name: "City Walk", lat: 25.2130, lon: 55.2677, radius: 1 },
      { name: "Al Barsha", lat: 25.1130, lon: 55.1972, radius: 2 },
      { name: "Jumeirah", lat: 25.2252, lon: 55.2557, radius: 3 },
      { name: "Deira", lat: 25.2726, lon: 55.3258, radius: 3 },
      { name: "Bur Dubai", lat: 25.2575, lon: 55.2981, radius: 2 },
      { name: "Dubai Silicon Oasis", lat: 25.1212, lon: 55.3773, radius: 2.5 },
    ];

    // Calculate distance to each area center
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Find closest area
    let closestArea = null;
    let minDistance = Infinity;

    for (const area of areas) {
      const distance = calculateDistance(args.latitude, args.longitude, area.lat, area.lon);
      if (distance < area.radius && distance < minDistance) {
        minDistance = distance;
        closestArea = area.name;
      }
    }

    return {
      success: true,
      suggestedArea: closestArea || "Dubai", // Default to "Dubai" if no specific match
      confidence: closestArea ? Math.max(0, 100 - minDistance * 20) : 50,
    };
  },
});
