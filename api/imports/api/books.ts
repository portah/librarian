import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { Publisher } from '../modules/publishers';

import { paginationPublish } from '../modules/pagination';
import { Logger } from '../modules/logger';

export interface NLPTerm {
    term: string;
    tf?: number;
    idf?: number
    tfidf?: number;
}

export interface BookFile {
    _id?: string;
    root?: string;
    base?: string;
    name: string;
    dir?: string;
    ext: string;
    size: number;
    atimeMs: number;
    ctimeMs: number;
    mtimeMs: number;
    birthtimeMs: number;
    ostrioId?: string;
}

export interface Book {
    _id?: string;
    title?: string;
    numPages?: number;
    authors?: string[];
    description?: string;
    outline?: any;

    isbn?: string;
    isbn10?: string;
    isbn13?: string;

    imageBase64?: string;

    url: string;

    nlpTags?: string[];
    nlpTerms?: NLPTerm[];

    publisher?: Publisher;
    fileInfo: BookFile;
    recent?: {
        page: number;
        zoom: string | number;
        position: {
            a: number,
            b: number
        },
        lastAccessTime: number;
    };
}
}

export const Books = new Mongo.Collection<Book>('books');

Meteor.startup(() => {
    Books._ensureIndex({ title: 1, base: 1, name: 1 });
});


Books.deny({
    insert: () => true,
    update: () => true,
    remove: () => true
});

/**
 * exclude invoices from publishing
 * @params params = {{book: number}}
 */
const fields = { invoice: 0 };

Meteor.publish('books/list', function (params?) {

    params = {
        filtering: {},
        ...params
    };

    Logger.debug('books/list: ', params);

    // if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'billing'], Roles.GLOBAL_GROUP)) {
    //     params.filtering["userId"] = Meteor.userId();
    // }

    paginationPublish.bind(this, Books, params, { options: {sort: { title: 1 } }}, { fields })();
    return this.ready();
});


