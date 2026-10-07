import { useState } from 'react';
import {
  FACTORY_PHASES,
  type FactoryPhase,
  canContinueFactoryPhase,
  factoryPhaseHint,
  factoryPhaseLabel,
  factoryPhaseShade,
  isFactoryPhaseApproved,
  isFactoryPhaseUnlocked,
  lockedFactoryPhaseReason,
  nextFactoryPhase,
  showFactoryPhaseApproval,
} from '~/lib/factoryPhase';
import type { FactoryPhaseComment } from '~/lib/factoryRun';

interface FactoryPhaseBarProps {
  phase: FactoryPhase;
  progress: {
    approved: ReadonlySet<FactoryPhase>;
    started: ReadonlySet<FactoryPhase>;
  };
  phaseSummary: string | null;
  isStreaming: boolean;
  comments: FactoryPhaseComment[];
  approvalPending: boolean;
  onSelectPhase: (phase: FactoryPhase) => void;
  onApprove: () => void;
  onComment: (body: string) => void;
}

export function FactoryPhaseBar({
  phase,
  progress,
  phaseSummary,
  isStreaming,
  comments,
  approvalPending,
  onSelectPhase,
  onApprove,
  onComment,
}: FactoryPhaseBarProps) {
  const [comment, setComment] = useState('');
  const next = nextFactoryPhase(phase);
  const hasPhaseSummary = phaseSummary != null;
  const canApprove = canContinueFactoryPhase({ hasPhaseSummary, isStreaming }) && !approvalPending;
  const deliveryStillOpen = phase === 'delivery' && !isFactoryPhaseApproved(phase, progress);

  const showApproval = showFactoryPhaseApproval({ phase, progress, hasPhaseSummary }) || deliveryStillOpen;

  const approveLabel = next ? `Approve and continue to ${factoryPhaseLabel(next)}` : 'Approve delivery';

  return (
    <div
      className="border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-3 py-2"
      data-testid="factory-phase-bar"
    >
      <div className="flex flex-wrap items-center gap-2">
        {FACTORY_PHASES.map((item) => {
          const selected = item === phase;
          const unlocked = isFactoryPhaseUnlocked(item, progress);

          const shade = factoryPhaseShade({
            phase: item,
            progress,
            hasPhaseSummary: item === phase ? hasPhaseSummary : progress.approved.has(item),
          });

          return (
            <button
              key={item}
              type="button"
              aria-pressed={selected}
              disabled={!unlocked}
              title={unlocked ? undefined : lockedFactoryPhaseReason(item)}
              data-testid={`factory-phase-${item}`}
              data-phase-shade={shade}
              className={`rounded-md px-2.5 py-1 text-sm disabled:cursor-not-allowed ${
                shade === 'finished'
                  ? 'bg-accent-500 text-white'
                  : shade === 'in-progress'
                    ? 'bg-accent-500/25 text-bolt-elements-textPrimary'
                    : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary'
              } ${selected ? 'ring-2 ring-accent-500 ring-offset-1' : ''}`}
              onClick={() => onSelectPhase(item)}
            >
              {!unlocked && <span className="i-ph:lock mr-1 inline-block align-middle" aria-hidden />}
              {factoryPhaseLabel(item)}
            </button>
          );
        })}
        {showApproval && (
          <button
            type="button"
            className="ml-auto rounded-md bg-accent-500 px-2.5 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canApprove}
            data-testid="factory-phase-continue"
            onClick={onApprove}
          >
            {approveLabel}
          </button>
        )}
      </div>
      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        data-testid="factory-phase-comments"
        onSubmit={(event) => {
          event.preventDefault();

          const body = comment.trim();

          if (!body) {
            return;
          }

          onComment(body);
          setComment('');
        }}
      >
        {comments
          .filter((item) => item.phase === phase)
          .map((item) => (
            <p key={`${item.phase}:${item.body}`} className="w-full text-xs text-bolt-elements-textSecondary">
              {item.body}
            </p>
          ))}
        <input
          aria-label="Phase comment"
          className="h-8 min-w-0 flex-1 rounded-md border border-bolt-elements-borderColor bg-transparent px-2 text-sm"
          value={comment}
          placeholder="Comment on this phase"
          onChange={(event) => setComment(event.target.value)}
        />
        <button type="submit" className="rounded-md border border-bolt-elements-borderColor px-2.5 py-1 text-sm">
          Comment
        </button>
      </form>
      <p className="mt-2 text-xs text-bolt-elements-textSecondary">
        {factoryPhaseHint(phase)}
        {showApproval && !canApprove && (
          <>
            {' '}
            {isStreaming
              ? 'The reply is still coming in.'
              : `Approval unlocks when the last reply posts its ${factoryPhaseLabel(phase)} summary.`}
          </>
        )}
      </p>
    </div>
  );
}
