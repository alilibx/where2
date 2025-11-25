/**
 * User Feedback System
 *
 * Allows users to report incorrect venue data for crowdsourced improvements
 * Supports phased rollout by gathering user input on data quality
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Submit feedback for a venue
 */
export const submitFeedback = mutation({
  args: {
    placeId: v.id("places"),
    userId: v.string(),
    feedbackType: v.string(), // "incorrect_tags", "wrong_info", "venue_closed", "missing_data", "other"
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const feedbackId = await ctx.db.insert("placeFeedback", {
      placeId: args.placeId,
      userId: args.userId,
      feedbackType: args.feedbackType,
      description: args.description,
      status: "pending",
      timestamp: Date.now(),
    });

    return {
      success: true,
      feedbackId,
      message: "Thank you for your feedback!",
    };
  },
});

/**
 * Get all feedback for a specific venue
 */
export const getFeedbackForPlace = query({
  args: {
    placeId: v.id("places"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db
      .query("placeFeedback")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect();

    return feedback;
  },
});

/**
 * Get pending feedback (for admin review)
 */
export const getPendingFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const feedback = await ctx.db
      .query("placeFeedback")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(limit);

    // Enrich with place names
    const enrichedFeedback = await Promise.all(
      feedback.map(async (fb) => {
        const place = await ctx.db.get(fb.placeId);
        return {
          ...fb,
          placeName: place?.name || "Unknown",
          placeArea: place?.area || "Unknown",
        };
      })
    );

    return enrichedFeedback;
  },
});

/**
 * Get all feedback grouped by type (for analytics)
 */
export const getFeedbackStats = query({
  args: {},
  handler: async (ctx) => {
    const allFeedback = await ctx.db.query("placeFeedback").collect();

    const stats = {
      total: allFeedback.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      recentCount: 0, // Last 7 days
    };

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    allFeedback.forEach((fb) => {
      // Count by type
      stats.byType[fb.feedbackType] = (stats.byType[fb.feedbackType] || 0) + 1;

      // Count by status
      stats.byStatus[fb.status] = (stats.byStatus[fb.status] || 0) + 1;

      // Count recent
      if (fb.timestamp > oneWeekAgo) {
        stats.recentCount++;
      }
    });

    return stats;
  },
});

/**
 * Update feedback status (admin action)
 */
export const updateFeedbackStatus = mutation({
  args: {
    feedbackId: v.id("placeFeedback"),
    status: v.string(), // "pending", "reviewed", "resolved", "dismissed"
    reviewedBy: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { feedbackId, ...updates } = args;

    await ctx.db.patch(feedbackId, updates as any);

    return {
      success: true,
      message: "Feedback status updated",
    };
  },
});

/**
 * Batch resolve feedback (when venue data is corrected)
 */
export const resolveFeedbackForPlace = mutation({
  args: {
    placeId: v.id("places"),
    reviewedBy: v.string(),
    reviewNotes: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all pending feedback for this place
    const feedback = await ctx.db
      .query("placeFeedback")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect();

    const pendingFeedback = feedback.filter((fb) => fb.status === "pending");

    // Update all to resolved
    for (const fb of pendingFeedback) {
      await ctx.db.patch(fb._id, {
        status: "resolved",
        reviewedBy: args.reviewedBy,
        reviewNotes: args.reviewNotes,
      });
    }

    return {
      success: true,
      resolved: pendingFeedback.length,
      message: `Resolved ${pendingFeedback.length} feedback items`,
    };
  },
});

/**
 * Get venues with most feedback (indicates data quality issues)
 */
export const getTopFeedbackVenues = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const allFeedback = await ctx.db.query("placeFeedback").collect();

    // Count feedback per place
    const feedbackCounts: Record<string, number> = {};
    allFeedback.forEach((fb) => {
      const placeId = fb.placeId;
      feedbackCounts[placeId] = (feedbackCounts[placeId] || 0) + 1;
    });

    // Sort by count
    const sorted = Object.entries(feedbackCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    // Enrich with place data
    const enriched = await Promise.all(
      sorted.map(async ([placeId, count]) => {
        const place = await ctx.db.get(placeId as Id<"places">);
        return {
          placeId,
          placeName: place?.name || "Unknown",
          placeArea: place?.area || "Unknown",
          feedbackCount: count,
          enrichmentComplete: place?.enrichmentComplete || false,
        };
      })
    );

    return enriched;
  },
});

/**
 * Check if user has already submitted feedback for a venue
 * Prevents duplicate submissions
 */
export const hasUserSubmittedFeedback = query({
  args: {
    placeId: v.id("places"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db
      .query("placeFeedback")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect();

    const userFeedback = feedback.filter((fb) => fb.userId === args.userId);

    return {
      hasSubmitted: userFeedback.length > 0,
      count: userFeedback.length,
      lastSubmission: userFeedback.length > 0 ? userFeedback[userFeedback.length - 1].timestamp : null,
    };
  },
});
