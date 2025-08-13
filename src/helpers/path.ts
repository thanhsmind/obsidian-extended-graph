export function pathParse(path: string, ext?: string) {
    if (!path) return { path, basename: "", ext: "" };

    path = path.replace(/\/+$/, ''); // Remove trailing slashes (if any)
    const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));

    const base = lastSlashIndex === -1 ? path : path.substring(lastSlashIndex + 1);

    if (!ext) {
        const lastDotIndex = base.lastIndexOf('.');
        ext = lastDotIndex === -1 ? "" : base.substring(lastDotIndex);
    }
    else if (!base.contains(ext)) {
        throw new Error(`The path "${path}" is not of extension "${ext}".`);
    }

    if (!ext.startsWith(".") && ext) {
        ext = "." + ext;
    }

    let basename: string;
    if (ext.length > 1) {
        const lastExtIndex = base.lastIndexOf(ext);
        basename = lastExtIndex === -1 ? base : base.substring(0, lastExtIndex);
    }
    else {
        basename = base;
    }

    return {
        path,
        basename,
        ext
    }
}