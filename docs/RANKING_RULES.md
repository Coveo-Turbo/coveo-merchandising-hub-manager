# Ranking Rules Import/Export

This document explains how to use the Ranking Rules Import/Export feature in the Coveo Merchandising Hub Manager.

## Overview

The Ranking Rules Manager allows you to export and validate ranking rules from your Coveo Commerce listing pages. This feature is useful for:

- **Backup**: Export ranking rules for backup and documentation purposes
- **Migration**: Document rules for manual application in other environments
- **Validation**: Verify the structure of ranking rules JSON before manual import
- **Auditing**: Review all ranking rules across your listing pages

## Important Note

⚠️ **API Limitation**: The Coveo Commerce API v2 does not currently provide endpoints for directly importing or updating ranking rules programmatically. Ranking rules must be managed through the Coveo Merchandising Hub UI. This tool provides export and validation capabilities only.

## Features

### Export Ranking Rules

1. Navigate to the **Ranking Rules** tab in the application
2. Click **Fetch Rules** to retrieve all ranking rules from your listing pages
3. Review the preview showing:
   - Number of listings with ranking rules
   - Total count of rules
   - Detailed breakdown by listing
4. Click **Download JSON** to save the rules to a file

The exported JSON file contains:
- Listing ID and name
- Tracking ID
- Array of ranking rules with complete metadata

### Import & Validation

1. Click **Select JSON File** to upload a ranking rules JSON file
2. The system validates:
   - JSON syntax
   - Required fields (listingId, listingName, rules)
   - Rule structure (name, rankingModifier)
   - Data types (finite numbers for ranking values)
3. View validation results and preview the data
4. Use validated rules for manual application in Merchandising Hub UI

## JSON Structure

### Root Array
The file must contain an array of listing objects:

```json
[
  {
    "listingId": "string",
    "listingName": "string",
    "trackingId": "string",
    "rules": [ /* array of rule objects */ ]
  }
]
```

### Rule Object
Each rule in the `rules` array must have:

```json
{
  "id": "string (optional)",
  "name": "string (required)",
  "matchQuery": [ /* array of query filters (optional) */ ],
  "matchResult": [ /* array of result filters (optional) */ ],
  "rankingModifier": {
    "name": "string (required)",
    "value": number (required, must be finite)
  },
  "isEnabled": boolean (optional),
  "isSuggested": boolean (optional),
  "locales": [ /* array of locale objects (optional) */ ],
  "updatedAt": "ISO 8601 string (optional)",
  "updatedBy": "string (optional)"
}
```

### Filter Object
Used in `matchQuery` and `matchResult`:

```json
{
  "fieldName": "string",
  "operator": "isExactly" | "contains" | "isGreaterThan" | "isLessThan" | etc.,
  "value": {
    "type": "string" | "decimal" | "array",
    "value": "string or number (for single values)",
    "values": ["array of strings (for array type)"]
  }
}
```

### Locale Object
Used for locale-specific rules:

```json
{
  "language": "string (optional, e.g., 'en')",
  "country": "string (optional, e.g., 'US')",
  "currency": "string (optional, e.g., 'USD')"
}
```

## Common Ranking Modifier Names

- `boostFactor`: Positive values boost products, negative values bury them
  - Example: `100` to boost, `-500` to bury

## Example Use Cases

### 1. Boost New Arrivals
```json
{
  "name": "Boost New Arrivals",
  "matchResult": [
    {
      "fieldName": "ec_product_age_days",
      "operator": "isLessThan",
      "value": { "type": "decimal", "value": 30 }
    }
  ],
  "rankingModifier": {
    "name": "boostFactor",
    "value": 100
  }
}
```

### 2. Bury Out of Stock Items
```json
{
  "name": "Bury Out of Stock",
  "matchResult": [
    {
      "fieldName": "ec_in_stock",
      "operator": "isExactly",
      "value": { "type": "string", "value": "false" }
    }
  ],
  "rankingModifier": {
    "name": "boostFactor",
    "value": -500
  }
}
```

### 3. Promote High Margin Products
```json
{
  "name": "Boost High Margin",
  "matchResult": [
    {
      "fieldName": "ec_margin_percent",
      "operator": "isGreaterThan",
      "value": { "type": "decimal", "value": 40 }
    }
  ],
  "rankingModifier": {
    "name": "boostFactor",
    "value": 50
  }
}
```

## Validation Errors

Common validation errors and how to fix them:

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid format: Expected an array" | Root element is not an array | Wrap your data in `[]` |
| "listingId is required" | Missing or non-string listingId | Add valid listingId string |
| "rules must be an array" | rules field is not an array | Change rules to array format |
| "rankingModifier is required" | Missing rankingModifier object | Add rankingModifier with name and value |
| "value must be a finite number" | NaN, Infinity, or non-numeric value | Use valid finite number |

## Workflow for Environment Migration

1. **Export from Source Environment**
   - Configure credentials for source environment
   - Navigate to Ranking Rules tab
   - Click Fetch Rules and Download JSON

2. **Review and Document**
   - Open downloaded JSON file
   - Review rules for accuracy
   - Document any environment-specific adjustments needed

3. **Validate for Target Environment**
   - Configure credentials for target environment (if using same app instance)
   - Upload JSON file to validate structure
   - Review validation results

4. **Manual Application**
   - Open Coveo Merchandising Hub UI for target environment
   - Navigate to each listing page mentioned in the JSON
   - Manually create/update ranking rules based on exported data

## Best Practices

1. **Regular Backups**: Export ranking rules regularly for disaster recovery
2. **Version Control**: Store exported JSON files in version control
3. **Documentation**: Add comments in documentation files (not in JSON) about rule purposes
4. **Testing**: Test rules in a non-production environment first
5. **Validation**: Always validate JSON files before attempting manual import

## Example Files

See `examples/ranking-rules-example.json` for a complete example of the expected format.

## Support

For issues with the Ranking Rules feature or questions about Coveo Commerce API capabilities, please:
- Check the [Coveo Documentation](https://docs.coveo.com/)
- Contact Coveo Support for API feature requests
- Open an issue in this repository for tool-specific problems
