const EPub = require('epub');
import { Image } from 'canvas';

import { of as observableOf, Observable, from as observableFrom, merge } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { NodeCanvasFactory } from '../pdf/pdfparse';
import { Logger } from '../logger';

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
        this.epubReady = new Promise((resolve) => this.epub.on('end', () => resolve(this.epub)));
        this.epub.parse();
    }


    // private events(event: string): Promise<any> {
    //     return new Promise((resolve, reject) => {
    //         this.epub.on(event, () => {

    //         });
    //     });
    // }

    print(): Promise<any> {
        // Logger.debug(this.epub.metadata);
        Logger.debug(this.epub);
        return Promise.resolve();
    }

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
        if (this.epub.metadata.cover) {
            if (this.epub.manifest[this.epub.metadata.cover]) {
                return this.getImage(this.epub.metadata.cover);
            }

            const cover = Object.keys(this.epub.manifest).find((k: any) => this.epub.manifest[k].href?.endsWith(this.epub.metadata.cover));
            if (cover) {
                return this.getImage(cover);
            }
        } else {
            const cover = this.epub.guide.find((g: any) => {
                return g.type === 'cover';
            });
            if (cover) {
                Logger.debug(cover);
            }
        }
        return Promise.resolve(null);
    }
    /**
     *
     * @param imgId
     */
    getImage(imgId: any): Promise<any> {
        const maxWidth = 640;
        const maxHeight = maxWidth * 1.55;
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
                return Promise.resolve(null);
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
            return Promise.resolve(canvas.toDataURL('image/png'));
        });
    }


    /**
     *
     */
    epubParse() {
        return observableFrom(this.epubReady).pipe(
            mergeMap((epub: EPUBJS) => {
                Logger.debug(epub);
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
                return observableFrom(this.getText()).pipe(
                    map((text) => ({ text, ...result }))
                );
            })
        );
    }

}



// export function epubParse(epubfile: string, ) {
//     const imagewebroot = '/images';
//     const chapterwebroot = '/chapter';

//     const epub = new EPub(epubfile, imagewebroot, chapterwebroot);

//     epub.on('end', function () {
//         // epub is now usable
//         Logger.debug(epub.metadata.title);
//         Logger.debug(epub);
//         // epub.getChapter("chapter_id", function(err, text){});

//         // epub.getImage('cover-image', (err: any, data: Buffer) => {
//         //     if (err) { Logger.error(err); }
//         //     if (data) {
//         //         Logger.debug(data.toString('base64'));
//         //     }
//         // });
//     });
//     epub.parse();
// }
