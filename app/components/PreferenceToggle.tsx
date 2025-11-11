"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Settings, Trash2, Heart } from "lucide-react";

interface PreferenceToggleProps {
  userId: string;
  currentPrefs?: any;
}

export function PreferenceToggle({ userId, currentPrefs }: PreferenceToggleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const updatePrefs = useMutation(api.preferences.updateUserPreferences);
  const clearPrefs = useMutation(api.preferences.clearUserPreferences);
  const vibeSummary = useQuery(api.preferences.getUserVibeSummary, { userId });

  const handleToggleMemory = async () => {
    await updatePrefs({
      userId,
      memoryEnabled: !currentPrefs?.memoryEnabled,
    });
  };

  const handleClearPreferences = async () => {
    if (confirm("Clear all your learned preferences? This cannot be undone.")) {
      await clearPrefs({ userId });
      alert("Preferences cleared!");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          background: "rgba(255,255,255,0.2)",
          color: "white",
          padding: "10px 16px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: "500",
        }}
      >
        <Settings size={20} />
        Preferences
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowMenu(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />

          {/* Menu */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              padding: "20px",
              minWidth: "300px",
              zIndex: 1000,
            }}
          >
            <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
              Your Preferences
            </h4>

            {/* Memory toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                padding: "12px",
                background: "#f3f4f6",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Heart size={20} color="#667eea" />
                <span style={{ fontWeight: "500" }}>Remember my vibe</span>
              </div>
              <button
                onClick={handleToggleMemory}
                style={{
                  width: "52px",
                  height: "28px",
                  borderRadius: "14px",
                  background: currentPrefs?.memoryEnabled ? "#667eea" : "#d1d5db",
                  position: "relative",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "white",
                    position: "absolute",
                    top: "4px",
                    left: currentPrefs?.memoryEnabled ? "28px" : "4px",
                    transition: "all 0.2s",
                  }}
                />
              </button>
            </div>

            {/* Vibe summary */}
            {currentPrefs?.memoryEnabled && vibeSummary && vibeSummary.summary !== "No preferences learned yet" && (
              <div
                style={{
                  background: "#e0e7ff",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                <p style={{ fontSize: "12px", color: "#667eea", fontWeight: "600", marginBottom: "4px" }}>
                  Your Vibe:
                </p>
                <p style={{ fontSize: "14px", color: "#333" }}>{vibeSummary.summary}</p>
              </div>
            )}

            {/* Clear preferences */}
            {currentPrefs?.memoryEnabled && (
              <button
                onClick={handleClearPreferences}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#ef4444",
                  fontSize: "14px",
                  padding: "8px",
                  width: "100%",
                  justifyContent: "center",
                  background: "#fee2e2",
                  borderRadius: "8px",
                }}
              >
                <Trash2 size={16} />
                Clear All Preferences
              </button>
            )}

            <p style={{ fontSize: "12px", color: "#666", marginTop: "12px" }}>
              {currentPrefs?.memoryEnabled
                ? "We'll learn from your choices to give better recommendations over time."
                : "Preference learning is disabled. Your choices won't influence future results."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
