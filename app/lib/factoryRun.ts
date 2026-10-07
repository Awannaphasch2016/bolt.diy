import { atom } from 'nanostores';
import { FACTORY_PHASES, type FactoryPhase } from './factoryPhase';

export interface FactoryPhaseComment {
  phase: FactoryPhase;
  body: string;
}

/** One walkthrough stored on the chat record. The summary is read from the last reply. */
export interface FactoryRunRecord {
  phase: FactoryPhase;
  approved: FactoryPhase[];
  comments: FactoryPhaseComment[];
}

export const walkthroughPhase = atom<FactoryPhase>('discovery');

export function emptyFactoryRun(): FactoryRunRecord {
  return { phase: 'discovery', approved: [], comments: [] };
}

function isFactoryPhase(value: unknown): value is FactoryPhase {
  return FACTORY_PHASES.includes(value as FactoryPhase);
}

/** Restores a saved run. A missing or broken record starts at Discovery. */
export function factoryRunFromMetadata(metadata: { factory?: unknown } | undefined): FactoryRunRecord {
  const factory = metadata?.factory;

  if (!factory || typeof factory !== 'object') {
    return emptyFactoryRun();
  }

  const record = factory as Partial<FactoryRunRecord>;
  const phase = isFactoryPhase(record.phase) ? record.phase : 'discovery';
  const approved = Array.isArray(record.approved) ? record.approved.filter(isFactoryPhase) : [];

  const comments = Array.isArray(record.comments)
    ? record.comments.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return [];
        }

        const comment = item as Partial<FactoryPhaseComment>;

        if (!isFactoryPhase(comment.phase) || typeof comment.body !== 'string' || comment.body.trim() === '') {
          return [];
        }

        return [{ phase: comment.phase, body: comment.body }];
      })
    : [];

  return { phase, approved, comments };
}

/**
 * Earlier phases count as started once they are approved. The current phase
 * counts once this chat has any message. A later phase stays locked.
 */
export function progressForRun(
  run: FactoryRunRecord,
  hasMessages: boolean,
): {
  approved: ReadonlySet<FactoryPhase>;
  started: ReadonlySet<FactoryPhase>;
} {
  const approved = new Set(run.approved);
  const started = new Set<FactoryPhase>(approved);

  if (hasMessages) {
    started.add(run.phase);
  }

  return { approved, started };
}
