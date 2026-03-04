# Copilot Instructions for Coveo Merchandising Hub Manager

## Project Overview

**Name:** Coveo Merchandising Hub Manager (CMH Manager)  
**Purpose:** A web application to help Coveo customers bulk manage their Commerce Listing Pages via CSV upload, manage global configurations, and perform bulk maintenance.  
**Target Audience:** Merchandisers and Coveo Administrators.

This is a Single Page Application (SPA) built with React 19, Vite, and TypeScript. The application streamlines the management of Coveo Commerce Listing Pages with features for bulk creation/update, global configuration management, and maintenance tools.

## Tech Stack

- **Framework:** React 19 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (using CSS variables approach in `index.css`)
- **Icons:** Lucide React
- **CSV Parser:** PapaParse
- **AI:** @google/genai (Gemini 2.5 Flash for rule suggestions)
- **State Management:** Local React State (`useState`)
- **Build System:** Vite

## Architecture

### Key Components (`App.tsx`)

The application has three main views managed by state:

1. **Import Wizard (`view === 'wizard'`)**:
   - **Step 1: Configuration**: User inputs credentials (Org ID, Tracking ID, Token) and selects Platform Region (US, CA, EU, AU).
   - **Step 2: Upload**: Parses CSV files.
   - **Step 3: Preview**: Logic to map CSV rows to API models, AI rule suggestion button.
   - **Step 4: Submit**: Pushes data to Coveo API.

2. **Global Config (`view === 'global-config'`)**:
   - Fetches Global Search or Listing Configuration JSON.
   - Provides a text area for direct JSON editing and updating.

3. **Maintenance (`view === 'maintenance'`)**:
   - **Bulk Delete**: Fetches *all* listing IDs via pagination and deletes them in chunks.
   - **UI**: Uses a custom two-step button confirmation (no native `window.confirm`).

### API Layer (`services/coveoApi.ts`)

- **Base URL**: Dynamic based on selected region (e.g., `platform-ca.cloud.coveo.com`).
- **Rate Limiting/Chunking**:
  - `bulkCreateListings`: Splits payloads into chunks of 50 items.
  - `bulkDeleteListings`: Splits IDs into chunks of 50 items.
- **Pagination**: `fetchAllListingIds` iterates through all pages to gather IDs for deletion.
- **Caching**: Explicit `cache: 'no-store'` headers to ensure fresh data for delete operations.

### Data Logic (`types.ts` & `App.tsx`)

- **CSV Parsing**:
  - Columns: `Name`, `UrlPattern`, `FilterField`, `FilterValue`, `FilterOperator`, `Language`, `Country`, `Currency`.
  - **Grouping**: Rows with the same `Name` are merged into a single Listing Page object.
  - **URL Patterns**: Supports multiple URLs in a single cell separated by semicolons (`;`).
  - **Locales**: Rules can be specific to a locale (Language/Country/Currency). If provided in the CSV, the rule is tagged with that locale.

### Responsiveness

- Standard Tailwind responsive prefixes (`md:hidden`, `md:flex`).
- Mobile "Hamburger" menu implemented in `App.tsx` state (`isMobileMenuOpen`).

## API & Data Structure

- **Source of Truth**: The API definition is located in `.gemini/CommerceService_schema.json`.
- **Protocol**: If you need to work with code that interfaces with the API, request to "include the schema context" unless it has already been included with `@.gemini/CommerceService_schema.json` in the prompt.

## Development Workflow

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_KEY=your_google_gemini_api_key
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

### Build & Test

- **Build:** `npm run build` (runs TypeScript compilation followed by Vite build)
- **Lint:** `npm run lint` (runs ESLint)
- **Preview:** `npm run preview` (preview production build)

**Note:** There is currently no test infrastructure in this project.

## Coding Standards

### General Guidelines

- **Minimal Changes**: Make the smallest possible changes to achieve the goal.
- **No Breaking Changes**: Do not delete or modify working code unless absolutely necessary.
- **Respect Architecture**: Maintain the existing structure:
  - Keep the `App.tsx` component structure intact
  - Use the `services/coveoApi.ts` abstraction for API calls
  - Preserve CSV parsing logic in `mapRowsToListings`
- **State Management**: Use local React state (`useState`) - no Redux or Context unless explicitly required.

### TypeScript

- Use proper typing - avoid `any` when possible
- Follow existing type definitions in `types.ts`
- Maintain consistency with existing code patterns

### React

- Follow React 19 conventions
- Use functional components with hooks
- Maintain the existing component hierarchy in `App.tsx`

### Styling

- Use Tailwind CSS v4 with CSS variables (configured in `index.css`)
- Follow responsive design patterns with `md:` prefixes
- Use Lucide React for icons
- Maintain consistency with existing UI patterns

### CSV Processing

- Preserve the row grouping logic based on the `Name` column
- Support semicolon-separated URL patterns
- Handle locale-specific rules (Language/Country/Currency)

## Special Instructions

### API Integration

- Always respect regional base URLs (US, CA, EU, AU)
- Use chunking for bulk operations (50 items per chunk)
- Include proper error handling for API calls
- Use `cache: 'no-store'` for operations requiring fresh data

### Developer Mode

- The app has a "Developer Mode" feature (activated by clicking version number 5 times)
- Preserve this functionality when making changes

### Mobile Support

- Maintain the mobile navigation menu functionality
- Test responsive behavior when making UI changes

### AI Features

- The app uses Google Gemini for rule suggestions
- API key is stored in environment variables (`VITE_API_KEY`)
- AI features are optional and should degrade gracefully if unavailable

## Persona

When assisting with this codebase:
- Assume the developer has moderate experience with React and TypeScript
- Provide context about why changes are needed
- Explain any API-specific logic or Coveo Commerce platform conventions
- Suggest minimal, surgical changes that respect the existing architecture
- Point out potential impacts on the three main views (Wizard, Global Config, Maintenance)

## Example Patterns

### API Call Pattern
```typescript
const response = await fetch(`${baseUrl}/rest/organizations/${orgId}/...`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

### State Update Pattern
```typescript
const [viewState, setViewState] = useState<'wizard' | 'global-config' | 'maintenance'>('wizard');
```

### CSV Row Grouping Pattern
```typescript
// Group rows by Name column to create single listing with multiple rules
const groupedByName = rows.reduce((acc, row) => {
  const name = row.Name;
  if (!acc[name]) acc[name] = [];
  acc[name].push(row);
  return acc;
}, {});
```

## Important Context Files

- `.gemini/GEMINI.md` - Detailed project context and history
- `.gemini/CommerceService_schema.json` - API schema definition
- `README.md` - User-facing documentation
- `src/types.ts` - TypeScript type definitions
- `src/services/coveoApi.ts` - API client implementation

## Common Tasks

- **Adding a new API endpoint**: Add function to `services/coveoApi.ts` following existing patterns
- **Modifying CSV parsing**: Update logic in `App.tsx` in the `mapRowsToListings` function
- **Changing UI**: Update JSX in `App.tsx`, using Tailwind classes
- **Adding new configuration**: Update credential/config state in `App.tsx`
