/**
 * Google Places API Integration
 *
 * IMPORTANT: ToS Compliance
 * - Only place_id can be stored permanently
 * - All other Google data (hours, photos, etc.) must be cached max 30 days
 * - This file handles fetching live data, not storing it
 */

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Google Places API (New) base URL
const GOOGLE_PLACES_API_BASE = "https://places.googleapis.com/v1";

/**
 * Discover venues in Dubai using Nearby Search API
 * Returns place_ids that can be stored permanently (ToS compliant)
 */
export const discoverVenues = action({
  args: {
    location: v.object({ lat: v.number(), lng: v.number() }),
    radius: v.number(), // meters
    types: v.array(v.string()), // e.g., ["restaurant", "cafe"]
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY environment variable not set");
    }

    const maxResults = args.maxResults || 20;

    try {
      const response = await fetch(`${GOOGLE_PLACES_API_BASE}/places:searchNearby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.types",
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: args.location,
              radius: args.radius,
            },
          },
          includedTypes: args.types,
          maxResultCount: maxResults,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Places API error:", response.status, errorText);
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      // Create venue placeholders with place_ids
      const discovered = [];
      for (const place of data.places || []) {
        // Check if place_id already exists
        const existing = await ctx.runQuery(api.places.getPlaceByGoogleId, {
          googlePlaceId: place.id,
        });

        if (!existing) {
          discovered.push({
            googlePlaceId: place.id,
            name: place.displayName?.text || "Unknown",
            latitude: place.location?.latitude || 0,
            longitude: place.location?.longitude || 0,
            types: place.types || [],
          });
        }
      }

      return {
        success: true,
        discovered: discovered.length,
        venues: discovered,
      };
    } catch (error: any) {
      console.error("Error discovering venues:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Fetch fresh Place Details from Google for a specific place_id
 * This data can be cached client-side for 30 days (ToS compliant)
 */
export const fetchPlaceDetails = action({
  args: {
    googlePlaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY environment variable not set");
    }

    try {
      // Use Place Details API to fetch fresh data
      const response = await fetch(
        `${GOOGLE_PLACES_API_BASE}/places/${args.googlePlaceId}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
            // Pro tier fields - optimize field mask to control costs
            "X-Goog-FieldMask": [
              "name",
              "formattedAddress",
              "location",
              "rating",
              "userRatingCount",
              "priceLevel",
              "currentOpeningHours",
              "regularOpeningHours",
              "internationalPhoneNumber",
              "websiteUri",
              "photos",
              "types",
              "displayName",
            ].join(","),
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Place Details error:", response.status, errorText);

        // Handle common errors
        if (response.status === 404) {
          return {
            success: false,
            error: "PLACE_NOT_FOUND",
            message: "This place no longer exists in Google's database",
          };
        }

        throw new Error(`Google Place Details API error: ${response.status}`);
      }

      const place = await response.json();

      // Extract and structure the data
      const details = {
        name: place.displayName?.text || place.name || "Unknown",
        formattedAddress: place.formattedAddress || "",
        location: place.location || { latitude: 0, longitude: 0 },
        rating: place.rating || 0,
        userRatingCount: place.userRatingCount || 0,
        priceLevel: place.priceLevel || null, // PRICE_LEVEL_INEXPENSIVE to PRICE_LEVEL_VERY_EXPENSIVE

        // Opening hours - critical for "Open Now" feature
        currentOpeningHours: place.currentOpeningHours || null,
        regularOpeningHours: place.regularOpeningHours || null,

        // Contact info
        phone: place.internationalPhoneNumber || null,
        website: place.websiteUri || null,

        // Photos (URLs that expire)
        photos: (place.photos || []).slice(0, 5).map((photo: any) => ({
          name: photo.name,
          widthPx: photo.widthPx,
          heightPx: photo.heightPx,
          // Note: actual photo URL requires separate API call with photo reference
        })),

        // Types/categories
        types: place.types || [],
      };

      return {
        success: true,
        details,
        fetchedAt: Date.now(), // Client should cache with this timestamp
      };
    } catch (error: any) {
      console.error("Error fetching place details:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Get photo URL for a specific Google Places photo
 * Photos should be cached client-side for 30 days
 */
export const getPhotoUrl = action({
  args: {
    photoName: v.string(), // e.g., "places/ChIJ.../photos/..."
    maxWidth: v.optional(v.number()),
    maxHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY environment variable not set");
    }

    const maxWidth = args.maxWidth || 800;
    const maxHeight = args.maxHeight || 600;

    // Construct photo URL
    const photoUrl = `${GOOGLE_PLACES_API_BASE}/${args.photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${apiKey}`;

    return {
      success: true,
      photoUrl,
    };
  },
});

/**
 * Check if a place is currently open using Google's opening hours
 */
export const checkIsOpenNow = action({
  args: {
    googlePlaceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch place details (this will be cached)
    const result: any = await ctx.runAction(api.googlePlaces.fetchPlaceDetails, {
      googlePlaceId: args.googlePlaceId,
    });

    if (!result.success) {
      return { success: false, isOpen: null, error: result.error };
    }

    const currentHours = result.details.currentOpeningHours;
    if (!currentHours) {
      return { success: true, isOpen: null, message: "Hours not available" };
    }

    // Google provides openNow boolean
    return {
      success: true,
      isOpen: currentHours.openNow || false,
      periods: currentHours.periods || [],
      weekdayDescriptions: currentHours.weekdayDescriptions || [],
    };
  },
});

/**
 * Batch create venue placeholders from discovery results
 * Used after running discoverVenues to populate the database
 */
export const createVenuePlaceholders = internalAction({
  args: {
    venues: v.array(
      v.object({
        googlePlaceId: v.string(),
        name: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        types: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ success: boolean; created: number }> => {
    const created = [];

    for (const venue of args.venues) {
      // Determine category from Google types
      let category = "restaurant"; // default
      if (venue.types.includes("cafe")) category = "cafe";
      else if (venue.types.includes("bar")) category = "bar";
      else if (venue.types.includes("tourist_attraction")) category = "attraction";

      // Create placeholder with minimal data
      const placeId = await ctx.runMutation(internal.places.createPlaceholder, {
        googlePlaceId: venue.googlePlaceId,
        name: venue.name,
        latitude: venue.latitude,
        longitude: venue.longitude,
        category,
        dataSource: "google",
      });

      created.push(placeId);
    }

    return {
      success: true,
      created: created.length,
    };
  },
});

/**
 * Refresh place_id for a venue (Google recommends annually)
 * Searches for the venue by name and location to get updated place_id
 */
export const refreshPlaceId = action({
  args: {
    placeId: v.id("places"),
  },
  handler: async (ctx, args) => {
    // Get current venue data
    const place: any = await ctx.runQuery(api.places.getPlace, { placeId: args.placeId });
    if (!place) {
      return { success: false, error: "Place not found" };
    }

    // Search for venue by name and location
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY environment variable not set");
    }

    try {
      // Use Text Search to find venue by name
      const response = await fetch(`${GOOGLE_PLACES_API_BASE}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.location",
        },
        body: JSON.stringify({
          textQuery: place.name,
          locationBias: {
            circle: {
              center: {
                latitude: place.latitude,
                longitude: place.longitude,
              },
              radius: 500, // 500m radius
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Text Search API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.places || data.places.length === 0) {
        return {
          success: false,
          error: "VENUE_NOT_FOUND",
          message: "Could not find venue in Google Places",
        };
      }

      // Get the first result (most likely match)
      const newPlaceId = data.places[0].id;

      // Update place_id in database
      await ctx.runMutation(internal.places.updatePlaceGoogleId, {
        placeId: args.placeId,
        googlePlaceId: newPlaceId,
        lastGoogleSync: Date.now(),
      });

      return {
        success: true,
        oldPlaceId: place.googlePlaceId,
        newPlaceId,
        message: "Place ID refreshed successfully",
      };
    } catch (error: any) {
      console.error("Error refreshing place ID:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
