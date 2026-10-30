import React, { useRef, useEffect } from 'react';
import { TargetTrack, FlightStatus, VisionMode } from '../types';
import { Flame, Eye, Compass, ShieldAlert } from 'lucide-react';

interface HudOverlayProps {
  tracks: TargetTrack[];
  status: FlightStatus;
  designatedTrackId: number | null;
  isInterceptMode: boolean;
  visionMode: VisionMode;
  targetInKillbox: boolean;
  onSetVisionMode: (mode: VisionMode) => void;
  onDesignateTarget: (trackId: number) => void;
  onBreakLock: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  tracks,
  status,
  designatedTrackId,
  isInterceptMode,
  visionMode,
  targetInKillbox,
  onSetVisionMode,
  onDesignateTarget,
  onBreakLock,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Thermal Palette Background & Atmospheric Rendering
      if (visionMode === 'WHITE_HOT') {
        // Military Standard White Hot: Cold terrain is dark, hot signatures glow white
        ctx.fillStyle = '#0c1017';
        ctx.fillRect(0, 0, width, height);

        // Ground terrain radiance noise
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, height * 0.45, width, height * 0.55);
      } else if (visionMode === 'BLACK_HOT') {
        // Inverted Military Black Hot: Background is light gray, hot targets are pitch black
        ctx.fillStyle = '#b0b8c4';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, height * 0.45, width, height * 0.55);
      } else if (visionMode === 'IRONBOW') {
        // Ironbow Thermal: Dark indigo/purple background
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#120a2a');
        grad.addColorStop(0.5, '#1e0c38');
        grad.addColorStop(1, '#2c0d45');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Standard Daylight
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, width, height);
      }

      // Grid Overlay
      const gridColor = visionMode === 'BLACK_HOT' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(6, 182, 212, 0.08)';
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Horizon & Pitch Ladder
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-status.rollDeg * Math.PI) / 180);

      const pitchOffset = (status.pitchDeg / 90) * (height / 2);
      ctx.strokeStyle = visionMode === 'BLACK_HOT' ? '#1e293b' : (isInterceptMode ? '#ef4444' : '#06b6d4');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-120, pitchOffset);
      ctx.lineTo(-30, pitchOffset);
      ctx.moveTo(30, pitchOffset);
      ctx.lineTo(120, pitchOffset);
      ctx.stroke();

      ctx.fillStyle = visionMode === 'BLACK_HOT' ? '#0f172a' : '#06b6d4';
      ctx.font = '10px monospace';
      [-20, -10, 10, 20].forEach((deg) => {
        const y = pitchOffset - (deg / 90) * (height / 2);
        ctx.beginPath();
        ctx.moveTo(-40, y);
        ctx.lineTo(-20, y);
        ctx.moveTo(20, y);
        ctx.lineTo(40, y);
        ctx.stroke();
        ctx.fillText(`${deg}°`, 45, y + 3);
      });
      ctx.restore();

      // 3. Central Bore Sight Crosshair
      ctx.strokeStyle = visionMode === 'BLACK_HOT' ? '#000000' : (isInterceptMode ? '#ef4444' : '#06b6d4');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width / 2 - 16, height / 2);
      ctx.lineTo(width / 2 - 8, height / 2);
      ctx.moveTo(width / 2 + 8, height / 2);
      ctx.lineTo(width / 2 + 16, height / 2);
      ctx.moveTo(width / 2, height / 2 - 16);
      ctx.lineTo(width / 2, height / 2 - 8);
      ctx.moveTo(width / 2, height / 2 + 8);
      ctx.lineTo(width / 2, height / 2 + 16);
      ctx.stroke();

      // 4. Render Targets with Thermal Radiance Glow
      tracks.forEach((track) => {
        const isLocked = track.trackId === designatedTrackId;
        const bx = track.bbox.xMin * width;
        const by = track.bbox.yMin * height;
        const bw = (track.bbox.xMax - track.bbox.xMin) * width;
        const bh = (track.bbox.yMax - track.bbox.yMin) * height;

        // Draw Thermal Body / Engine Radiance Glow
        if (visionMode === 'WHITE_HOT') {
          // White-Hot: Blazing white thermal signature inside object box
          const radGrad = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 2, bx + bw / 2, by + bh / 2, bw);
          radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          radGrad.addColorStop(0.5, 'rgba(240, 240, 240, 0.6)');
          radGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
        } else if (visionMode === 'BLACK_HOT') {
          // Black-Hot: Pitch black hot signature
          const radGrad = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 2, bx + bw / 2, by + bh / 2, bw);
          radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
          radGrad.addColorStop(0.6, 'rgba(20, 20, 20, 0.5)');
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
        } else if (visionMode === 'IRONBOW') {
          // Ironbow: White-hot engine core with orange/yellow heat bloom
          const radGrad = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 2, bx + bw / 2, by + bh / 2, bw);
          radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          radGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.85)'); // Yellow
          radGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.6)');    // Red/Orange
          radGrad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');    // Purple/fade
          ctx.fillStyle = radGrad;
          ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
        }

        // Bounding Box Brackets
        ctx.lineWidth = isLocked ? 2.5 : 1.5;
        ctx.strokeStyle = isLocked ? '#ef4444' : (visionMode === 'BLACK_HOT' ? '#000000' : '#06b6d4');

        const cl = Math.min(12, bw / 3, bh / 3);
        ctx.beginPath();
        ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
        ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
        ctx.moveTo(bx + bw, by + bh - cl); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - cl, by + bh);
        ctx.moveTo(bx + cl, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - cl);
        ctx.stroke();

        // Lock crosshair
        if (isLocked) {
          ctx.strokeStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2 - 8, by + bh / 2); ctx.lineTo(bx + bw / 2 + 8, by + bh / 2);
          ctx.moveTo(bx + bw / 2, by + bh / 2 - 8); ctx.lineTo(bx + bw / 2, by + bh / 2 + 8);
          ctx.stroke();

          // Intercept flight path line
          ctx.strokeStyle = isInterceptMode ? '#ef4444' : 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = isInterceptMode ? 2.5 : 1.5;
          ctx.setLineDash(isInterceptMode ? [6, 3] : [4, 4]);
          ctx.beginPath();
          ctx.moveTo(width / 2, height / 2);
          ctx.lineTo(bx + bw / 2, by + bh / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Target Tag Label
        ctx.fillStyle = isLocked ? '#ef4444' : (visionMode === 'BLACK_HOT' ? '#0f172a' : 'rgba(6, 182, 212, 0.85)');
        ctx.fillRect(bx, by - 18, bw, 18);
        ctx.fillStyle = visionMode === 'BLACK_HOT' ? '#ffffff' : '#0a0d14';
        ctx.font = 'bold 10px monospace';
        const label = `${isLocked ? (isInterceptMode ? '💥 ' : '🎯 ') : ''}#${track.trackId} ${track.className.toUpperCase()} ${(track.confidence * 100).toFixed(0)}%`;
        ctx.fillText(label, bx + 4, by - 5);
      });

      // 5. Intercept Mode or Killbox Banner
      if (designatedTrackId) {
        if (!targetInKillbox) {
          // Warning outside killbox
          ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
          ctx.fillRect(width / 2 - 180, 52, 360, 26);
          ctx.strokeStyle = '#eab308';
          ctx.strokeRect(width / 2 - 180, 52, 360, 26);
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('STANDOFF: TARGET OUTSIDE AUTHORIZED KILLBOX', width / 2, 69);
          ctx.textAlign = 'left';
        } else if (isInterceptMode) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(width / 2 - 170, 52, 340, 26);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(width / 2 - 170, 52, 340, 26);
          ctx.fillStyle = '#fee2e2';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('KILLBOX AUTHORIZED: FLYING INTO TARGET', width / 2, 69);
          ctx.textAlign = 'left';
        }
      }

      // 6. Navigation Source & Thermal Mode Indicators (Top Right of HUD)
      ctx.fillStyle = 'rgba(17, 23, 38, 0.85)';
      ctx.fillRect(width - 210, 16, 194, 28);
      ctx.strokeStyle = status.navigationSource === 'OPTICAL_FLOW_VISION' ? '#eab308' : '#06b6d4';
      ctx.strokeRect(width - 210, 16, 194, 28);
      ctx.fillStyle = status.navigationSource === 'OPTICAL_FLOW_VISION' ? '#fde047' : '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(status.navigationSource === 'OPTICAL_FLOW_VISION' ? 'NAV: OPTICAL FLOW (ANTI-JAM)' : 'NAV: GPS (RTK FIXED)', width - 202, 34);

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [tracks, status, designatedTrackId, isInterceptMode, visionMode, targetInKillbox]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    for (const track of tracks) {
      if (
        clickX >= track.bbox.xMin &&
        clickX <= track.bbox.xMax &&
        clickY >= track.bbox.yMin &&
        clickY <= track.bbox.yMax
      ) {
        onDesignateTarget(track.trackId);
        return;
      }
    }
    if (designatedTrackId) {
      onBreakLock();
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        onClick={handleCanvasClick}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* Vision Mode Selector Pills (Top Left) */}
      <div className="absolute top-3 left-4 flex items-center gap-1.5 bg-tactical-panel/90 border border-tactical-border p-1 rounded backdrop-blur">
        <span className="text-[10px] text-slate-400 px-1 font-bold flex items-center gap-1">
          <Eye className="w-3 h-3 text-cyan-400" /> VISION:
        </span>
        <button
          onClick={() => onSetVisionMode('THERMAL_WHITE_HOT')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            visionMode === 'THERMAL_WHITE_HOT' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          WHITE-HOT (MIL)
        </button>
        <button
          onClick={() => onSetVisionMode('THERMAL_BLACK_HOT')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            visionMode === 'THERMAL_BLACK_HOT' ? 'bg-slate-200 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          BLACK-HOT
        </button>
        <button
          onClick={() => onSetVisionMode('THERMAL_IRONBOW')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            visionMode === 'THERMAL_IRONBOW' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          IRONBOW
        </button>
        <button
          onClick={() => onSetVisionMode('DAYLIGHT')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            visionMode === 'DAYLIGHT' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          DAY
        </button>
      </div>

      <div className="absolute bottom-3 left-4 text-[10px] bg-slate-900/85 border border-slate-700 text-slate-300 px-2 py-1 rounded backdrop-blur">
        🎯 <span className="text-tactical-accent font-bold">CLICK-TO-TRACK:</span> Click any target to lock tracking
      </div>
    </div>
  );
};
