"use client";

import { X } from "lucide-react";

interface Filters {
  category?: string;
  tags: string[];
  priceLevel?: string;
  area?: string;
  nearMetro?: boolean;
  minRating?: number;
  cuisine: string[];
  noise?: string;
  openNow: boolean;
}

interface FilterChipsProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function FilterChips({ filters, onFilterChange }: FilterChipsProps) {
  const availableTags = [
    "family-friendly",
    "kid-friendly",
    "outdoor",
    "indoor",
    "waterfront",
  ];

  const availablePriceLevels = ["Low", "Mid", "High", "Lux"];
  const availableNoise = ["Quiet", "Moderate", "Lively"];

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const togglePriceLevel = (level: string) => {
    onFilterChange({
      ...filters,
      priceLevel: filters.priceLevel === level ? undefined : level,
    });
  };

  const toggleNearMetro = () => {
    onFilterChange({
      ...filters,
      nearMetro: filters.nearMetro ? undefined : true,
    });
  };

  const toggleOpenNow = () => {
    onFilterChange({
      ...filters,
      openNow: !filters.openNow,
    });
  };

  const toggleNoise = (noise: string) => {
    onFilterChange({
      ...filters,
      noise: filters.noise === noise ? undefined : noise,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      category: undefined,
      tags: [],
      priceLevel: undefined,
      area: undefined,
      nearMetro: undefined,
      minRating: undefined,
      cuisine: [],
      noise: undefined,
      openNow: false,
    });
  };

  const hasActiveFilters =
    filters.tags.length > 0 ||
    filters.priceLevel ||
    filters.nearMetro ||
    filters.openNow ||
    filters.noise;

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <span style={{ color: "white", fontWeight: "600" }}>Filters:</span>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "white",
              fontSize: "14px",
              textDecoration: "underline",
            }}
          >
            <X size={16} />
            Clear all
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
        {/* Tags */}
        {availableTags.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`chip ${filters.tags.includes(tag) ? "active" : ""}`}
            style={{ background: filters.tags.includes(tag) ? "#667eea" : "white" }}
          >
            {tag.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
          </button>
        ))}

        {/* Near Metro */}
        <button
          onClick={toggleNearMetro}
          className={`chip ${filters.nearMetro ? "active" : ""}`}
          style={{ background: filters.nearMetro ? "#667eea" : "white" }}
        >
          Near Metro
        </button>

        {/* Open Now */}
        <button
          onClick={toggleOpenNow}
          className={`chip ${filters.openNow ? "active" : ""}`}
          style={{ background: filters.openNow ? "#667eea" : "white" }}
        >
          Open Now
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
        {/* Price Levels */}
        <span style={{ color: "white", fontSize: "14px", alignSelf: "center", marginRight: "8px" }}>
          Price:
        </span>
        {availablePriceLevels.map((level) => (
          <button
            key={level}
            onClick={() => togglePriceLevel(level)}
            className={`chip ${filters.priceLevel === level ? "active" : ""}`}
            style={{ background: filters.priceLevel === level ? "#667eea" : "white" }}
          >
            {level}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {/* Noise Levels */}
        <span style={{ color: "white", fontSize: "14px", alignSelf: "center", marginRight: "8px" }}>
          Vibe:
        </span>
        {availableNoise.map((noise) => (
          <button
            key={noise}
            onClick={() => toggleNoise(noise)}
            className={`chip ${filters.noise === noise ? "active" : ""}`}
            style={{ background: filters.noise === noise ? "#667eea" : "white" }}
          >
            {noise}
          </button>
        ))}
      </div>
    </div>
  );
}
