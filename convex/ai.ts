import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

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

// Define the structured output schema for search intent
const searchIntentSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      description: "A brief summary of what the user is looking for",
    },
    filters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["cafe", "restaurant", "any"],
          description: "Type of venue",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "family-friendly",
              "kid-friendly",
              "outdoor",
              "indoor",
              "waterfront",
            ],
          },
          description: "Venue characteristics",
        },
        priceLevel: {
          type: "string",
          enum: ["Low", "Mid", "High", "Lux"],
          description: "Price range",
        },
        area: {
          type: "string",
          description: "Area or neighborhood in Dubai",
        },
        nearMetro: {
          type: "boolean",
          description: "Whether venue should be near a Metro station",
        },
        minRating: {
          type: "number",
          minimum: 0,
          maximum: 5,
          description: "Minimum rating (0-5)",
        },
        cuisine: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Types of cuisine",
        },
        noise: {
          type: "string",
          enum: ["Quiet", "Moderate", "Lively"],
          description: "Atmosphere noise level",
        },
        openNow: {
          type: "boolean",
          description: "Whether venue must be open now",
        },
      },
      required: ["tags", "cuisine", "openNow"],
    },
    clarifyingQuestions: {
      type: "array",
      items: {
        type: "string",
      },
      description: "Questions to ask if more information is needed (max 2)",
      maxItems: 2,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Confidence level in understanding the query (0-1)",
    },
  },
  required: ["intent", "filters", "clarifyingQuestions", "confidence"],
};

// Parse natural language query into structured search filters
export const parseSearchQuery = action({
  args: {
    query: v.string(),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const client = getOpenAIClient();

    // Build messages with context
    const messages: any[] = [
      {
        role: "system",
        content: `You are an AI assistant helping users find venues in Dubai. Your job is to understand their natural language queries and convert them into structured search filters.

Context about Dubai:
- Metro stations: DMCC, Business Bay, Burj Khalifa/Dubai Mall, Mall of the Emirates, Emirates Towers, Al Rigga
- Popular areas: Marina, Business Bay, Downtown, JBR, City Walk, Al Barsha, Palm Jumeirah, DIFC, Jumeirah, Deira
- Weather: Dubai is pleasant outdoors from October to March (outdoor bias), hot from April to September (indoor bias)
- Current time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" })}

Extract search intent and filters from the user's query. Consider:
1. Time context (breakfast, lunch, dinner, late night)
2. Party composition (family, kids, couples, solo)
3. Constraints (budget, location, atmosphere)
4. Implicit preferences (e.g., "family" implies family-friendly and possibly kid-friendly)

If the query is ambiguous, add up to 2 clarifying questions. Set confidence to:
- 0.9-1.0: Very clear query with all necessary info
- 0.7-0.8: Most info present, minor clarification helpful
- 0.5-0.6: Significant ambiguity
- Below 0.5: Very unclear, needs more info

Default values:
- tags: [] (extract from query)
- cuisine: [] (extract from query)
- openNow: true if time-sensitive (e.g., "now", "tonight"), false otherwise`,
      },
    ];

    // Add conversation history if provided
    if (args.conversationHistory && args.conversationHistory.length > 0) {
      messages.push(...args.conversationHistory);
    }

    // Add current query
    messages.push({
      role: "user",
      content: args.query,
    });

    try {
      const completion = await client.chat.completions.create({
        model: "openai/gpt-4o-2024-08-06", // Supports structured outputs
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "search_intent",
            strict: true,
            schema: searchIntentSchema,
          },
        },
        temperature: 0.3, // Lower temperature for more consistent parsing
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content in AI response");
      }

      const parsed = JSON.parse(content);

      return {
        success: true,
        result: parsed,
        usage: completion.usage,
      };
    } catch (error: any) {
      console.error("Error parsing query with AI:", error);
      return {
        success: false,
        error: error.message,
        // Fallback to basic parsing
        result: {
          intent: args.query,
          filters: {
            tags: [],
            cuisine: [],
            openNow: false,
          },
          clarifyingQuestions: [],
          confidence: 0.3,
        },
      };
    }
  },
});

// Generate a conversational response about search results
export const generateSearchResponse = action({
  args: {
    query: v.string(),
    results: v.any(), // Search results
    bestMatch: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const client = getOpenAIClient();

    const resultsCount = args.results?.places?.length || 0;
    const hasResults = resultsCount > 0;

    const prompt = hasResults
      ? `The user searched for: "${args.query}"

We found ${resultsCount} venues. ${
          args.bestMatch
            ? `The best match is "${args.bestMatch.name}" because: ${args.bestMatch.reasons}`
            : ""
        }

Generate a friendly, concise response (2-3 sentences) that:
1. Acknowledges their request
2. Highlights the best match or top results
3. Invites them to explore or refine

Keep it conversational and helpful.`
      : `The user searched for: "${args.query}"

We found no exact matches. Generate a friendly, empathetic response (2-3 sentences) that:
1. Acknowledges their search
2. Suggests ways to broaden the search (relax filters, try different area)
3. Stays positive and helpful

Keep it conversational.`;

    try {
      const completion = await client.chat.completions.create({
        model: "openai/gpt-4o-mini", // Faster, cheaper for simple generation
        messages: [
          {
            role: "system",
            content:
              "You are a friendly, helpful AI assistant for Where2 Dubai. Be concise, warm, and actionable.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return {
        success: true,
        response: completion.choices[0].message.content || "",
        usage: completion.usage,
      };
    } catch (error: any) {
      console.error("Error generating response:", error);
      return {
        success: false,
        error: error.message,
        response: hasResults
          ? `Found ${resultsCount} great options for you!`
          : "No exact matches found. Try adjusting your filters.",
      };
    }
  },
});

// Chat-style interaction with context
export const chatWithAI = action({
  args: {
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
    currentResults: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const client = getOpenAIClient();

    const systemMessage = {
      role: "system",
      content: `You are Where2, a friendly AI assistant helping users discover venues in Dubai.

Your capabilities:
- Understand natural language queries about cafes, restaurants, and venues
- Consider time, weather, party size, and preferences
- Ask clarifying questions when needed (max 2 at a time)
- Provide personalized recommendations
- Help refine searches

Current context:
- Time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" })}
- Weather season: ${
        new Date().getMonth() >= 9 || new Date().getMonth() <= 2
          ? "Pleasant (outdoor-friendly)"
          : "Hot (indoor preferred)"
      }
${
  args.currentResults
    ? `- Current search has ${args.currentResults.places?.length || 0} results`
    : ""
}

Guidelines:
- Be conversational and friendly
- Keep responses concise (2-4 sentences)
- If user asks to search, acknowledge and let them know results are coming
- If discussing results, reference specific venues
- Use emojis sparingly and naturally`,
    };

    try {
      const completion = await client.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [systemMessage, ...args.messages],
        temperature: 0.8,
        max_tokens: 200,
      });

      return {
        success: true,
        message: completion.choices[0].message.content || "",
        usage: completion.usage,
      };
    } catch (error: any) {
      console.error("Error in chat:", error);
      return {
        success: false,
        error: error.message,
        message: "I'm having trouble connecting right now. Please try again.",
      };
    }
  },
});
