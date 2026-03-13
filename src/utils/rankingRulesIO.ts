import type {
  MerchandisingHubRulePayload,
  MerchandisingHubRuleRecord,
  RuleImportModel,
  RuleModel,
} from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toHubRuleRecord = (value: unknown): MerchandisingHubRuleRecord | null => {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.action !== 'string') {
    return null;
  }

  return {
    name: value.name,
    description: typeof value.description === 'string' ? value.description : '',
    action: value.action as MerchandisingHubRuleRecord['action'],
    trackingId: typeof value.trackingId === 'string' ? value.trackingId : '',
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    type:
      value.action === 'include' || value.action === 'exclude' || value.action === 'onlyShow' ? 'filter' : 'ranking',
    filters: Array.isArray(value.conditions)
      ? value.conditions
          .filter(isRecord)
          .map((condition) => ({
            fieldName:
              typeof condition.field === 'string'
                ? condition.field
                : typeof condition.fieldName === 'string'
                  ? condition.fieldName
                  : '',
            operator: typeof condition.operator === 'string' ? condition.operator : 'isExactly',
            value: {
              type: 'array',
              values: Array.isArray(condition.values)
                ? condition.values.filter((entry): entry is string => typeof entry === 'string')
                : condition.value === undefined
                  ? []
                  : [String(condition.value)],
            },
          }))
      : [],
    value:
      isRecord(value.definition) && typeof value.definition.boostFactor === 'number'
        ? value.definition.boostFactor
        : isRecord(value.definition) && typeof value.definition.position === 'number'
          ? value.definition.position
          : 0,
    locales: [],
    rulePrecondition: null,
    audienceConditions: [],
  };
};

function transformMerchandisingHubFormat(hubRule: unknown): MerchandisingHubRulePayload {
  if (isRecord(hubRule) && isRecord(hubRule.rule)) {
    return hubRule as unknown as MerchandisingHubRulePayload;
  }

  return {
    rule: toHubRuleRecord(hubRule) ?? {
      name: 'Unknown rule',
      action: 'boost',
      trackingId: '',
      enabled: true,
    },
    solutionType: undefined,
    schedule: null,
    ruleTargets: null,
    isGlobal: true,
  };
}

export function exportRankingRulesToJSON(rules: RuleImportModel[]): string {
  return JSON.stringify(rules, null, 2);
}

export function parseRankingRulesJSON(jsonString: string): {
  valid: boolean;
  data?: RuleImportModel[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    if (!Array.isArray(parsed)) {
      return {valid: false, error: 'Invalid format: Expected an array of rules'};
    }

    const transformedRules = parsed.map(transformMerchandisingHubFormat);

    for (const [index, item] of transformedRules.entries()) {
      const rule = item.rule;

      if (!rule.name || typeof rule.name !== 'string') {
        return {valid: false, error: `Invalid format at index ${index}: name is required and must be a string`};
      }

      if (rule.trackingId && typeof rule.trackingId !== 'string') {
        return {valid: false, error: `Invalid format at index ${index}: trackingId must be a string if provided`};
      }

      if (rule.enabled !== undefined && typeof rule.enabled !== 'boolean') {
        return {valid: false, error: `Invalid format at index ${index}: enabled must be a boolean if provided`};
      }

      if (
        !rule.action ||
        !['boost', 'bury', 'pin', 'reservedPosition', 'spotlightContent', 'include', 'exclude', 'onlyShow'].includes(
          rule.action,
        )
      ) {
        return {
          valid: false,
          error:
            'Invalid format at index ' +
            index +
            ': action must be one of: boost, bury, pin, reservedPosition, spotlightContent, include, exclude, onlyShow',
        };
      }

      if (rule.value !== undefined && (typeof rule.value !== 'number' || !Number.isFinite(rule.value))) {
        return {valid: false, error: `Invalid format at index ${index}: value must be a finite number`};
      }

      if (rule.filters !== undefined && !Array.isArray(rule.filters)) {
        return {valid: false, error: `Invalid format at index ${index}: filters must be an array`};
      }

      for (const [conditionIndex, filter] of (rule.filters ?? []).entries()) {
        if (!filter.fieldName || typeof filter.fieldName !== 'string') {
          return {
            valid: false,
            error: `Invalid condition at index ${index}, condition ${conditionIndex}: fieldName is required`,
          };
        }

        if (!filter.operator || typeof filter.operator !== 'string') {
          return {
            valid: false,
            error: `Invalid condition at index ${index}, condition ${conditionIndex}: operator is required`,
          };
        }
      }
    }

    return {
      valid: true,
      data: transformedRules,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {valid: false, error: `JSON parse error: ${errorMessage}`};
  }
}

export const toImportPayload = (
  rules: RuleImportModel[],
  trackingId: string,
  solutionType: 'listing' | 'search',
): MerchandisingHubRulePayload[] =>
  rules.map((item) => {
    if ('rule' in item) {
      const hubItem = item as MerchandisingHubRulePayload;
      const rule = hubItem.rule;
      const normalizedRule: MerchandisingHubRuleRecord = {
        ...rule,
        trackingId,
      };
      delete normalizedRule.id;
      delete normalizedRule.createdBy;
      delete normalizedRule.createdAt;
      delete normalizedRule.updatedAt;
      delete normalizedRule.updatedBy;

      return {
        rule: normalizedRule,
        solutionType,
        schedule: hubItem.schedule ?? null,
        ruleTargets: hubItem.ruleTargets ?? null,
        isGlobal: hubItem.isGlobal ?? true,
      };
    }

    const flatRule = item as RuleModel;
    const rest: RuleModel = {
      ...flatRule,
    };
    delete rest.id;
    delete rest.createdBy;
    delete rest.createdAt;
    delete rest.updatedAt;
    delete rest.updatedBy;

    return {
      rule: {
        ...(toHubRuleRecord(rest) ?? {
          name: rest.name,
          action: rest.action,
          trackingId,
          enabled: rest.enabled,
        }),
        trackingId,
      },
      solutionType,
      schedule: null,
      ruleTargets: null,
      isGlobal: true,
    };
  });

export function downloadRankingRulesJSON(
  rules: RuleImportModel[],
  ruleType: 'ranking' | 'filter' = 'ranking',
  solutionType: 'listing' | 'search' = 'listing',
) {
  const jsonString = exportRankingRulesToJSON(rules);
  const blob = new Blob([jsonString], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.download = `${ruleType}-rules-${solutionType}-${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
