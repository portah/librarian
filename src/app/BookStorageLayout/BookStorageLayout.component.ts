import { Component, OnInit, NgZone } from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';

import { SearchService } from '../search.service';

@Component({
    selector: 'bs-layout',
    templateUrl: './BookStorageLayout.component.html',
    styleUrls: ['./BookStorageLayout.component.scss']
})
export class BookStorageLayoutComponent implements OnInit {

    title = 'Librarian';
    collapsed = true;


    constructor(
        private zone: NgZone,
        public mediaObserver: MediaObserver,
        public searchService: SearchService) {
        mediaObserver.media$.subscribe((d) => {
            console.log('xxxxxx------------xxxxxxx-------',d);
        });
    }

    ngOnInit() {
    }

}
