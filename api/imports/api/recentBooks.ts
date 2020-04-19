import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { Publisher } from '../modules/publishers';

import { paginationPublish } from '../modules/pagination';
import { Logger } from '../modules/logger';

import { NLPTerm, BookFile, Book, Books } from './books';



// Meteor.startup(() => {
//     Books._ensureIndex({ title: 1, base: 1, name: 1 });
// });

/**
 * exclude invoices from publishing
 * @params params = {{book: number}}
 */
const fields = { invoice: 0 };

Meteor.publish('books/recent', function (params?) {

    params = {
        filtering: {},
        ...params
    };

    Logger.debug('books/recent: ', params);

    // if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'billing'], Roles.GLOBAL_GROUP)) {
    //     params.filtering["userId"] = Meteor.userId();
    // }

    paginationPublish.bind(this, Books, params, {}, { fields: fields })();
    return this.ready();
});


Meteor.methods({
    'mark/book/recent': function (bookData: any) {

        Logger.debug('mark/book/recent', bookData);
        check(bookData, {
            _id: String,
            pageNumber: Number,
            scale: Match.OneOf(Number, String),
            top: Number,
            left: Number,
            rotation: Number,
            pdfOpenParams: String,
            lastAccessTime: Match.Optional(Number)
        });

        let { _id, ...recent } = bookData;

        recent.lastAccessTime = Date.now() / 1000.0;

        Books.update({ _id }, { $set: { recent: recent } });

    }
});
