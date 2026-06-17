# Getting Started With CMH Manager

CMH Manager helps merchandisers and administrators manage Coveo Merchandising Hub data faster from either a standalone web app or an embedded browser extension.

## Choose the right surface

- **Standalone web app**: Best when you want to connect manually, work outside of Merchandising Hub, or share a simple link with teammates.
- **Embedded extension**: Best when you already work inside Merchandising Hub and want to reuse the current page context without switching tabs.

## Connect to your organization

### Standalone web app

1. Open the CMH Manager web app.
2. Open the **Connection** workspace.
3. Enter your **Organization ID** and **Access Token**.
4. Pick the correct **Platform region**.
5. Connect and let CMH Manager load the tracking IDs available for that organization.

### Embedded extension

1. Open Merchandising Hub in Chrome or Edge.
2. Launch **CMH Manager** from the left navigation.
3. Click **Refresh Hub context** to reuse the current page session.
4. If Hub context is not available yet, open the **Connection** workspace or the manual connection form and connect directly.

## Navigate the app

- **Connection**: Validate the current Hub context, connect manually, and choose the tracking ID you want to manage.
- **Listings**: Import CSV content, preview listing payloads, and submit listing upserts.
- **Global Config**: Fetch and edit search, listing, recommendation, or product suggest configuration.
- **Context Mappings**: Review and synchronize context mapping definitions.
- **Rules**: Export and import ranking or filter rule payloads.
- **Maintenance**: Run bulk exports, bulk deletions, or troubleshoot console deployment flows.

## Common workflows

### Import listing pages from CSV

1. Go to **Listings**.
2. Upload a CSV file with listing names, URL patterns, and rule fields.
3. Review the parsed listing preview before submitting changes.
4. Submit to create new listings and update existing ones with matching names.

See the [Import API reference](../API.md) if you need to automate uploads.

### Edit shared query configuration

1. Open **Global Config**.
2. Select the configuration type you want to manage.
3. Load the current configuration, review the JSON, and save your changes.

### Manage context mappings

1. Open **Context Mappings**.
2. Load the current mappings.
3. Use the editor to create, update, or remove mappings safely.

### Export or import ranking rules

1. Open **Rules**.
2. Fetch the current rules before exporting or preparing an import file.
3. Review the JSON payload carefully before importing back into a tracking ID.

See the [Ranking Rules guide](./RANKING_RULES.md) for examples and validation details.

### Run maintenance tasks

Use **Maintenance** for bulk exports, bulk deletions, and Commerce Troubleshoot Console deployment flows. These actions are high impact, so double-check the active tracking ID before you run them.

## Access and permissions

- Use API tokens with the minimum required privileges.
- Keep production and sandbox tokens separate.
- Validate the selected tracking ID before importing, deleting, or updating shared settings.

## Next references

- [Import API reference](../API.md)
- [Ranking Rules guide](./RANKING_RULES.md)
- [Automation examples](../examples/README.md)
