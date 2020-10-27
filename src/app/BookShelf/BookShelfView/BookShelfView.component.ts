import { Component, OnInit, NgZone } from '@angular/core';
import { Router, NavigationExtras, ActivatedRoute } from '@angular/router';
import {
    from as observableFrom,
    of as observableOf,
    Subject,
    Subscriber,
    Observable,
    zip,
    combineLatest
} from 'rxjs';

import { Tracking } from '../../../lib/tracking';

import { BooksService } from '../../books.service';
import { mergeMap, switchMap, debounceTime } from 'rxjs/operators';
import { SearchService } from '../../search.service';


@Component({
    selector: 'bs-book-shelf-view',
    templateUrl: './BookShelfView.component.html',
    styleUrls: ['./BookShelfView.component.scss']
})
export class BookShelfViewComponent extends Tracking implements OnInit {

    books: any[] = [];
    public booksSelectedMap = new Map();
    count = 0;

    constructor(
        public booksService: BooksService,
        private zone: NgZone,
        private router: Router,
        private route: ActivatedRoute,
        private searchService: SearchService
    ) {
        super();
        console.log('Constructor??');
        let justStarted = true;
        this.tracked = combineLatest([this.route.paramMap, this.route.queryParamMap])
            .pipe(
                switchMap(([params, query]) => {
                    console.log(params, query);
                    this.booksService.pagination.directParams = undefined;
                    if (params.get('list') === 'recent') {
                        this.booksService.pagination.directParams = { recent: { $exists: 1 } };
                    } else if (params.get('list') === 'new') {
                        this.booksService.pagination._sortBy = 'fileInfo.mtimeMs';
                        this.booksService.pagination._sortOrder = -1;
                    } else {
                        this.booksService.pagination._sortBy = 'title';
                        this.booksService.pagination._sortOrder = 1;
                    }
                    if (justStarted) {
                        justStarted = false;
                        if (query.get('search')) {
                            this.searchService.searchTerm = query.get('search');
                        }
                    } else {
                        this.booksService.pagination.pageIndex = 1;
                    }
                    return this.booksService.pagination$;
                })
            )
            .subscribe((d: any) => {
                console.log(d);
                this.zone.run(() => {
                    this.books = d.data;
                    this.count = d.count;
                });
            });

        this.tracked = this.searchService.searchStringChanged$
            .pipe(debounceTime(1000))
            .subscribe((v) => {
                console.log('search for:', v);
                this.booksService.pagination.search(v); // = v;
            });
        // this.booksService.pagination.permSearch('recent.pdfOpenParams', 'page', true);
    }

    ngOnInit() {
    }

    booksSelected(event, book) {
        console.log(event, book, this.booksSelectedMap);
    }

    bookSelect(event, book) {
        event.stopPropagation();
    }
}
