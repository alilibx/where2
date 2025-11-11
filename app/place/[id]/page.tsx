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
  ParkingCircle,
  Info,
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
          color: "white",
        }}
      >
        <p>Loading...</p>
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
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
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

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];

  return (
    <main style={{ minHeight: "100vh", paddingBottom: "40px" }}>
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
        <div className="container" style={{ padding: "20px" }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "white",
              fontSize: "16px",
              fontWeight: "500",
            }}
          >
            <ArrowLeft size={20} />
            Back to results
          </button>
        </div>
      </div>

      <div className="container" style={{ marginTop: "24px" }}>
        {/* Hero Image */}
        <div
          style={{
            width: "100%",
            height: "400px",
            borderRadius: "16px",
            background: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url(${place.coverImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "32px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ color: "white", fontSize: "48px", fontWeight: "700", marginBottom: "8px" }}>
                {place.name}
              </h1>
              {place.nameAr && (
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "24px", marginBottom: "16px" }}>
                  {place.nameAr}
                </p>
              )}
            </div>

            <span
              style={{
                background: place.isOpen ? "#10b981" : "#ef4444",
                color: "white",
                padding: "8px 20px",
                borderRadius: "16px",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {place.isOpen ? "Open Now" : "Closed"}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Left Column */}
          <div>
            {/* Quick Info */}
            <div className="card" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "24px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Star size={20} fill="#FFD700" color="#FFD700" />
                  <span style={{ fontSize: "20px", fontWeight: "600" }}>{place.rating.toFixed(1)}</span>
                </div>

                <div style={{ fontSize: "18px", fontWeight: "600", color: "#666" }}>
                  {getPriceLevelSymbols(place.priceLevel)}
                </div>

                <div style={{ color: "#666" }}>{place.cuisine.join(", ")}</div>
              </div>

              <div style={{ display: "flex", alignItems: "start", gap: "8px", color: "#666", marginBottom: "12px" }}>
                <MapPin size={18} style={{ marginTop: "2px", flexShrink: 0 }} />
                <span>{place.area}, Dubai</span>
              </div>

              {place.metroStation && (
                <div style={{ color: "#667eea", marginBottom: "12px", fontSize: "16px" }}>
                  🚇 {place.metroStation} Metro - {place.metroWalkTime} min walk
                </div>
              )}

              {place.parkingNote && (
                <div style={{ display: "flex", alignItems: "start", gap: "8px", color: "#666" }}>
                  <ParkingCircle size={18} style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontSize: "14px" }}>{place.parkingNote}</span>
                </div>
              )}
            </div>

            {/* Highlights */}
            <div className="card" style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
                Why this place?
              </h3>
              <p style={{ color: "#666", lineHeight: "1.6" }}>{place.highlights}</p>
            </div>

            {/* Tags */}
            <div className="card" style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
                Features
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {place.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: "#e0e7ff",
                      color: "#667eea",
                      padding: "8px 16px",
                      borderRadius: "16px",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {tag.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </span>
                ))}
              </div>
            </div>

            {/* Gallery */}
            {place.gallery && place.gallery.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
                  Gallery
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {place.gallery.map((image, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: "100%",
                        height: "150px",
                        borderRadius: "8px",
                        background: `url(${image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div>
            {/* Action Buttons */}
            <div className="card" style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                Quick Actions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button onClick={handleNavigate} className="btn btn-primary" style={{ width: "100%" }}>
                  <Navigation size={20} />
                  Get Directions
                </button>

                {place.phone && (
                  <button onClick={handleCall} className="btn btn-secondary" style={{ width: "100%" }}>
                    <Phone size={20} />
                    Call {place.phone}
                  </button>
                )}

                {place.bookingUrl && (
                  <button onClick={handleBook} className="btn btn-secondary" style={{ width: "100%" }}>
                    <ExternalLink size={20} />
                    Book a Table
                  </button>
                )}

                {place.website && (
                  <button
                    onClick={() => window.open(place.website, "_blank")}
                    className="btn btn-secondary"
                    style={{ width: "100%" }}
                  >
                    <ExternalLink size={20} />
                    Visit Website
                  </button>
                )}

                <button onClick={handleShare} className="btn btn-secondary" style={{ width: "100%" }}>
                  <Share2 size={20} />
                  Share This Place
                </button>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="card" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Clock size={20} />
                <h3 style={{ fontSize: "20px", fontWeight: "600" }}>Opening Hours</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {days.map((day) => (
                  <div
                    key={day}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      background: day === today ? "#e0e7ff" : "transparent",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontWeight: day === today ? "600" : "400", textTransform: "capitalize" }}>
                      {day}
                    </span>
                    <span style={{ color: "#666" }}>
                      {place.openingHours[day as keyof typeof place.openingHours]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            {place.seatingTypes && place.seatingTypes.length > 0 && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Info size={20} />
                  <h3 style={{ fontSize: "20px", fontWeight: "600" }}>Seating Options</h3>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {place.seatingTypes.map((type) => (
                    <span
                      key={type}
                      style={{
                        background: "#f3f4f6",
                        padding: "6px 12px",
                        borderRadius: "12px",
                        fontSize: "14px",
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
