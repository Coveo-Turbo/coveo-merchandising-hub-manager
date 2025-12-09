# API Documentation

## Import Listing Pages API

The Import API allows you to programmatically upload CSV files and create/update listing pages in Coveo Merchandising Hub without using the UI.

### Endpoint

```
POST /api/import
```

### Authentication

The API uses the same Coveo Platform API token authentication as the UI. You must provide a valid API token with **Commerce - Merchandising Hub (Edit)** privileges.

### Request Format

The API supports two content types:

#### Option 1: Multipart Form Data (File Upload)

Use this when uploading a CSV file directly.

**Headers:**
```
Content-Type: multipart/form-data
```

**Form Fields:**
- `file` (required): The CSV file to upload
- `organizationId` (required): Your Coveo organization ID
- `trackingId` (required): The commerce tracking ID (e.g., `fashion_store`)
- `accessToken` (required): Your Coveo API access token
- `platformUrl` (optional): Platform region URL. Defaults to `https://platform.cloud.coveo.com`
  - US: `https://platform.cloud.coveo.com`
  - Canada: `https://platform-ca.cloud.coveo.com`
  - Europe: `https://platform-eu.cloud.coveo.com`
  - Australia: `https://platform-au.cloud.coveo.com`

**Example using cURL:**
```bash
curl -X POST https://your-app.netlify.app/api/import \
  -F "file=@listings.csv" \
  -F "organizationId=myorganization" \
  -F "trackingId=ecommerce-site" \
  -F "accessToken=xx-xxxx-xxxx-xxxx" \
  -F "platformUrl=https://platform.cloud.coveo.com"
```

**Example using JavaScript/fetch:**
```javascript
const formData = new FormData();
formData.append('file', csvFile); // File object from input
formData.append('organizationId', 'myorganization');
formData.append('trackingId', 'ecommerce-site');
formData.append('accessToken', 'xx-xxxx-xxxx-xxxx');
formData.append('platformUrl', 'https://platform.cloud.coveo.com');

const response = await fetch('https://your-app.netlify.app/api/import', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

#### Option 2: JSON (CSV Content as String)

Use this when you have CSV content as a string (e.g., generated programmatically).

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "csvContent": "Name,UrlPattern,FilterField,FilterValue,FilterOperator,Language,Country,Currency\n...",
  "organizationId": "myorganization",
  "trackingId": "ecommerce-site",
  "accessToken": "xx-xxxx-xxxx-xxxx",
  "platformUrl": "https://platform.cloud.coveo.com"
}
```

**Example using cURL:**
```bash
curl -X POST https://your-app.netlify.app/api/import \
  -H "Content-Type: application/json" \
  -d '{
    "csvContent": "Name,UrlPattern,FilterField,FilterValue\nSummer Sale,https://site.com/summer,ec_category,Summer",
    "organizationId": "myorganization",
    "trackingId": "ecommerce-site",
    "accessToken": "xx-xxxx-xxxx-xxxx"
  }'
```

**Example using JavaScript/fetch:**
```javascript
const response = await fetch('https://your-app.netlify.app/api/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    csvContent: csvString,
    organizationId: 'myorganization',
    trackingId: 'ecommerce-site',
    accessToken: 'xx-xxxx-xxxx-xxxx',
    platformUrl: 'https://platform.cloud.coveo.com'
  })
});

const result = await response.json();
console.log(result);
```

### CSV Format

The CSV file must include these columns:

**Required Columns:**
- `Name`: The internal name of the listing page (rows with the same name are grouped into one listing)
- `FilterField`: The field to filter on (e.g., `ec_category`)
- `FilterValue`: The value to match

**Optional Columns:**
- `UrlPattern`: URL pattern(s) to match. Separate multiple URLs with semicolons (`;`)
- `FilterOperator`: Filter operator. Defaults to `isExactly`. Supported: `isExactly`, `contains`, `isBetween`, `isGreaterThan`, `isLessThan`
- `Language`: Language code for locale-specific rules (e.g., `en`, `fr`)
- `Country`: Country code for locale-specific rules (e.g., `US`, `CA`)
- `Currency`: Currency code for locale-specific rules (e.g., `USD`, `CAD`)

**Example CSV:**
```csv
Name,UrlPattern,FilterField,FilterValue,FilterOperator,Language,Country,Currency
"Summer Sale","https://site.com/summer",ec_category,Summer,isExactly,en,US,USD
"Summer Sale","https://site.com/ete",ec_category,Ete,isExactly,fr,CA,CAD
"Multi-Value","https://site.com/products",ec_productid,1001;1002;1003,isExactly,en,US,USD
```

**Notes:**
- Rows with the same `Name` are merged into a single Listing Configuration
- Use semicolons (`;`) to specify multiple URL patterns or filter values in a single cell
- Empty rows are automatically skipped
- Rows without a `Name` are skipped
- Listings must have at least one page rule (filter) to be created

### Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Successfully processed 10 listings: 5 created, 5 updated.",
  "results": {
    "totalParsed": 10,
    "created": 5,
    "updated": 5,
    "errors": []
  }
}
```

#### Error Responses

**400 Bad Request - Missing Parameters:**
```json
{
  "error": "Missing required parameters: csvContent, organizationId, trackingId, accessToken"
}
```

**400 Bad Request - Invalid CSV:**
```json
{
  "error": "CSV parsing error",
  "details": [
    {
      "type": "FieldMismatch",
      "code": "TooFewFields",
      "message": "Too few fields: expected 8 fields but parsed 6",
      "row": 5
    }
  ]
}
```

**400 Bad Request - No Valid Listings:**
```json
{
  "error": "No valid listings found in CSV. Ensure rows have Name, FilterField, and FilterValue columns."
}
```

**405 Method Not Allowed:**
```json
{
  "error": "Method not allowed. Use POST."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to push listings to Coveo API",
  "message": "API Error 401: Invalid authentication token",
  "results": {
    "totalParsed": 10,
    "created": 0,
    "updated": 0,
    "errors": []
  }
}
```

### Upsert Behavior

The API implements intelligent upsert logic:

1. **Checks existing listings**: Fetches all listing pages for the given `trackingId`
2. **Matches by name**: Compares the `Name` field in the CSV with existing listings
3. **Updates existing listings**: If a listing with the same name exists, it updates that listing
4. **Creates new listings**: If no match is found, it creates a new listing

This prevents duplicate listing pages and allows you to safely re-run imports with updated data.

### Rate Limiting

The API automatically chunks large requests:
- Maximum 50 listings per API call to Coveo
- If your CSV contains more than 50 unique listings, they will be processed in batches

### Security Considerations

- **Never commit API tokens**: Store your `accessToken` securely (e.g., environment variables, secrets manager)
- **Use HTTPS**: Always make requests over HTTPS to protect credentials in transit
- **Token permissions**: Ensure your API token has only the necessary permissions (Commerce - Merchandising Hub Edit)
- **Validate input**: The API validates CSV format and required fields before making calls to Coveo

### Integration Examples

#### CI/CD Pipeline (GitHub Actions)

```yaml
name: Update Listing Pages

on:
  push:
    branches: [ main ]
    paths:
      - 'data/listings.csv'

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Import Listings to Coveo
        run: |
          curl -X POST ${{ secrets.CMH_MANAGER_URL }}/api/import \
            -F "file=@data/listings.csv" \
            -F "organizationId=${{ secrets.COVEO_ORG_ID }}" \
            -F "trackingId=${{ secrets.COVEO_TRACKING_ID }}" \
            -F "accessToken=${{ secrets.COVEO_API_TOKEN }}"
```

#### Node.js Script

```javascript
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function importListings() {
  const form = new FormData();
  form.append('file', fs.createReadStream('./listings.csv'));
  form.append('organizationId', process.env.COVEO_ORG_ID);
  form.append('trackingId', process.env.COVEO_TRACKING_ID);
  form.append('accessToken', process.env.COVEO_API_TOKEN);
  form.append('platformUrl', 'https://platform.cloud.coveo.com');

  const response = await fetch('https://your-app.netlify.app/api/import', {
    method: 'POST',
    body: form
  });

  const result = await response.json();
  
  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.error(`❌ Import failed: ${result.error}`);
    process.exit(1);
  }
}

importListings();
```

#### Python Script

```python
import os
import requests

def import_listings(csv_file_path):
    url = 'https://your-app.netlify.app/api/import'
    
    with open(csv_file_path, 'rb') as file:
        files = {'file': file}
        data = {
            'organizationId': os.environ['COVEO_ORG_ID'],
            'trackingId': os.environ['COVEO_TRACKING_ID'],
            'accessToken': os.environ['COVEO_API_TOKEN'],
            'platformUrl': 'https://platform.cloud.coveo.com'
        }
        
        response = requests.post(url, files=files, data=data)
        result = response.json()
        
        if result.get('success'):
            print(f"✅ {result['message']}")
        else:
            print(f"❌ Import failed: {result['error']}")
            exit(1)

if __name__ == '__main__':
    import_listings('./listings.csv')
```

### Troubleshooting

#### "Missing required parameters" Error
- Ensure all required fields are provided in the request
- Check that field names match exactly (case-sensitive)

#### "CSV parsing error" 
- Verify your CSV has the correct headers
- Check for malformed rows or unescaped special characters
- Ensure the file is encoded in UTF-8

#### "No valid listings found"
- Verify each row has a `Name`, `FilterField`, and `FilterValue`
- Check that there are no empty required columns

#### "API Error 401: Invalid authentication token"
- Verify your `accessToken` is correct and has not expired
- Ensure the token has Commerce - Merchandising Hub (Edit) permissions
- Check that the `organizationId` matches the token's organization

#### "API Error 404: Not found"
- Verify the `trackingId` exists in your Coveo organization
- Check that the `platformUrl` matches your organization's region

### Support

For issues with:
- **This API**: Open an issue in the GitHub repository
- **Coveo Platform APIs**: Consult the [Coveo Platform API documentation](https://docs.coveo.com/en/api/)
- **Merchandising Hub**: Contact Coveo Support
