# Google Places Integration - Admin Guide

**Where2 Dubai Admin Documentation**
**Version:** 1.0
**Last Updated:** January 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Venue Discovery](#venue-discovery)
4. [Venue Enrichment](#venue-enrichment)
5. [User Feedback Management](#user-feedback-management)
6. [Maintenance Tasks](#maintenance-tasks)
7. [Troubleshooting](#troubleshooting)
8. [Cost Monitoring](#cost-monitoring)

---

## Overview

The Where2 Dubai Google Places integration uses a **hybrid approach**:
- **Google provides:** Fresh hours, photos, ratings, phone, website
- **We provide:** Custom tags, metro info, noise levels, curated highlights

This guide explains how to discover venues, enrich them with custom data, and maintain data quality.

---

## Getting Started

### Prerequisites

1. **Google Cloud Project** with Places API (New) enabled
2. **API Key** configured in Convex environment
3. **Billing alerts** set at $50, $100, $200
4. **Convex development environment** running

### Verify Setup

```bash
# Check Convex environment variables
npx convex env list

# Should show:
# GOOGLE_PLACES_API_KEY: ***...***
# OPENROUTER_API_KEY: ***...***
```

---

## Venue Discovery

### Step 1: Discover Venues in a Dubai Area

Use the Convex dashboard to run discovery:

1. Go to Convex Dashboard → Functions
2. Find `googlePlaces:discoverVenues`
3. Run with parameters:

```json
{
  "location": { "lat": 25.1972, "lng": 55.2744 },
  "radius": 2000,
  "types": ["restaurant", "cafe"],
  "maxResults": 20
}
```

**Common Dubai Areas:**

| Area | Latitude | Longitude | Radius | Types |
|------|----------|-----------|--------|-------|
| Downtown Dubai | 25.1972 | 55.2744 | 2000m | restaurant, cafe, bar |
| Dubai Marina | 25.0806 | 55.1400 | 2000m | restaurant, cafe, bar |
| Business Bay | 25.1867 | 55.2636 | 1500m | restaurant, cafe |
| JBR | 25.0783 | 55.1283 | 1000m | restaurant, cafe, bar |
| Palm Jumeirah | 25.1124 | 55.1390 | 3000m | restaurant, bar |
| DIFC | 25.2125 | 55.2805 | 1000m | restaurant, cafe |
| City Walk | 25.2130 | 55.2677 | 1000m | restaurant, cafe |

### Step 2: Create Venue Placeholders

After discovery, create placeholders:

1. Find `googlePlaces:createVenuePlaceholders` (internal action)
2. Run with the venues array from discovery results
3. This creates minimal records with `googlePlaceId` only

**Result:** New venues appear in database with:
- ✅ Google Place ID
- ✅ Name and coordinates
- ❌ **NO custom enrichment yet** (needs manual work)

### Cost: Discovery

- **~$0.032 per venue discovered**
- 300 venues = ~$10 total
- One-time cost per venue

---

## Venue Enrichment

Enrichment is where you add **custom Dubai-specific data** that Google doesn't provide.

### Step 1: Get Unenriched Venues

```bash
# Via Convex dashboard
places:getUnenrichedPlaces({ limit: 50 })

# Returns venues awaiting enrichment
```

### Step 2: AI-Assisted Enrichment

For each venue, use AI to suggest tags:

1. Run `enrichment:suggestEnrichment`
2. Parameters:
```json
{
  "placeId": "j57abc123...",
  "includeReviews": false
}
```

3. AI returns suggestions:
```json
{
  "suggestedTags": ["family-friendly", "outdoor", "waterfront"],
  "tagConfidence": 85,
  "noiseLevel": "Moderate",
  "noiseLevelConfidence": 80,
  "priceLevel": "Mid",
  "priceLevelConfidence": 90,
  "highlights": "Stunning waterfront views with family-friendly atmosphere...",
  "highlightsConfidence": 75,
  "reasoning": "Based on venue type and location..."
}
```

### Step 3: Review and Apply

**Review AI suggestions:**
- ✅ **High confidence (≥90%)**: Auto-apply safe
- ⚠️ **Medium confidence (70-89%)**: Review before applying
- ❌ **Low confidence (<70%)**: Manual research needed

**Apply enrichment:**

```json
places:updatePlaceEnrichment({
  "placeId": "j57abc123...",
  "tags": ["family-friendly", "outdoor", "waterfront"],
  "noise": "Moderate",
  "priceLevel": "Mid",
  "highlights": "Stunning waterfront views...",
  "area": "Dubai Marina",
  "nearMetro": true,
  "metroStation": "DMCC Metro Station",
  "metroWalkTime": 5
})
```

### Step 4: Add Custom Fields

**Metro Information** (our unique value):
- Research nearest metro station
- Measure walk time (Google Maps)
- Add station name and time

**Curated Highlights:**
- Write 1-2 sentences about "why visit"
- Focus on unique aspects
- Be specific and actionable

**Custom Tags Checklist:**

**Family & Accessibility:**
- `family-friendly` - Kids welcome, kids menu
- `kid-friendly` - Play area, activities
- `pet-friendly` - Allows pets

**Environment:**
- `outdoor` - Outdoor seating available
- `indoor` - Indoor seating only
- `waterfront` - Water views
- `rooftop` - Rooftop location

**Atmosphere:**
- `quiet` - Conversation-friendly
- `romantic` - Date-night appropriate
- `lively` - Energetic, social
- `casual` - Relaxed dress code
- `upscale` - Formal, elegant

**Occasion:**
- `good-for-groups` - Large party friendly
- `good-for-dates` - Intimate setting
- `good-for-meetings` - Business appropriate
- `late-night` - Open late
- `breakfast-spot` - Breakfast served
- `brunch-spot` - Weekend brunch

### Time Estimate

- **With AI suggestions:** 2-3 minutes per venue
- **Manual enrichment:** 5-10 minutes per venue
- **50 venues:** ~2-3 hours (with AI)
- **300 venues:** ~10-15 hours total (with AI)

### Batch Auto-Apply (High Confidence Only)

```bash
# Auto-apply suggestions with ≥90% confidence
enrichment:autoApplyHighConfidenceSuggestions({
  "placeId": "j57abc123...",
  "suggestions": { ... },
  "confidenceThreshold": 90
})
```

---

## User Feedback Management

Users can report incorrect venue data. Your job: review and resolve.

### Step 1: View Pending Feedback

```bash
feedback:getPendingFeedback({ limit: 50 })
```

Returns:
```json
[
  {
    "_id": "feedback123",
    "placeId": "j57abc123",
    "placeName": "Salt Bae",
    "feedbackType": "incorrect_tags",
    "description": "This place is not family-friendly, very loud",
    "status": "pending",
    "timestamp": 1705152000000
  }
]
```

### Step 2: Verify Feedback

1. Check venue on Google Maps
2. Read recent reviews
3. Verify claim (visit if necessary)

### Step 3: Resolve Feedback

**If feedback is correct:**

1. Update venue enrichment:
```bash
places:updatePlaceEnrichment({
  "placeId": "j57abc123",
  "tags": ["upscale", "lively"],  # Remove "family-friendly"
  "noise": "Lively"  # Update noise level
})
```

2. Mark feedback as resolved:
```bash
feedback:resolveFeedbackForPlace({
  "placeId": "j57abc123",
  "reviewedBy": "admin@where2dubai.com",
  "reviewNotes": "Verified - removed family-friendly tag, updated noise level"
})
```

**If feedback is incorrect/spam:**

```bash
feedback:updateFeedbackStatus({
  "feedbackId": "feedback123",
  "status": "dismissed",
  "reviewedBy": "admin@where2dubai.com",
  "reviewNotes": "Checked recent reviews - venue is family-friendly"
})
```

### Step 4: Track Feedback Trends

```bash
# Get venues with most feedback
feedback:getTopFeedbackVenues({ limit: 10 })

# Get feedback statistics
feedback:getFeedbackStats()
```

High-feedback venues = data quality issues. Prioritize enrichment updates.

---

## Maintenance Tasks

### Daily

**Check API Costs:**
1. Google Cloud Console → Billing
2. Verify within budget
3. Check for unexpected spikes

**Monitor Errors:**
- Convex logs for API failures
- Target: <1% error rate

### Weekly

**Review Feedback:**
- Process pending feedback (target: 0 pending)
- Update venues with reported issues
- Thank users for valuable feedback (if applicable)

**Cache Performance:**
- Check cache hit rate (target: >70%)
- Clear expired cache if needed

### Monthly

**Discover New Venues:**
- Run discovery in popular areas
- Enrich newly discovered venues

**Quality Audit:**
- Review enrichment completeness
- Update highlights for top venues
- Verify metro information accuracy

### Quarterly

**Expand Coverage:**
- Discover venues in new Dubai neighborhoods
- Remove permanently closed venues
- Verify all metro information

### Annually

**Refresh Place IDs:**

Google recommends refreshing place_ids annually:

```bash
# Get venues needing refresh
places:getPlacesNeedingRefresh()

# Refresh each venue
googlePlaces:refreshPlaceId({ "placeId": "j57abc123" })
```

**ToS Compliance Audit:**
- Verify no Google data stored permanently (except place_id)
- Check cache expiration working
- Review attribution implementation

---

## Troubleshooting

### Issue: Discovery Returns No Venues

**Cause:** Radius too small or wrong coordinates

**Solution:**
- Increase radius (try 3000m)
- Verify coordinates are in Dubai
- Try different venue types

### Issue: API Error 404 on Place Details

**Cause:** Place no longer exists in Google's database

**Solution:**
```bash
# Remove venue or mark as closed
places:updatePlaceEnrichment({
  "placeId": "j57abc123",
  "verified": false
})
```

### Issue: High API Costs

**Cause:** Low cache hit rate or too many Place Details requests

**Solution:**
1. Check cache hit rate (`getCacheStats()` in browser console)
2. Verify 30-day caching enabled
3. Reduce number of enriched results (top 5 → top 3)
4. Check for API call loops in code

### Issue: AI Suggestions Wrong

**Cause:** Insufficient context or venue type mismatch

**Solution:**
- Add `includeReviews: true` (costs more but better accuracy)
- Manually research venue
- Update enrichment guidelines for AI

### Issue: Expired Cache Not Clearing

**Cause:** `initializePlaceDetailsCache()` not called

**Solution:**
- Verify cache initialization in `app/layout.tsx`
- Run `clearExpiredCache()` manually in console

---

## Cost Monitoring

### Expected Costs (Monthly)

| Metric | Target | Alert If |
|--------|--------|----------|
| API Calls | <15K | >20K |
| Cost | <$100 | >$150 |
| Cost per User | <$0.10 | >$0.15 |
| Cache Hit Rate | >70% | <60% |
| Error Rate | <1% | >3% |

### Google Cloud Alerts

Set up budget alerts:

1. Google Cloud Console → Billing → Budgets & Alerts
2. Create budget alerts at:
   - $50 (50% of monthly budget)
   - $100 (100% of monthly budget)
   - $200 (200% - urgent action needed)

### Cost Optimization Tips

1. **Aggressive Caching**
   - Verify 30-day cache working
   - Monitor cache hit rate
   - Target: >70% hit rate

2. **Selective Enrichment**
   - Enrich top 5 results only (not all 10)
   - Lazy-load venue details on demand

3. **Field Optimization**
   - Review field mask in `fetchPlaceDetails`
   - Remove unused fields
   - Balance between cost and UX

4. **Rate Limiting**
   - Implement per-user search limits (10 searches/hour)
   - Throttle API calls during high traffic

5. **Batch Operations**
   - Discover venues in batches
   - Add delays between API calls

---

## Best Practices

### Enrichment Guidelines

**DO:**
- ✅ Verify AI suggestions before applying
- ✅ Add metro info for all venues
- ✅ Write specific, actionable highlights
- ✅ Use consistent tag taxonomy
- ✅ Research venue before enriching

**DON'T:**
- ❌ Auto-apply low confidence suggestions
- ❌ Copy-paste highlights from Google
- ❌ Add tags without verification
- ❌ Enrich without checking photos/reviews
- ❌ Ignore user feedback

### Data Quality Standards

**Highlights:**
- 1-2 sentences
- Focus on "why visit"
- Specific, not generic
- No promotional language

**Tags:**
- Max 5-7 tags per venue
- Only accurate tags
- Verify from multiple sources

**Metro Info:**
- Walk time: 1-15 minutes
- Use Google Maps for accuracy
- Round to nearest minute

---

## Support & Resources

**Documentation:**
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Google ToS](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Convex Documentation](https://docs.convex.dev)

**Internal:**
- `docs/enrichment-guidelines.md` - Detailed tag guidelines
- `README.md` - Technical integration overview

**Contact:**
- Technical issues: Check Convex logs
- Cost issues: Google Cloud billing dashboard
- Data quality: User feedback system

---

**End of Admin Guide**

*For frontend integration and component updates, see README.md > Google Places Integration > Next Steps*
