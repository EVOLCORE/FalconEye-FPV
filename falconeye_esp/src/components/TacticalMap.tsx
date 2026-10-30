import React, { useRef, useEffect } from 'react';
import { TargetTrack, Telemetry } from '../types';
import { Compass, Maximize2 } from 'lucide-react';

interface TacticalMapProps {
  tracks: TargetTrack[];
  telemetry: Telemetry;
  designatedTrackId: number | null;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  tracks,
  telemetry,
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

      // Dark tactical map background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // Range rings (10m, 25m, 50m, 100m)
      const scale = 2.2; // pixels per meter
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.lineWidth = 1;
      [15, 30, 60].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(`${r}m`, cx + r * scale + 4, cy - 4);
      });

      // Grid axes
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Camera FOV Frustum Polygon (Projected on ground)
      const headingRad = (telemetry.headingDeg * Math.PI) / 180;
      const fovAngle = (80 * Math.PI) / 180; // 80 deg FOV
      const fovDistance = Math.max(20, telemetry.altitudeMeters * 2.5) * scale;

      const fovLeftX = cx + Math.sin(headingRad - fovAngle / 2) * fovDistance;
      const fovLeftY = cy - Math.cos(headingRad - fovAngle / 2) * fovDistance;
      const fovRightX = cx + Math.sin(headingRad + fovAngle / 2) * fovDistance;
      const fovRightY = cy - Math.cos(headingRad + fovAngle / 2) * fovDistance;

      // Shaded camera footprint
      ctx.fillStyle = 'rgba(6, 182, 212, 0.06)';
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fovLeftX, fovLeftY);
      ctx.lineTo(fovRightX, fovRightY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Tracked Targets on Map
      tracks.forEach((track) => {
        const isLocked = track.trackId === designatedTrackId;
        // Project target relative to drone based on screen position and range
        const dist = (track.distanceMeters || 35.0) * scale;
        // Horizontal angle offset from heading
        const angleOffset = (track.bbox.xMin + track.bbox.xMax - 1.0) * (fovAngle / 2);
        const targetAngle = headingRad + angleOffset;

        const tx = cx + Math.sin(targetAngle) * dist;
        const ty = cy - Math.cos(targetAngle) * dist;

        // Target Marker
        ctx.fillStyle = isLocked ? '#ef4444' : '#06b6d4';
        ctx.strokeStyle = isLocked ? '#fecaca' : '#a5f3fc';
        ctx.lineWidth = 1.5;

        // Triangle or square icon
        ctx.beginPath();
        if (track.className === 'vehicle') {
          ctx.rect(tx - 6, ty - 6, 12, 12);
        } else {
          ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Target Tag Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(
          `${isLocked ? '🎯 ' : ''}#${track.trackId} ${track.className.toUpperCase()}`,
          tx + 8,
          ty + 3
        );
      });

      // Central Drone Icon
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(headingRad);

      // Drone Quadcopter shape
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#0284c7';

      // Heading arrow
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(8, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [tracks, telemetry, designatedTrackId]);

  return (
    <div className="relative w-full h-full bg-tactical-dark border border-tactical-border rounded-lg overflow-hidden flex flex-col">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-tactical-panel/80 px-2 py-1 rounded border border-tactical-border backdrop-blur">
        <Compass className="w-3.5 h-3.5 text-tactical-accent" />
        TACTICAL SITUATIONAL PICTURE (ESP)
      </div>

      <canvas ref={canvasRef} width={480} height={320} className="w-full h-full object-cover" />

      {/* Map Legend */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-3 text-[10px] text-slate-400 bg-tactical-panel/90 px-2.5 py-1 rounded border border-tactical-border">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-cyan-400 inline-block"></span> Detected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500 inline-block"></span> Locked Target
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-1.5 border border-cyan-400/50 inline-block"></span> Camera FOV
        </span>
      </div>
    </div>
  );
};
