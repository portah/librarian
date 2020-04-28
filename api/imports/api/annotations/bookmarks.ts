import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { promises as fs } from 'fs';

import { of as observableOf, Observable, from as observableFrom } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

// import { Publisher } from '../../modules/publishers';

import { paginationPublish } from '../../modules/pagination';

import { NLPTerm, BookFile, Book, Books } from '../books';

import { Logger, walk, ScrapePDFFile, PDF as pdfParser } from '/imports/modules';

export const Annotations = new Mongo.Collection<any>('annotations');


/**
 * exclude invoices from publishing
 * @params params = {{book: number}}
 */
const fields = { invoice: 0 };

Meteor.publish('bookmarks', function (params?) {

    params = {
        filtering: {},
        ...params
    };

    Logger.debug('books/recent: ', params);

    // if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'billing'], Roles.GLOBAL_GROUP)) {
    //     params.filtering["userId"] = Meteor.userId();
    // }

    paginationPublish.bind(this, Annotations, params, {}, { fields })();
    return this.ready();
});


Meteor.methods({
    'mark/bookmark': function (bookData: any) {

        Logger.debug('mark/bookmark', bookData);
        check(bookData, {
            _id: String,
            pageNumber: Number,
            scale: Match.OneOf(Number, String),
            top: Number,
            left: Number,
            rotation: Number,
            pdfOpenParams: String,
            bookmarkTime: Match.Optional(Number)
        });

        const { _id, ...bookmark } = bookData;

        bookmark.bookId = _id;

        const book = Books.findOne({ _id });
        if (!book) {
            throw new Meteor.Error(404, `Book ${_id} can not be found!`);
        }

        const annot = Annotations.findOne({ bookId: _id, pageNumber: bookmark.pageNumber });
        if (annot) {
            throw new Meteor.Error(202, `Bookmark is already in the database '${annot.bookTitle}' - ${annot.pageNumber}!`);
        }
        const filePath = `${book.fileInfo.root}/${book.fileInfo.dir}/${book.fileInfo.base}`;

        observableFrom(fs.readFile(filePath))
            .pipe(
                mergeMap((file: any) => {
                    return observableFrom(pdfParser(file, { page: bookmark.pageNumber }));
                })
            ).subscribe(
                ({ text, imageBase64 }) => {
                    bookmark.bookmarkTime = Date.now() / 1000.0;
                    bookmark.text = text;
                    bookmark.imageBase64 = imageBase64;
                    bookmark.bookTitle = book.title;
                    bookmark.nlpTags = book.nlpTags;
                    Annotations.insert({ ...bookmark });
                }
            );

    }
});
