"use client";

import { PlaceCard } from "./PlaceCard";
import { MapPin } from "lucide-react";

interface Place {
  _id: any;
  name: string;
  coverImage: string;
  tags: string[];
  rating: number;
  priceLevel: string;
  distance: number;
  isOpen: boolean | null;
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
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
          padding: 48,
          textAlign: "center",
        }}
      >
        <MapPin size={40} color="var(--text-tertiary)" style={{ marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No places found</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
          Try adjusting your filters or search for something else
        </p>
        <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          <p>• Remove some filters</p>
          <p>• Try a different area</p>
          <p>• Broaden your price range</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Results Count */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{totalCount}</span>{" "}
          {totalCount === 1 ? "place" : "places"} found
        </p>
      </div>

      {/* Results Grid */}
      <div className="grid-cards">
        {/* Best Match first */}
        {bestMatch && (
          <PlaceCard
            key={bestMatch._id + "-best"}
            place={bestMatch}
            userId={userId}
            searchQuery={searchQuery}
            filters={filters}
            isBestMatch={true}
          />
        )}

        {/* Other results */}
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
  );
}
