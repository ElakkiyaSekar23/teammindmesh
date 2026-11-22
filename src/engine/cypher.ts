import type { CypherAudit, SupplierLayer } from './types';

/**
 * Generates exact Neo4j Cypher queries corresponding to each graph action
 * for the "For judges" technical inspection panel.
 */
export const cypherQueries = {
  loadChainSnapshot(businessId: string): CypherAudit {
    return {
      actionName: 'Load Multi-Layer Supply Chain',
      description: 'Traverses up to 3 upstream SUPPLIES hops from the business.',
      query: [
        'MATCH path = (s:Supplier)-[:SUPPLIES*1..3]->(b:Business {id: $businessId})',
        'WITH s, relationships(path) AS rels, length(path) AS layerDepth',
        'RETURN s.id AS id, s.name AS name, layerDepth AS layer,',
        '       s.stockDays AS stockDays, s.city AS city, rels[0].sharePct AS sharePct',
        'ORDER BY layerDepth ASC, sharePct DESC;',
      ].join('\n'),
      params: { businessId },
    };
  },

  discoverHiddenSuppliers(layer1Id: string): CypherAudit {
    return {
      actionName: 'Show Hidden Layers (2 & 3)',
      description: 'Reveals Layer 2 and Layer 3 upstream suppliers connected via SUPPLIES links.',
      query: [
        'MATCH (s1:Supplier {id: $layer1Id, layer: 1})-[:SUPPLIES]->(b:Business)',
        'OPTIONAL MATCH (s2:Supplier {layer: 2})-[:SUPPLIES]->(s1)',
        'OPTIONAL MATCH (s3:Supplier {layer: 3})-[:SUPPLIES]->(s2)',
        'RETURN s1.name AS directSupplier, collect(DISTINCT s2.name) AS layer2,',
        '       collect(DISTINCT s3.name) AS layer3;',
      ].join('\n'),
      params: { layer1Id },
    };
  },

  traceSupplierPathToBusiness(businessId: string, supplierId: string): CypherAudit {
    return {
      actionName: 'Highlight Supplier Path to Business',
      description: 'Finds the shortest directed SUPPLIES route from the tapped supplier to the business.',
      query: [
        'MATCH path = (s:Supplier {id: $supplierId})-[:SUPPLIES*1..3]->(b:Business {id: $businessId})',
        'WITH path, nodes(path) AS chainNodes, length(path) AS hops',
        'RETURN [n IN chainNodes | n.name] AS route,',
        '       reduce(days = 0, n IN chainNodes[0..-1] | days + n.stockDays + 2) AS stockDaysB;',
      ].join('\n'),
      params: { businessId, supplierId },
    };
  },

  filterChainSuppliers(
    businessId: string,
    layerFilter: number | 'all',
    lightFilter: string,
    noBackupOnly: boolean,
  ): CypherAudit {
    return {
      actionName: 'Filter Chain Map Suppliers',
      description: 'Filters suppliers by layer depth, traffic-light status, and single-source backup flag.',
      query: [
        'MATCH (s:Supplier)-[:SUPPLIES*1..3]->(b:Business {id: $businessId})',
        'WHERE ($layerFilter = "all" OR s.layer = $layerFilter)',
        '  AND ($noBackupOnly = false OR s.isSingleSource = true)',
        'RETURN s.id AS id, s.name AS name, s.layer AS layer, s.isSingleSource AS noBackup;',
      ].join('\n'),
      params: { businessId, layerFilter, lightFilter, noBackupOnly },
    };
  },

  findWeakSpotsWithinDays(businessId: string, maxDays = 10): CypherAudit {
    return {
      actionName: 'Find Weak Spots (No Backup & <= 10 Days)',
      description: 'Finds every sole-source supplier whose cumulative stock + transport cushion is <= 10 days.',
      query: [
        'MATCH path = (s:Supplier)-[:SUPPLIES*1..3]->(b:Business {id: $businessId})',
        'WHERE s.isSingleSource = true',
        'WITH s, nodes(path)[0..-1] AS chain,',
        '     reduce(d = 0, n IN nodes(path)[0..-1] | d + n.stockDays + 2) AS daysToHurt',
        'WHERE daysToHurt <= $maxDays',
        'RETURN s.id AS id, s.name AS name, s.layer AS layer, daysToHurt',
        'ORDER BY daysToHurt ASC;',
      ].join('\n'),
      params: { businessId, maxDays },
    };
  },

  traceRippleImpact(businessId: string, eventId: string, matchedSupplierIds: string[]): CypherAudit {
    return {
      actionName: 'Trace Disruption Ripple Paths',
      description: 'Finds all directed SUPPLIES paths from affected suppliers to the business.',
      query: [
        'MATCH path = (src:Supplier)-[r:SUPPLIES*1..3]->(b:Business {id: $businessId})',
        'WHERE src.id IN $matchedSupplierIds',
        'WITH path, src, reduce(w = 1.0, rel IN r | w * (rel.sharePct / 100.0)) AS pathShare,',
        '     reduce(t = 0, rel IN r | t + rel.transitDays) AS totalTransitDays',
        'RETURN src.id AS sourceId, length(path) AS hops, pathShare, totalTransitDays',
        'ORDER BY pathShare DESC;',
      ].join('\n'),
      params: { businessId, eventId, matchedSupplierIds },
    };
  },

  addSupplierAndLink(
    name: string,
    layer: SupplierLayer,
    toId: string,
    sharePct: number,
  ): CypherAudit {
    return {
      actionName: 'Create Supplier & SUPPLIES Link',
      description: 'Adds a new supplier node and directed SUPPLIES relationship into the chain.',
      query: [
        'MERGE (s:Supplier {name: $name, layer: $layer})',
        'WITH s',
        'MATCH (target {id: $toId})',
        'MERGE (s)-[rel:SUPPLIES {sharePct: $sharePct}]->(target)',
        'RETURN s, rel, target;',
      ].join('\n'),
      params: { name, layer, toId, sharePct },
    };
  },

  findSingleSourceBottlenecks(businessId: string): CypherAudit {
    return {
      actionName: 'Detect Single-Source Bottlenecks',
      description: 'Flags suppliers with zero alternatives or >= 80% supply share.',
      query: [
        'MATCH (s:Supplier)-[r:SUPPLIES*1..3]->(b:Business {id: $businessId})',
        'WHERE s.isSingleSource = true OR any(rel IN r WHERE rel.sharePct >= 80)',
        'RETURN DISTINCT s.id AS supplierId, s.name AS name, s.layer AS layer, s.stockDays AS stockDays',
        'ORDER BY s.stockDays ASC;',
      ].join('\n'),
      params: { businessId },
    };
  },
};
