"use client";

import { useState, useEffect, useCallback } from "react";
import { AISearchBar } from "./components/AISearchBar";
import { ChatInterface } from "./components/ChatInterface";
import { FilterChips } from "./components/FilterChips";
import { ResultsList } from "./components/ResultsList";
import { MessageSquare, Search as SearchIcon, MapPin } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const ROTATING_PHRASES = [
  "Find your spot",
  "Discover hidden gems",
  "Your perfect cafe",
  "Dinner with a view",
  "Family-friendly fun",
  "Near the Metro",
];

function useTypingAnimation(phrases: string[], typingSpeed = 80, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayText.length < currentPhrase.length) {
            setDisplayText(currentPhrase.slice(0, displayText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1));
          } else {
            setIsDeleting(false);
            setPhraseIndex((prev) => (prev + 1) % phrases.length);
          }
        }
      },
      isDeleting ? typingSpeed / 2 : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex, phrases, typingSpeed, pauseDuration]);

  return displayText;
}

export default function Home() {
  const [userId, setUserId] = useState("guest");
  const [mounted, setMounted] = useState(false);

  // Initialize userId on client only
  useEffect(() => {
    setMounted(true);
    let id = localStorage.getItem("where2-user-id");
    if (!id) {
      id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("where2-user-id", id);
    }
    setUserId(id);
  }, []);

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
  const [mode, setMode] = useState<"search" | "chat">("search");

  const typingText = useTypingAnimation(ROTATING_PHRASES);

  const results = useQuery(
    api.places.searchPlaces,
    showResults && mounted
      ? {
          query: searchQuery,
          ...filters,
          userLat: userLocation?.lat,
          userLon: userLocation?.lon,
          userId,
        }
      : "skip"
  );

  // Request location on mount
  useEffect(() => {
    if (mounted && !locationPermissionAsked && "geolocation" in navigator) {
      setLocationPermissionAsked(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {}
      );
    }
  }, [mounted, locationPermissionAsked]);

  const handleSearch = useCallback((query: string, aiFilters?: any, intent?: string) => {
    setSearchQuery(intent || query);

    if (aiFilters) {
      setFilters((prev) => ({
        category: aiFilters.category ?? prev.category,
        tags: aiFilters.tags ?? prev.tags,
        priceLevel: aiFilters.priceLevel ?? prev.priceLevel,
        area: aiFilters.area ?? prev.area,
        nearMetro: aiFilters.nearMetro ?? prev.nearMetro,
        minRating: aiFilters.minRating ?? prev.minRating,
        cuisine: aiFilters.cuisine ?? prev.cuisine,
        noise: aiFilters.noise ?? prev.noise,
        openNow: aiFilters.openNow ?? prev.openNow,
      }));
    }

    setShowResults(true);
  }, []);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const quickFilters = [
    { label: "Open Now", filters: { openNow: true } },
    { label: "Near Metro", filters: { nearMetro: true } },
    { label: "Family", filters: { tags: ["family-friendly"] } },
    { label: "Outdoor", filters: { tags: ["outdoor"] } },
    { label: "Waterfront", filters: { tags: ["waterfront"] } },
  ];

  return (
    <main style={{ minHeight: "100vh", paddingBottom: 48 }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div className="container" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Logo */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              onClick={() => {
                setShowResults(false);
                setSearchQuery("");
              }}
            >
              <MapPin size={20} strokeWidth={2.5} />
              <span style={{ fontSize: 17, fontWeight: 600 }}>Where2</span>
            </div>

            {/* Mode Toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-full)",
                padding: 3,
              }}
            >
              <button
                onClick={() => setMode("search")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  background: mode === "search" ? "var(--bg-secondary)" : "transparent",
                  color: mode === "search" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: mode === "search" ? "var(--shadow-sm)" : "none",
                }}
              >
                <SearchIcon size={14} />
                Search
              </button>
              <button
                onClick={() => {
                  setMode("chat");
                  setShowResults(false);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  background: mode === "chat" ? "var(--bg-secondary)" : "transparent",
                  color: mode === "chat" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: mode === "chat" ? "var(--shadow-sm)" : "none",
                }}
              >
                <MessageSquare size={14} />
                Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container" style={{ paddingTop: 24 }}>
        {mode === "chat" ? (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <ChatInterface userId={userId} onSearchTriggered={handleSearch} />

            {showResults && results && (
              <div style={{ marginTop: 32 }}>
                <FilterChips filters={filters} onFilterChange={handleFilterChange} />
                <ResultsList
                  results={results.places}
                  bestMatch={results.bestMatch}
                  totalCount={results.totalCount}
                  userId={userId}
                  searchQuery={searchQuery}
                  filters={filters}
                />
              </div>
            )}
          </div>
        ) : !showResults ? (
          /* Home View */
          <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 48 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  marginBottom: 8,
                  letterSpacing: "-0.02em",
                  minHeight: 40,
                }}
              >
                {typingText}
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 32,
                    background: "var(--accent)",
                    marginLeft: 2,
                    verticalAlign: "middle",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
                Discover the best places in Dubai
              </p>
            </div>

            <AISearchBar onSearch={handleSearch} />

            {/* Quick Filters */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                marginTop: 20,
              }}
            >
              {quickFilters.map((item) => (
                <button
                  key={item.label}
                  className="chip"
                  onClick={() => {
                    const newTags = item.filters.tags
                      ? Array.from(new Set([...filters.tags, ...item.filters.tags]))
                      : filters.tags;
                    handleFilterChange({
                      ...filters,
                      ...item.filters,
                      tags: newTags,
                    });
                    setSearchQuery(item.label);
                    setShowResults(true);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Info Cards */}
            <div style={{ marginTop: 48, display: "grid", gap: 12 }}>
              {[
                { icon: "🎯", title: "AI-Powered", desc: "Natural language search" },
                { icon: "🗺️", title: "150+ Venues", desc: "Curated Dubai spots" },
                { icon: "⚡", title: "Real-time", desc: "Open now & directions" },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Results View */
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <AISearchBar onSearch={handleSearch} initialValue={searchQuery} />
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
              <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
                <div className="skeleton" style={{ width: 200, height: 20, margin: "0 auto 12px" }} />
                <div className="skeleton" style={{ width: 140, height: 16, margin: "0 auto" }} />
              </div>
            )}
          </div>
        )}
      </div>

    </main>
  );
}
