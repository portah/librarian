import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';

import { promises as fs } from 'fs';

import { of as observableOf, Observable, from as observableFrom, merge } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { Publishers, Publisher } from '../modules/publishers';
import { BookFile, Books, Book } from '/imports/api/books';

import { Logger, walk, ScrapePDFFile, PDF as pdfParser, ScrapeEpubFile, EPUB as epubParser } from '/imports/modules';
import { FilesUpload } from '/imports/api/ostrioFiles';


const uniqName = true;

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
function checkUpdate(book: any, { authors, description, imageBase64, outline }) {
    if (!book.authors || book.authors.length === 0) {
        Books.update({ _id: book._id }, {
            $set: { authors }
        });
    }
    if (!book.description) {
        Books.update({ _id: book._id }, {
            $set: { description }
        });
    }
    if (!book.imageBase64) {
        Books.update({ _id: book._id }, {
            $set: { imageBase64 }
        });
    }

    if (!book.outline) {
        Books.update({ _id: book._id }, {
            $set: { outline }
        });
    }

}
/**
 *
 */
Meteor.methods({
    'walk/folders': function (baseFolders: any[]) {

        check(baseFolders, [String]);
        this.unblock();
        const publishers: Publisher[] = Publishers.find().fetch();
        observableFrom(baseFolders)
            .pipe(
                mergeMap((baseFolder: string) => observableFrom(walk(baseFolder, baseFolder, Meteor.settings.extensions))),
                mergeMap((list: any[]) => observableFrom(list)),
                mergeMap((fileInfo: BookFile): Observable<{ pdfBook?: any, fileInfo: any, epubBook?: any }> => {
                    this.unblock();
                    const filePath = `${fileInfo.root}/${fileInfo.dir}/${fileInfo.base}`;

                    let book: Book | any;
                    if (uniqName) {
                        book = Books.findOne({
                            'fileInfo.root': fileInfo.root,
                            'fileInfo.name': fileInfo.name
                        });
                    } else {
                        book = Books.findOne({
                            'fileInfo.root': fileInfo.root,
                            'fileInfo.dir': fileInfo.dir,
                            'fileInfo.name': fileInfo.name
                        });
                    }

                    if (fileInfo.ext === '.pdf') {
                        if (book && (book.fileInfo.ext === '.pdf' || book.epub)) {
                            return observableOf({ pdfBook: book, fileInfo });
                        } else {
                            return observableFrom(fs.readFile(filePath))
                                .pipe(
                                    mergeMap((file) => {
                                        return observableFrom(pdfParser(file))
                                            .pipe(
                                                map((pdfData: any) => ({ pdfBook: (new ScrapePDFFile(pdfData, fileInfo, publishers)).scrapePDFFile(), fileInfo }))
                                            );
                                    })
                                );
                        }
                    } else
                        if (fileInfo.ext === '.epub') {
                            if (book && (book.fileInfo.ext === '.epub' || book.pdf)) {
                                return observableOf({ epubBook: book, fileInfo });
                            } else {
                                return (new epubParser(filePath))
                                    .epubParse()
                                    .pipe(
                                        map((epubData: any) => ({ pdfBook: null, epubBook: (new ScrapeEpubFile(epubData, fileInfo, publishers)).scrapeEpubFile(), fileInfo }))
                                    );
                            }
                        }
                    return observableOf({ pdfBook: null, epubBook: null, fileInfo });
                })
            )
            .subscribe(({ pdfBook, fileInfo, epubBook }) => {
                this.unblock();
                if (!pdfBook && !epubBook) {
                    Logger.error('Unsupported extension:', fileInfo.ext);
                    return;
                }

                let book: Book | any;
                if (uniqName) {
                    book = Books.findOne({
                        'fileInfo.root': fileInfo.root,
                        'fileInfo.name': fileInfo.name
                    });
                } else {
                    book = Books.findOne({
                        'fileInfo.root': fileInfo.root,
                        'fileInfo.dir': fileInfo.dir,
                        'fileInfo.name': fileInfo.name
                    });
                }

                if (book) {
                    const { title, authors, isbn, description, publisher, outline, imageBase64, nlpTags, nlpTerms } = epubBook || pdfBook;
                    if (epubBook && book.fileInfo.ext === '.pdf') {

                        // alternatives
                        if (!book.epub) {
                            fileInfo._id = addFile(book._id, fileInfo);
                            Books.update({ _id: book._id }, {
                                $set: {
                                    epub: {
                                        title,
                                        authors,
                                        isbn,
                                        description,
                                        publisher,
                                        fileInfo
                                    }
                                }
                            });
                        }
                    }

                    if (pdfBook && book.fileInfo.ext === '.epub') {
                        if (!book.pdf) {
                            fileInfo._id = addFile(book._id, fileInfo);
                            Books.update({ _id: book._id }, {
                                $set: {
                                    pdf: {
                                        title,
                                        authors,
                                        isbn,
                                        description,
                                        publisher,
                                        fileInfo
                                    }
                                }
                            });
                        }
                    }
                    checkUpdate(book, { description, authors, imageBase64, outline });

                } else {
                    /**
                     *      NO BOOK RECORD in MONGODB
                     */

                    const bookId = Books.insert(pdfBook || epubBook);
                    fileInfo._id = addFile(bookId, fileInfo);
                    Books.update({ _id: bookId }, { $set: { fileInfo } });
                    Logger.info((pdfBook || epubBook).title, bookId, fileInfo, fileInfo._id);

                }
            });
    }
});

