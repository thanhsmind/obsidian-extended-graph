export type Feature = 'auto-enabled' | 'tags' | 'properties' | 'property-key' | 'links' | 'folders' | 'imagesFromProperty' | 'imagesForAttachments' | 'imagesFromEmbeds' | 'focus' | 'shapes' | 'elements-stats' | 'names' | 'icons' | 'arrows' | 'linksSameColorAsNode';
export type GraphType = 'graph' | 'localgraph';

export const graphTypeLabels: Record<GraphType, string> = {
    'graph': "Global",
    'localgraph': "Local"
}