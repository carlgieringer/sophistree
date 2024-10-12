export function serializeMap<K, V>(map: Map<K, V>): [K, V][] {
  return Array.from(map.entries());
}

export function deserializeMap<K, V>(serialized: [K, V][]): Map<K, V> {
  return new Map(serialized);
}
