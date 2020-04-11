import {
    Component,
    OnInit,
    ViewEncapsulation,
    NgZone,
    ViewChild,
    ElementRef,
    AfterViewInit
} from '@angular/core';

import { ActivatedRoute, ParamMap } from '@angular/router';
import * as screenFull from 'screenfull';
import { pipe } from 'rxjs';
import { switchMap, map, mergeMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { BooksService } from '../books.service';

@Component({
    selector: 'app-BookView',
    templateUrl: './BookView.component.html',
    styleUrls: ['./BookView.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: []
})
export class BookViewComponent implements OnInit, AfterViewInit {

    @ViewChild('pdfViewer', { static: false }) public pdfViewer;

    public hostUrl = `${environment.meteor.ROOT_URL}/books`;

    // public service: string = this.hostUrl;
    public document: string; // = 'PDF_Succinctly.pdf';
    public _id;
    books;
    showPdfViewer = false;

    constructor(
        public booksService: BooksService,
        private zone: NgZone,
        private route: ActivatedRoute,
        private elRef: ElementRef) {

        // this.booksService.booksList$().subscribe((d: any[]) => {
        //         this.books = d;
        // });

        this.route.paramMap.pipe(
            switchMap((params: ParamMap) => {
                this._id = params.get('id');
                return this.booksService.booksList$()
                    .pipe(
                        map((books) => ({ params, book: books.find(b => b._id === params.get('id')) })),
                    );
            }),
            mergeMap(({ params, book }: any) => {
                console.log(book);
                return this.booksService.file$(book.fileInfo._id)
                .pipe(
                    map((file) => ({ params, book, file } )),
                );
            })
        ).subscribe(({ params, book, file }: any) => {
            console.log(file, file.link());

            this.zone.run(() => {
                this.document = file.link(); // `${this.hostUrl}/${this._id}`;
            });
        });


    }

    ngAfterViewInit(): void {
        this.zone.run(() => {
            this.pdfViewer.primaryMenuVisible = false;
            console.log(this.pdfViewer);
        });
    }

    ngOnInit() {
        this.zone.run(() => {
            this.showPdfViewer = true;
        });
    }

    bookmarkAdd(event) {
        console.log(new URL(event).hash);
    }
    zoomChanged(event) {
        console.log(event);
    }

    fullscreen() {
        if (screenFull.isEnabled) {
            screenFull.request(this.elRef.nativeElement);
        }
    }
}
