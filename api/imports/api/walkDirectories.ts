import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';

import { promises as fs } from 'fs';

import { of as observableOf, Observable, from as observableFrom, merge, Subscriber, Subject } from 'rxjs';
import { map, mergeMap, switchMap, delayWhen, concatMap } from 'rxjs/operators';

import { Publishers, Publisher } from '../modules/publishers';
import { BookFile, Books, Book } from '/imports/api/books';

import { Logger, walk, ScrapePDFFile, PDF as pdfParser, ScrapeEpubFile, EPUB as epubParser } from '/imports/modules';
import { FilesUpload } from '/imports/api/ostrioFiles';


const uniqName = true;

// const bound = Meteor.bindEnvironment(callback => callback());

/**
 *
 * @param bookId
 * @param fileInfo
 */
function addFile(bookId: string, fileInfo: any) {
    const filePath = `${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`;

    const opts: any = {
        meta: {
            projectId: '',
            userId: '',
            bookId
        },
        fileName: fileInfo.base,
        fileId: Random.id(),
        isPDF: fileInfo.ext === '.pdf'
    };

    FilesUpload.addFile(filePath, opts, (err: any) => err ? Logger.error(err) : '');
    fileInfo._id = opts.fileId;
    return opts.fileId;
}
/**
 *
 */
function checkUpdate(book: any, { authors, description, imageBase64, outline, numPages, publisher }: any) {

    let setB = {};

    if (!book.authors || book.authors.length === 0) {
        setB = { ...setB, authors };
    }
    if (!book.description && description) {
        setB = { ...setB, description };
    }
    if (!book.imageBase64 && imageBase64) {
        setB = { ...setB, imageBase64 };
    }
    if (!book.outline && outline) {
        setB = { ...setB, outline };
    }
    if (!book.numPages && numPages) {
        setB = { ...setB, numPages };
    }
    if (!book.publisher && publisher) {
        setB = { ...setB, publisher };
    }

    if (Object.keys(setB).length > 0) {
        Books.update({ _id: book._id }, {
            $set: { ...setB }
        });
    }
}

/**
 *
 */
