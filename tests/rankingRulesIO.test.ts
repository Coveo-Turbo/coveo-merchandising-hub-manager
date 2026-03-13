import {describe, expect, it} from 'vitest';
import {parseRankingRulesJSON, toImportPayload} from '../src/utils/rankingRulesIO';

describe('rankingRulesIO', () => {
  it('transforms flat rule exports into Hub-compatible payloads', () => {
    const json = JSON.stringify([
      {
        name: 'Boost summer',
        trackingId: 'old-tracking',
        enabled: true,
        action: 'boost',
        conditions: [{field: 'ec_category', operator: 'equals', value: 'summer'}],
        definition: {boostFactor: 100},
      },
    ]);

    const parsed = parseRankingRulesJSON(json);
    expect(parsed.valid).toBe(true);
    expect(parsed.data).toHaveLength(1);

    const payload = toImportPayload(parsed.data ?? [], 'new-tracking', 'listing');
    expect(payload[0].rule.trackingId).toBe('new-tracking');
    expect(payload[0].rule.filters?.[0].fieldName).toBe('ec_category');
  });
});
