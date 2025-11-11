import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get or create conversation for user
export const getConversation = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (!conversation) {
      return {
        userId: args.userId,
        messages: [],
        lastMessage: Date.now(),
        currentFilters: {
          tags: [],
          cuisine: [],
          openNow: false,
        },
      };
    }

    return conversation;
  },
});

// Add message to conversation
export const addMessage = mutation({
  args: {
    userId: v.string(),
    role: v.string(),
    content: v.string(),
    filters: v.optional(
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    const newMessage = {
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
    };

    if (existing) {
      const updatedMessages = [...existing.messages, newMessage];

      // Keep only last 20 messages to manage storage
      const trimmedMessages =
        updatedMessages.length > 20
          ? updatedMessages.slice(-20)
          : updatedMessages;

      await ctx.db.patch(existing._id, {
        messages: trimmedMessages,
        lastMessage: Date.now(),
        ...(args.filters && { currentFilters: args.filters }),
      });

      return existing._id;
    } else {
      return await ctx.db.insert("conversations", {
        userId: args.userId,
        messages: [newMessage],
        lastMessage: Date.now(),
        currentFilters: args.filters || {
          tags: [],
          cuisine: [],
          openNow: false,
        },
      });
    }
  },
});

// Clear conversation
export const clearConversation = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
