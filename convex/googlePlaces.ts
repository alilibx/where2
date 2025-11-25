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

// Cuisine mapping from Google Place types to our cuisine categories
const CUISINE_TYPE_MAP: Record<string, string> = {
  italian_restaurant: "Italian",
  japanese_restaurant: "Japanese",
  lebanese_restaurant: "Lebanese",
  indian_restaurant: "Indian",
  chinese_restaurant: "Chinese",
  thai_restaurant: "Thai",
  mexican_restaurant: "Mexican",
  french_restaurant: "French",
  korean_restaurant: "Korean",
  turkish_restaurant: "Turkish",
  mediterranean_restaurant: "Mediterranean",
  middle_eastern_restaurant: "Middle Eastern",
  asian_restaurant: "Asian",
  american_restaurant: "American",
  seafood_restaurant: "Seafood",
  pizza_restaurant: "Pizza",
  steak_house: "Steakhouse",
  sushi_restaurant: "Sushi",
  vietnamese_restaurant: "Vietnamese",
  greek_restaurant: "Greek",
  spanish_restaurant: "Spanish",
  brazilian_restaurant: "Brazilian",
  vegan_restaurant: "Vegan",
  vegetarian_restaurant: "Vegetarian",
  indonesian_restaurant: "Indonesian",
  persian_restaurant: "Persian",
  african_restaurant: "African",
  ethiopian_restaurant: "Ethiopian",
  german_restaurant: "German",
  british_restaurant: "British",
  irish_restaurant: "Irish",
  russian_restaurant: "Russian",
  pakistani_restaurant: "Pakistani",
  bangladeshi_restaurant: "Bangladeshi",
  sri_lankan_restaurant: "Sri Lankan",
  filipino_restaurant: "Filipino",
  malaysian_restaurant: "Malaysian",
  singaporean_restaurant: "Singaporean",
  taiwanese_restaurant: "Taiwanese",
  ramen_restaurant: "Ramen",
  barbecue_restaurant: "BBQ",
  breakfast_restaurant: "Breakfast",
  brunch_restaurant: "Brunch",
  buffet_restaurant: "Buffet",
  hamburger_restaurant: "Burgers",
  sandwich_shop: "Sandwiches",
  ice_cream_shop: "Ice Cream",
  coffee_shop: "Coffee",
  tea_house: "Tea",
  dessert_shop: "Desserts",
  bakery: "Bakery",
  fast_food_restaurant: "Fast Food",
};

// Map Google price level to our price categories
const PRICE_LEVEL_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: "Low",
  PRICE_LEVEL_INEXPENSIVE: "Low",
  PRICE_LEVEL_MODERATE: "Mid",
  PRICE_LEVEL_EXPENSIVE: "High",
  PRICE_LEVEL_VERY_EXPENSIVE: "Lux",
};

/**
 * Parse cuisines from Google Place types
 */
function parseCuisinesFromTypes(types: string[]): string[] {
  const cuisines: string[] = [];
  for (const type of types) {
    if (CUISINE_TYPE_MAP[type]) {
      cuisines.push(CUISINE_TYPE_MAP[type]);
    }
  }
  return Array.from(new Set(cuisines)); // Remove duplicates
}

/**
 * Convert Google price level to our format
 */
function mapPriceLevel(googlePriceLevel: string | null): string {
  if (!googlePriceLevel) return "Mid"; // Default
  return PRICE_LEVEL_MAP[googlePriceLevel] || "Mid";
}

/**
 * Discover venues in Dubai using Nearby Search API
 * Returns place_ids that can be stored permanently (ToS compliant)
 */
