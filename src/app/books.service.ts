import { Injectable } from '@angular/core';
import { Mongo } from 'meteor/mongo';
import { of, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { BaseService } from '../lib/base.service';

const Books = new Mongo.Collection<any>('books');

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
}
