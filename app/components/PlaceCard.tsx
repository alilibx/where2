"use client";

import { Star, MapPin, Phone, Navigation, ArrowUpRight } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

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
  phone?: string;
  bookingUrl?: string;
  latitude: number;
  longitude: number;
  metroStation?: string;
  metroWalkTime?: number;
  googlePhotos?: string[];
}

interface PlaceCardProps {
  place: Place;
  userId: string;
  searchQuery: string;
  filters: any;
  isBestMatch: boolean;
}

export function PlaceCard({ place, userId, searchQuery, filters, isBestMatch }: PlaceCardProps) {
  const recordSelection = useMutation(api.preferences.recordPlaceSelection);

  const handleCardClick = () => {
    recordSelection({
      userId,
      placeId: place._id,
      query: searchQuery,
      filters,
    });
    window.location.href = `/place/${place._id}`;
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordSelection({
      userId,
      placeId: place._id,
      query: searchQuery,
      filters,
    });
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
      "_blank"
    );
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (place.phone) {
      window.location.href = `tel:${place.phone}`;
    }
  };

  const getPriceSymbol = (level: string) => {
    const map: Record<string, string> = { Low: "$", Mid: "$$", High: "$$$", Lux: "$$$$" };
    return map[level] || level;
  };

  // Use Google photos if available, fall back to coverImage
  const imageUrl = place.googlePhotos?.[0] || place.coverImage;

  return (
    <article
      onClick={handleCardClick}
      className="card card-hover"
      style={{
        cursor: "pointer",
        padding: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Best Match Badge */}
      {isBestMatch && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            background: "var(--accent)",
            color: "white",
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          Best Match
        </div>
      )}

      {/* Image */}
      <div
        style={{
          width: "100%",
          height: 180,
          background: imageUrl
            ? `url(${imageUrl})`
            : "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--border-light) 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {/* Open Status */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          <span
            className={`badge ${place.isOpen ? "badge-success" : "badge-error"}`}
            style={{ fontSize: 11 }}
          >
            {place.isOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{place.name}</h3>
          <ArrowUpRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0, marginLeft: 8 }} />
        </div>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Star size={14} fill="#facc15" color="#facc15" />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{place.rating.toFixed(1)}</span>
          </div>
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{getPriceSymbol(place.priceLevel)}</span>
          {place.cuisine.length > 0 && (
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{place.cuisine[0]}</span>
          )}
        </div>

        {/* Location */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", marginBottom: 8 }}>
          <MapPin size={13} />
          <span style={{ fontSize: 13 }}>
            {place.area}
            {place.distance > 0 && ` · ${place.distance.toFixed(1)} km`}
          </span>
        </div>

        {/* Metro */}
        {place.metroStation && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
            🚇 {place.metroStation} · {place.metroWalkTime} min walk
          </div>
        )}

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {place.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                padding: "3px 8px",
                borderRadius: "var(--radius-full)",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {tag.replace("-", " ")}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleNavigate}
            className="btn btn-primary"
            style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}
          >
            <Navigation size={14} />
            Directions
          </button>
          {place.phone && (
            <button
              onClick={handleCall}
              className="btn btn-secondary"
              style={{ padding: "10px 14px", fontSize: 13 }}
            >
              <Phone size={14} />
              Call
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
