import { describe, expect, it } from 'vitest';
import { factoryPhaseSystemPrompt } from './factoryPhasePrompt';

describe('factoryPhasePrompt', () => {
  it('requires the summary heading for each phase', () => {
    expect(factoryPhaseSystemPrompt('discovery')).toContain('## Discovery summary');
    expect(factoryPhaseSystemPrompt('implementation')).toContain('## Implementation summary');
    expect(factoryPhaseSystemPrompt('delivery')).toContain('## Delivery summary');
    expect(factoryPhaseSystemPrompt(null)).toBe('');
  });
});
