"use client";

import { Star, MapPin, Phone, ExternalLink, Share2, Navigation } from "lucide-react";
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
  isOpen: boolean;
  reasons: string;
  area: string;
  cuisine: string[];
  phone?: string;
  bookingUrl?: string;
  latitude: number;
  longitude: number;
  metroStation?: string;
  metroWalkTime?: number;
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
    // Record the selection for preference learning
    recordSelection({
      userId,
      placeId: place._id,
      query: searchQuery,
      filters,
    });

    // Navigate to details page
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

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (place.bookingUrl) {
      window.open(place.bookingUrl, "_blank");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: place.name,
      text: `Check out ${place.name} in ${place.area} - ${place.reasons}`,
      url: window.location.origin + `/place/${place._id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      alert("Link copied to clipboard!");
    }
  };

  const getPriceLevelSymbols = (level: string) => {
    const map: { [key: string]: string } = {
      Low: "$",
      Mid: "$$",
      High: "$$$",
      Lux: "$$$$",
    };
    return map[level] || level;
  };

  return (
    <div
      className="card"
      onClick={handleCardClick}
      style={{
        cursor: "pointer",
        border: isBestMatch ? "3px solid #FFD700" : "none",
        position: "relative",
      }}
    >
      {/* Cover Image */}
      <div
        style={{
          width: "100%",
          height: "200px",
          borderRadius: "8px",
          background: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url(${place.coverImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px",
        }}
      >
        {/* Status badge */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span
            style={{
              background: place.isOpen ? "#10b981" : "#ef4444",
              color: "white",
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {place.isOpen ? "Open Now" : "Closed"}
          </span>
        </div>

        {/* Name */}
        <h3 style={{ color: "white", fontSize: "24px", fontWeight: "700" }}>
          {place.name}
        </h3>
      </div>

      {/* Info */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          {/* Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Star size={16} fill="#FFD700" color="#FFD700" />
            <span style={{ fontWeight: "600" }}>{place.rating.toFixed(1)}</span>
          </div>

          {/* Price */}
          <span style={{ color: "#666", fontWeight: "600" }}>
            {getPriceLevelSymbols(place.priceLevel)}
          </span>

          {/* Cuisine */}
          <span style={{ color: "#666" }}>{place.cuisine.join(", ")}</span>
        </div>

        {/* Area and Distance */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#666", marginBottom: "8px" }}>
          <MapPin size={14} />
          <span style={{ fontSize: "14px" }}>
            {place.area}
            {place.distance > 0 && ` • ${place.distance.toFixed(1)} km away`}
          </span>
        </div>

        {/* Metro info */}
        {place.metroStation && (
          <div style={{ fontSize: "14px", color: "#667eea", marginBottom: "8px" }}>
            🚇 {place.metroStation} Metro ({place.metroWalkTime} min walk)
          </div>
        )}

        {/* Reasons */}
        <div
          style={{
            background: "#f3f4f6",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#333",
            marginBottom: "12px",
          }}
        >
          {place.reasons}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
        {place.tags.map((tag) => (
          <span
            key={tag}
            style={{
              background: "#e0e7ff",
              color: "#667eea",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={handleNavigate}
          className="btn btn-primary"
          style={{ flex: 1, minWidth: "120px", fontSize: "14px", padding: "10px 16px" }}
        >
          <Navigation size={16} />
          Navigate
        </button>

        {place.phone && (
          <button
            onClick={handleCall}
            className="btn btn-secondary"
            style={{ fontSize: "14px", padding: "10px 16px" }}
          >
            <Phone size={16} />
            Call
          </button>
        )}

        {place.bookingUrl && (
          <button
            onClick={handleBook}
            className="btn btn-secondary"
            style={{ fontSize: "14px", padding: "10px 16px" }}
          >
            <ExternalLink size={16} />
            Book
          </button>
        )}

        <button
          onClick={handleShare}
          className="btn btn-secondary"
          style={{ fontSize: "14px", padding: "10px 16px" }}
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
}
