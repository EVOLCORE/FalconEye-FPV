import React from 'react';
import { Telemetry } from '../types';
import { Shield, Battery, Navigation, Radio, AlertTriangle } from 'lucide-react';

interface HeaderBarProps {
  telemetry: Telemetry;
  designatedTrackId: number | null;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ telemetry, designatedTrackId }) => {
  return (
    <header className="h-14 border-b border-tactical-border bg-tactical-panel/90 backdrop-blur px-4 flex items-center justify-between text-xs tracking-wider">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-tactical-accent/20 border border-tactical-accent flex items-center justify-center text-tactical-accent font-black">
          FE
        </div>
        <div>
          <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
            FALCONEYE FPV
            <span className="text-[10px] bg-cyan-950 text-tactical-accent border border-cyan-800 px-1.5 py-0.5 rounded">
              ESP v1.0
            </span>
          </div>
          <div className="text-[10px] text-slate-400">AUTONOMOUS TACTICAL PERCEPTION</div>
        </div>
      </div>

      {/* Flight Telemetry Status Badges */}
      <div className="flex items-center gap-4">
        {/* Arm State */}
        <div className={`px-2.5 py-1 rounded font-bold border flex items-center gap-1.5 ${
          telemetry.armed 
            ? 'bg-tactical-alert/20 border-tactical-alert text-tactical-alert animate-pulse'
            : 'bg-emerald-950/40 border-emerald-600 text-emerald-400'
        }`}>
          <Shield className="w-3.5 h-3.5" />
          {telemetry.armed ? 'ARMED' : 'DISARMED'}
        </div>

        {/* Flight Mode */}
        <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded text-slate-200 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-tactical-accent" />
          MODE: <span className="text-tactical-accent font-bold">{telemetry.flightMode}</span>
        </div>

        {/* Active Target Lock Status */}
        {designatedTrackId ? (
          <div className="bg-red-950/60 border border-red-500 text-red-400 px-3 py-1 rounded flex items-center gap-1.5 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            TARGET LOCKED: <span className="font-black text-white">#{designatedTrackId}</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded">
            TARGET: NO LOCK (SEARCHING)
          </div>
        )}

        {/* Battery Indicator */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded">
          <Battery className={`w-4 h-4 ${telemetry.batteryPct < 25 ? 'text-tactical-alert' : 'text-emerald-400'}`} />
          <span className="font-bold text-slate-100">{telemetry.batteryPct}%</span>
          <span className="text-slate-400">({telemetry.batteryVoltage.toFixed(1)}V)</span>
        </div>
      </div>
    </header>
  );
};