export const discoverVenues = action({
  args: {
    location: v.object({ latitude: v.number(), longitude: v.number() }),
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
              center: {
                latitude: args.location.latitude,
                longitude: args.location.longitude,
              },
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
      // Enterprise + Atmosphere tier fields for full data
      const response = await fetch(
        `${GOOGLE_PLACES_API_BASE}/places/${args.googlePlaceId}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
            // Enterprise + Atmosphere tier fields
            "X-Goog-FieldMask": [
              // Basic fields
              "name",
              "displayName",
              "formattedAddress",
              "location",
              "types",
              "primaryType",
              // Enterprise fields
              "rating",
              "userRatingCount",
              "priceLevel",
              "priceRange",
              "currentOpeningHours",
              "regularOpeningHours",
              "internationalPhoneNumber",
              "websiteUri",
              "photos",
              // Atmosphere fields (restaurant-specific)
              "outdoorSeating",
              "goodForGroups",
              "goodForChildren",
              "liveMusic",
              "menuForChildren",
              "reservable",
              // Service options
              "dineIn",
              "takeout",
              "delivery",
              // Menu offerings
              "servesBeer",
              "servesBreakfast",
              "servesBrunch",
              "servesCocktails",
              "servesCoffee",
              "servesDessert",
              "servesDinner",
              "servesLunch",
              "servesVegetarianFood",
              "servesWine",
              // AI Summary
              "generativeSummary",
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

      // Parse cuisines from types
      const cuisines = parseCuisinesFromTypes(place.types || []);

      // Extract and structure the data
      const details = {
        name: place.displayName?.text || place.name || "Unknown",
        formattedAddress: place.formattedAddress || "",
        location: place.location || { latitude: 0, longitude: 0 },
        rating: place.rating || 0,
        userRatingCount: place.userRatingCount || 0,
        priceLevel: place.priceLevel || null, // PRICE_LEVEL_INEXPENSIVE to PRICE_LEVEL_VERY_EXPENSIVE
        priceLevelMapped: mapPriceLevel(place.priceLevel),
        priceRange: place.priceRange || null,

        // Opening hours - critical for "Open Now" feature
        currentOpeningHours: place.currentOpeningHours || null,
        regularOpeningHours: place.regularOpeningHours || null,

        // Contact info
        phone: place.internationalPhoneNumber || null,
        website: place.websiteUri || null,

        // Photos (references for fetching)
        photos: (place.photos || []).slice(0, 5).map((photo: any) => ({
          name: photo.name,
          widthPx: photo.widthPx,
          heightPx: photo.heightPx,
        })),

        // Types/categories
        types: place.types || [],
        primaryType: place.primaryType || null,
        cuisines,

        // Restaurant attributes (Atmosphere tier)
        outdoorSeating: place.outdoorSeating ?? null,
        goodForGroups: place.goodForGroups ?? null,
        goodForChildren: place.goodForChildren ?? null,
        liveMusic: place.liveMusic ?? null,
        reservable: place.reservable ?? null,

        // Service options
        dineIn: place.dineIn ?? null,
        takeout: place.takeout ?? null,
        delivery: place.delivery ?? null,

        // Menu offerings
        servesBreakfast: place.servesBreakfast ?? null,
        servesBrunch: place.servesBrunch ?? null,
        servesLunch: place.servesLunch ?? null,
        servesDinner: place.servesDinner ?? null,
        servesBeer: place.servesBeer ?? null,
        servesWine: place.servesWine ?? null,
        servesCocktails: place.servesCocktails ?? null,
        servesVegetarianFood: place.servesVegetarianFood ?? null,

        // AI-generated summary from Google
        generativeSummary: place.generativeSummary?.overview?.text || null,
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
export const createVenuePlaceholders = action({
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
      const placeId = await ctx.runMutation(api.places.createPlaceholder, {
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

/**
 * Fetch actual photo URLs for a place's photos
 * Returns usable image URLs (charged per photo)
 */
export const fetchPhotoUrls = action({
  args: {
    photoNames: v.array(v.string()), // Array of photo.name values
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

    const photoUrls: string[] = [];

    for (const photoName of args.photoNames) {
      // Construct photo URL - this URL can be used directly to display the image
      const photoUrl = `${GOOGLE_PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${apiKey}`;
      photoUrls.push(photoUrl);
    }

    return {
      success: true,
      photoUrls,
    };
  },
});

/**
 * Sync full Google data for a single venue
 * Fetches details + photos and updates the database
 */
export const syncVenueGoogleData = action({
  args: {
    placeId: v.id("places"),
    fetchPhotos: v.optional(v.boolean()),
    maxPhotos: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const fetchPhotos = args.fetchPhotos ?? true;
    const maxPhotos = args.maxPhotos ?? 3;

    // Get place data
    const place: any = await ctx.runQuery(api.places.getPlace, { placeId: args.placeId });
    if (!place) {
      return { success: false, error: "Place not found" };
    }

    if (!place.googlePlaceId) {
      return { success: false, error: "No Google Place ID for this venue" };
    }

    // Fetch full details from Google
    const detailsResult: any = await ctx.runAction(api.googlePlaces.fetchPlaceDetails, {
      googlePlaceId: place.googlePlaceId,
    });

    if (!detailsResult.success) {
      return { success: false, error: detailsResult.error };
    }

    const details = detailsResult.details;

    // Fetch photo URLs if requested
    let photoUrls: string[] = [];
    if (fetchPhotos && details.photos && details.photos.length > 0) {
      const photoNames = details.photos.slice(0, maxPhotos).map((p: any) => p.name);
      const photosResult: any = await ctx.runAction(api.googlePlaces.fetchPhotoUrls, {
        photoNames,
        maxWidth: 800,
        maxHeight: 600,
      });
      if (photosResult.success) {
        photoUrls = photosResult.photoUrls;
      }
    }

    // Update the place in database
    await ctx.runMutation(api.places.updatePlaceFromGoogle, {
      placeId: args.placeId,
      // Basic info
      rating: details.rating,
      userRatingCount: details.userRatingCount,
      // Contact
      phone: details.phone,
      website: details.website,
      // Price
      priceLevel: details.priceLevelMapped,
      // Cuisine (merge with existing)
      cuisine: details.cuisines.length > 0 ? details.cuisines : undefined,
      // Photos
      googlePhotos: photoUrls.length > 0 ? photoUrls : undefined,
      // Google AI summary
      googleSummary: details.generativeSummary,
      // Raw Google types for reference
      googleTypes: details.types,
      // Restaurant attributes
      outdoorSeating: details.outdoorSeating,
      goodForGroups: details.goodForGroups,
      goodForChildren: details.goodForChildren,
      liveMusic: details.liveMusic,
      reservable: details.reservable,
      // Service options
      dineIn: details.dineIn,
      takeout: details.takeout,
      delivery: details.delivery,
      // Menu offerings
      servesBreakfast: details.servesBreakfast,
      servesBrunch: details.servesBrunch,
      servesLunch: details.servesLunch,
      servesDinner: details.servesDinner,
      servesBeer: details.servesBeer,
      servesWine: details.servesWine,
      servesCocktails: details.servesCocktails,
      servesVegetarianFood: details.servesVegetarianFood,
      // Sync timestamp
      lastGoogleSync: Date.now(),
    });

    return {
      success: true,
      placeId: args.placeId,
      name: place.name,
      cuisines: details.cuisines,
      photosAdded: photoUrls.length,
      hasSummary: !!details.generativeSummary,
    };
  },
});

/**
 * Batch sync Google data for all venues with googlePlaceId
 * Full Enterprise + Atmosphere tier sync with photos
 */
export const syncFullGoogleData = action({
  args: {
    limit: v.optional(v.number()),
    fetchPhotos: v.optional(v.boolean()),
    maxPhotosPerVenue: v.optional(v.number()),
    skipAlreadySynced: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const fetchPhotos = args.fetchPhotos ?? true;
    const maxPhotos = args.maxPhotosPerVenue ?? 3;
    const skipSynced = args.skipAlreadySynced ?? true;

    // Get all places with Google Place IDs
    const places: any[] = await ctx.runQuery(api.places.getPlacesWithGoogleId, {
      limit,
      skipSynced,
    });

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const place of places) {
      try {
        const result: any = await ctx.runAction(api.googlePlaces.syncVenueGoogleData, {
          placeId: place._id,
          fetchPhotos,
          maxPhotos,
        });

        results.push({
          placeId: place._id,
          name: place.name,
          success: result.success,
          cuisines: result.cuisines,
          photosAdded: result.photosAdded,
          hasSummary: result.hasSummary,
          error: result.error,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Rate limiting - delay between API calls
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        results.push({
          placeId: place._id,
          name: place.name,
          success: false,
          error: error.message,
        });
        errorCount++;
      }
    }

    return {
      success: true,
      processed: results.length,
      successCount,
      errorCount,
      results,
    };
  },
});
