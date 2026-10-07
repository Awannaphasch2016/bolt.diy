import { describe, expect, it } from 'vitest';
import { factoryRunFromMetadata, progressForRun } from './factoryRun';

describe('factoryRun', () => {
  it('starts a missing record at Discovery', () => {
    expect(factoryRunFromMetadata(undefined)).toEqual({
      phase: 'discovery',
      approved: [],
      comments: [],
    });
    expect(factoryRunFromMetadata({ factory: { phase: 'nope' } }).phase).toBe('discovery');
  });

  it('keeps a saved phase, approvals, and comments', () => {
    expect(
      factoryRunFromMetadata({
        factory: {
          phase: 'implementation',
          approved: ['discovery', 'notes'],
          comments: [
            { phase: 'discovery', body: 'Hero only' },
            { phase: 'delivery', body: '   ' },
          ],
        },
      }),
    ).toEqual({
      phase: 'implementation',
      approved: ['discovery'],
      comments: [{ phase: 'discovery', body: 'Hero only' }],
    });
  });

  it('does not treat Discovery messages as Implementation having started', () => {
    const progress = progressForRun({ phase: 'discovery', approved: [], comments: [] }, true);
    expect(progress.started.has('discovery')).toBe(true);
    expect(progress.started.has('implementation')).toBe(false);
  });
});
