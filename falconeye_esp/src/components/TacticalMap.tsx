import React, { useRef, useEffect } from 'react';
import { TargetTrack, FlightStatus, SwarmDroneInfo } from '../types';
import { Compass } from 'lucide-react';

interface TacticalMapProps {
  tracks: TargetTrack[];
  status: FlightStatus;
  swarm: SwarmDroneInfo[];
  selectedDroneId: number;
  designatedTrackId: number | null;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  tracks,
  status,
  swarm,
  selectedDroneId,
  designatedTrackId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = 2.0; // pixels per meter

      // Clean tactical dark background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // Distance rings
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = 1;
      [20, 45, 75].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(`${r}m`, cx + r * scale + 4, cy - 4);
      });

      // Grid axes
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Camera FOV Ground Footprint of Selected Drone
      const headingRad = (status.headingDeg * Math.PI) / 180;
      const fovAngle = (80 * Math.PI) / 180;
      const fovDistance = Math.max(20, status.altitudeMeters * 2.5) * scale;

      const fovLeftX = cx + Math.sin(headingRad - fovAngle / 2) * fovDistance;
      const fovLeftY = cy - Math.cos(headingRad - fovAngle / 2) * fovDistance;
      const fovRightX = cx + Math.sin(headingRad + fovAngle / 2) * fovDistance;
      const fovRightY = cy - Math.cos(headingRad + fovAngle / 2) * fovDistance;

      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fovLeftX, fovLeftY);
      ctx.lineTo(fovRightX, fovRightY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw All Airborne Swarm Drones & Relay Links
      const dronePositions: { [id: number]: { x: number; y: number } } = {};

      swarm.forEach((drone) => {
        let dx = cx;
        let dy = cy;

        if (drone.droneId !== selectedDroneId) {
          // Secondary drone in the air offset by distance
          dx = cx + 85;
          dy = cy - 65;
        }
        dronePositions[drone.droneId] = { x: dx, y: dy };

        // Draw Drone Icon
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate((drone.headingDeg * Math.PI) / 180);

        const isCurrent = drone.droneId === selectedDroneId;
        ctx.strokeStyle = isCurrent ? '#38bdf8' : '#a855f7';
        ctx.fillStyle = isCurrent ? '#0284c7' : '#7e22ce';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(7, 7);
        ctx.lineTo(0, 3);
        ctx.lineTo(-7, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Label
        ctx.fillStyle = isCurrent ? '#38bdf8' : '#c084fc';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${drone.callsign} (${drone.altitudeMeters.toFixed(0)}m)`, dx + 10, dy + 4);
      });

      // Draw Airborne Mesh Relay Connection Line if Drone 2 is hopping through Drone 1
      const secondaryDrone = swarm.find((d) => d.droneId !== selectedDroneId);
      if (secondaryDrone && secondaryDrone.relayThroughDroneId !== 0) {
        const p1 = dronePositions[selectedDroneId];
        const p2 = dronePositions[secondaryDrone.droneId];
        if (p1 && p2) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Hop Label
          ctx.fillStyle = '#f59e0b';
          ctx.font = '9px monospace';
          ctx.fillText('AIR-MESH HOP', (p1.x + p2.x) / 2 - 25, (p1.y + p2.y) / 2 - 6);
        }
      }

      // Draw Shared Targets
      tracks.forEach((track) => {
        const isLocked = track.trackId === designatedTrackId;
        const dist = (track.distanceMeters || 35.0) * scale;
        const angleOffset = (track.bbox.xMin + track.bbox.xMax - 1.0) * (fovAngle / 2);
        const targetAngle = headingRad + angleOffset;

        const tx = cx + Math.sin(targetAngle) * dist;
        const ty = cy - Math.cos(targetAngle) * dist;

        ctx.fillStyle = isLocked ? '#ef4444' : '#06b6d4';
        ctx.strokeStyle = isLocked ? '#fecaca' : '#a5f3fc';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        if (track.className === 'vehicle') {
          ctx.rect(tx - 6, ty - 6, 12, 12);
        } else {
          ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(
          `${isLocked ? '🎯 ' : ''}#${track.trackId} ${track.className.toUpperCase()}`,
          tx + 8,
          ty + 3
        );
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [tracks, status, swarm, selectedDroneId, designatedTrackId]);

  return (
    <div className="relative w-full h-full bg-tactical-dark border border-tactical-border rounded-lg overflow-hidden flex flex-col">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-tactical-panel/90 px-2 py-1 rounded border border-tactical-border backdrop-blur">
        <Compass className="w-3.5 h-3.5 text-tactical-accent" />
        SWARM TACTICAL MAP
      </div>

      <canvas ref={canvasRef} width={480} height={320} className="w-full h-full object-cover" />

      {/* Map Legend */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2.5 text-[9px] text-slate-400 bg-tactical-panel/95 px-2.5 py-1 rounded border border-tactical-border">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-sky-400 inline-block"></span> Active Drone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-purple-400 inline-block"></span> Sister Drone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-amber-400 inline-block"></span> Air Relay Hop
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500 inline-block"></span> Locked Target
        </span>
      </div>
    </div>
  );
};
