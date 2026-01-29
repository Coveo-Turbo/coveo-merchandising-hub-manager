import type { RankingRuleModel } from '../types';

/**
 * Export ranking rules to JSON format
 */
export function exportRankingRulesToJSON(rules: RankingRuleModel[]): string {
  return JSON.stringify(rules, null, 2);
}

/**
 * Parse and validate ranking rules from JSON
 */
export function parseRankingRulesJSON(jsonString: string): {
  valid: boolean;
  data?: RankingRuleModel[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!Array.isArray(parsed)) {
      return {
        valid: false,
        error: 'Invalid format: Expected an array of ranking rules'
      };
    }
    
    // Validate structure
    for (let i = 0; i < parsed.length; i++) {
      const rule = parsed[i];
      
      if (!rule.name || typeof rule.name !== 'string') {
        return {
          valid: false,
          error: `Invalid format at index ${i}: name is required and must be a string`
        };
      }
      
      if (!rule.trackingId || typeof rule.trackingId !== 'string') {
        return {
          valid: false,
          error: `Invalid format at index ${i}: trackingId is required and must be a string`
        };
      }
      
      if (typeof rule.enabled !== 'boolean') {
        return {
          valid: false,
          error: `Invalid format at index ${i}: enabled is required and must be a boolean`
        };
      }
      
      if (!rule.action || !['boost', 'bury', 'pin', 'reservedPosition'].includes(rule.action)) {
        return {
          valid: false,
          error: `Invalid format at index ${i}: action must be one of: boost, bury, pin, reservedPosition`
        };
      }
      
      if (!rule.definition || typeof rule.definition !== 'object') {
        return {
          valid: false,
          error: `Invalid format at index ${i}: definition is required and must be an object`
        };
      }
      
      // Validate boostFactor if present
      if (rule.definition.boostFactor !== undefined) {
        if (typeof rule.definition.boostFactor !== 'number' || !Number.isFinite(rule.definition.boostFactor)) {
          return {
            valid: false,
            error: `Invalid format at index ${i}: definition.boostFactor must be a finite number`
          };
        }
      }
      
      // Validate position if present
      if (rule.definition.position !== undefined) {
        if (typeof rule.definition.position !== 'number' || !Number.isFinite(rule.definition.position) || rule.definition.position < 0) {
          return {
            valid: false,
            error: `Invalid format at index ${i}: definition.position must be a positive finite number`
          };
        }
      }
      
      // Validate conditions if present
      if (rule.conditions !== undefined) {
        if (!Array.isArray(rule.conditions)) {
          return {
            valid: false,
            error: `Invalid format at index ${i}: conditions must be an array`
          };
        }
        
        for (let j = 0; j < rule.conditions.length; j++) {
          const condition = rule.conditions[j];
          
          if (!condition.field || typeof condition.field !== 'string') {
            return {
              valid: false,
              error: `Invalid condition at index ${i}, condition ${j}: field is required and must be a string`
            };
          }
          
          if (!condition.operator || typeof condition.operator !== 'string') {
            return {
              valid: false,
              error: `Invalid condition at index ${i}, condition ${j}: operator is required and must be a string`
            };
          }
        }
      }
    }
    
    return {
      valid: true,
      data: parsed as RankingRuleModel[]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `JSON parse error: ${errorMessage}`
    };
  }
}

/**
 * Download ranking rules as JSON file
 */
export function downloadRankingRulesJSON(rules: RankingRuleModel[], filename?: string) {
  const jsonString = exportRankingRulesToJSON(rules);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `ranking-rules-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
