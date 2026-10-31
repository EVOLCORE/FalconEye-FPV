import React, { useRef, useEffect } from 'react';
import { TargetTrack, FlightStatus, VisionMode, GimbalMode } from '../types';
import { Flame, Eye, Compass, ShieldAlert, Video, Crosshair, ZoomIn, Sparkles } from 'lucide-react';

interface HudOverlayProps {
  tracks: TargetTrack[];
  status: FlightStatus;
  designatedTrackId: number | null;
  isInterceptMode: boolean;
  visionMode: VisionMode;
  targetInKillbox: boolean;
  gimbalMode: GimbalMode;
  zoomFactor: number;
  autoZoomEnabled: boolean;
  onSetVisionMode: (mode: VisionMode) => void;
  onSetGimbalMode: (mode: GimbalMode) => void;
  onSetZoomFactor: (zoom: number) => void;
  onToggleAutoZoom: () => void;
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
  gimbalMode,
  zoomFactor,
  autoZoomEnabled,
  onSetVisionMode,
  onSetGimbalMode,
  onSetZoomFactor,
  onToggleAutoZoom,
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

      // Clear Canvas
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // Determine Virtual Gimbal & EIS Transformations
      let rotDeg = 0;
      let offX = 0;
      let offY = 0;

      const lockedTrack = tracks.find((t) => t.trackId === designatedTrackId);

      if (gimbalMode === 'HORIZON_LOCKED') {
        // Counter-rotate drone roll angle to keep visual horizon level
        rotDeg = status.rollDeg;
      } else if (gimbalMode === 'TARGET_CENTRIC') {
        rotDeg = status.rollDeg;
        if (lockedTrack) {
          const tCenterX = (lockedTrack.bbox.xMin + lockedTrack.bbox.xMax) / 2;
          const tCenterY = (lockedTrack.bbox.yMin + lockedTrack.bbox.yMax) / 2;
          offX = (tCenterX - 0.5) * width;
          offY = (tCenterY - 0.5) * height;
        }
      }

