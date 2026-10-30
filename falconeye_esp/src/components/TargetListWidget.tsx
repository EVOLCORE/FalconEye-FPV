import React from 'react';
import { TargetTrack } from '../types';
import { Target, Lock, Unlock, Eye, ArrowRightLeft } from 'lucide-react';

interface TargetListWidgetProps {
  tracks: TargetTrack[];
  designatedTrackId: number | null;
  selectedDroneCallsign: string;
  onDesignateTarget: (trackId: number) => void;
  onBreakLock: () => void;
  onHandoffTarget: (trackId: number) => void;
}

export const TargetListWidget: React.FC<TargetListWidgetProps> = ({
  tracks,
  designatedTrackId,
  selectedDroneCallsign,
  onDesignateTarget,
  onBreakLock,
  onHandoffTarget,
}) => {
  return (
    <div className="bg-tactical-panel border border-tactical-border rounded-lg p-3 text-xs flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-tactical-border">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <Eye className="w-3.5 h-3.5 text-tactical-accent" />
          SPOTTED TARGETS ({tracks.length})
        </div>
        {designatedTrackId && (
          <button
            onClick={onBreakLock}
            className="flex items-center gap-1 text-[10px] bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 px-2 py-0.5 rounded transition-colors font-bold"
          >
            <Unlock className="w-3 h-3" /> RELEASE LOCK
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
        {tracks.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-slate-500 italic text-center">
            No targets spotted in camera view.
          </div>
        ) : (
          tracks.map((t) => {
            const isLocked = t.trackId === designatedTrackId;

            return (
              <div
                key={t.trackId}
                className={`p-2 rounded border flex items-center justify-between transition-all ${
                  isLocked
                    ? 'bg-red-950/40 border-red-500 shadow-sm shadow-red-950'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200">#{t.trackId}</span>
                    <span className="font-bold text-tactical-accent uppercase text-[11px]">{t.className}</span>
                    <span className="text-[10px] text-slate-400">{(t.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Status: <strong className={t.state === 'TRACKING' ? 'text-emerald-400' : 'text-amber-400'}>{t.state}</strong></span>
                    <span>Range: ~{t.distanceMeters || 32}m</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isLocked ? (
                    <>
                      <span className="flex items-center gap-1 bg-red-600 text-white font-bold text-[10px] px-2 py-1 rounded">
                        <Lock className="w-3 h-3" /> TRACKING
                      </span>
                      {/* Swarm Target Handoff Button */}
                      <button
                        onClick={() => onHandoffTarget(t.trackId)}
                        title="Hand off this target to sister drone"
                        className="flex items-center gap-1 bg-purple-900 hover:bg-purple-800 border border-purple-600 text-purple-200 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> HANDOFF
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onDesignateTarget(t.trackId)}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-tactical-accent hover:text-black border border-slate-700 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded transition-colors"
                    >
                      <Target className="w-3 h-3" /> LOCK
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
