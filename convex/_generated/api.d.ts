/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as conversations from "../conversations.js";
import type * as embeddings from "../embeddings.js";
import type * as enrichment from "../enrichment.js";
import type * as feedback from "../feedback.js";
import type * as googlePlaces from "../googlePlaces.js";
import type * as places from "../places.js";
import type * as preferences from "../preferences.js";
import type * as seedData from "../seedData.js";
import type * as semanticSearch from "../semanticSearch.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  conversations: typeof conversations;
  embeddings: typeof embeddings;
  enrichment: typeof enrichment;
  feedback: typeof feedback;
  googlePlaces: typeof googlePlaces;
  places: typeof places;
  preferences: typeof preferences;
  seedData: typeof seedData;
  semanticSearch: typeof semanticSearch;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
