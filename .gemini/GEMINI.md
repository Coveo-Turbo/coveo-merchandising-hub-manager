
# Coveo Merchandising Hub Manager - Project Context

This document serves as a "context dump" for AI assistants (Gemini, Copilot, Cursor) to understand the project's architecture, history, and business logic.

## Project Overview
**Name:** Coveo Merchandising Hub Manager (CMH Manager)
**Purpose:** A web application to help Coveo customers bulk manage their Commerce Listing Pages via CSV upload, manage global configurations, and perform bulk maintenance.
**Target Audience:** Merchandisers and Coveo Administrators.

## Tech Stack
*   **Framework:** React 19 (Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4 (using CSS variables approach in `index.css`)
*   **Icons:** Lucide React
*   **CSV Parser:** PapaParse
*   **AI:** @google/genai (Gemini 2.5 Flash for rule suggestions)
*   **State Management:** Local React State (`useState`)
*   **Build System:** Vite

## Architecture

### 1. Key Components (`App.tsx`)
The application is a Single Page Application (SPA) with four main views managed by state:

1.  **Import Wizard (`view === 'wizard'`)**:
    *   **Step 1: Configuration**: User inputs credentials (Org ID, Tracking ID, Token) and selects Platform Region (US, CA, EU, AU).
    *   **Step 2: Upload**: Parses CSV files.
    *   **Step 3: Preview**: Logic to map CSV rows to API models, AI rule suggestion button.
    *   **Step 4: Submit**: Pushes data to Coveo API.

2.  **Category Generator (`view === 'generator'`)**:
    *   Fetches field values (e.g., `@ec_category`) from Coveo Search API V2.
    *   Allows selection of values to auto-generate listing pages.
    *   Supports URL pattern templates (e.g., `{{value}}`, `{{value_slug}}`).

3.  **Global Config (`view === 'global-config'`)**:
    *   Fetches/Updates JSON for Search/Listing/Product Suggest/Recommendation configurations.
    *   Provides a "Common Settings" UI and text area for direct JSON editing.

4.  **Maintenance (`view === 'maintenance'`)**:
    *   **Bulk Delete**: Fetches *all* listing IDs via pagination and deletes them in chunks.
    *   **UI**: Uses a custom two-step button confirmation (no native `window.confirm`).

### 2. API Layer (`services/coveoApi.ts`)
*   **Base URL**: Dynamic based on selected region (e.g., `platform-ca.cloud.coveo.com`).
*   **Rate Limiting/Chunking**:
    *   `bulkCreateListings`: Splits payloads into chunks of 50 items.
    *   `bulkDeleteListings`: Splits IDs into chunks of 50 items.
*   **Search API**: `listFieldValues` calls V2 Search API to get category values.
*   **Pagination**: `fetchAllListings` iterates through all pages to gather data for deletion or upsert checks.
*   **Caching**: Explicit `cache: 'no-store'` headers to ensure fresh data for delete operations.

### 3. Data Logic (`types.ts` & `App.tsx`)
*   **CSV Parsing**:
    *   Columns: `Name`, `UrlPattern`, `FilterField`, `FilterValue`, `FilterOperator`, `Language`, `Country`, `Currency`.
    *   **Grouping**: Rows with the same `Name` are merged into a single Listing Page object.
    *   **URL Patterns**: Supports multiple URLs in a single cell separated by semicolons (`;`).
    *   **Locales**: Rules can be specific to a locale (Language/Country/Currency). If provided in the CSV, the rule is tagged with that locale.

### 4. Responsiveness
*   Standard Tailwind responsive prefixes (`md:hidden`, `md:flex`).
*   Mobile "Hamburger" menu implemented in `App.tsx` state (`isMobileMenuOpen`).

## History of Changes (Session Log)

1.  **Initialization**: Set up React/Tailwind scaffold.
2.  **Region Support**: Added region selector to fix "Organization does not accept requests" (API 400).
3.  **Advanced CSV Parsing**:
    *   Added support for locale columns.
    *   Added support for semicolon-separated URL patterns.
    *   Implemented row-merging logic based on Page Name.
4.  **New Views**: Added "Global Config" and "Maintenance" tabs.
5.  **Maintenance Fixes**:
    *   Implemented `fetchAllListings` loop.
    *   Fixed `window.confirm` sandbox errors by building a custom UI confirmation.
6.  **UI Polish**:
    *   Renamed to "Coveo Merchandising Hub Manager".
    *   Added Mobile Navigation menu.
7.  **Migration**: Migrated Tailwind configuration to v4 standards (CSS variables in `index.css`, removed `tailwind.config.js`).
8.  **Feature**: Added Category Listing Generator using Search API V2.

## Setup for Local Development (Vite)

1.  **Environment**:
    *   Create `.env`: `VITE_API_KEY=your_gemini_key`
    *   Update `services/geminiService.ts` to use `import.meta.env.VITE_API_KEY`.

2.  **Install**:
    ```bash
    npm install
    npm install tailwindcss @tailwindcss/vite
    ```

3.  **Run**:
    ```bash
    npm run dev
    ```

## Context Prompt for AI

*Copy and paste this section when starting a new chat in Cursor/VS Code to prime the AI:*

> "I am working on the **Coveo Merchandising Hub Manager**, a React/Vite app for managing e-commerce configurations. The app uses a wizard flow for CSV uploads, parsing specific columns (Name, UrlPattern, FilterField, Locale) into Coveo API JSON models. It also supports Global JSON config editing, Category Generation via Search API, and bulk deletion of listings.
>
> **Current State**:
> - Tailwind v4 is used (CSS variables).
> - API calls are chunked (50 items).
> - State is local (no Redux/Context).
> - Multi-region support is active.
>
> When implementing changes, please respect the existing `App.tsx` structure, the `services/coveoApi.ts` abstraction, and the CSV parsing logic defined in `mapRowsToListings`."
