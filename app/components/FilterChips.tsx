"use client";

import { X } from "lucide-react";

interface Filters {
  category: string | undefined;
  tags: string[];
  priceLevel: string | undefined;
  area: string | undefined;
  nearMetro: boolean | undefined;
  minRating: number | undefined;
  cuisine: string[];
  noise: string | undefined;
  openNow: boolean;
}

interface FilterChipsProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function FilterChips({ filters, onFilterChange }: FilterChipsProps) {
  const tagOptions = ["family-friendly", "outdoor", "indoor", "waterfront", "quiet"];
  const priceOptions = ["Low", "Mid", "High", "Lux"];
  const vibeOptions = ["Quiet", "Moderate", "Lively"];

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const togglePrice = (level: string) => {
    onFilterChange({
      ...filters,
      priceLevel: filters.priceLevel === level ? undefined : level,
    });
  };

  const toggleVibe = (vibe: string) => {
    onFilterChange({
      ...filters,
      noise: filters.noise === vibe ? undefined : vibe,
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

  const clearAll = () => {
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

  const hasActive =
    filters.tags.length > 0 ||
    filters.priceLevel ||
    filters.nearMetro ||
    filters.openNow ||
    filters.noise;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Main Row */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {/* Open Now */}
        <button
          onClick={toggleOpenNow}
          className={`chip ${filters.openNow ? "active" : ""}`}
        >
          Open Now
        </button>

        {/* Near Metro */}
        <button
          onClick={toggleNearMetro}
          className={`chip ${filters.nearMetro ? "active" : ""}`}
        >
          Near Metro
        </button>

        {/* Tags */}
        {tagOptions.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`chip ${filters.tags.includes(tag) ? "active" : ""}`}
          >
            {tag.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Second Row - Price & Vibe */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          overflowX: "auto",
          alignItems: "center",
        }}
      >
        <span style={{ color: "var(--text-secondary)", fontSize: 13, flexShrink: 0 }}>Price:</span>
        {priceOptions.map((price) => (
          <button
            key={price}
            onClick={() => togglePrice(price)}
            className={`chip ${filters.priceLevel === price ? "active" : ""}`}
          >
            {price}
          </button>
        ))}

        <span
          style={{
            width: 1,
            height: 20,
            background: "var(--border-light)",
            margin: "0 8px",
            flexShrink: 0,
          }}
        />

        <span style={{ color: "var(--text-secondary)", fontSize: 13, flexShrink: 0 }}>Vibe:</span>
        {vibeOptions.map((vibe) => (
          <button
            key={vibe}
            onClick={() => toggleVibe(vibe)}
            className={`chip ${filters.noise === vibe ? "active" : ""}`}
          >
            {vibe}
          </button>
        ))}
      </div>

      {/* Clear All */}
      {hasActive && (
        <button
          onClick={clearAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 12,
            color: "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </div>
  );
}
