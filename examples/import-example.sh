#!/bin/bash

# Example script for importing listing pages via the API
# Usage: ./import-example.sh

# Configuration - Replace these with your actual values
COVEO_ORG_ID="${COVEO_ORG_ID:-your-organization-id}"
COVEO_TRACKING_ID="${COVEO_TRACKING_ID:-your-tracking-id}"
COVEO_API_TOKEN="${COVEO_API_TOKEN:-your-api-token}"
PLATFORM_URL="${PLATFORM_URL:-https://platform.cloud.coveo.com}"
API_ENDPOINT="${API_ENDPOINT:-https://your-app.netlify.app/api/import}"

# Path to your CSV file
CSV_FILE="${1:-../samples/listings-sample.csv}"

if [ ! -f "$CSV_FILE" ]; then
    echo "❌ Error: CSV file not found: $CSV_FILE"
    echo "Usage: $0 [path-to-csv-file]"
    exit 1
fi

echo "🚀 Importing listing pages..."
echo "   File: $CSV_FILE"
echo "   Organization: $COVEO_ORG_ID"
echo "   Tracking ID: $COVEO_TRACKING_ID"
echo ""

# Make the API request
response=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -F "file=@$CSV_FILE" \
  -F "organizationId=$COVEO_ORG_ID" \
  -F "trackingId=$COVEO_TRACKING_ID" \
  -F "accessToken=$COVEO_API_TOKEN" \
  -F "platformUrl=$PLATFORM_URL")

# Extract HTTP status code and body
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# Check if successful
if [ "$http_code" -eq 200 ]; then
    echo "✅ Success!"
    echo ""
    echo "$body" | jq '.'
else
    echo "❌ Error (HTTP $http_code)"
    echo ""
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    exit 1
fi
