import React from 'react';
import { FlightStatus, SwarmDroneInfo } from '../types';
import { Shield, Battery, Navigation, Radio, Plane } from 'lucide-react';

interface HeaderBarProps {
  status: FlightStatus;
  designatedTrackId: number | null;
  swarm: SwarmDroneInfo[];
  selectedDroneId: number;
  onSelectDrone: (droneId: number) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  status,
  designatedTrackId,
  swarm,
  selectedDroneId,
  onSelectDrone,
}) => {
  return (
    <header className="h-14 border-b border-tactical-border bg-tactical-panel/95 backdrop-blur px-4 flex items-center justify-between text-xs tracking-wider">
      {/* Brand & Multi-Drone Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-cyan-950 border border-tactical-accent flex items-center justify-center text-tactical-accent font-black">
            FE
          </div>
          <div className="font-bold text-sm text-slate-100 hidden sm:block">
            FALCONEYE
          </div>
        </div>

        {/* Airborne Swarm Drone Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400 px-1 font-bold flex items-center gap-1">
            <Plane className="w-3 h-3 text-tactical-accent" /> SWARM:
          </span>
          {swarm.map((d) => {
            const isSelected = d.droneId === selectedDroneId;
            return (
              <button
                key={d.droneId}
                onClick={() => onSelectDrone(d.droneId)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-tactical-accent text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{d.callsign}</span>
                <span className={`text-[9px] ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                  {d.batteryPct}%
                </span>
                {d.relayThroughDroneId !== 0 && (
                  <span className="text-[9px] bg-amber-900/60 text-amber-300 px-1 rounded">
                    HOP
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Status Badges */}
      <div className="flex items-center gap-3">
        {/* Motors Arm State */}
        <div className={`px-2.5 py-1 rounded font-bold border flex items-center gap-1.5 ${
          status.armed 
            ? 'bg-tactical-alert/20 border-tactical-alert text-tactical-alert animate-pulse'
            : 'bg-emerald-950/40 border-emerald-600 text-emerald-400'
        }`}>
          <Shield className="w-3.5 h-3.5" />
          {status.armed ? 'ARMED (LIVE)' : 'DISARMED (SAFE)'}
        </div>

        {/* Flight Mode */}
        <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded text-slate-200 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-tactical-accent" />
          FLIGHT: <span className="text-tactical-accent font-bold">{status.flightMode}</span>
        </div>

        {/* Target Lock */}
        {designatedTrackId ? (
          <div className="bg-red-950/60 border border-red-500 text-red-400 px-3 py-1 rounded flex items-center gap-1.5 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            LOCKED: <span className="font-black text-white">#{designatedTrackId}</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded">
            TARGET: SCANNING
          </div>
        )}

        {/* Battery Health */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded">
          <Battery className={`w-4 h-4 ${status.batteryPct < 25 ? 'text-tactical-alert' : 'text-emerald-400'}`} />
          <span className="font-bold text-slate-100">{status.batteryPct}%</span>
          <span className="text-slate-400">({status.batteryVoltage.toFixed(1)}V)</span>
        </div>
      </div>
    </header>
  );
};
