import {Request} from 'express';

export function getBaseUrl(request: Request): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const protocol = isProduction ? 'https' : request.protocol;
    const host = request.get('host');
    return `${protocol}://${host}`;
}

export function getAbsoluteUrl(request: Request, relativePath: string | null): string | null {
    if (!relativePath) return null;

    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }

    const baseUrl = getBaseUrl(request);
    return `${baseUrl}${relativePath}`;
}

