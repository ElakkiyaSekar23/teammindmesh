import type { PersonaType, SupplyChainGraph } from '../engine/types';
import { FACTORY_CHAIN_GRAPH } from './factory';
import { SHOP_CHAIN_GRAPH } from './shop';

export { SHOP_CHAIN_GRAPH } from './shop';
export { FACTORY_CHAIN_GRAPH } from './factory';

export function getPersonaChainGraph(persona: PersonaType): SupplyChainGraph {
  const source = persona === 'shop' ? SHOP_CHAIN_GRAPH : FACTORY_CHAIN_GRAPH;
  return {
    business: { ...source.business },
    suppliers: source.suppliers.map((s) => ({
      ...s,
      alternateSuppliers: [...s.alternateSuppliers],
      keywords: [...s.keywords],
    })),
    links: source.links.map((l) => ({ ...l })),
  };
}
