import { Injectable } from '@angular/core';
import { Mongo } from 'meteor/mongo';
import { of, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { FilesCollection, FileObj } from 'meteor/ostrio:files';

import { BaseService } from '../lib/base.service';

const Books = new Mongo.Collection<any>('books');

const booksFilesCollection = new Mongo.Collection('raw_data_files', { _suppressSameNameError: true } as any);

const bookFiles = new FilesCollection({
    collection: booksFilesCollection,
});

@Injectable({
    providedIn: 'root'
})
export class BooksService extends BaseService {

    constructor() {
        super();
    }

    booksList$(): Observable<any[]> {
        return this.MeteorSubscribeAutorun('books/list', () => Books.find())
            .pipe(
                mergeMap((d: any) => {
                    return of(d.fetch());
                })
            );
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

}
