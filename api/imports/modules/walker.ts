import { promises as fs } from 'fs';
import { join, parse } from 'path';
import { Book } from '/imports/api/books';

/**
 * Walk a directory returns array of files with stats
 * @param dir - base directory to start walking
 * @param extensions - filter by extensions i.e. ['.pdf']
 */
export async function walk(dir: string, extensions?: string[] | undefined): Promise<Book[] | any> {
    const files = await fs.readdir(dir);
    return [...await files.reduce(async (previousPromise: Promise<string[]>, file): Promise<string[] | any> => {
        const collection = await previousPromise;
        const filePath = join(dir, file);
        const stats = await fs.stat(filePath);
        // Logger.debug(stats);
        // Logger.debug(collection);
        if (stats.isDirectory()) {
            return [...collection, ...await walk(filePath, extensions)];
        } else {
            const pathParse = parse(filePath);
            if (extensions && extensions.includes(pathParse.ext) || !extensions) {
                return [...collection, {
                    ...pathParse,
                    size: stats.size,
                    atimeMs: stats.atimeMs,
                    ctimeMs: stats.ctimeMs,
                    mtimeMs: stats.mtimeMs,
                    birthtimeMs: stats.birthtimeMs
                }];
            } else {
                return collection;
            }

        }
    }, Promise.resolve([]))];
}

export const walker = walk;