      // -------------------------------------------------------------
      // STAGE 1: Transformed Camera Viewport (Zoomed & EIS Stabilized)
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomFactor, zoomFactor);
      ctx.rotate((rotDeg * Math.PI) / 180);
      ctx.translate(-width / 2 - offX, -height / 2 - offY);

      // 1. Thermal Palette Background & Atmospheric Rendering
      if (visionMode === 'THERMAL_WHITE_HOT') {
        // Military Standard White Hot: Cold terrain is dark, hot signatures glow white
        ctx.fillStyle = '#0c1017';
        ctx.fillRect(-width, -height, width * 3, height * 3);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(-width, height * 0.45, width * 3, height * 2);
      } else if (visionMode === 'THERMAL_BLACK_HOT') {
        // Inverted Military Black Hot: Background is light gray, hot targets are pitch black
        ctx.fillStyle = '#b0b8c4';
        ctx.fillRect(-width, -height, width * 3, height * 3);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(-width, height * 0.45, width * 3, height * 2);
      } else if (visionMode === 'THERMAL_IRONBOW') {
        // Ironbow Thermal: Dark indigo/purple background
        const grad = ctx.createLinearGradient(0, -height, 0, height * 2);
        grad.addColorStop(0, '#120a2a');
        grad.addColorStop(0.5, '#1e0c38');
        grad.addColorStop(1, '#2c0d45');
        ctx.fillStyle = grad;
        ctx.fillRect(-width, -height, width * 3, height * 3);
      } else {
        // Standard Daylight
        ctx.fillStyle = '#080c14';
        ctx.fillRect(-width, -height, width * 3, height * 3);
      }

      // Optical flow / terrain reference grid
      const gridColor =
        visionMode === 'THERMAL_BLACK_HOT'
          ? 'rgba(0, 0, 0, 0.12)'
          : 'rgba(6, 182, 212, 0.08)';
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = -width; x < width * 2; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -height);
        ctx.lineTo(x, height * 2);
        ctx.stroke();
      }
      for (let y = -height; y < height * 2; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-width, y);
        ctx.lineTo(width * 2, y);
        ctx.stroke();
      }

      // Render Detected Targets inside transformed space
      tracks.forEach((track) => {
        const isLocked = track.trackId === designatedTrackId;
        const bx = track.bbox.xMin * width;
        const by = track.bbox.yMin * height;
        const bw = (track.bbox.xMax - track.bbox.xMin) * width;
        const bh = (track.bbox.yMax - track.bbox.yMin) * height;

        // Draw Thermal Body / Engine Radiance Glow
        if (visionMode === 'THERMAL_WHITE_HOT') {
          const radGrad = ctx.createRadialGradient(
            bx + bw / 2,
            by + bh / 2,
            2,
            bx + bw / 2,
            by + bh / 2,
            bw
          );
          radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          radGrad.addColorStop(0.5, 'rgba(240, 240, 240, 0.6)');
          radGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
        } else if (visionMode === 'THERMAL_BLACK_HOT') {
          const radGrad = ctx.createRadialGradient(
            bx + bw / 2,
            by + bh / 2,
            2,
            bx + bw / 2,
            by + bh / 2,
            bw
          );
          radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
          radGrad.addColorStop(0.6, 'rgba(20, 20, 20, 0.5)');
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
        } else if (visionMode === 'THERMAL_IRONBOW') {
          const radGrad = ctx.createRadialGradient(
            bx + bw / 2,
            by + bh / 2,
            2,
            bx + bw / 2,
            by + bh / 2,
            bw
          );
          radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          radGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.85)');
          radGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.6)');
          radGrad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
        }

        // Bounding Box Brackets
        ctx.lineWidth = isLocked ? 2.5 : 1.5;
        ctx.strokeStyle = isLocked
          ? '#ef4444'
          : visionMode === 'THERMAL_BLACK_HOT'
          ? '#000000'
          : '#06b6d4';

        const cl = Math.min(12, bw / 3, bh / 3);
        ctx.beginPath();
        ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
        ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
        ctx.moveTo(bx + bw, by + bh - cl); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - cl, by + bh);
        ctx.moveTo(bx + cl, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - cl);
        ctx.stroke();

        // Lock Crosshair on target
        if (isLocked) {
          ctx.strokeStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2 - 8, by + bh / 2);
          ctx.lineTo(bx + bw / 2 + 8, by + bh / 2);
          ctx.moveTo(bx + bw / 2, by + bh / 2 - 8);
          ctx.lineTo(bx + bw / 2, by + bh / 2 + 8);
          ctx.stroke();
        }

        // Target Tag Label
        ctx.fillStyle = isLocked
          ? '#ef4444'
          : visionMode === 'THERMAL_BLACK_HOT'
          ? '#0f172a'
          : 'rgba(6, 182, 212, 0.85)';
        ctx.fillRect(bx, by - 18, Math.max(bw, 90), 18);
        ctx.fillStyle = visionMode === 'THERMAL_BLACK_HOT' ? '#ffffff' : '#0a0d14';
        ctx.font = 'bold 10px monospace';
        const label = `${isLocked ? (isInterceptMode ? '💥 ' : '🎯 ') : ''}#${track.trackId} ${track.className.toUpperCase()} ${(track.confidence * 100).toFixed(0)}%`;
        ctx.fillText(label, bx + 4, by - 5);
      });

      ctx.restore();

      // -------------------------------------------------------------
      // STAGE 2: Fixed Pilot HUD (Static Flight Reticle & Telemetry)
      // -------------------------------------------------------------

      // 2. Artificial Horizon Ladder (Shows pitch & drone roll relative to aircraft frame)
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-status.rollDeg * Math.PI) / 180);

      const pitchOffset = (status.pitchDeg / 90) * (height / 2);
      ctx.strokeStyle =
        visionMode === 'THERMAL_BLACK_HOT'
          ? '#1e293b'
          : isInterceptMode
          ? '#ef4444'
          : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-120, pitchOffset);
      ctx.lineTo(-30, pitchOffset);
      ctx.moveTo(30, pitchOffset);
      ctx.lineTo(120, pitchOffset);
      ctx.stroke();

      ctx.fillStyle = visionMode === 'THERMAL_BLACK_HOT' ? '#0f172a' : '#06b6d4';
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
      ctx.strokeStyle =
        visionMode === 'THERMAL_BLACK_HOT'
          ? '#000000'
          : isInterceptMode
          ? '#ef4444'
          : '#06b6d4';
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

      // Intercept Flight Vector Line (from bore sight to target position on screen)
      if (designatedTrackId && lockedTrack) {
        // Compute target's current screen position with transform
        const tCenterX = (lockedTrack.bbox.xMin + lockedTrack.bbox.xMax) / 2;
        const tCenterY = (lockedTrack.bbox.yMin + lockedTrack.bbox.yMax) / 2;

        let screenTx = width / 2;
        let screenTy = height / 2;

        if (gimbalMode !== 'TARGET_CENTRIC') {
          // Point line towards target
          const origX = tCenterX * width - offX;
          const origY = tCenterY * height - offY;
          const dx = origX - width / 2;
          const dy = origY - height / 2;
          const rad = (rotDeg * Math.PI) / 180;
          screenTx = width / 2 + (dx * Math.cos(rad) - dy * Math.sin(rad)) * zoomFactor;
          screenTy = height / 2 + (dx * Math.sin(rad) + dy * Math.cos(rad)) * zoomFactor;
        }

        ctx.strokeStyle = isInterceptMode ? '#ef4444' : 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = isInterceptMode ? 2.5 : 1.5;
        ctx.setLineDash(isInterceptMode ? [6, 3] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(width / 2, height / 2);
        ctx.lineTo(screenTx, screenTy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Intercept Mode or Killbox Banner
      if (designatedTrackId) {
        if (!targetInKillbox) {
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

      // 5. Gimbal & Zoom HUD Status Pill (Top Center)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(width / 2 - 120, 16, 240, 26);
      ctx.strokeStyle = gimbalMode === 'FPV_RAW' ? '#475569' : '#06b6d4';
      ctx.strokeRect(width / 2 - 120, 16, 240, 26);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('EIS: ', width / 2 - 110, 33);
      ctx.fillStyle = gimbalMode === 'FPV_RAW' ? '#e2e8f0' : '#22d3ee';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        gimbalMode === 'FPV_RAW'
          ? 'OFF (RAW FPV)'
          : gimbalMode === 'HORIZON_LOCKED'
          ? 'HORIZON LEVEL'
          : 'TARGET LOCK',
        width / 2 - 82,
        33
      );

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('| ZOOM: ', width / 2 + 10, 33);
      ctx.fillStyle = autoZoomEnabled ? '#a855f7' : '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        `${zoomFactor.toFixed(1)}X ${autoZoomEnabled ? '(AUTO)' : ''}`,
        width / 2 + 58,
        33
      );

      // 6. Navigation Source Indicator (Top Right of HUD)
      ctx.fillStyle = 'rgba(17, 23, 38, 0.85)';
      ctx.fillRect(width - 210, 16, 194, 28);
      ctx.strokeStyle =
        status.navigationSource === 'OPTICAL_FLOW_VISION' ? '#eab308' : '#06b6d4';
      ctx.strokeRect(width - 210, 16, 194, 28);
      ctx.fillStyle =
        status.navigationSource === 'OPTICAL_FLOW_VISION' ? '#fde047' : '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        status.navigationSource === 'OPTICAL_FLOW_VISION'
          ? 'NAV: OPTICAL FLOW (ANTI-JAM)'
          : 'NAV: GPS (RTK FIXED)',
        width - 202,
        34
      );

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    tracks,
    status,
    designatedTrackId,
    isInterceptMode,
    visionMode,
    targetInKillbox,
    gimbalMode,
    zoomFactor,
    autoZoomEnabled,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawClickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const rawClickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Calculate transformation values to reverse-map click into unzoomed/unrotated target coordinates
    let rotDeg = 0;
    let offX = 0;
    let offY = 0;

    const lockedTrack = tracks.find((t) => t.trackId === designatedTrackId);

    if (gimbalMode === 'HORIZON_LOCKED') {
      rotDeg = status.rollDeg;
    } else if (gimbalMode === 'TARGET_CENTRIC') {
      rotDeg = status.rollDeg;
      if (lockedTrack) {
        const tCenterX = (lockedTrack.bbox.xMin + lockedTrack.bbox.xMax) / 2;
        const tCenterY = (lockedTrack.bbox.yMin + lockedTrack.bbox.yMax) / 2;
        offX = (tCenterX - 0.5) * canvas.width;
        offY = (tCenterY - 0.5) * canvas.height;
      }
    }

    const dx = rawClickX - canvas.width / 2;
    const dy = rawClickY - canvas.height / 2;
    const sx = dx / zoomFactor;
    const sy = dy / zoomFactor;
    const rad = (-rotDeg * Math.PI) / 180;
    const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
    const ry = sx * Math.sin(rad) + sy * Math.cos(rad);

    const clickNormX = (rx + canvas.width / 2 + offX) / canvas.width;
    const clickNormY = (ry + canvas.height / 2 + offY) / canvas.height;

    for (const track of tracks) {
      if (
        clickNormX >= track.bbox.xMin &&
        clickNormX <= track.bbox.xMax &&
        clickNormY >= track.bbox.yMin &&
        clickNormY <= track.bbox.yMax
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
            visionMode === 'THERMAL_WHITE_HOT'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          WHITE-HOT (MIL)
        </button>
        <button
          onClick={() => onSetVisionMode('THERMAL_BLACK_HOT')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            visionMode === 'THERMAL_BLACK_HOT'
              ? 'bg-slate-200 text-slate-950'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          BLACK-HOT
        </button>
        <button
          onClick={() => onSetVisionMode('THERMAL_IRONBOW')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            visionMode === 'THERMAL_IRONBOW'
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          IRONBOW
        </button>
        <button
          onClick={() => onSetVisionMode('DAYLIGHT')}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            visionMode === 'DAYLIGHT'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          DAY
        </button>
      </div>

      {/* Virtual Gimbal & EIS Selector (Bottom Right) */}
      <div className="absolute bottom-3 right-4 flex items-center gap-2">
        {/* Gimbal Mode Control */}
        <div className="flex items-center gap-1 bg-tactical-panel/90 border border-tactical-border p-1 rounded backdrop-blur">
          <span className="text-[10px] text-slate-400 px-1 font-bold flex items-center gap-1">
            <Video className="w-3 h-3 text-cyan-400" /> EIS GIMBAL:
          </span>
          <button
            onClick={() => onSetGimbalMode('FPV_RAW')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              gimbalMode === 'FPV_RAW'
                ? 'bg-slate-200 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            RAW
          </button>
          <button
            onClick={() => onSetGimbalMode('HORIZON_LOCKED')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              gimbalMode === 'HORIZON_LOCKED'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            HORIZON
          </button>
          <button
            onClick={() => onSetGimbalMode('TARGET_CENTRIC')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              gimbalMode === 'TARGET_CENTRIC'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            TARGET LOCK
          </button>
        </div>

        {/* Digital Zoom Controls */}
        <div className="flex items-center gap-1 bg-tactical-panel/90 border border-tactical-border p-1 rounded backdrop-blur">
          <span className="text-[10px] text-slate-400 px-1 font-bold flex items-center gap-1">
            <ZoomIn className="w-3 h-3 text-cyan-400" /> ZOOM:
          </span>
          {[1.0, 2.0, 4.0].map((z) => (
            <button
              key={z}
              onClick={() => onSetZoomFactor(z)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                zoomFactor === z && !autoZoomEnabled
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {z}X
            </button>
          ))}
          <button
            onClick={onToggleAutoZoom}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              autoZoomEnabled
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" /> AUTO
          </button>
        </div>
      </div>

      <div className="absolute bottom-3 left-4 text-[10px] bg-slate-900/85 border border-slate-700 text-slate-300 px-2 py-1 rounded backdrop-blur">
        🎯 <span className="text-tactical-accent font-bold">CLICK-TO-TRACK:</span> Click any target to lock tracking
      </div>
    </div>
  );
};
