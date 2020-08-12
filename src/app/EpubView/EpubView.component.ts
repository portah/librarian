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
import { switchMap, map, mergeMap, debounceTime, first, takeWhile, skipUntil, take, shareReplay, filter } from 'rxjs/operators';

import { AngularEpubViewerComponent } from './EpubViewer/EpubViewer.component';
import screenFull from 'screenfull';

import { environment } from '../../environments/environment';
import { BooksService } from '../books.service';
import { BaseComponent } from '../../lib/base.component';

@Component({
    selector: 'app-pdf-view',
    templateUrl: './EpubView.component.html',
    styleUrls: ['./EpubView.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: []
})
export class EpubViewComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {

    public pdfViewer$ = new Subject();

    public angularEpubViewerComponent: AngularEpubViewerComponent;
    public loading = true;
    /**
     *
     */
    @ViewChild('epubViewer')
    public set epubViewer(epub) {
        if (!epub) {
            return;
        }
        this.angularEpubViewerComponent = epub;
    }


    public fileUrl: string;
    public bookId;
    public bookData;
    public showPdfViewer = false;
    public recentLocation;
    public bookmarkLocation;

    public toc;

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
            filter(({ params, book, query }: any) => !!book),
            mergeMap(({ params, book, query }: any) => {
                console.log(book);
                // if (book.recent && !this.recentLocation) {
                //     this.recentLocation = book.recent;
                //     this.bookStatLocation(book.recent);
                // }
                const fileId = book.fileInfo.epub?._id;
                if (!fileId) {
                    return of(({ params, book, file: null }));
                } else {
                    return this.booksService.file$(fileId)
                        .pipe(
                            map((file) => ({ params, book, file })),
                        );
                }
            })
        ).subscribe(({ params, book, file }: any) => {
            console.log(file, file.link());

            this.zone.run(() => {
                this.bookData = book;
                this.fileUrl = file.link();
                // this.angularEpubViewerComponent
                this.angularEpubViewerComponent.openLink(this.fileUrl);
            });
        });

        this.angularEpubViewerComponent.onTOCLoaded.subscribe(
            (toc) => {
                console.log(toc, toc.toc);
                this.toc = toc.toc;
            }
        );
        // this.pdfViewer$.subscribe((v: any) => {
        //     if (v && v.location) {
        //         console.log(v);
        //         this.bookmarkLocation = v.location;
        //         this.bookStatLocation(v.location);
        //         this.booksService.setRecentBook({ _id: this.bookId, ...v.location });
        //     }
        // });
    }
    getChildren = (item) => item.subitems;
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
        // this.location.replaceState(
        //     this.router.createUrlTree(
        //         [this.locationStrategy.path().split('?')[0]], // Get uri
        //         { queryParams } // Pass all parameters inside queryParamsObj
        //     ).toString()
        // );
    }
    /**
     * Buttons
     */
    sideBarOpened() {


    }

    sideBarClosed() {
    }

    /**
     *
     * @param event
     */
    bookmarkAdd(event) {
        // console.log(this.bookmarkLocation);
        // this.booksService.setBookmark({ _id: this.bookId, ...this.bookmarkLocation });
        // // console.log(new URL(event).hash);
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
