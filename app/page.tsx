"use client";

import { useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { FilterChips } from "./components/FilterChips";
import { ResultsList } from "./components/ResultsList";
import { PreferenceToggle } from "./components/PreferenceToggle";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Home() {
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("where2-user-id");
      if (!id) {
        id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("where2-user-id", id);
      }
      return id;
    }
    return "guest";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    tags: [] as string[],
    priceLevel: undefined as string | undefined,
    area: undefined as string | undefined,
    nearMetro: undefined as boolean | undefined,
    minRating: undefined as number | undefined,
    cuisine: [] as string[],
    noise: undefined as string | undefined,
    openNow: false,
  });

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const [showResults, setShowResults] = useState(false);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);

  const userPrefs = useQuery(api.preferences.getUserPreferences, { userId });

  const results = useQuery(
    api.places.searchPlaces,
    showResults
      ? {
          query: searchQuery,
          ...filters,
          userLat: userLocation?.lat,
          userLon: userLocation?.lon,
          userId,
        }
      : "skip"
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(true);

    // Request location permission on first search if not asked
    if (!locationPermissionAsked && typeof window !== "undefined" && "geolocation" in navigator) {
      setLocationPermissionAsked(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location permission denied or error:", error);
        }
      );
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    if (showResults) {
      // Trigger re-search with new filters
      setShowResults(true);
    }
  };

  return (
    <main style={{ minHeight: "100vh", paddingBottom: "40px" }}>
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
        <div className="container" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ color: "white", fontSize: "28px", fontWeight: "700" }}>
              Where2 Dubai
            </h1>
            <PreferenceToggle userId={userId} currentPrefs={userPrefs || undefined} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container" style={{ marginTop: "40px" }}>
        {!showResults ? (
          // Home/Onboarding View
          <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
            <h2
              style={{
                color: "white",
                fontSize: "32px",
                fontWeight: "700",
                marginBottom: "16px",
              }}
            >
              What are you in the mood for?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "18px", marginBottom: "32px" }}>
              Discover the perfect place in Dubai, right now.
            </p>

            <SearchBar onSearch={handleSearch} />

            {/* Quick chips */}
            <div style={{ marginTop: "32px" }}>
              <p style={{ color: "white", marginBottom: "16px", fontSize: "14px" }}>
                Quick suggestions:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
                {[
                  { label: "Outdoor now", filters: { tags: ["outdoor"] } },
                  { label: "Near Metro", filters: { nearMetro: true } },
                  { label: "Family-friendly", filters: { tags: ["family-friendly"] } },
                  { label: "Waterfront", filters: { tags: ["waterfront"] } },
                  { label: "Open late", filters: { openNow: true } },
                ].map((suggestion) => (
                  <button
                    key={suggestion.label}
                    className="chip"
                    style={{ background: "rgba(255,255,255,0.9)" }}
                    onClick={() => {
                      handleFilterChange({
                        ...filters,
                        ...suggestion.filters,
                        tags: suggestion.filters.tags
                          ? [...filters.tags, ...suggestion.filters.tags]
                          : filters.tags,
                      });
                      setSearchQuery(suggestion.label);
                      setShowResults(true);
                    }}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info section */}
            <div
              style={{
                marginTop: "48px",
                background: "rgba(255,255,255,0.95)",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "left",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>
                How it works
              </h3>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>🎤</span>
                  <div>
                    <strong>Speak or type</strong> what you're looking for
                  </div>
                </li>
                <li style={{ display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>🎯</span>
                  <div>
                    <strong>Get smart matches</strong> based on your preferences
                  </div>
                </li>
                <li style={{ display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>🗺️</span>
                  <div>
                    <strong>Navigate, call, or book</strong> in one tap
                  </div>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          // Results View
          <div>
            <div style={{ marginBottom: "24px" }}>
              <SearchBar onSearch={handleSearch} initialValue={searchQuery} />
            </div>

            <FilterChips filters={filters} onFilterChange={handleFilterChange} />

            {results ? (
              <ResultsList
                results={results.places}
                bestMatch={results.bestMatch}
                totalCount={results.totalCount}
                userId={userId}
                searchQuery={searchQuery}
                filters={filters}
              />
            ) : (
              <div style={{ textAlign: "center", color: "white", padding: "40px" }}>
                <p>Searching...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
