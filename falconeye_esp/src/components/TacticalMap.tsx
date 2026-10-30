import React, { useEffect, useRef, useState } from 'react';
import { TargetTrack, FlightStatus, SwarmDroneInfo } from '../types';
import { Compass, Crosshair, Globe, Layers } from 'lucide-react';
import L from 'leaflet';

interface TacticalMapProps {
  tracks: TargetTrack[];
  status: FlightStatus;
  swarm: SwarmDroneInfo[];
  selectedDroneId: number;
  designatedTrackId: number | null;
  isInterceptMode: boolean;
  onToggleIntercept: () => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  tracks,
  status,
  swarm,
  selectedDroneId,
  designatedTrackId,
  isInterceptMode,
  onToggleIntercept,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'dark'>('satellite');

  // Base coordinates (e.g., outdoor test range area: 45.4642° N, 9.1900° E)
  const baseLat = 45.4642;
  const baseLon = 9.1900;

  // Initialize Leaflet Map with Satellite Tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [baseLat, baseLon],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    // High-Resolution Esri World Imagery Satellite Tile Layer (Free, no API key required)
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        subdomains: ['server', 'services'],
      }
    );
    satLayer.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Drones, Targets, Camera FOV, and Intercept Flight Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Calculate GPS coordinates for selected drone
    const droneLat = baseLat + (status.pitchDeg * 0.00002);
    const droneLon = baseLon + (status.headingDeg * 0.00001);

    // 2. Camera Field-Of-View (FOV) polygon projected onto satellite terrain
    const headingRad = (status.headingDeg * Math.PI) / 180;
    const fovAngle = (75 * Math.PI) / 180;
    const fovDistDeg = 0.0008; // ~90 meters ground footprint

    const leftLat = droneLat + Math.cos(headingRad - fovAngle / 2) * fovDistDeg;
    const leftLon = droneLon + Math.sin(headingRad - fovAngle / 2) * fovDistDeg;
    const rightLat = droneLat + Math.cos(headingRad + fovAngle / 2) * fovDistDeg;
    const rightLon = droneLon + Math.sin(headingRad + fovAngle / 2) * fovDistDeg;

    L.polygon(
      [
        [droneLat, droneLon],
        [leftLat, leftLon],
        [rightLat, rightLon],
      ],
      {
        color: '#06b6d4',
        weight: 1.5,
        fillColor: '#06b6d4',
        fillOpacity: 0.12,
      }
    ).addTo(group);

    // 3. Draw Drone Marker with Heading Arrow
    const droneHtml = `
      <div style="transform: rotate(${status.headingDeg}deg); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" style="width: 24px; height: 24px; filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.8));">
          <polygon points="12,2 22,22 12,17 2,22"/>
        </svg>
      </div>
    `;
    const droneIcon = L.divIcon({
      html: droneHtml,
      className: 'custom-drone-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([droneLat, droneLon], { icon: droneIcon }).addTo(group);

    // 4. Draw Sister Drones & Airborne Relay Link
    swarm.forEach((drone) => {
      if (drone.droneId !== selectedDroneId) {
        const sisterLat = droneLat + 0.0006;
        const sisterLon = droneLon + 0.0007;

        const sisterHtml = `
          <div style="transform: rotate(${drone.headingDeg}deg); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" fill="#c084fc" stroke="#7e22ce" stroke-width="1.5" style="width: 20px; height: 20px; filter: drop-shadow(0 0 5px rgba(192, 132, 252, 0.8));">
              <polygon points="12,2 22,22 12,17 2,22"/>
            </svg>
          </div>
        `;
        const sisterIcon = L.divIcon({
          html: sisterHtml,
          className: 'sister-drone-icon',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        L.marker([sisterLat, sisterLon], { icon: sisterIcon }).addTo(group);

        // Airborne Mesh Hop Line
        if (drone.relayThroughDroneId !== 0) {
          L.polyline(
            [
              [droneLat, droneLon],
              [sisterLat, sisterLon],
            ],
            {
              color: '#f59e0b',
              weight: 2,
              dashArray: '5, 5',
              opacity: 0.85,
            }
          ).addTo(group);
        }
      }
    });

    // 5. Draw Targets on Satellite Terrain
    let targetCoords: [number, number] | null = null;

    tracks.forEach((track) => {
      const isLocked = track.trackId === designatedTrackId;
      // Target offset in ground coordinate degrees (~30-60m ahead of drone)
      const tLat = droneLat + 0.00045 + (track.bbox.yMin - 0.5) * 0.0003;
      const tLon = droneLon + (track.bbox.xMin - 0.5) * 0.0004;

      if (isLocked) {
        targetCoords = [tLat, tLon];
      }

      const targetHtml = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: ${isLocked ? '16px' : '12px'};
            height: ${isLocked ? '16px' : '12px'};
            background: ${isLocked ? '#ef4444' : '#06b6d4'};
            border: 2px solid ${isLocked ? '#fee2e2' : '#ffffff'};
            border-radius: ${track.className === 'vehicle' ? '2px' : '50%'};
            box-shadow: 0 0 10px ${isLocked ? 'rgba(239, 68, 68, 0.9)' : 'rgba(6, 182, 212, 0.6)'};
            ${isLocked ? 'animation: pulse 1s infinite;' : ''}
          "></div>
          <span style="
            font-size: 9px;
            font-family: monospace;
            font-weight: bold;
            color: #ffffff;
            background: rgba(10, 13, 20, 0.85);
            padding: 1px 3px;
            border-radius: 2px;
            margin-top: 2px;
            white-space: nowrap;
          ">
            ${isLocked ? '🎯 ' : ''}#${track.trackId} ${track.className.toUpperCase()}
          </span>
        </div>
      `;

      const targetIcon = L.divIcon({
        html: targetHtml,
        className: 'custom-target-icon',
        iconSize: [60, 30],
        iconAnchor: [30, 8],
      });

      L.marker([tLat, tLon], { icon: targetIcon }).addTo(group);
    });

    // 6. TARGET INTERCEPT / COLLISION TRAJECTORY VECTOR
    // When Intercept Mode is active, draw the flight line leading directly into the target!
    if (targetCoords) {
      // Predicted lead collision point (drone leads target)
      const leadLat = targetCoords[0] + 0.00008;
      const leadLon = targetCoords[1] + 0.00006;

      L.polyline(
        [
          [droneLat, droneLon],
          [leadLat, leadLon],
        ],
        {
          color: isInterceptMode ? '#ef4444' : '#f59e0b',
          weight: isInterceptMode ? 3 : 2,
          dashArray: isInterceptMode ? '6, 4' : '3, 6',
          opacity: 0.95,
        }
      ).addTo(group);

      // Lead Impact Ring
      L.circleMarker([leadLat, leadLon], {
        radius: isInterceptMode ? 8 : 5,
        color: '#ef4444',
        weight: 2,
        fillColor: '#fee2e2',
        fillOpacity: 0.4,
      }).addTo(group);
    }
  }, [tracks, status, swarm, selectedDroneId, designatedTrackId, isInterceptMode]);

  return (
    <div className="relative w-full h-full bg-tactical-dark border border-tactical-border rounded-lg overflow-hidden flex flex-col">
      {/* Top Header Controls */}
      <div className="absolute top-2 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200 bg-tactical-panel/90 px-2.5 py-1 rounded border border-tactical-border backdrop-blur pointer-events-auto">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          SATELLITE SITUATIONAL MAP
        </div>

        {/* Intercept / Fly to Target Toggle Button */}
        {designatedTrackId && (
          <button
            onClick={onToggleIntercept}
            className={`pointer-events-auto px-3 py-1 rounded font-bold text-xs flex items-center gap-1.5 border transition-all ${
              isInterceptMode
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-400 shadow-lg shadow-red-950 animate-pulse'
                : 'bg-amber-600/90 hover:bg-amber-500 text-white border-amber-400'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            {isInterceptMode ? 'INTERCEPT ACTIVE (ENGAGING)' : 'ENGAGE / INTERCEPT TARGET'}
          </button>
        )}
      </div>

      {/* Leaflet Satellite Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Intercept Flight Telemetry Overlay (Bottom) */}
      <div className="absolute bottom-2 left-2 right-2 z-[400] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 text-[10px] text-slate-200 bg-tactical-panel/95 px-2.5 py-1.5 rounded border border-tactical-border backdrop-blur pointer-events-auto">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow"></span> Drone
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block shadow"></span> Target
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-red-500 inline-block"></span> Collision Vector
          </span>
        </div>

        {designatedTrackId && (
          <div className="text-[10px] font-bold bg-slate-900/95 border border-red-500/80 text-red-400 px-3 py-1.5 rounded backdrop-blur flex items-center gap-3 pointer-events-auto">
            <span>RANGE: <strong className="text-white">34.5m</strong></span>
            <span>CLOSING: <strong className="text-white">28 m/s</strong></span>
            <span>TTI: <strong className="text-white">{isInterceptMode ? '1.2s' : 'HOLD'}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
