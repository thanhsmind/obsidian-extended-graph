export type Feature = 'auto-enabled' | 'tags' | 'properties' | 'property-key' | 'links' | 'curvedLinks' | 'folders' | 'imagesFromProperty' | 'imagesForAttachments' | 'imagesFromEmbeds' | 'focus' | 'shapes' | 'source' | 'target' | 'elements-stats' | 'names';
export type GraphType = 'graph' | 'localgraph';

export const graphTypeLabels: Record<GraphType, string> = {
    'graph': "Global",
    'localgraph': "Local"
}