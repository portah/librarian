import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';

import { promises as fs } from 'fs';

import { of as observableOf, Observable, from as observableFrom } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { Publishers, Publisher } from '../modules/publishers';
import { BookFile, Books } from '/imports/api/books';

import { Logger, walk, ScrapePDFFile, PDF as pdfParser } from '/imports/modules';
import { FilesUpload } from '/imports/api/ostrioFiles';

Meteor.methods({
    'walk/folders': function (baseFolders: any[]) {

        check(baseFolders, [String]);
        this.unblock();
        const publishers: Publisher[] = Publishers.find().fetch();
        observableFrom(baseFolders)
            .pipe(
                mergeMap((baseFolder: string) => observableFrom(walk(baseFolder, baseFolder, Meteor.settings.extensions))),
                mergeMap((list: any[]) => observableFrom(list)),
                mergeMap((fileInfo: BookFile): Observable<{ pdfBook: any, fileInfo: any }> => {
                    this.unblock();
                    const filePath = `${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`;

                    const book = Books.findOne({ 'fileInfo.name': fileInfo.name });
                    if (book) {
                        if (fileInfo.ext === '.pdf' && !book.outline) {
                            observableFrom(fs.readFile(filePath))
                                .pipe(
                                    mergeMap((file) => {
                                        return observableFrom(pdfParser(file, { page: 1 }))
                                            .pipe(
                                                map((pdfData: any) => {
                                                    book.outline = pdfData.outline || [];
                                                    return { pdfBook: book, fileInfo };
                                                }));
                                    })
                                );
                        }
                        return observableOf({ pdfBook: book, fileInfo });
                    } else if (fileInfo.ext === '.pdf') {
                        observableFrom(fs.readFile(filePath))
                            .pipe(
                                mergeMap((file) => {
                                    return observableFrom(pdfParser(file))
                                        .pipe(
                                            map((pdfData: any) => ({ pdfBook: (new ScrapePDFFile(pdfData, fileInfo, publishers)).scrapePDFFile(), fileInfo }))
                                        );
                                })
                            );
                    }
                    return observableOf({ pdfBook: null, fileInfo });
                })
            )
            .subscribe(({ pdfBook, fileInfo }) => {
                this.unblock();
                if (!pdfBook) {
                    Logger.error('Unsupported extension:', fileInfo.ext);
                    return;
                }
                if (pdfBook) {
                    const filePath = `${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`;

                    const book = Books.findOne({ 'fileInfo.name': pdfBook.fileInfo.name });
                    if (book) {
                        const bookId = book._id;
                        if (!book.fileInfo._id) {
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
                            Books.update({ _id: bookId }, { $set: { fileInfo: pdfBook.fileInfo } });
                            Logger.debug(`Updated file info for ${pdfBook.title} & ${bookId}`, pdfBook.fileInfo);
                        } else if (pdfBook.fileInfo.root !== book.fileInfo.root ||
                            pdfBook.fileInfo.dir !== book.fileInfo.dir) {
                            // TODO: Update FilesUpload remove old file add new
                            book.fileInfo.root = pdfBook.fileInfo.root;
                            book.fileInfo.dir = pdfBook.fileInfo.dir;
                            Books.update({ _id: bookId }, { $set: pdfBook });
                            Books.update({ _id: bookId }, { $set: { fileInfo: pdfBook.fileInfo } });
                            Logger.debug(`Updated file info for ${pdfBook.title} & ${bookId}`, pdfBook.fileInfo);
                        } else if (pdfBook.outline && !book.outline) {
                            Books.update({ _id: bookId }, { $set: { outline: pdfBook.outline } });
                        }
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
                        Books.update({ _id: bookId }, { $set: { fileInfo: pdfBook.fileInfo } });
                        Logger.info(pdfBook.title, bookId, pdfBook.fileInfo, pdfBook.fileInfo._id);
                    }

                }
            });
    }
});

