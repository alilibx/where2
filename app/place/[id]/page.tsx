"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  ExternalLink,
  Share2,
  Navigation,
  Clock,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

export default function PlaceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const placeId = params.id as Id<"places">;

  const place = useQuery(api.places.getPlace, { placeId });

  if (!place) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="skeleton" style={{ width: 200, height: 24, margin: "0 auto 12px" }} />
          <div className="skeleton" style={{ width: 140, height: 16, margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  const handleNavigate = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
      "_blank"
    );
  };

  const handleCall = () => {
    if (place.phone) {
      window.location.href = `tel:${place.phone}`;
    }
  };

  const handleBook = () => {
    if (place.bookingUrl) {
      window.open(place.bookingUrl, "_blank");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: place.name,
      text: `Check out ${place.name} - ${place.highlights}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      alert("Link copied!");
    }
  };

  const getPriceSymbol = (level: string) => {
    const map: Record<string, string> = { Low: "$", Mid: "$$", High: "$$$", Lux: "$$$$" };
    return map[level] || level;
  };

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];

  // Use Google photos if available
  const imageUrl = place.googlePhotos?.[0] || place.coverImage;
  const galleryImages = place.googlePhotos?.slice(1, 5) || place.gallery || [];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
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
          <button
            onClick={() => router.back()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-primary)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: "24px 16px 48px" }}>
        {/* Hero Image */}
        <div
          style={{
            width: "100%",
            height: 280,
            borderRadius: "var(--radius-lg)",
            background: imageUrl
              ? `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), url(${imageUrl})`
              : "var(--bg-tertiary)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            marginBottom: 24,
            position: "relative",
          }}
        >
          {/* Status Badge */}
          <div style={{ position: "absolute", top: 16, right: 16 }}>
            <span className={`badge ${place.isOpen ? "badge-success" : "badge-error"}`}>
              {place.isOpen ? "Open Now" : "Closed"}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr", maxWidth: 800 }}>
          {/* Title Section */}
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>
              {place.name}
            </h1>
            {place.nameAr && (
              <p style={{ color: "var(--text-secondary)", fontSize: 18, marginBottom: 16 }}>{place.nameAr}</p>
            )}

            {/* Meta Info */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Star size={18} fill="#facc15" color="#facc15" />
                <span style={{ fontSize: 16, fontWeight: 600 }}>{place.rating.toFixed(1)}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-secondary)" }}>
                {getPriceSymbol(place.priceLevel)}
              </span>
              <span style={{ color: "var(--text-secondary)", fontSize: 15 }}>{place.cuisine.join(", ")}</span>
            </div>

            {/* Location */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", marginBottom: 8 }}>
              <MapPin size={16} />
              <span style={{ fontSize: 14 }}>{place.area}, Dubai</span>
            </div>

            {/* Metro */}
            {place.metroStation && (
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                🚇 {place.metroStation} Metro · {place.metroWalkTime} min walk
              </div>
            )}

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {place.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {tag.replace("-", " ")}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="card"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
            }}
          >
            <button onClick={handleNavigate} className="btn btn-primary" style={{ gridColumn: "span 2" }}>
              <Navigation size={18} />
              Get Directions
            </button>

            {place.phone && (
              <button onClick={handleCall} className="btn btn-secondary">
                <Phone size={18} />
                Call
              </button>
            )}

            {place.bookingUrl && (
              <button onClick={handleBook} className="btn btn-secondary">
                <ExternalLink size={18} />
                Book
              </button>
            )}

            {place.website && (
              <button onClick={() => window.open(place.website, "_blank")} className="btn btn-secondary">
                <ExternalLink size={18} />
                Website
              </button>
            )}

            <button
              onClick={handleShare}
              className="btn btn-outline"
              style={{ gridColumn: !place.phone && !place.bookingUrl && !place.website ? "span 2" : "auto" }}
            >
              <Share2 size={18} />
              Share
            </button>
          </div>

          {/* Highlights */}
          {place.highlights && (
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>About this place</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{place.highlights}</p>
            </div>
          )}

          {/* Opening Hours */}
          {place.openingHours && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Clock size={18} />
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Opening Hours</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {days.map((day) => (
                  <div
                    key={day}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: day === today ? "var(--accent-light)" : "transparent",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: day === today ? 600 : 400,
                        fontSize: 14,
                        textTransform: "capitalize",
                      }}
                    >
                      {day}
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                      {place.openingHours![day as keyof typeof place.openingHours]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Gallery</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {galleryImages.map((image, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "100%",
                      height: 140,
                      borderRadius: "var(--radius-md)",
                      background: `url(${image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Parking Note */}
          {place.parkingNote && (
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Parking</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{place.parkingNote}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
