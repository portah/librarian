import { Component, OnInit, NgZone } from '@angular/core';
import { MediaObserver } from '@angular/flex-layout';

@Component({
    selector: 'bs-layout',
    templateUrl: './BookStorageLayout.component.html',
    styleUrls: ['./BookStorageLayout.component.css']
})
export class BookStorageLayoutComponent implements OnInit {

    title = 'Book Storage';
    collapsed = true;


    constructor(
        private zone: NgZone,
        public mediaObserver: MediaObserver) {
            mediaObserver.asObservable().subscribe( (d) => console.log(d));
    }

    ngOnInit() {
    }

}
