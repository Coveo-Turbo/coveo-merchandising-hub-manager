# Ranking Rules Import/Export

This document explains how to use the Ranking Rules Import/Export feature in the Coveo Merchandising Hub Manager.

## Overview

The Ranking Rules Manager allows you to export and import ranking rules using Coveo's private Commerce API. This feature is useful for:

- **Backup**: Export ranking rules for backup and documentation purposes
- **Migration**: Transfer rules between environments (Dev → QA → Prod)
- **Bulk Management**: Import multiple rules at once
- **Auditing**: Review all ranking rules in your organization

## Features

### Export Ranking Rules

1. Navigate to the **Ranking Rules** tab in the application
2. Click **Fetch Rules** to retrieve all ranking rules from your organization
3. Review the preview showing:
   - Total count of rules
   - Breakdown by action type (boost, bury, pin, reservedPosition)
   - Individual rule details
4. Click **Download JSON** to save the rules to a file

The exported JSON file contains complete rule metadata including:
- Rule name and description
- Tracking ID
- Action type (boost, bury, pin, reservedPosition)
- Conditions
- Definition (boostFactor, position, etc.)
- Status (enabled/disabled)

### Import Ranking Rules

1. Click **Select JSON File** to upload a ranking rules JSON file
2. The system validates:
   - JSON syntax
   - Required fields (name, trackingId, enabled, action, definition)
   - Action types (boost, bury, pin, reservedPosition)
   - Data types (finite numbers for boostFactor/position)
   - Condition structure
3. Click **Import X Rule(s)** to create the rules in your organization
4. View import results showing success count and any errors

## JSON Structure

### Root Array
The file must contain an array of ranking rule objects:

```json
[
  {
    "name": "string (required)",
    "description": "string (optional)",
    "trackingId": "string (required)",
    "enabled": boolean (required),
    "action": "boost" | "bury" | "pin" | "reservedPosition" (required),
    "conditions": [ /* array of condition objects (optional) */ ],
    "definition": { /* object with action-specific settings (required) */ }
  }
]
```

### Rule Object Fields

**Required Fields:**
- `name` (string): Human-readable rule name
- `trackingId` (string): Tracking ID for your commerce interface
- `enabled` (boolean): Whether the rule is active
- `action` (string): Rule type - must be one of:
  - `"boost"`: Increase ranking score
  - `"bury"`: Decrease ranking score
  - `"pin"`: Pin products to specific positions
  - `"reservedPosition"`: Reserve positions for certain products
- `definition` (object): Action-specific configuration

**Optional Fields:**
- `description` (string): Explanation of the rule's purpose
- `conditions` (array): When the rule should apply
- `id` (string): Auto-generated on export, omit on import
- `createdBy`, `createdAt`, `updatedAt`, `updatedBy`: Metadata (auto-generated)

### Condition Object

```json
{
  "field": "string (required)",
  "operator": "string (required)",
  "value": "string | number (optional)",
  "values": ["array of strings (optional)"]
}
```

**Common Operators:**
- `"equals"`: Exact match
- `"contains"`: Partial match
- `"greaterThan"`: Numeric comparison
- `"lessThan"`: Numeric comparison

### Definition Object

The definition structure varies by action type:

**For boost/bury actions:**
```json
{
  "boostFactor": number (required)
}
```
- Positive values boost (e.g., `100`)
- Negative values bury (e.g., `-500`)

**For pin/reservedPosition actions:**
```json
{
  "position": number (required)
}
```
- Position in search results (1-based)

## Example Use Cases

### 1. Boost New Arrivals
```json
{
  "name": "Boost New Arrivals",
  "description": "Boost products added in the last 30 days",
  "trackingId": "fashion_store",
  "enabled": true,
  "action": "boost",
  "conditions": [
    {
      "field": "ec_product_age_days",
      "operator": "lessThan",
      "value": 30
    }
  ],
  "definition": {
    "boostFactor": 100
  }
}
```

