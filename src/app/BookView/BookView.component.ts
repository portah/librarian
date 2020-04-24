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
import { switchMap, map, mergeMap, debounceTime, first, takeWhile, skipUntil } from 'rxjs/operators';
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
                switchMap(() => {
                    this.PDFViewerApplication = (window as any).PDFViewerApplication;
                    return fromEvent(this.PDFViewerApplication.eventBus, 'updateviewarea');
                })
            );
        const skipUntil$ = new Subject();

        this.tracked = viewReady$
            .pipe(
                skipUntil(skipUntil$),
                debounceTime(500)
            )
            .subscribe(this.pdfViewer$);

        viewReady$
            .pipe(
                debounceTime(80),
                takeWhile((v: any) => {
                    if (!this.recentLocation ||
                        (v.location && v.location.pageNumber === this.recentLocation.pageNumber
                            && v.location.scale === this.recentLocation.scale)) {
                        skipUntil$.next();
                        return false;
                    }
                    return true;
                }),
            )
            .subscribe((v) => {
                console.log(v);

                this.PDFViewerApplication.initialBookmark = this.recentLocation.pdfOpenParams.substring(1);
                // TODO: remove in the future, put into next call
                this.ngxPDFViewerComponent.rotation = this.recentLocation.rotation;

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

    // public hostUrl = `${environment.meteor.ROOT_URL}/books`;

    public fileUrl: string;
    public bookId;
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


        // Get route params find the book and show PDFviewer
        combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
            switchMap(([params, query]) => {
                this.bookId = params.get('id');
                console.log(params, query);

                return this.booksService.book$(this.bookId)
                .pipe(
                    map((book: any) => ({ params, query, book}))
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
     *  Events
     */
    ngAfterViewInit(): void {
        // this.zone.run(() => {
        // });
    }

    ngOnInit() {
        // this.zone.run(() => {
        // });
    }
    ngOnDestroy() {
        super.ngOnDestroy();

    }

    bookStatLocation(queryParams) {
        this.location.replaceState(
            this.router.createUrlTree(
                [this.locationStrategy.path().split('?')[0]], // Get uri
                { queryParams } // Pass all parameters inside queryParamsObj
            ).toString()
        );
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

    fullscreen() {
        if (screenFull.isEnabled) {
            screenFull.request(this.elRef.nativeElement);
        }
    }
}
