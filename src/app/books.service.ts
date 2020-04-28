import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LocationStrategy, Location } from '@angular/common';

import { of, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { FilesCollection, FileObj } from 'meteor/ostrio:files';
import { Mongo } from 'meteor/mongo';

import { BaseService } from '../lib/base.service';

import { SDPagination } from '../lib/pagination';

const Books = new Mongo.Collection<any>('books');

const booksFilesCollection = new Mongo.Collection('raw_data_files', { _suppressSameNameError: true } as any);

const bookFiles = new FilesCollection({
    collection: booksFilesCollection,
});

@Injectable({
    providedIn: 'root'
})
export class BooksService extends BaseService {

    public pagination: SDPagination;
    constructor(private router: Router, private route: ActivatedRoute, private location: Location, public locationStrategy: LocationStrategy) {
        super();
        console.log('constructor?');
        this.pagination = new SDPagination('books/list', Books, this.router, this.route, this.location, this.locationStrategy,
            'bookshelf', {
            sortBy: 'title',
            sortOrder: 1,
            page: 1,
            searchFields: ['title', 'nlpTags', 'authors', 'description'],
            pageSize: 40
        });
        // this.pagination.permSearch('recent.pdfOpenParams', 'page', true);
    }

    get pagination$(): Observable<any[]> {
        return this.pagination.paginationCache$();
    }

    paginationSearch(search): Observable<any> {
        return this.pagination.search(search);
    }

    booksList$(): Observable<any[]> {
        return this.MeteorSubscribeAutorun('books/list', () => Books.find())
            .pipe(
                mergeMap((d: any) => {
                    return of(d.fetch());
                })
            );
    }

    book$(id): Observable<any> {
        return this.MeteorSubscribeAutorun('book/id', id, () => Books.findOne({ _id: id }));
    }

    /**
     * subscribe to satellite resources
     */
    files$(): Observable<any> {
        return this.MeteorSubscribeAutorun('raw_data_files', () => bookFiles.find())
            .pipe(
                mergeMap((d: any) => {
                    return of(d.fetch());
                })
            );
    }

    /**
     * subscribe to satellite resources
     */
    file$(_id: string): Observable<any> {
        return this.MeteorSubscribeAutorun('raw_data_files', () => bookFiles.findOne({ _id }));
        // .pipe(
        //     mergeMap((d: any) => {
        //         return of(d.fetch());
        //     })
        // );
    }

    /**
     * Recent book
     */
    setRecentBook(location) {
        this.promiseCall('mark/book/recent', location).catch(console.log);
    }

    /**
     * Recent book
     */
    setBookmark(location) {
        this.promiseCall('mark/bookmark', location).catch(console.log);
    }


}
