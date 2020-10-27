import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

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

    epub?: any;
    pdf?: any;

    url: string;

    nlpTags?: string[];
    nlpTerms?: NLPTerm[];

    publisher?: Publisher;
    fileInfo: {
        root: string;
        dir: string;
        name: string;
        searchName: string,
        pdf?: BookFile;
        epub?: BookFile;
    };
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


export const Books = new Mongo.Collection<Book>('books');

Meteor.startup(() => {
    Books._ensureIndex({ title: 1, base: 1, name: 1, 'fileInfo.mtimeMs': 1 });
    Books._ensureIndex({ 'fileInfo.name': 1 }, { collation: { locale: 'en', strength: 1 } } );
    Books._ensureIndex({ 'fileInfo.searchName': 1 });
});


Books.deny({
    insert: () => true,
    update: () => true,
    remove: () => true
});

/**
 * exclude nlpTerms from publishing
 * @params params = {{book: number}}
 */
const fields = { nlpTerms: 0 };

Meteor.publish('books/list', function (params?) {
    Logger.debug('books/list: ', params);

    let serverParams: any = {};

    if (!params.sortBy) {
        serverParams = { options: { sort: { title: 1 } } };
    }
    if (params.directParams) {
        check(params, Match.ObjectIncluding({
            directParams: { recent: { $exists: Match.OneOf(Boolean, Number) } }
        }));
        serverParams = { ...serverParams, selector: params.directParams };
    }
    params = {
        filtering: {},
        ...params
    };

    // if (!Roles.userIsInRole(Meteor.userId(), ['admin', 'billing'], Roles.GLOBAL_GROUP)) {
    //     params.filtering["userId"] = Meteor.userId();
    // }

    paginationPublish.bind(this, Books, params, serverParams, { fields })();
    return this.ready();
});


Meteor.publish('book/id', function (id) {

    check(id, String);
    Logger.debug('book/id: ', id);

    return Books.find({ _id: id });
});


