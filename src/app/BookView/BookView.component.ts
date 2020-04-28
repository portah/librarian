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

import { pipe, Subject, fromEvent, merge, zip, of, combineLatest } from 'rxjs';
import { switchMap, map, mergeMap, debounceTime, first, takeWhile, skipUntil, take, shareReplay } from 'rxjs/operators';
import { NgxExtendedPdfViewerComponent, IPDFViewerApplication, NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';

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
    @ViewChild('pdfViewer', { static: false })
    public set pdfViewer(pdf: NgxExtendedPdfViewerComponent) {
        if (!pdf) {
            return;
        }
        this.ngxPDFViewerComponent = pdf;
        this.ngxPDFViewerComponent.primaryMenuVisible = false;

        // TODO: Put into separate function?
        const viewReady$ = this.ngxPDFViewerComponent.pdfLoaded
            .pipe(
                mergeMap(() => {
                    this.PDFViewerApplication = (window as any).PDFViewerApplication;
                    console.log('ngxPDFViewerComponent.pdfLoaded?', this.PDFViewerApplication);
                    return fromEvent(this.PDFViewerApplication.eventBus, 'updateviewarea');
                }),
                shareReplay(1)
            );
        const skipUntil$ = new Subject();

        this.tracked = viewReady$
            .pipe(
                skipUntil(skipUntil$),
                debounceTime(500)
            )
            .subscribe(this.pdfViewer$);

        /**
         *  OUTLINE
         */
        viewReady$
            .pipe(
                mergeMap(() => {
                    return fromEvent(this.PDFViewerApplication.eventBus, 'outlineloaded');
                }),
                take(1)
            ).subscribe(
                (d) => {
                    console.log(d, this.PDFViewerApplication.pdfOutlineViewer.outline);
                    this.PDFViewerApplication.pdfOutlineViewer.toggleOutlineTree();
                }
            );

        /**
         *  ZOOM INTO RECENT and start event loop
         */
        viewReady$
            .pipe(
                debounceTime(80),
                takeWhile((v: any) => {
                    console.log('Recent location!', this.recentLocation, v.location);
                    if (!this.recentLocation ||
                        (v.location && v.location.pageNumber === this.recentLocation.pageNumber
                            && v.location.scale === this.recentLocation.scale)) {
                        this.loading = false;
                        skipUntil$.next();
                        return false;
                    }
                    return true;
                }),
            )
            .subscribe((v) => {
                console.log(v);

                // this.PDFViewerApplication.initialBookmark = this.recentLocation.pdfOpenParams.substring(1);
                // TODO: remove in the future, put into next call
                this.ngxPDFViewerComponent.rotation = this.recentLocation.rotation;
                this.ngxPDFViewerComponent.zoom = this.recentLocation.scale;

                let scale: any;
                if (!isNaN(this.recentLocation.scale)) {
                    scale = +this.recentLocation.scale / 100.0;
                } else {
                    scale = this.recentLocation.scale;
                }
                this.PDFViewerApplication.pdfViewer.scrollPageIntoView({
                    pageNumber: this.recentLocation.pageNumber,
                    destArray: [
                        null,
                        { name: "XYZ" },
                        this.recentLocation.left,
                        this.recentLocation.top,
                        scale
                    ]
                });
            });
    }


    public fileUrl: string;
    public bookId;
    public bookData;
    public showPdfViewer = false;
    public recentLocation;
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
        private location: Location
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
            mergeMap(({ params, book, query }: any) => {
                console.log(book);
                if (book.recent && !this.recentLocation) {
                    this.recentLocation = book.recent;
                    this.bookStatLocation(book.recent);
                }
                return this.booksService.file$(book.fileInfo._id)
                    .pipe(
                        map((file) => ({ params, book, file })),
                    );
            })
        ).subscribe(({ params, book, file }: any) => {
            console.log(file, file.link());

            this.zone.run(() => {
                this.bookData = book;
                this.fileUrl = file.link();
                this.showPdfViewer = true;
            });
        });

        this.pdfViewer$.subscribe((v: any) => {
            if (v && v.location) {
                console.log(v);
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
        super.ngOnDestroy();

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
