# API Import Examples

This directory contains example scripts demonstrating how to use the Import API to programmatically upload listing pages.

## Available Examples

### 1. Bash Script (`import-example.sh`)

Simple shell script using `curl`.

**Requirements:**
- `curl`
- `jq` (optional, for JSON formatting)

**Usage:**
```bash
# Set environment variables
export COVEO_ORG_ID="your-organization-id"
export COVEO_TRACKING_ID="your-tracking-id"
export COVEO_API_TOKEN="your-api-token"
export API_ENDPOINT="https://your-app.netlify.app/api/import"

# Run the script
./import-example.sh path/to/your/listings.csv
```

### 2. Node.js Script (`import-example.js`)

JavaScript example for Node.js environments.

**Requirements:**
```bash
npm install form-data node-fetch@2
```

**Usage:**
```bash
# Set environment variables
export COVEO_ORG_ID="your-organization-id"
export COVEO_TRACKING_ID="your-tracking-id"
export COVEO_API_TOKEN="your-api-token"
export API_ENDPOINT="https://your-app.netlify.app/api/import"

# Run the script
node import-example.js path/to/your/listings.csv
```

### 3. Python Script (`import-example.py`)

Python example for automation and CI/CD pipelines.

**Requirements:**
```bash
pip install requests
```

**Usage:**
```bash
# Set environment variables
export COVEO_ORG_ID="your-organization-id"
export COVEO_TRACKING_ID="your-tracking-id"
export COVEO_API_TOKEN="your-api-token"
export API_ENDPOINT="https://your-app.netlify.app/api/import"

# Run the script
python import-example.py path/to/your/listings.csv
```

## Configuration

All scripts use environment variables for configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `COVEO_ORG_ID` | Your Coveo organization ID | `your-organization-id` |
| `COVEO_TRACKING_ID` | Your commerce tracking ID | `your-tracking-id` |
| `COVEO_API_TOKEN` | Your API access token | `your-api-token` |
| `PLATFORM_URL` | Platform region URL | `https://platform.cloud.coveo.com` |
| `API_ENDPOINT` | Import API endpoint | `https://your-app.netlify.app/api/import` |

## CSV File Format

Your CSV file should follow this structure:

```csv
Name,UrlPattern,FilterField,FilterValue,FilterOperator,Language,Country,Currency
"Summer Sale","https://site.com/summer",ec_category,Summer,isExactly,en,US,USD
"Summer Sale","https://site.com/ete",ec_category,Ete,isExactly,fr,CA,CAD
```

See the sample file at `../samples/listings-sample.csv` for a complete example.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Import Listings

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
      
      - name: Import to Coveo
        env:
          COVEO_ORG_ID: ${{ secrets.COVEO_ORG_ID }}
          COVEO_TRACKING_ID: ${{ secrets.COVEO_TRACKING_ID }}
          COVEO_API_TOKEN: ${{ secrets.COVEO_API_TOKEN }}
          API_ENDPOINT: ${{ secrets.API_ENDPOINT }}
        run: |
          chmod +x examples/import-example.sh
          examples/import-example.sh data/listings.csv
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    environment {
        COVEO_ORG_ID = credentials('coveo-org-id')
        COVEO_TRACKING_ID = credentials('coveo-tracking-id')
        COVEO_API_TOKEN = credentials('coveo-api-token')
        API_ENDPOINT = credentials('api-endpoint')
    }
    
    stages {
        stage('Import Listings') {
            steps {
                sh '''
                    chmod +x examples/import-example.sh
                    examples/import-example.sh data/listings.csv
                '''
            }
        }
    }
}
```

## Security Best Practices

⚠️ **Never commit API tokens or credentials to version control!**

- Use environment variables or secret management systems
- Store credentials in CI/CD secrets (GitHub Secrets, Jenkins Credentials, etc.)
- Use `.env` files locally (add to `.gitignore`)
- Rotate tokens regularly
- Use tokens with minimum required permissions

## Troubleshooting

### "File not found" error
- Check the CSV file path is correct
- Use absolute paths if relative paths don't work

### "Authentication failed" error
- Verify your API token is correct and not expired
- Ensure the token has "Commerce - Merchandising Hub (Edit)" permissions
- Check that the organization ID matches the token's organization

### "CSV parsing error"
- Validate your CSV format
- Ensure all required columns are present
- Check for special characters that need escaping

For more details, see the [API Documentation](../API.md).
