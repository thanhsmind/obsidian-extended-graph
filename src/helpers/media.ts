import { getFile, PluginInstances } from "src/internal";
import STRINGS from "src/Strings";

export class Media {
    static async getImageUriFromProperty(keyProperty: string, id: string): Promise<string | null> {
        const metadata = PluginInstances.app.metadataCache.getCache(id);
        if (!metadata) return null;

        const frontmatter = metadata.frontmatter;
        if (!frontmatter) return null;

        let imageLink: string | null = null;
        if (typeof frontmatter[keyProperty] === "string") {
            imageLink = frontmatter[keyProperty]?.replace("[[", "").replace("]]", "");
        }
        else if (Array.isArray(frontmatter[keyProperty])) {
            imageLink = frontmatter[keyProperty][0]?.replace("[[", "").replace("]]", "");
        }
        if (imageLink) {
            const imageFile = PluginInstances.app.metadataCache.getFirstLinkpathDest(imageLink, ".");
            if (imageFile) {
                const src = PluginInstances.app.vault.getResourcePath(imageFile);
                return Media.getStaticImageUri(src);
            }
            else {
                try {
                    const validationUrl = new URL(imageLink);
                    if (validationUrl.protocol === 'http:' || validationUrl.protocol === 'https:') {
                        return Media.getStaticImageUri(imageLink);
                    }
                } catch (err) {
                    return null;
                }
            }
        }
        return null;
    }

    static async getImageUriFromEmbeds(id: string): Promise<string | null> {
        const metadata = PluginInstances.app.metadataCache.getCache(id);
        if (!metadata) return null;

        const embeds = metadata.embeds;
        if (!embeds) return null;
        
        for (const embedCache of embeds) {
            const imageFile = PluginInstances.app.metadataCache.getFirstLinkpathDest(embedCache.link, ".");
            if (imageFile) {
                const src = PluginInstances.app.vault.getResourcePath(imageFile);
                return Media.getStaticImageUri(src);
            }
            else {
                try {
                    const validationUrl = new URL(embedCache.link);
                    if (validationUrl.protocol === 'http:' || validationUrl.protocol === 'https:') {
                        return Media.getStaticImageUri(embedCache.link);
                    }
                } catch (err) {
                    return null;
                }
            }
        }
        
        return null;
    }

    

    static async getImageUriForAttachment(id: string): Promise<string | null> {
        const file = getFile(id);
        if (file) {
            return Media.getStaticImageUri(PluginInstances.app.vault.getResourcePath(file));
        }
        return null;
    }

    static async getStaticImageUri(src: string): Promise<string | null> {
        // https://www.iana.org/assignments/media-types/media-types.xhtml
        const type = await Media.getMediaType(src);
        if (!type) return null;

        if (['image/avif', 'image/webp', 'image/png', 'image/svg+xml', 'image/jpeg'].includes(type)) {
            return src;
        }
        else if (['image/gif'].includes(type)) {
            return Media.getUriForGif(src);
        }
        else if (['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'].includes(type)) {
            return Media.getUriForVideo(src);
        }
        return null;
    }

    static async getUriForGif(src: string): Promise<string | null> {
        const canvas = createEl('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let uri: string | undefined = undefined;

            const image = new Image();
            image.onload = () => {
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                uri = canvas.toDataURL();
            };
            image.src = src;

            let waitLoop = 0;
            await (async() => {
                while (uri === undefined && waitLoop < 5) {
                    waitLoop += 1;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            })();
            return uri ?? null;
        }
        return null;
    }

    static async getUriForVideo(src: string): Promise<string | null> {
        const canvas = createEl('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let uri: string | undefined = undefined;

            const video = createEl('video');

            video.src = src;
            video.addEventListener('seeked', function() {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                uri = canvas.toDataURL();
            });
            video.onloadedmetadata = function() {
                if (video.duration) video.currentTime = video.duration / 2;
            };

            let waitLoop = 0;
            await (async() => {
                while (uri === undefined && waitLoop < 5) {
                    waitLoop += 1;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            })();
            return uri ?? null;
        }
        return null;
    }

    static async getMediaType(url: string): Promise<string | null> {
        let type: string | null | undefined;
        
        var request = new XMLHttpRequest();
        request.open('HEAD', url, false);
        request.onload = function() {
            type = request.getResponseHeader('Content-Type');
        };
        request.onerror = function(e) {
            console.warn(e);
            type = null;
        }
        request.onreadystatechange = function() {
            if (request.status === 401) {
                console.warn(STRINGS.errors.uri401);
            }
        }
        try {
            request.send();
        }
        catch (e) {
            console.warn(e);
            type = null;
        }



        let waitLoop = 0;
        await (async() => {
            while (type === undefined && waitLoop < 5) {
                waitLoop += 1;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        })();
        return type ?? null;
    }
}