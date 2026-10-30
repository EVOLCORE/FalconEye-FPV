import React, { useState, useEffect } from 'react';
import { TargetTrack, FlightStatus, FalconNetStatus, SwarmDroneInfo, VisionMode, NavigationSource, GeofenceZone } from './types';
import { HeaderBar } from './components/HeaderBar';
import { HudOverlay } from './components/HudOverlay';
import { TacticalMap } from './components/TacticalMap';
import { NetworkStatusWidget } from './components/NetworkStatusWidget';
import { TargetListWidget } from './components/TargetListWidget';
import { ShieldAlert, RotateCcw, Crosshair, RadioTower, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Airborne Swarm Team
  const [swarm, setSwarm] = useState<SwarmDroneInfo[]>([
    {
      droneId: 1,
      callsign: 'Falcon-1',
      batteryPct: 91,
      altitudeMeters: 45.0,
      headingDeg: 42.0,
      linkQualityPct: 95,
      relayThroughDroneId: 0,
      role: 'SCOUT',
      lockedTargetId: null,
    },
    {
      droneId: 2,
      callsign: 'Falcon-2',
      batteryPct: 78,
      altitudeMeters: 18.0,
      headingDeg: 350.0,
      linkQualityPct: 20,
      relayThroughDroneId: 1,
      role: 'SCOUT',
      lockedTargetId: null,
    },
  ]);

  const [selectedDroneId, setSelectedDroneId] = useState<number>(1);
  const [isInterceptMode, setIsInterceptMode] = useState<boolean>(false);

  // Vision Mode (Default: Military White Hot)
  const [visionMode, setVisionMode] = useState<VisionMode>('THERMAL_WHITE_HOT');

  // Flight Status & Anti-Jam Navigation
  const [status, setStatus] = useState<FlightStatus>({
    armed: false,
    flightMode: 'POS_HOLD',
    batteryPct: 91,
    batteryVoltage: 22.8,
    altitudeMeters: 45.0,
    speedMps: 12.0,
    headingDeg: 42.0,
    pitchDeg: -3.5,
    rollDeg: 1.8,
    gpsStatus: 'RTK_LOCK',
    satellites: 26,
    navigationSource: 'GPS_RTK',
  });

  // Active Tactical Geofences (Default Authorized Killbox around target range)
  const [zones, setZones] = useState<GeofenceZone[]>([
    {
      id: 'KB_ALPHA',
      name: 'AUTHORIZED KILLBOX',
      type: 'KILLBOX',
      coords: [
        [45.4635, 9.1890],
        [45.4655, 9.1890],
        [45.4655, 9.1915],
        [45.4635, 9.1915],
      ],
    },
  ]);

  // Shared Targets
  const [tracks, setTracks] = useState<TargetTrack[]>([
    {
      trackId: 101,
      className: 'vehicle',
      confidence: 0.95,
      state: 'TRACKING',
      bbox: { xMin: 0.42, yMin: 0.48, xMax: 0.58, yMax: 0.62 },
      velocityX: 0.02,
      velocityY: -0.01,
      distanceMeters: 32.0,
      inKillbox: true,
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
      inKillbox: true,
    },
  ]);

  const [designatedTrackId, setDesignatedTrackId] = useState<number | null>(null);

  // Multi-Provider Network Health
  const [network, setNetwork] = useState<FalconNetStatus>({
    activeTransport: 'WIFI6',
    wifi6: { connected: true, rssi: -56, latencyMs: 12 },
    mesh: { connected: true, latencyMs: 18, details: 'In-Air Drone Mesh Active' },
    cellular: { connected: true, latencyMs: 35, details: '5G SA Standby' },
    starlink: { connected: true, latencyMs: 42, details: 'Satcom Ready' },
    packetLossPct: 0.05,
    activeAirborneRelaysCount: 1,
  });

  // Check if designated target is inside active Killbox
  const activeTrack = tracks.find((t) => t.trackId === designatedTrackId);
  const targetInKillbox = activeTrack?.inKillbox ?? true;

  // Animation Physics Loop (30 Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      setTracks((prevTracks) => {
        const t = Date.now() / 1000;
        return prevTracks.map((tr) => {
          if (tr.trackId === 101) {
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

      setStatus((prev) => {
        const t = Date.now() / 1000;
        return {
          ...prev,
          headingDeg: (prev.headingDeg + 0.05) % 360,
          rollDeg: 1.8 * Math.sin(t * 1.2),
          pitchDeg: -3.5 + 1.2 * Math.cos(t * 0.8),
        };
      });
    }, 33);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleSelectDrone = (droneId: number) => {
    setSelectedDroneId(droneId);
    const targetDrone = swarm.find((d) => d.droneId === droneId);
    if (targetDrone) {
      setStatus((prev) => ({
        ...prev,
        batteryPct: targetDrone.batteryPct,
        altitudeMeters: targetDrone.altitudeMeters,
        headingDeg: targetDrone.headingDeg,
      }));
    }
  };

  const handleDesignateTarget = (trackId: number) => {
    setDesignatedTrackId(trackId);
    setStatus((prev) => ({ ...prev, flightMode: 'OFFBOARD' }));
    setSwarm((prev) =>
      prev.map((d) =>
        d.droneId === selectedDroneId ? { ...d, lockedTargetId: trackId, role: 'TRACKING' } : d
      )
    );
  };

  const handleBreakLock = () => {
    setDesignatedTrackId(null);
    setIsInterceptMode(false);
    setStatus((prev) => ({ ...prev, flightMode: 'POS_HOLD' }));
    setSwarm((prev) =>
      prev.map((d) =>
        d.droneId === selectedDroneId ? { ...d, lockedTargetId: null, role: 'SCOUT' } : d
      )
    );
  };

  const handleToggleIntercept = () => {
    if (!designatedTrackId) return;
    if (!targetInKillbox && zones.some((z) => z.type === 'KILLBOX')) return;

    const nextState = !isInterceptMode;
    setIsInterceptMode(nextState);
    setStatus((prev) => ({
      ...prev,
      flightMode: nextState ? 'INTERCEPT' : 'OFFBOARD',
      speedMps: nextState ? 28.0 : 12.0,
    }));
  };

  const handleToggleKillbox = () => {
    if (zones.some((z) => z.type === 'KILLBOX')) {
      setZones((prev) => prev.filter((z) => z.type !== 'KILLBOX'));
    } else {
      setZones((prev) => [
        ...prev,
        {
          id: 'KB_ALPHA',
          name: 'AUTHORIZED KILLBOX',
          type: 'KILLBOX',
          coords: [
            [45.4635, 9.1890],
            [45.4655, 9.1890],
            [45.4655, 9.1915],
            [45.4635, 9.1915],
          ],
        },
      ]);
    }
  };

  // Toggle GPS Jamming / Optical Flow Fallback
  const handleToggleGpsJamming = () => {
    const isGpsActive = status.navigationSource === 'GPS_RTK';
    setStatus((prev) => ({
      ...prev,
      navigationSource: isGpsActive ? 'OPTICAL_FLOW_VISION' : 'GPS_RTK',
      gpsStatus: isGpsActive ? 'NO_GPS' : 'RTK_LOCK',
      satellites: isGpsActive ? 0 : 26,
    }));
  };

  const handleHandoffTarget = (trackId: number) => {
    const receiverId = selectedDroneId === 1 ? 2 : 1;
    setSwarm((prev) =>
      prev.map((d) => {
        if (d.droneId === selectedDroneId) return { ...d, lockedTargetId: null, role: 'SCOUT' };
        if (d.droneId === receiverId) return { ...d, lockedTargetId: trackId, role: 'TRACKING' };
        return d;
      })
    );
    handleSelectDrone(receiverId);
  };

  const toggleArm = () => {
    setStatus((prev) => ({ ...prev, armed: !prev.armed }));
  };

  const currentDroneCallsign = selectedDroneId === 1 ? 'Falcon-1' : 'Falcon-2';

  return (
    <div className="flex flex-col h-screen w-screen bg-tactical-dark text-slate-100 overflow-hidden font-mono">
      {/* Top Header & Multi-Drone Switcher */}
      <HeaderBar
        status={status}
        designatedTrackId={designatedTrackId}
        swarm={swarm}
        selectedDroneId={selectedDroneId}
        onSelectDrone={handleSelectDrone}
      />

      {/* Main Tactical Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden">
        {/* Left Column: SATELLITE MAP & Network (4 cols) */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-[300px]">
            <TacticalMap
              tracks={tracks}
              status={status}
              swarm={swarm}
              selectedDroneId={selectedDroneId}
              designatedTrackId={designatedTrackId}
              isInterceptMode={isInterceptMode}
              zones={zones}
              targetInKillbox={targetInKillbox}
              onToggleIntercept={handleToggleIntercept}
              onToggleKillbox={handleToggleKillbox}
            />
          </div>
          <div className="h-auto">
            <NetworkStatusWidget network={network} />
          </div>
        </div>

        {/* Center/Right Column: AR Video HUD & Pilot Controls (8 cols) */}
        <div className="col-span-8 flex flex-col gap-3 min-h-0">
          {/* Main AR Video HUD Display with Thermal Vision */}
          <div className="flex-1 bg-black rounded-lg border border-tactical-border overflow-hidden relative shadow-2xl">
            <HudOverlay
              tracks={tracks}
              status={status}
              designatedTrackId={designatedTrackId}
              isInterceptMode={isInterceptMode}
              visionMode={visionMode}
              targetInKillbox={targetInKillbox}
              onSetVisionMode={setVisionMode}
              onDesignateTarget={handleDesignateTarget}
              onBreakLock={handleBreakLock}
            />
          </div>

          {/* Bottom Deck: Spotted Targets + Pilot Action Bar */}
          <div className="h-44 grid grid-cols-12 gap-3">
            {/* Target Inventory */}
            <div className="col-span-7 h-full">
              <TargetListWidget
                tracks={tracks}
                designatedTrackId={designatedTrackId}
                selectedDroneCallsign={currentDroneCallsign}
                onDesignateTarget={handleDesignateTarget}
                onBreakLock={handleBreakLock}
                onHandoffTarget={handleHandoffTarget}
              />
            </div>

            {/* Pilot Action Bar */}
            <div className="col-span-5 bg-tactical-panel border border-tactical-border rounded-lg p-3 flex flex-col justify-between text-xs">
              <div className="font-bold text-slate-200 border-b border-tactical-border pb-1 mb-2 flex items-center justify-between">
                <span>PILOT TACTICAL CONTROLS</span>
                <span className="text-[10px] text-tactical-accent">{currentDroneCallsign}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleArm}
                  className={`py-2 px-2 rounded font-bold transition-all flex items-center justify-center gap-1.5 ${
                    status.armed
                      ? 'bg-tactical-alert hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  {status.armed ? 'EMERGENCY STOP' : 'START MOTORS'}
                </button>

                <button
                  onClick={() => setStatus((prev) => ({ ...prev, flightMode: 'RTL' }))}
                  className="bg-amber-600/80 hover:bg-amber-500 text-white font-bold py-2 px-2 rounded flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> FLY HOME (RTL)
                </button>
              </div>

              {/* Anti-Jam Optical Flow Toggle */}
              <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800 mt-2">
                <span className="text-slate-400">Anti-Jam Mode:</span>
                <button
                  onClick={handleToggleGpsJamming}
                  className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 text-[10px] border transition-all ${
                    status.navigationSource === 'OPTICAL_FLOW_VISION'
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <RadioTower className="w-3 h-3" />
                  {status.navigationSource === 'OPTICAL_FLOW_VISION'
                    ? 'OPTICAL FLOW (ACTIVE)'
                    : 'SIMULATE GPS JAMMING'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
