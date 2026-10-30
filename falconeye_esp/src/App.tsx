import React, { useState, useEffect } from 'react';
import { TargetTrack, Telemetry, FalconNetStatus } from './types';
import { HeaderBar } from './components/HeaderBar';
import { HudOverlay } from './components/HudOverlay';
import { TacticalMap } from './components/TacticalMap';
import { NetworkStatusWidget } from './components/NetworkStatusWidget';
import { TargetListWidget } from './components/TargetListWidget';
import { Play, Pause, RotateCcw, ShieldAlert } from 'lucide-react';

export const App: React.FC = () => {
  // Telemetry State
  const [telemetry, setTelemetry] = useState<Telemetry>({
    armed: false,
    flightMode: 'POS_HOLD',
    batteryPct: 88,
    batteryVoltage: 22.4, // 6S LiPo
    altitudeMeters: 18.5,
    groundSpeedMps: 12.4,
    headingDeg: 42.0,
    pitchDeg: -4.5,
    rollDeg: 2.1,
    gpsFix: 'RTK_FIXED',
    satellites: 24,
  });

  // Active Target Tracks
  const [tracks, setTracks] = useState<TargetTrack[]>([
    {
      trackId: 101,
      className: 'vehicle',
      confidence: 0.94,
      state: 'TRACKING',
      bbox: { xMin: 0.42, yMin: 0.48, xMax: 0.58, yMax: 0.62 },
      velocityX: 0.02,
      velocityY: -0.01,
      distanceMeters: 32.0,
    },
    {
      trackId: 102,
      className: 'person',
      confidence: 0.88,
      state: 'TRACKING',
      bbox: { xMin: 0.72, yMin: 0.55, xMax: 0.76, yMax: 0.65 },
      velocityX: -0.005,
      velocityY: 0.0,
      distanceMeters: 45.0,
    },
  ]);

  // Locked Target ID
  const [designatedTrackId, setDesignatedTrackId] = useState<number | null>(null);

  // FalconNet Multi-Provider Status
  const [network, setNetwork] = useState<FalconNetStatus>({
    activeTransport: 'WIFI6',
    wifi6: { connected: true, rssi: -58, latencyMs: 14, throughputKbps: 48000 },
    mesh: { connected: true, latencyMs: 22, details: '1 Hop via Ground Relay' },
    cellular: { connected: true, latencyMs: 38, details: '5G SA (Standby)' },
    starlink: { connected: true, latencyMs: 44, details: 'Satcom Ready' },
    packetLossPct: 0.1,
  });

  // Simulation physics loop (30 Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      setTracks((prevTracks) => {
        const t = Date.now() / 1000;
        return prevTracks.map((tr) => {
          if (tr.trackId === 101) {
            // Vehicle smoothly cruising in a gentle orbit
            const cx = 0.5 + 0.18 * Math.sin(t * 0.7);
            const cy = 0.55 + 0.08 * Math.cos(t * 0.5);
            const w = 0.14;
            const h = 0.09;
            return {
              ...tr,
              bbox: { xMin: cx - w / 2, yMin: cy - h / 2, xMax: cx + w / 2, yMax: cy + h / 2 },
              velocityX: 0.04 * Math.cos(t * 0.7),
              velocityY: -0.02 * Math.sin(t * 0.5),
            };
          }
          return tr;
        });
      });

      // Subtle drone heading & attitude oscillation
      setTelemetry((prev) => {
        const t = Date.now() / 1000;
        return {
          ...prev,
          headingDeg: (prev.headingDeg + 0.05) % 360,
          rollDeg: 2.0 * Math.sin(t * 1.2),
          pitchDeg: -4.0 + 1.5 * Math.cos(t * 0.8),
        };
      });
    }, 33);

    return () => clearInterval(interval);
  }, []);

  // Handlers for Operator Controls
  const handleDesignateTarget = (trackId: number) => {
    setDesignatedTrackId(trackId);
    setTelemetry((prev) => ({ ...prev, flightMode: 'OFFBOARD' }));
  };

  const handleBreakLock = () => {
    setDesignatedTrackId(null);
    setTelemetry((prev) => ({ ...prev, flightMode: 'POS_HOLD' }));
  };

  const toggleArm = () => {
    setTelemetry((prev) => ({ ...prev, armed: !prev.armed }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-tactical-dark text-slate-100 overflow-hidden font-mono">
      {/* Top Header & Status Bar */}
      <HeaderBar telemetry={telemetry} designatedTrackId={designatedTrackId} />

      {/* Main Tactical Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden">
        {/* Left Column: Tactical Map & Multi-Provider Network (4 cols) */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-[280px]">
            <TacticalMap
              tracks={tracks}
              telemetry={telemetry}
              designatedTrackId={designatedTrackId}
            />
          </div>
          <div className="h-auto">
            <NetworkStatusWidget network={network} />
          </div>
        </div>

        {/* Center Column: AR Video HUD & Flight Control Deck (8 cols) */}
        <div className="col-span-8 flex flex-col gap-3 min-h-0">
          {/* Main AR HUD Display */}
          <div className="flex-1 bg-black rounded-lg border border-tactical-border overflow-hidden relative shadow-2xl">
            <HudOverlay
              tracks={tracks}
              telemetry={telemetry}
              designatedTrackId={designatedTrackId}
              onDesignateTarget={handleDesignateTarget}
              onBreakLock={handleBreakLock}
            />
          </div>

          {/* Bottom Action Deck: Target List + Operator Command Bar */}
          <div className="h-44 grid grid-cols-12 gap-3">
            {/* Target Inventory (7 cols) */}
            <div className="col-span-7 h-full">
              <TargetListWidget
                tracks={tracks}
                designatedTrackId={designatedTrackId}
                onDesignateTarget={handleDesignateTarget}
                onBreakLock={handleBreakLock}
              />
            </div>

            {/* Quick Pilot Action Bar (5 cols) */}
            <div className="col-span-5 bg-tactical-panel border border-tactical-border rounded-lg p-3 flex flex-col justify-between text-xs">
              <div className="font-bold text-slate-200 border-b border-tactical-border pb-1 mb-2 flex items-center justify-between">
                <span>OPERATOR QUICK COMMANDS</span>
                <span className="text-[10px] text-tactical-accent">STANDBY LINK</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleArm}
                  className={`py-2 px-2 rounded font-bold transition-all flex items-center justify-center gap-1.5 ${
                    telemetry.armed
                      ? 'bg-tactical-alert hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  {telemetry.armed ? 'EMERGENCY DISARM' : 'ARM MOTORS'}
                </button>

                <button
                  onClick={() => setTelemetry((prev) => ({ ...prev, flightMode: 'RTL' }))}
                  className="bg-amber-600/80 hover:bg-amber-500 text-white font-bold py-2 px-2 rounded flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> RETURN HOME (RTL)
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800 mt-2">
                <span className="text-slate-400">Autonomy Status:</span>
                <span className="font-bold text-cyan-400">
                  {designatedTrackId ? `IBVS LOCKED (#${designatedTrackId})` : 'PILOT MANUAL READY'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
