import React from 'react';
import { FalconNetStatus } from '../types';
import { Wifi, Radio, Smartphone, Globe, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface NetworkStatusWidgetProps {
  network: FalconNetStatus;
}

export const NetworkStatusWidget: React.FC<NetworkStatusWidgetProps> = ({ network }) => {
  const providers = [
    {
      id: 'WIFI6',
      name: 'Wi-Fi 6 (Direct LOS)',
      icon: Wifi,
      data: network.wifi6,
      subtext: network.wifi6.rssi ? `${network.wifi6.rssi} dBm` : 'LOS Link'
    },
    {
      id: 'MESH',
      name: 'RF Ad-Hoc Mesh',
      icon: Radio,
      data: network.mesh,
      subtext: network.mesh.details || 'Relay Hopping'
    },
    {
      id: 'CELLULAR',
      name: 'Cellular (5G / LTE)',
      icon: Smartphone,
      data: network.cellular,
      subtext: network.cellular.details || 'BVLOS WAN'
    },
    {
      id: 'STARLINK',
      name: 'Starlink Satcom',
      icon: Globe,
      data: network.starlink,
      subtext: network.starlink.details || 'Global Backhaul'
    }
  ];

  return (
    <div className="bg-tactical-panel border border-tactical-border rounded-lg p-3 text-xs">
      {/* Title & Active Route Banner */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-tactical-border">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <Activity className="w-3.5 h-3.5 text-tactical-accent" />
          FALCONNET MULTI-PROVIDER
        </div>
        <div className="flex items-center gap-1 text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-bold">
          ACTIVE: {network.activeTransport}
        </div>
      </div>

      {/* Grid of 4 Network Providers */}
      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => {
          const isActive = network.activeTransport === p.id;
          const isConnected = p.data.connected;
          const Icon = p.icon;

          return (
            <div
              key={p.id}
              className={`p-2 rounded border flex flex-col justify-between transition-all ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-sm shadow-cyan-950'
                  : isConnected
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-tactical-accent' : isConnected ? 'text-slate-400' : 'text-slate-600'}`} />
                  <span className={isActive ? 'text-white' : ''}>{p.name}</span>
                </div>
                {isConnected ? (
                  <CheckCircle2 className={`w-3 h-3 ${isActive ? 'text-tactical-accent' : 'text-emerald-500'}`} />
                ) : (
                  <AlertCircle className="w-3 h-3 text-slate-600" />
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{p.subtext}</span>
                <span className={`font-mono font-bold ${p.data.latencyMs < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isConnected ? `${p.data.latencyMs}ms` : 'OFFLINE'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* QoS & Health Status Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
        <span>QoS: 3-Tier Priority Active</span>
        <span>Packet Loss: <strong className="text-emerald-400">{network.packetLossPct.toFixed(1)}%</strong></span>
      </div>
    </div>
  );
};
