import { Component, OnInit, NgZone } from '@angular/core';

import { Tracking } from '../../lib/tracking';

import { BooksService } from '../books.service';


@Component({
    selector: 'bs-book-shelf-view',
    templateUrl: './BookShelfView.component.html',
    styleUrls: ['./BookShelfView.component.css']
})
export class BookShelfViewComponent extends Tracking implements OnInit {

    books: any[] = [];

    constructor(
        public bookService: BooksService,
        private zone: NgZone
    ) {
        super();
    }

    ngOnInit() {
        this.bookService.booksList$().subscribe((d: any[]) => {
            this.zone.run(() => {
                this.books = d;
            });
        });
    }

}
