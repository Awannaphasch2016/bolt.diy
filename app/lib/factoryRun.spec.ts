import { describe, expect, it } from 'vitest';
import { factoryRunFromMetadata, factoryRunToRestore, progressForRun } from './factoryRun';

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

  it('restores a saved phase once the reloaded chat is ready', () => {
    const metadata = {
      factory: { phase: 'delivery', approved: ['discovery', 'implementation'], comments: [] },
    };

    expect(factoryRunToRestore(false, 'chat-1', undefined, metadata)).toBeNull();
    expect(factoryRunToRestore(true, undefined, undefined, metadata)).toBeNull();
    expect(factoryRunToRestore(true, 'chat-1', undefined, {})).toBeNull();

    const restored = factoryRunToRestore(true, 'chat-1', undefined, metadata);
    expect(restored?.run.phase).toBe('delivery');
    expect(restored?.run.approved).toEqual(['discovery', 'implementation']);
    expect(factoryRunToRestore(true, 'chat-1', restored?.chatId, metadata)).toBeNull();
  });

  it('does not treat Discovery messages as Implementation having started', () => {
    const progress = progressForRun({ phase: 'discovery', approved: [], comments: [] }, true);
    expect(progress.started.has('discovery')).toBe(true);
    expect(progress.started.has('implementation')).toBe(false);
  });
});
