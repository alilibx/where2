"use client";

import { PlaceCard } from "./PlaceCard";
import { Trophy } from "lucide-react";

interface Place {
  _id: any;
  name: string;
  coverImage: string;
  tags: string[];
  rating: number;
  priceLevel: string;
  distance: number;
  isOpen: boolean | null; // null when opening hours not available (e.g., Google-sourced venues)
  reasons: string;
  area: string;
  cuisine: string[];
  latitude: number;
  longitude: number;
}

interface ResultsListProps {
  results: Place[];
  bestMatch: Place | null;
  totalCount: number;
  userId: string;
  searchQuery: string;
  filters: any;
}

export function ResultsList({
  results,
  bestMatch,
  totalCount,
  userId,
  searchQuery,
  filters,
}: ResultsListProps) {
  if (results.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <h3 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "16px" }}>
          No exact matches found
        </h3>
        <p style={{ color: "#666", marginBottom: "24px" }}>
          We couldn't find places matching all your criteria. Try:
        </p>
        <ul style={{ listStyle: "none", color: "#666", marginBottom: "24px" }}>
          <li>• Removing one or two filters</li>
          <li>• Expanding your search area</li>
          <li>• Adjusting your price range</li>
        </ul>
      </div>
    );
  }

  return (
    <div>
      {/* Results header */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ color: "white", fontSize: "18px" }}>
          Found <strong>{totalCount}</strong> {totalCount === 1 ? "place" : "places"}
        </p>
      </div>

      {/* Best Match */}
      {bestMatch && (
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Trophy size={24} color="#FFD700" />
            <h3 style={{ color: "white", fontSize: "20px", fontWeight: "600" }}>
              Best Match
            </h3>
          </div>
          <PlaceCard
            place={bestMatch}
            userId={userId}
            searchQuery={searchQuery}
            filters={filters}
            isBestMatch={true}
          />
        </div>
      )}

      {/* Other results */}
      {results.length > (bestMatch ? 1 : 0) && (
        <div>
          {bestMatch && (
            <h3
              style={{
                color: "white",
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              Other great options
            </h3>
          )}

          <div style={{ display: "grid", gap: "16px" }}>
            {results
              .filter((place) => !bestMatch || place._id !== bestMatch._id)
              .map((place) => (
                <PlaceCard
                  key={place._id}
                  place={place}
                  userId={userId}
                  searchQuery={searchQuery}
                  filters={filters}
                  isBestMatch={false}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
