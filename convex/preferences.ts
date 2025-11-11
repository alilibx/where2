import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user preferences
export const getUserPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();

    if (!prefs) {
      // Create default preferences
      return {
        userId: args.userId,
        preferredTags: [],
        preferredAreas: [],
        memoryEnabled: true,
        language: "en",
        lastActive: Date.now(),
      };
    }

    return prefs;
  },
});

// Initialize or update user preferences
export const updateUserPreferences = mutation({
  args: {
    userId: v.string(),
    memoryEnabled: v.optional(v.boolean()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.memoryEnabled !== undefined && { memoryEnabled: args.memoryEnabled }),
        ...(args.language && { language: args.language }),
        lastActive: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userPreferences", {
        userId: args.userId,
        preferredTags: [],
        preferredAreas: [],
        memoryEnabled: args.memoryEnabled ?? true,
        language: args.language ?? "en",
        lastActive: Date.now(),
      });
    }
  },
});

// Clear all user preferences
export const clearUserPreferences = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        preferredTags: [],
        preferredAreas: [],
        preferredPriceLevel: undefined,
        lastActive: Date.now(),
      });
    }
  },
});

// Record a place selection to learn preferences
export const recordPlaceSelection = mutation({
  args: {
    userId: v.string(),
    placeId: v.id("places"),
    query: v.string(),
    filters: v.object({
      category: v.optional(v.string()),
      tags: v.array(v.string()),
      priceLevel: v.optional(v.string()),
      area: v.optional(v.string()),
      nearMetro: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // Record search history
    await ctx.db.insert("searchHistory", {
      userId: args.userId,
      query: args.query,
      filters: args.filters,
      selectedPlaceId: args.placeId,
      timestamp: Date.now(),
    });

    // Update user preferences if memory is enabled
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();

    if (prefs && prefs.memoryEnabled) {
      const place = await ctx.db.get(args.placeId);
      if (!place) return;

      // Update preferred tags
      const updatedTags = [...prefs.preferredTags];
      place.tags.forEach(tag => {
        const existing = updatedTags.find(t => t.tag === tag);
        if (existing) {
          existing.count += 1;
        } else {
          updatedTags.push({ tag, count: 1 });
        }
      });

      // Update preferred areas
      const updatedAreas = [...prefs.preferredAreas];
      if (!updatedAreas.includes(place.area)) {
        updatedAreas.push(place.area);
      }

      // Update preferred price level (weighted average)
      let preferredPriceLevel = place.priceLevel;

      await ctx.db.patch(prefs._id, {
        preferredTags: updatedTags,
        preferredAreas: updatedAreas,
        preferredPriceLevel,
        lastActive: Date.now(),
      });
    }
  },
});

// Get user's vibe summary
export const getUserVibeSummary = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();

    if (!prefs || !prefs.memoryEnabled || prefs.preferredTags.length === 0) {
      return {
        summary: "No preferences learned yet",
        tags: [],
        priceLevel: null,
      };
    }

    // Get top 5 preferred tags
    const topTags = prefs.preferredTags
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(t => t.tag);

    const summary = [
      ...topTags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)),
      prefs.preferredPriceLevel && `${prefs.preferredPriceLevel} price`,
    ]
      .filter(Boolean)
      .join(" • ");

    return {
      summary,
      tags: topTags,
      priceLevel: prefs.preferredPriceLevel,
    };
  },
});
