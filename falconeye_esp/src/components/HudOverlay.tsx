import React, { useRef, useEffect } from 'react';
import { TargetTrack, FlightStatus } from '../types';

interface HudOverlayProps {
  tracks: TargetTrack[];
  status: FlightStatus;
  designatedTrackId: number | null;
  isInterceptMode: boolean;
  onDesignateTarget: (trackId: number) => void;
  onBreakLock: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  tracks,
  status,
  designatedTrackId,
  isInterceptMode,
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

      // 1. Dark optical background with subtle grid
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = isInterceptMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(6, 182, 212, 0.08)';
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
      ctx.strokeStyle = isInterceptMode ? 'rgba(239, 68, 68, 0.6)' : 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-120, pitchOffset);
      ctx.lineTo(-30, pitchOffset);
      ctx.moveTo(30, pitchOffset);
      ctx.lineTo(120, pitchOffset);
      ctx.stroke();

      ctx.fillStyle = isInterceptMode ? 'rgba(239, 68, 68, 0.8)' : 'rgba(6, 182, 212, 0.7)';
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
      ctx.strokeStyle = isInterceptMode ? '#ef4444' : 'rgba(6, 182, 212, 0.8)';
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

      // 4. Target Bounding Boxes & Intercept Guidance
      tracks.forEach((track) => {
        const isLocked = track.trackId === designatedTrackId;
        const bx = track.bbox.xMin * width;
        const by = track.bbox.yMin * height;
        const bw = (track.bbox.xMax - track.bbox.xMin) * width;
        const bh = (track.bbox.yMax - track.bbox.yMin) * height;

        ctx.lineWidth = isLocked ? 2.5 : 1.5;
        ctx.strokeStyle = isLocked ? '#ef4444' : '#06b6d4';

        const cl = Math.min(12, bw / 3, bh / 3);
        ctx.beginPath();
        ctx.moveTo(bx, by + cl);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + cl, by);
        ctx.moveTo(bx + bw - cl, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + cl);
        ctx.moveTo(bx + bw, by + bh - cl);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw - cl, by + bh);
        ctx.moveTo(bx + cl, by + bh);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx, by + bh - cl);
        ctx.stroke();

        if (isLocked) {
          ctx.strokeStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2 - 8, by + bh / 2);
          ctx.lineTo(bx + bw / 2 + 8, by + bh / 2);
          ctx.moveTo(bx + bw / 2, by + bh / 2 - 8);
          ctx.lineTo(bx + bw / 2, by + bh / 2 + 8);
          ctx.stroke();

          // Intercept flight line from center directly into target center
          ctx.strokeStyle = isInterceptMode ? '#ef4444' : 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = isInterceptMode ? 2.5 : 1.5;
          ctx.setLineDash(isInterceptMode ? [6, 3] : [4, 4]);
          ctx.beginPath();
          ctx.moveTo(width / 2, height / 2);
          ctx.lineTo(bx + bw / 2, by + bh / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = isLocked ? 'rgba(239, 68, 68, 0.9)' : 'rgba(6, 182, 212, 0.85)';
        ctx.fillRect(bx, by - 18, bw, 18);
        ctx.fillStyle = '#0a0d14';
        ctx.font = 'bold 10px monospace';
        const label = `${isLocked ? (isInterceptMode ? '💥 INTERCEPT ' : '🎯 LOCK ') : ''}#${track.trackId} ${track.className.toUpperCase()} ${(track.confidence * 100).toFixed(0)}%`;
        ctx.fillText(label, bx + 4, by - 5);
      });

      // 5. Intercept Mode Banner
      if (isInterceptMode && designatedTrackId) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(width / 2 - 160, 52, 320, 26);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(width / 2 - 160, 52, 320, 26);
        ctx.fillStyle = '#fee2e2';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('COLLISION COURSE: FLYING INTO TARGET', width / 2, 69);
        ctx.textAlign = 'left';
      }

      // 6. Speed & Altitude Tapes
      ctx.fillStyle = 'rgba(17, 23, 38, 0.75)';
      ctx.fillRect(16, height / 2 - 60, 60, 120);
      ctx.fillRect(width - 76, height / 2 - 60, 60, 120);

      ctx.fillStyle = isInterceptMode ? '#ef4444' : '#06b6d4';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SPEED', 22, height / 2 - 40);
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`${(status.speedMps * (isInterceptMode ? 2.2 : 1.0)).toFixed(1)}`, 22, height / 2);
      ctx.font = '10px monospace';
      ctx.fillText('m/s', 22, height / 2 + 16);

      ctx.font = 'bold 12px monospace';
      ctx.fillText('ALT', width - 68, height / 2 - 40);
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`${status.altitudeMeters.toFixed(1)}`, width - 68, height / 2);
      ctx.font = '10px monospace';
      ctx.fillText('m', width - 68, height / 2 + 16);

      // Heading Tape
      ctx.fillStyle = 'rgba(17, 23, 38, 0.75)';
      ctx.fillRect(width / 2 - 80, 16, 160, 28);
      ctx.strokeStyle = isInterceptMode ? '#ef4444' : '#06b6d4';
      ctx.strokeRect(width / 2 - 80, 16, 160, 28);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`HEADING: ${Math.round(status.headingDeg)}°`, width / 2, 34);
      ctx.textAlign = 'left';

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [tracks, status, designatedTrackId, isInterceptMode]);

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
      <div className="absolute bottom-3 left-4 text-[10px] bg-slate-900/85 border border-slate-700 text-slate-300 px-2 py-1 rounded backdrop-blur">
        🎯 <span className="text-tactical-accent font-bold">CLICK-TO-TRACK:</span> Click any target to lock tracking
      </div>
    </div>
  );
};
