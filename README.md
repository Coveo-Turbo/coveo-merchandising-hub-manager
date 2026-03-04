# Coveo Merchandising Hub Manager

A specialized web application designed to streamline the management of Coveo Commerce Listing Pages. This tool allows merchandisers and developers to bulk create/update listing configurations via CSV, manage global search and listing settings, and perform environment maintenance.

## Features

### 1. Import Wizard
*   **Connection-First Setup:** Connect with Organization ID, Region, and Access Token, then automatically load tracking IDs from `/rest/organizations/{organizationId}/trackingidcatalogmappings`.
*   **Tracking Selector in Header:** Change tracking ID from the top menu without returning to step 1.
*   **Bulk Creation/Update:** Upload a CSV file to create or update hundreds of listing pages at once.
*   **Smart Parsing:** Automatically groups rows by page name, supports multiple URL patterns per page, and handles locale-specific rules.
*   **Upsert Logic:** Checks for existing listings to prevent duplicates (API 412 errors) by updating existing IDs instead of failing.
*   **AI Enhancement:** Uses Google Gemini (GenAI) to suggest relevant filter rules based on page names.

### 2. REST API for Programmatic Import
*   **Automated Imports:** Trigger imports programmatically via a REST API endpoint without using the UI.
*   **CI/CD Integration:** Integrate with GitHub Actions, Jenkins, or any automation tool.
*   **Multiple Formats:** Accepts CSV file uploads or JSON payloads with CSV content.
*   **See [API Documentation](./API.md) for details.**

### 3. Global Configuration Manager
*   **Search & Listing Configs:** View and edit the global configuration JSON for your Commerce organization.
*   **Common Settings UI:** Quickly adjust `perPage`, `additionalFields`, and `sorts` using a visual interface without touching JSON.
*   **Copy/Paste Settings:** Easily copy common settings from your Search config to your Listing config to keep them consistent.
*   **Product Suggest & Recommendations:** Manage configurations for these subsystems as well.

### 4. Ranking Rules Manager
*   **Export:** Fetch and export all ranking rules as JSON for backup and portability.
*   **Import:** Upload and import ranking rules from JSON files.
*   **Full API Support:** Uses Coveo's private Commerce API for complete import/export functionality.
*   **Bulk Operations:** Import multiple rules at once with validation and error reporting.
*   **See [Ranking Rules Documentation](./docs/RANKING_RULES.md) for detailed usage guide.**

### 5. Maintenance Tools
*   **Bulk Delete:** A "Danger Zone" utility to fetch and delete all listing pages for a specific tracking ID. Useful for resetting non-production environments.
*   **Export:** Download all listing pages as a CSV file for backup or editing.

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd cmh-manager
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` (or `.env.local`) file in the root directory to store your Google Gemini API Key (required for AI features).
    ```env
    VITE_API_KEY=your_google_gemini_api_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Usage Guide

### Step 1: Connection
Enter your Coveo Platform credentials and connect.
*   **Region:** Select the platform region (US, CA, EU, AU).
*   **Organization ID:** The ID of your Coveo organization.
*   **Access Token:** An API key with **Commerce - Merchandising Hub (Edit)** privileges.
*   **Connect:** The app calls `/trackingidcatalogmappings` and extracts tracking IDs. If no tracking IDs are found, the wizard remains blocked at step 1.

After a successful connection:
*   Tracking IDs are available in a header dropdown (desktop and mobile).
*   You can switch tracking IDs quickly from the top menu.
*   A **Disconnect** action is available in the top menu to clear session and reconnect to another org/token.
*   Session state (org, region, token, tracking ID) is saved for the current browser session.

> **Developer Mode:** Click the "V1.1" version number in the header 5 times to enable Developer Mode, allowing you to load preset configurations.

### Step 2: CSV Upload
Prepare a CSV file with the following headers:
*   `Name` (Required): The internal name of the listing page.
*   `UrlPattern`: The URL to match. Separate multiple URLs with semicolons (`;`).
*   `FilterField`: The field to filter on (e.g., `ec_category`).
*   `FilterValue`: The value to match.
*   `Language`, `Country`, `Currency` (Optional): Define locale-specific rules.

**Example:**
```csv
Name,UrlPattern,FilterField,FilterValue,Language
"Summer Sale","https://site.com/summer",ec_category,Summer,en
"Summer Sale","https://site.com/ete",ec_category,Ete,fr
```

### Step 3: Preview & AI
Review the parsed data.
*   **Check URLs:** Ensure all patterns are correctly grouped.
*   **AI Enhance:** Click the "AI Enhance" button on a row to let Gemini suggest an additional rule based on the page name.

### Step 4: Submit
Click **Push to CMH**. The app will:
1.  Fetch all existing listings to check for name collisions.
2.  Update existing listings (by ID).
3.  Create new listings.

## API Usage

For programmatic imports (CI/CD, automation, batch operations), use the REST API endpoint:

```bash
curl -X POST https://your-app.netlify.app/api/import \
  -F "file=@listings.csv" \
  -F "organizationId=myorganization" \
  -F "trackingId=ecommerce-site" \
  -F "accessToken=xx-xxxx-xxxx-xxxx"
```

See the [API Documentation](./API.md) for complete details, examples, and integration guides.

## Technology Stack
*   **Frontend:** React 19, Vite, TypeScript
*   **Styling:** Tailwind CSS v4
*   **Icons:** Lucide React
*   **AI:** Google GenAI SDK
*   **Data Parsing:** PapaParse
*   **API:** Netlify Functions (serverless)