### 2. Bury Out of Stock Items
```json
{
  "name": "Bury Out of Stock",
  "description": "Demote products that are unavailable",
  "trackingId": "fashion_store",
  "enabled": true,
  "action": "bury",
  "conditions": [
    {
      "field": "ec_in_stock",
      "operator": "equals",
      "value": "false"
    }
  ],
  "definition": {
    "boostFactor": -500
  }
}
```

### 3. Pin Featured Product
```json
{
  "name": "Pin Hero Product",
  "description": "Always show this product first",
  "trackingId": "fashion_store",
  "enabled": true,
  "action": "pin",
  "conditions": [
    {
      "field": "ec_product_id",
      "operator": "equals",
      "value": "PROD-12345"
    }
  ],
  "definition": {
    "position": 1
  }
}
```

### 4. Reserve Top 3 for Sponsored
```json
{
  "name": "Reserve Top 3 Positions",
  "description": "Keep top 3 spots for sponsored products",
  "trackingId": "fashion_store",
  "enabled": true,
  "action": "reservedPosition",
  "conditions": [
    {
      "field": "ec_sponsored",
      "operator": "equals",
      "value": "true"
    }
  ],
  "definition": {
    "position": 3
  }
}
```

## Validation Errors

Common validation errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Expected an array" | Root element is not an array | Wrap your data in `[]` |
| "name is required" | Missing or non-string name | Add valid name string |
| "trackingId is required" | Missing or non-string trackingId | Add valid trackingId string |
| "enabled must be a boolean" | enabled is not true/false | Set to `true` or `false` |
| "action must be one of..." | Invalid action type | Use: boost, bury, pin, or reservedPosition |
| "definition is required" | Missing definition object | Add definition with boostFactor or position |
| "boostFactor must be a finite number" | NaN, Infinity, or non-numeric | Use valid finite number |

## Workflow for Environment Migration

### Step 1: Export from Source
1. Configure credentials for source environment
2. Navigate to Ranking Rules tab
3. Click **Fetch Rules** and **Download JSON**

### Step 2: Review and Adjust
1. Open downloaded JSON file
2. Review rules for accuracy
3. Adjust trackingId if needed for target environment
4. Modify any environment-specific conditions

### Step 3: Import to Target
1. Configure credentials for target environment
2. Navigate to Ranking Rules tab
3. Click **Select JSON File** and choose your file
4. Review validation results
5. Click **Import X Rule(s)**
6. Verify import results

## Best Practices

1. **Regular Backups**: Export ranking rules regularly for disaster recovery
2. **Version Control**: Store exported JSON files in version control (Git)
3. **Testing**: Test rules in non-production environments first
4. **Naming Convention**: Use descriptive names for rules (e.g., "Boost - New Arrivals Q1 2024")
5. **Documentation**: Add descriptions to explain rule purposes
6. **Incremental Changes**: Import rules in small batches for easier troubleshooting
7. **Review Before Import**: Always review the preview before clicking Import

## Private API Details

This feature uses Coveo's private Commerce API endpoints:

**GET** `/rest/organizations/{orgId}/commerce/private/rules`
- Query params: `trackingId`, `page`, `perPage`, `actions[]`
- Retrieves ranking rules with pagination

**POST** `/rest/organizations/{orgId}/commerce/private/rules`
- Body: Rule JSON object
- Creates a single ranking rule

**Authentication**: Requires Bearer token with commerce management permissions

## Example Files

See `examples/ranking-rules-example.json` for a complete example with all action types.

## Troubleshooting

**Import fails with authentication error:**
- Verify your API token has commerce management permissions
- Check that the token is not expired

**Rules not appearing after import:**
- Confirm the trackingId matches your commerce interface
- Check that enabled is set to true
- Verify conditions are correctly formatted

**Partial import success:**
- Check console output for specific error messages
- Review failed rules in the validation preview
- Fix errors and re-import failed rules only

## Support

For issues with the Ranking Rules feature:
- Check the [Coveo Documentation](https://docs.coveo.com/)
- Contact Coveo Support for private API questions
- Open an issue in this repository for tool-specific problems
