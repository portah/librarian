import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { Random } from 'meteor/random';

import { promises as fs } from 'fs';

import { of as observableOf, Observable, Subscriber, from as observableFrom } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';

const cors = require('cors');
import express from 'express';

import * as bodyParser from 'body-parser';
import * as osmosis from 'osmosis';

import { Publishers, Publisher, getPublishers } from '/imports/api/publishers';
import { Book, BookFile, NLPTerm, Books } from '/imports/api/books';

import { Logger, walk, ScrapePDFFile, PDF as pdfParser } from '/imports/modules';

// import * as jwt from 'jsonwebtoken';

import { FileManagerOperations, contentRootPathGlobal } from '/imports/api/fileManager/operations';
import { download, downloadPdf } from '/imports/api/fileManager/download';

import { FilesUpload } from '/imports/api/ostrioFiles';

import '/imports/api';

async function debugMiddle(req: any, res: any, next: any) {
    Logger.info(`[BooksStorage]: ${req.method}, ${req.url}`);
    Logger.debug('[BooksStorage] Headers:', req.headers);
    Logger.debug('[BooksStorage] Body:', req.body);
    return next();
}

Meteor.startup(async () => {


    if (Meteor.settings.cors) {
        WebApp.rawConnectHandlers.use((req: any, res: any, next: any) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
            return next();
        });
    }

    if (Meteor.settings.cors_package) {
        WebApp.rawConnectHandlers.use(cors());
    }


    const baseFolders: any[] = Meteor.settings.walkingDirs || [];


    // Make the user agent that of a browser (Google Chrome on Windows)
    osmosis.config('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36');
    // If a request fails don't keep retrying (by default this is 3)
    osmosis.config('tries', 1);
    // Concurrent requests (by default this is 5) make this 2 so we don't hammer the site
    osmosis.config('concurrency', 2);


    /**
     * Scrape letmeread by isbn, maybe adopt for amazon too
     * @param isbn - isbn 10 string
     */
    const getLetMeRead = (isbn: string) => {
        return Observable.create(Meteor.bindEnvironment((observer: Subscriber<any>) => {
            const url = `https://www.letmeread.net/search/${isbn}/`;

            osmosis
                .get(url)
                .find('.card-body')
                .set({ title: 'a @title', url: '@href' })
                .find('.card-title > a')
                .follow('@href')
                .set({ image: 'article > div.row[1] img@src' })
                .set({ authors: ['article > div.row[1] > div a[itemprop="author"]'] })
                .set({ details: ['article > div.row[2] > div[1] > div.card[1] > div.card-body li'] })
                .set({ categories: ['article > div.row[2] > div[1] > div.card[2] > div.card-body a'] })
                .set({ tags: ['article > div.row[2] > div[1] > div.card[3] > div.card-body a'] })
                .set({ source_code: ['article > div.row[2] > div[1] > div.card[4] > div.card-body a@href'] })
                .set({ description: ['article > div.row[2] > div[2] > div.card[1] > div.card-body'] })
                .set({
                    data: [
                        osmosis
                            .find('article > div.row[2] .card')
                            .set({ info_title: '.card-header', info_description: 'div.card-body' }),
                    ]
                })
                // @ts-ignore
                .delay(2000)
                .data((item: any) => observer.next(item))
                .error((e: any) => { Logger.error(e); return observer.complete(); })
                .done(() => observer.complete());
        }));
    };


    /**
     *
     *
     *              CODE LOGIC
     *
     *
     */


    getPublishers()
        .pipe(filter((_: any) => !!_.title))
        .subscribe(Meteor.bindEnvironment((item: any) => {
            Publishers.update(
                { title: item.title },
                { $set: item },
                { upsert: true });
        }));

    const publishers: Publisher[] = Publishers.find().fetch();

    observableFrom(baseFolders)
        .pipe(
            mergeMap((baseFolder) => observableFrom(walk(baseFolder, baseFolder, Meteor.settings.extensions))),
            mergeMap((list: any[]) => observableFrom(list)),
            // takeWhile((v, i) => i > 10 && i < 12),
            // filter((v, i) => i > 0 && i < 2),
            // filter((v, i) => v.base === 'Apress.Working.with.Coders.148422700X.pdf'),
            mergeMap((fileInfo: BookFile) => {
                const filePath = `${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`;
                return observableFrom(fs.readFile(filePath))
                    .pipe(map((file: any) => ({ file, fileInfo })));
            }),
            mergeMap(({ file, fileInfo }) => {
                if (fileInfo.ext === '.pdf') {
                    return observableFrom(pdfParser(file))
                        .pipe(
                            map((pdfData: any) => ({ pdfBook: (new ScrapePDFFile(pdfData, fileInfo, publishers)).scrapePDFFile(), fileInfo }))
                        );
                }
                return observableOf({ pdfBook: null, fileInfo });
            })
        )
        .subscribe(({ pdfBook, fileInfo }) => {
            if (!pdfBook) {
                Logger.error('Unsupported extension:', fileInfo.ext);
                return;
            }
            if (pdfBook) {
                const filePath = `${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`;

                const book = Books.findOne({ 'fileInfo.name': pdfBook.fileInfo.name });
                if (book) {
                    if (!book.fileInfo._id) {
                        const bookId = book._id;
                        const opts: any = {
                            meta: {
                                projectId: '',
                                userId: '',
                                bookId
                            },
                            fileName: pdfBook.fileInfo.base,
                            fileId: Random.id(),
                            isPDF: true
                        };

                        FilesUpload.addFile(filePath, opts, (err: any) => err ? Logger.error(err) : '');
                        pdfBook.fileInfo._id = opts.fileId;
                        Books.upsert({ _id: bookId }, { $set: book }, { multi: false });
                        Logger.debug(`Updated file info for ${pdfBook.title} & ${bookId}`, pdfBook.fileInfo, pdfBook.fileInfo._id);
                    }
                    // pdfBook.fileInfo._id = book.fileInfo._id;
                    // Logger.info(book.title, book?._id, book.fileInfo, book.fileInfo._id);
                } else {

                    const bookId = Books.insert(pdfBook);
                    const opts: any = {
                        meta: {
                            projectId: '',
                            userId: '',
                            bookId
                        },
                        fileName: pdfBook.fileInfo.base,
                        fileId: Random.id(),
                        isPDF: true
                    };

                    FilesUpload.addFile(filePath, opts, (err: any) => err ? Logger.error(err) : '');
                    pdfBook.fileInfo._id = opts.fileId;
                    Books.upsert({ _id: bookId }, { $set: book }, { multi: false });
                    Logger.debug(pdfBook.title, bookId, pdfBook.fileInfo, pdfBook.fileInfo._id);
                }

            }
        });

    // if (isbn) {
    //     //
    //     getLetMeRead(isbn).subscribe((data: any) => {
    //         Logger.debug('Letmeread:', data);
    //     });
    // }

    // const fileName = '/Users/porter/Books/rar2/Wiley.Lean.Impact.How.to.Innovate.for.Radically.Greater.Social.Good.1119506603.pdf';

    // pdf(await fs.readFile(fileName)).then((data: any) => {




    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    // app.use(cors());
    const fileManager = new FileManagerOperations(contentRootPathGlobal);
    app.post('/operations', debugMiddle, async (req, res, next) => {
        // req.setTimeout(0);
        res.setHeader('Content-Type', 'application/json');
        res.json(
            JSON.stringify(
                await fileManager.fileManagerRead(req.body)
            )
        );
    });
    // app.post('/download', debugMiddle, async (req, res, next) => {
    //     download(req, res, contentRootPathGlobal);
    // });
    app.post('/download', debugMiddle, async (req, res, next) => {
        download(req, res, contentRootPathGlobal, next);
    });

    const app1 = express();
    app1.use(bodyParser.urlencoded({ extended: true }));
    app1.use(bodyParser.json());

    app1.all('*', debugMiddle, async (req, res, next) => {
        await downloadPdf(req, res, contentRootPathGlobal, next);
    });

    // app.post('/download/*', debugMiddle);
    WebApp.connectHandlers.use('/filemanager', app);

    WebApp.connectHandlers.use('/books', app1);
});
