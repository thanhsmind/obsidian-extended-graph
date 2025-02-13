export type Feature = 'tags' | 'properties' | 'property-key' | 'links' | 'curvedLinks' | 'folders' | 'imagesFromProperty' | 'focus' | 'shapes' | 'source' | 'target' | 'elements-stats';
export type GraphType = 'graph' | 'localgraph';

export const graphTypeLabels: Record<GraphType, string> = {
    'graph': "Global",
    'localgraph': "Local"
}