const EPub = require('epub');
import { Image } from 'canvas';

import { of as observableOf, Observable, from as observableFrom, merge } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { NodeCanvasFactory } from '../pdf/pdfparse';
import { Logger } from '../logger';


const maxWidth = 640;
const maxHeight = maxWidth * 1.55;

export interface TocElement {
    level: number;
    order: number;
    title: string;
    id: string;
    href: string;
}

export interface Metadata {
    creator: string;
    creatorFileAs: string;
    title: string;
    language: string;
    subject: string;
    date: string;
    description: string;
    cover?: string;
}

export interface EPUBJS {
    metadata: Metadata;
    manifest: object;
    spine: {
        toc: { href: string; id: string }
        contents: Array<TocElement>
    };
    flow: Array<TocElement>;
    toc: Array<TocElement>;
    guide: { type: string }[];
}

export class EPUB {
    public imagewebroot = '/images';
    public chapterwebroot = '/chapter';

    private epub: any | EPUBJS;

    public epubReady: Promise<any>;

    constructor(public epubfile: string) {
        this.epub = new EPub(this.epubfile, this.imagewebroot, this.chapterwebroot);
        this.epubReady = new Promise((resolve) => {
            this.epub.on('end', () => resolve(this.epub));
            this.epub.on('error', (error: any) => {
                Logger.error(`Error in ${this.epubfile}`, error);
                resolve(null);
            });
        });
        this.epub.parse();
    }

    static getCoverFromText({ title = '', year = '', publisher = '' }) {
        const { canvas, context } = (new NodeCanvasFactory()).create(maxWidth, maxHeight);

        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // On first page
        context.font = 'bold 30px Helvetica, verdana, sans-serif';
        context.fillStyle = '#000000';

        if (title) {
            context.fillText(title, 50, 100, maxWidth - 50);
        }

        if (publisher) {
            context.fillText(publisher, maxWidth / 2 - 30, 500, 200);
        }

        if (year) {
            context.fillText(year, maxWidth / 2 - 30, 400, 600);
        }
        return canvas.toDataURL('image/png');
    }

    // private events(event: string): Promise<any> {
    //     return new Promise((resolve, reject) => {
    //         this.epub.on(event, () => {

    //         });
    //     });
    // }

    getChapter(chapter: any) {
        return new Promise((resolve) => this.epub.getChapter(chapter.id, (err: any, text: string) => {
            if (err) {
                Logger.error(err);
                resolve('');
            } else {
                resolve(text);
            }
        }));
    }

    async getText() {
        let text: any[] = await Promise.all(
            this.epub.flow
                .map(
                    async (chapter: any) => await this.getChapter(chapter)
                )
        );
        text = text.reduce((pV, cV) => {
            return pV + cV.replace(/<[^>]*>?/gm, '');
        }, '');
        return text;
    }

    async getCover() {
        if (this.epub.metadata.cover && this.epub.manifest[this.epub.metadata.cover]) {
            return this.getImage(this.epub.metadata.cover);
        }

        let cover = Object.keys(this.epub.manifest).find((k: any) => this.epub.manifest[k].href?.endsWith(this.epub.metadata.cover));
        if (!cover) {
            cover = Object.keys(this.epub.manifest).find((k: any) => this.epub.manifest[k].properties?.startsWith('cover-image'));
        }
        if (cover) {
            return this.getImage(cover);
        }

        cover = this.epub.guide.find((g: any) => {
            return g.type === 'cover';
        });
        if (cover) {
            Logger.debug(cover);
        }
        return Promise.resolve(null);
    }

    /**
     *
     * @param imgId
     */
    async getImage(imgId: any): Promise<any> {
        return new Promise((resolve) => {
            this.epub.getImage(imgId, (e: any, d: any) => {
                if (e) {
                    Logger.error(e);
                    resolve(null);
                } else {
                    const image: any = new Image();
                    image.onerror = (err: any) => {
                        Logger.error(err); resolve(null);
                    };
                    image.onload = () => resolve(image);
                    image.src = d;
                }
            });
        }).then((image: any) => {
            if (!image) {
                return null;
            }
            let ratio = 1;
            if (image.width > maxWidth) { // need to scale
                ratio = maxWidth / image.width;
            }

            const { canvas, context } = (new NodeCanvasFactory()).create(maxWidth, maxHeight);

            canvas.width = image.width * ratio; // target width
            canvas.height = image.height * ratio; // target height
            context.drawImage(image,
                0, 0, image.width, image.height,
                0, 0, canvas.width, canvas.height
            );
            return canvas.toDataURL('image/png');
        });
    }


    /**
     *
     */
    epubParse() {
        return observableFrom(this.epubReady).pipe(
            mergeMap((epub: EPUBJS) => {
                if (!epub) {
                    return observableOf(null);
                }
                Logger.info(epub.metadata);
                Logger.debug(epub.manifest);
                Logger.debug(epub.toc);
                return observableFrom(this.getCover()).pipe(
                    map((imageBase64) => ({
                        imageBase64,
                        metadata: epub.metadata,
                        manifest: epub.manifest,
                        spine: epub.spine,
                        flow: epub.flow,
                        toc: epub.toc
                    }))
                );
            }),
            mergeMap((result) => {
                if (!result) {
                    return observableOf(null);
                }
                return observableFrom(this.getText()).pipe(
                    map((text) => ({ text, ...result }))
                );
            })
        );
    }

}
