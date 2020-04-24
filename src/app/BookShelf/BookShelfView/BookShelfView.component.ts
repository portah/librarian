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
import { mergeMap, switchMap } from 'rxjs/operators';


@Component({
    selector: 'bs-book-shelf-view',
    templateUrl: './BookShelfView.component.html',
    styleUrls: ['./BookShelfView.component.css']
})
export class BookShelfViewComponent extends Tracking implements OnInit {

    books: any[] = [];
    count = 0;

    constructor(
        public booksService: BooksService,
        private zone: NgZone,
        private router: Router,
        private route: ActivatedRoute
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
        // this.booksService.pagination.permSearch('recent.pdfOpenParams', 'page', true);
    }

    ngOnInit() {
    }

}
