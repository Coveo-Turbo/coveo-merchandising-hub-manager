import type { RankingRulesExportData } from '../services/coveoApi';

/**
 * Export ranking rules to JSON format
 */
export function exportRankingRulesToJSON(data: RankingRulesExportData[]): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Parse and validate ranking rules from JSON
 */
export function parseRankingRulesJSON(jsonString: string): {
  valid: boolean;
  data?: RankingRulesExportData[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!Array.isArray(parsed)) {
      return {
        valid: false,
        error: 'Invalid format: Expected an array of ranking rules data'
      };
    }
    
    // Validate structure
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      
      if (!item.listingId || typeof item.listingId !== 'string') {
        return {
          valid: false,
          error: `Invalid format at index ${i}: listingId is required and must be a string`
        };
      }
      
      if (!item.listingName || typeof item.listingName !== 'string') {
        return {
          valid: false,
          error: `Invalid format at index ${i}: listingName is required and must be a string`
        };
      }
      
      if (!Array.isArray(item.rules)) {
        return {
          valid: false,
          error: `Invalid format at index ${i}: rules must be an array`
        };
      }
      
      // Validate each rule
      for (let j = 0; j < item.rules.length; j++) {
        const rule = item.rules[j];
        
        if (!rule.name || typeof rule.name !== 'string') {
          return {
            valid: false,
            error: `Invalid rule at index ${i}, rule ${j}: name is required and must be a string`
          };
        }
        
        if (!rule.rankingModifier || typeof rule.rankingModifier !== 'object') {
          return {
            valid: false,
            error: `Invalid rule at index ${i}, rule ${j}: rankingModifier is required and must be an object`
          };
        }
        
        if (!rule.rankingModifier.name || typeof rule.rankingModifier.name !== 'string') {
          return {
            valid: false,
            error: `Invalid rule at index ${i}, rule ${j}: rankingModifier.name is required`
          };
        }
        
        if (typeof rule.rankingModifier.value !== 'number' || !Number.isFinite(rule.rankingModifier.value)) {
          return {
            valid: false,
            error: `Invalid rule at index ${i}, rule ${j}: rankingModifier.value must be a finite number`
          };
        }
      }
    }
    
    return {
      valid: true,
      data: parsed as RankingRulesExportData[]
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
export function downloadRankingRulesJSON(data: RankingRulesExportData[], filename?: string) {
  const jsonString = exportRankingRulesToJSON(data);
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
