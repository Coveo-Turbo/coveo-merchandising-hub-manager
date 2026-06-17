# Architecture Overview

![CMH Manager end-to-end architecture overview](/cmh-manager-architecture-overview.png)

CMH Manager is a shared operational layer for Coveo Merchandising Hub. It gives merchandisers and administrators one tool that can run either as a standalone web app or as an embedded browser extension while still targeting the same Coveo platform APIs and automation services.

## How the tool is organized

1. **Entry surfaces**
   - Users start either from the standalone web app or from the embedded Chrome/Edge extension inside Merchandising Hub.
   - Both surfaces use the same React application and the same product workspaces.
2. **Context and authentication**
   - The standalone flow supports manual organization, token, and region entry.
   - The embedded flow reuses Hub context by harvesting session details from the page and background worker state, with manual fallback when needed.
3. **Shared CMH Manager control layer**
   - The shared codebase exposes the six core workspaces: `Connection`, `Listings`, `Global Config`, `Context Mappings`, `Rules`, and `Maintenance`.
   - This keeps behavior aligned across standalone and embedded usage instead of maintaining two separate tools.
4. **Operational capabilities**
   - Each workspace focuses on a specific operational concern: connection validation, listing imports, shared query configuration, mapping synchronization, rule import or export, and maintenance tooling.
5. **Backend and automation services**
   - Serverless endpoints support API-first workflows such as bulk CSV listing ingestion and Commerce Troubleshoot Console deployment.
   - Optional enhancement services can extend the operator workflow without changing the core UI flow.
6. **Coveo platform execution**
   - The final execution layer is the Coveo platform itself, including platform APIs, commerce APIs, listing pages, query configurations, context mappings, rules, and regional platform endpoints.

## What this means in practice

- **One shared codebase** keeps the standalone and embedded experiences aligned.
- **Context-aware authentication** reduces duplicate setup work when users already operate inside Merchandising Hub.
- **API-first operations** make the same flows usable from the UI and from automation pipelines.
- **Bulk-safe execution** helps large operations stay consistent across imports, updates, and exports.

## Typical operating flow

1. Enter through the standalone app or embedded extension.
2. Resolve organization, tracking ID, token, and platform region context.
3. Open the workspace that matches the task you need to perform.
4. Run the operation locally in the shared UI and, when needed, through serverless helpers.
5. Apply the change to the target Coveo platform resources in the correct region.
