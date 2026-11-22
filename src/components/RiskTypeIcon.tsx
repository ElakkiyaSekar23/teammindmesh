import React from 'react';
import {
  AlertTriangle,
  Anchor,
  Ban,
  CloudRain,
  Construction,
  Droplets,
  Flame,
  Fuel,
  PackageX,
  PowerOff,
  ShieldAlert,
  Sprout,
  ThermometerSun,
  TrendingUp,
  Truck,
  Wind,
  ZapOff,
} from 'lucide-react';
import type { RiskEventType } from '../engine';

const RISK_TYPE_LABELS: Record<RiskEventType, string> = {
  flood: 'Flood',
  cyclone: 'Cyclone',
  heatwave: 'Heatwave',
  water_shortage: 'Water shortage',
  power_outage: 'Power outage',
  transport_strike: 'Transport strike',
  port_congestion: 'Port delay',
  highway_blockade: 'Road block',
  factory_fire: 'Factory fire',
  crop_disease: 'Crop disease',
  cattle_disease: 'Cattle illness',
  raw_material_shortage: 'Material shortage',
  export_ban: 'Export ban',
  gas_shortage: 'Gas shortage',
  material_price_spike: 'Price jump',
  fuel_price_hike: 'Fuel price hike',
  supplier_shutdown: 'Plant shutdown',
  cyber_attack: 'System shutdown',
};

export function getRiskTypeLabel(type: RiskEventType): string {
  return RISK_TYPE_LABELS[type] ?? 'Supply trouble';
}

export function RiskTypeIcon({
  type,
  className = 'h-4 w-4',
}: {
  type: RiskEventType;
  className?: string;
}) {
  switch (type) {
    case 'flood':
      return <CloudRain className={className} aria-hidden="true" />;
    case 'cyclone':
      return <Wind className={className} aria-hidden="true" />;
    case 'heatwave':
      return <ThermometerSun className={className} aria-hidden="true" />;
    case 'water_shortage':
      return <Droplets className={className} aria-hidden="true" />;
    case 'power_outage':
      return <ZapOff className={className} aria-hidden="true" />;
    case 'transport_strike':
      return <Truck className={className} aria-hidden="true" />;
    case 'port_congestion':
      return <Anchor className={className} aria-hidden="true" />;
    case 'highway_blockade':
      return <Construction className={className} aria-hidden="true" />;
    case 'factory_fire':
    case 'gas_shortage':
      return <Flame className={className} aria-hidden="true" />;
    case 'crop_disease':
      return <Sprout className={className} aria-hidden="true" />;
    case 'cattle_disease':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'raw_material_shortage':
      return <PackageX className={className} aria-hidden="true" />;
    case 'export_ban':
      return <Ban className={className} aria-hidden="true" />;
    case 'material_price_spike':
      return <TrendingUp className={className} aria-hidden="true" />;
    case 'fuel_price_hike':
      return <Fuel className={className} aria-hidden="true" />;
    case 'supplier_shutdown':
      return <PowerOff className={className} aria-hidden="true" />;
    case 'cyber_attack':
      return <ShieldAlert className={className} aria-hidden="true" />;
    default:
      return <AlertTriangle className={className} aria-hidden="true" />;
  }
}
