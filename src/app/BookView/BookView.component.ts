import {
    Component,
    OnInit,
    ViewEncapsulation,
    NgZone,
    ViewChild,
    ElementRef,
    AfterViewInit,
    OnDestroy
} from '@angular/core';

import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { Location, LocationStrategy } from '@angular/common';

import { pipe, Subject, fromEvent, merge, zip, of, combineLatest, from } from 'rxjs';
import { switchMap, map, mergeMap, debounceTime, first, takeWhile, skipUntil, take, shareReplay, filter, reduce } from 'rxjs/operators';
import { NgxExtendedPdfViewerComponent, IPDFViewerApplication, NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';
import { DomSanitizer } from '@angular/platform-browser';
import screenFull from 'screenfull';

import { environment } from '../../environments/environment';
import { BooksService } from '../books.service';
import { BaseComponent } from '../../lib/base.component';

@Component({
    selector: 'app-BookView',
    templateUrl: './BookView.component.html',
    styleUrls: ['./BookView.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: []
})
export class BookViewComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {

    public pdfViewer$ = new Subject();
    public PDFViewerApplication: IPDFViewerApplication | any;
    public ngxPDFViewerComponent;
    public loading = true;
    /**
     *
     */


    public fileUrl: string;
    public bookId;
    public book;
    public showPdfViewer = false;
    public recentLocation;
    public bookmarkLocation;

    /**
     *
     * @param booksService
     * @param zone
     * @param route
     * @param elRef
     */
    constructor(
        public booksService: BooksService,
        private zone: NgZone,
        private route: ActivatedRoute,
        private router: Router,
        private locationStrategy: LocationStrategy,
        private elRef: ElementRef,
        private location: Location,
        public sanitizer: DomSanitizer
    ) {

        super();
    }

    /**
     *  Events
     */
    ngAfterViewInit(): void {
        // Get route params find the book and show PDFviewer
        combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
            switchMap(([params, query]) => {
                this.bookId = params.get('id');
                console.log(params, query);

                return this.booksService.book$(this.bookId)
                    .pipe(
                        map((book: any) => ({ params, query, book })),
                        take(1)
                    );
            }),
            filter(({ params, book, query }: any) => !!book),
            mergeMap(({ params, book, query }: any) => {
                console.log(book);
                if (book.recent && !this.recentLocation) {
                    this.recentLocation = book.recent;
                }
                const {epub, pdf, ...fileInfo} = book.fileInfo;

                if (epub && pdf) {
                    return this.booksService.file$(pdf._id)
                        .pipe(
                            map((file) => ({ params, book, file })),
                        );
                } else if(epub){
                    return this.booksService.file$(epub._id)
                        .pipe(
                            map((file) => ({ params, book, file })),
                        );
                } else {
                    return this.booksService.file$(pdf._id)
                        .pipe(
                            map((file) => ({ params, book, file })),
                        );
                }
            })
        ).subscribe(({ params, book, file }: any) => {
            console.log(file, file.link());

            this.zone.run(() => {
                this.book = book;
                this.fileUrl = file.link();
                this.showPdfViewer = true;
            });
        });

        this.pdfViewer$.subscribe((v: any) => {
            if (v && v.location) {
                console.log(v);
                this.bookmarkLocation = v.location;
                this.bookStatLocation(v.location);
                this.booksService.setRecentBook({ _id: this.bookId, ...v.location });
            }
        });
    }

    /**
     *
     */
    ngOnInit() {
    }

    /**
     *
     */
    ngOnDestroy() {
        super.cleanup();

    }

    /**
     *
     * @param queryParams
     */
    bookStatLocation(queryParams) {
        this.location.replaceState(
            this.router.createUrlTree(
                [this.locationStrategy.path().split('?')[0]], // Get uri
                { queryParams } // Pass all parameters inside queryParamsObj
            ).toString()
        );
    }
    /**
     * Buttons
     */
    sideBarOpened() {
        const SidebarView = {
            UNKNOWN: -1,
            NONE: 0,
            THUMBS: 1,
            OUTLINE: 2,
            ATTACHMENTS: 3,
            LAYERS: 4
        };

        console.log(this.PDFViewerApplication.pdfSidebar);
        // this.PDFViewerApplication.pdfSidebar.toggle();
        if (this.PDFViewerApplication.pdfSidebar.isOpen) {
            return;
        }

        this.PDFViewerApplication.pdfSidebar.isOpen = true;

        if (this.PDFViewerApplication.pdfSidebar.active === SidebarView.THUMBS) {
            this.PDFViewerApplication.pdfSidebar._updateThumbnailViewer();
        }

        this.PDFViewerApplication.pdfSidebar._forceRendering();

        this.PDFViewerApplication.pdfSidebar._dispatchEvent();

        this.PDFViewerApplication.pdfSidebar._hideUINotification(this.PDFViewerApplication.pdfSidebar.active);

    }

    sideBarClosed() {
        console.log(this.PDFViewerApplication.pdfSidebar);
        if (!this.PDFViewerApplication.pdfSidebar.isOpen) {
            return;
        }
        this.PDFViewerApplication.pdfSidebar.isOpen = false;

        this.PDFViewerApplication.pdfSidebar._forceRendering();

        this.PDFViewerApplication.pdfSidebar._dispatchEvent();
    }

    /**
     *
     * @param event
     */
    bookmarkAdd(event) {
        console.log(this.bookmarkLocation);
        this.booksService.setBookmark({ _id: this.bookId, ...this.bookmarkLocation });
        // console.log(new URL(event).hash);
    }

    zoomChanged(event) {
        console.log(event);
    }

    /**
     *  NOT IN iOS  TODO:
     */
    fullscreen() {
        console.log(screenFull.isEnabled);
        if (screenFull.isEnabled) {
            screenFull.request(this.elRef.nativeElement);
        }
    }
}