Meteor.methods({
    'walk/folders': function (baseFolders: any[]) {

        const makeSequence = new Subject();
        check(baseFolders, [String]);
        const publishers: Publisher[] = Publishers.find().fetch();
        const globalList: any[] = [];
        let timeout = 1000;
        observableFrom(baseFolders)
            .pipe(
                concatMap((baseFolder: string) => observableFrom(walk(baseFolder, baseFolder, Meteor.settings.extensions))),
                concatMap((list: any[]): Observable<any> => {
                    // // Logger.debug(list);
                    // return observableFrom(list);

                    if (list && list.length > 0 && globalList.length === 0) {
                        globalList.push(...list);
                        // Logger.info(globalList);
                        Meteor.setTimeout(() => {
                            makeSequence.next(globalList.shift());
                        }, timeout);
                    }
                    return makeSequence;
                    // .pipe(
                    //     concatMap((...args): Observable<any> => {
                    //         return Observable.create((observer: any) => {
                    //             this.unblock();
                    //             Meteor.setTimeout(() => {
                    //                 observer.next(...args);
                    //                 observer.complete();
                    //             }, timeout);
                    //         });
                    //     })
                    // );
                }),
                concatMap((fileInfo: BookFile): Observable<{ pdfBook?: any, fileInfo: any, epubBook?: any }> => {
                    const filePath = `${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`;

                    let book: Book | any;
                    if (uniqName) {
                        book = Books.findOne({
                            $and: [
                                {
                                    'fileInfo.searchName': fileInfo.name.toUpperCase()
                                },
                                {
                                    'fileInfo.root': fileInfo.root
                                }
                            ]
                        });
                    } else {
                        book = Books.findOne({
                            $and: [
                                {
                                    'fileInfo.searchName': fileInfo.name.toUpperCase()
                                },
                                {
                                    'fileInfo.root': fileInfo.root
                                },
                                {
                                    'fileInfo.dir': fileInfo.dir,
                                }
                            ]
                        });
                    }
                    // TODO: root change! check dir & name

                    if (fileInfo.ext === '.pdf') { // Working on .pdf file on disk
                        if (book && book.fileInfo && book.fileInfo.pdf) {
                            return observableOf({ fileInfo }); // skip, any updates in subscription
                        } else {
                            return observableFrom(fs.readFile(filePath))
                                .pipe(
                                    mergeMap((file) => {
                                        return observableFrom(pdfParser(file))
                                            .pipe(
                                                map((pdfData: any) =>
                                                    ({ pdfBook: pdfData.error ? null : (new ScrapePDFFile(pdfData, fileInfo, publishers)).scrapePDFFile(), fileInfo })
                                                )
                                            );
                                    })
                                );
                        }
                    }
                    if (fileInfo.ext === '.epub') {
                        if (book && book.fileInfo && book.fileInfo.epub) {
                            return observableOf({ fileInfo }); // skip, any updates in subscription
                        } else {
                            return (new epubParser(filePath))
                                .epubParse()
                                .pipe(
                                    map((epubData: any) =>
                                        ({ epubBook: epubData ? (new ScrapeEpubFile(epubData, fileInfo, publishers)).scrapeEpubFile() : null, fileInfo })
                                    )
                                );
                        }
                    }
                    return observableOf({ pdfBook: null, epubBook: null, fileInfo });
                }),
                // concatMap((...args): Observable<any> => {
                //     return Observable.create((observer: any) => {
                //         this.unblock();
                //         Meteor.setTimeout(() => {
                //             observer.next(...args);
                //             observer.complete();
                //         }, 1000);
                //     });
                // })
            )
            .subscribe(({ pdfBook, fileInfo, epubBook }) => {
                this.unblock();
                if (!pdfBook && !epubBook) {
                    Logger.error(`Skip: ${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`);
                    if (globalList.length > 0) {
                        // timeout = 10;
                        Meteor.setTimeout(() => {
                            makeSequence.next(globalList.shift());
                        }, 0);
                    } else {
                        makeSequence.complete();
                    }
                    return;
                }

                let book: Book | any;
                if (uniqName) {
                    book = Books.findOne({
                        $and: [
                            {
                                'fileInfo.searchName': fileInfo.name.toUpperCase()
                            },
                            {
                                'fileInfo.root': fileInfo.root
                            }
                        ]
                    });
                } else {
                    book = Books.findOne({
                        $and: [
                            {
                                'fileInfo.searchName': fileInfo.name.toUpperCase()
                            },
                            {
                                'fileInfo.root': fileInfo.root
                            },
                            {
                                'fileInfo.dir': fileInfo.dir,
                            }
                        ]
                    });
                }                // TODO: root change! check dir & name

                if (book) {
                    const { title, authors, isbn, description, publisher, outline, imageBase64, nlpTags, nlpTerms, numPages } = epubBook || pdfBook;
                    if (epubBook && book.fileInfo.pdf) {

                        // alternatives
                        if (!book.fileInfo.epub) {
                            fileInfo._id = addFile(book._id, fileInfo);
                            Books.update({ _id: book._id }, {
                                $set: {
                                    'fileInfo.epub': fileInfo,
                                    altInfo: {
                                        title,
                                        authors,
                                        isbn,
                                        description,
                                        publisher
                                    }
                                }
                            });
                        }
                    }

                    if (pdfBook && book.fileInfo.epub) {
                        if (!book.fileInfo.pdf) {
                            fileInfo._id = addFile(book._id, fileInfo);
                            Books.update({ _id: book._id }, {
                                $set: {
                                    'fileInfo.pdf': fileInfo,
                                    altInfo: {
                                        title,
                                        authors,
                                        isbn,
                                        description,
                                        publisher
                                    }
                                }
                            });
                        }
                    }
                    checkUpdate(book, { description, authors, imageBase64, outline, numPages, publisher });

                } else {
                    /**
                     *      NO BOOK RECORD in MONGODB
                     */
                    const bookId = Books.insert(pdfBook || epubBook);
                    fileInfo._id = addFile(bookId, fileInfo);
                    Books.update({ _id: bookId }, {
                        $set: {
                            fileInfo: {
                                root: fileInfo.root,
                                dir: fileInfo.dir,
                                name: fileInfo.name,
                                searchName: fileInfo.name.toUpperCase()
                            }
                        }
                    });
                    if (pdfBook) {
                        Books.update({ _id: bookId }, { $set: { 'fileInfo.pdf': fileInfo } });
                    }
                    if (epubBook) {
                        Books.update({ _id: bookId }, { $set: { 'fileInfo.epub': fileInfo } });
                    }
                    Logger.info((pdfBook || epubBook).title, bookId, fileInfo, fileInfo._id);
                }

                if (globalList.length > 0) {
                    this.unblock();
                    Meteor.setTimeout(() => {
                        makeSequence.next(globalList.shift());
                    }, timeout * 2);
                } else {
                    makeSequence.complete();
                }
            });
    }
});

