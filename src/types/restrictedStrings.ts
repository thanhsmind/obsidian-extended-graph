export type Feature = 'tags' | 'properties' | 'property-key' | 'links' | 'curvedLinks' | 'folders' | 'images' | 'focus' | 'shapes' | 'source' | 'target' | 'node-size' | 'node-color';
export type GraphType = 'graph' | 'localgraph';

export const graphTypeLabels: Record<GraphType, string> = {
    'graph': "Global",
    'localgraph': "Local"
}