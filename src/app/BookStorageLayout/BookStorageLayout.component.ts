import { Component, OnInit, NgZone } from '@angular/core';
import { BooksService } from '../books.service';
import { MediaObserver } from '@angular/flex-layout';

@Component({
    selector: 'bs-layout',
    templateUrl: './BookStorageLayout.component.html',
    styleUrls: ['./BookStorageLayout.component.css']
})
export class BookStorageLayoutComponent implements OnInit {

    title = 'Book Storage';
    collapsed = false;

    books: any[] = [];

    constructor(
        public bookService: BooksService,
        private zone: NgZone,
        public mediaObserver: MediaObserver) {
            mediaObserver.asObservable().subscribe( (d) => console.log(d));
    }

    ngOnInit() {
        this.bookService.booksList$().subscribe((d: any[]) => {
            this.zone.run(() => {
                this.books = d;
            });
        });
    }

}
