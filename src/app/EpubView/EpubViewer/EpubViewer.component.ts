import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    OnDestroy,
    Output,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
    EpubChapter,
    EpubError,
    EpubLocation,
    EpubMetadata,
    EpubPage,
    EpubSearchResult
} from './EpubViewer.models';

declare const ePub: any;

/**
 * AngularEpubViewer component
 */
@Component({
    selector: 'angular-epub-viewer',
    template: ``,
    encapsulation: ViewEncapsulation.None
})
export class AngularEpubViewerComponent implements AfterViewInit, OnDestroy {

    /**
     * Primary object
     */
    epub: any = null;

    /**
     * Current location of document's rendered part
     */
    currentLocation: EpubLocation = {
        startCfi: null,
        endCfi: null,
        page: null,
        chapter: null
    };

    /**
     * Indicates whenever document is ready
     */
    documentReady: boolean = false;

    /**
     * Indicates whenever chapter is displayed
     */
    isChapterDisplayed: boolean = false;

    /**
     * Indicates whenever pagination is computing
     */
    computingPagination: boolean = false;

    /**
     * Indicates whenever searching text
     */
    searchingText: boolean = false;

    /**
     * Root container's padding in px, em, etc.
     */
    @Input()
    src: string = null;
    /**
     * Root container's padding in px, em, etc.
     */
    @Input()
    padding: string = null;
    /**
     * Enables auto calculate of pagination after document is ready or viewport has been changed
     */
    @Input()
    autoPagination: boolean = false;
    /**
     * Enables auto loading of metadata after document is ready
     */
    @Input()
    autoMetadata: boolean = false;
    /**
     * Enables auto loading of table of contents after document is ready
     */
    @Input()
    autoTOC: boolean = false;

    /**
     * Get event when document is loaded
     */
    @Output('onDocumentReady')
    onDocumentReady: EventEmitter<void> = new EventEmitter<void>();
    /**
     * Get event when chapter is unloaded
     */
    @Output('onChapterUnloaded')
    onChapterUnloaded: EventEmitter<void> = new EventEmitter<void>();
    /**
     * Get event when chapter is displayed
     */
    @Output('onChapterDisplayed')
    onChapterDisplayed: EventEmitter<EpubChapter> = new EventEmitter<EpubChapter>();
    /**
     * Get event about the current location
     */
    @Output('onLocationFound')
    onLocationFound: EventEmitter<EpubLocation> = new EventEmitter<EpubLocation>();
    /**
     * Get event about search results
     */
    @Output('onSearchFinished')
    onSearchFinished: EventEmitter<EpubSearchResult[]> = new EventEmitter<EpubSearchResult[]>();
    /**
     * Get event about pagination
     */
    @Output('onPaginationComputed')
    onPaginationComputed: EventEmitter<EpubPage[]> = new EventEmitter<EpubPage[]>();
    /**
     * Get event about metadata
     */
    @Output('onMetadataLoaded')
    onMetadataLoaded: EventEmitter<EpubMetadata> = new EventEmitter<EpubMetadata>();
    /**
     * Get event about table of contents
     */
    @Output('onTOCLoaded')
    onTOCLoaded: EventEmitter<EpubChapter[]> = new EventEmitter<EpubChapter[]>();
    /**
     * Get event when any error occurred
     */
    @Output('onErrorOccurred')
    onErrorOccurred: EventEmitter<EpubError> = new EventEmitter<EpubError>();

    /**
     * Starts loading document by link only after DOM is ready
     */
    private _link: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    private linkSubscription: Subscription;

    private needSearchText: string = null;

    private needComputePagination: boolean = false;
    private rendition: any;
    constructor(private zone: NgZone, private elementRef: ElementRef) { }

    ngAfterViewInit() {
        if (!this.src) {
            this.linkSubscription = this._link.asObservable().pipe(
                filter(link => link != null)
            )
                .subscribe(link => {
                    this.initEpub(link);
                });
        } else {
            this.initEpub(this.src);
        }
    }

    private initEpub(file: any) {
        // this.destroyEpub();

        this.epub = ePub(file);
        this.rendition = this.epub.renderTo(this.elementRef.nativeElement,
            {
                manager: "continuous",
                flow: "scrolled",
                width: "100%",
                height: "100%"
            }
        );
        this.rendition.display();
        // rendition.next();

        this.rendition.on("rendered", function (section) {
            console.log("rendered", section);
            var nextSection = section.next();
            var prevSection = section.prev();
            // rendition.next();

            // var current = this.epub.navigation && this.epub.navigation.get(section.href);

            // if (current) {
            //     document.title = current.label;
            // }
        });

        this.rendition.on("relocated", function (location) {
            // console.log("locationChanged", location)
            console.log("locationChanged start", location.start.cfi)
            // console.log("locationChanged end", location.end.cfi)
        });
        // { method: 'continuous', width: '100%', height: '100%' }
        // let displayed = rendition.display();
        // this.epub.nextPage();

        this.epub.ready.then(() => {
            console.log('Book ready?');
            this.zone.run(() => {
                this.documentReady = true;
                this.onDocumentReady.next(null);
                if (this.autoPagination) {
                    this.needComputePagination = true;
                }
                if (this.autoMetadata) {
                    this.loadMetadata();
                }
                if (this.autoTOC) {
                    this.loadTOC();
                }
            });
        });
        // this.epub.on('book:pageChanged', (location) => {
        //     this.zone.run(() => {
        //         if (!this.computingPagination) {
        //             this.currentLocation.page = location.anchorPage;
        //             this.onLocationFound.next(this.currentLocation);
        //         }
        //     });
        // });
        // this.epub.on('renderer:chapterUnloaded', () => {
        //     this.zone.run(() => {
        //         this.isChapterDisplayed = false;
        //         this.onChapterUnloaded.next(null);
        //     });
        // });
        // this.epub.on('renderer:chapterDisplayed', (chapter: EpubChapter) => {
        //     this.zone.run(() => {
        //         this.isChapterDisplayed = true;
        //         // no label attribute here
        //         chapter['label'] = null;
        //         this.onChapterDisplayed.next(chapter);
        //         this.currentLocation.chapter = chapter;
        //         this.onLocationFound.next(this.currentLocation);
        //         if (this.needComputePagination) {
        //             this.computePagination();
        //         }
        //     });
        // });
        // this.epub.on('renderer:resized', () => {
        //     this.zone.run(() => {
        //         this.needComputePagination = true;
        //         if (this.autoPagination) {
        //             this.computePagination();
        //         }
        //     });
        // });
        // this.epub.on('renderer:visibleRangeChanged', range => {
        //     this.zone.run(() => {
        //         // renderer:locationChanged is a part of this event
        //         this.currentLocation.startCfi = range.start;
        //         this.currentLocation.endCfi = range.end;
        //         this.onLocationFound.next(this.currentLocation);
        //     });
        // });
    }

    /**
     * Opens EPUB document by link
     * @param link
     */
    openLink(link: string) {
        this._link.next(link);
    }

    /**
     * Opens EPUB document file
     * @param file
     */
    openFile(file: File) {
        if (window['FileReader']) {
            this.zone.runOutsideAngular(() => {
                const reader: FileReader = new FileReader();
                reader.onload = () => {
                    this.zone.run(() => {
                        this.initEpub({
                            bookPath: reader.result
                        });
                    });
                };
                reader.onerror = () => {
                    this.zone.run(() => {
                        this.onErrorOccurred.emit(EpubError.READ_FILE);
                    });
                };
                reader.readAsArrayBuffer(file);
            });
        } else {
            this.onErrorOccurred.emit(EpubError.OPEN_FILE);
        }
    }

    /**
     * Navigates to the specified url or EPUB CFI or page
     * @param location
     */
    goTo(location: string | number) {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        if (typeof location === "number") {
            // page
            this.epub.displayChapter(location);
        } else if (/.*\.x?html#?.*$/.test(location)) {
            // url
            this.rendition.display(location);
            // this.epub.goto(location);
        } else {
            // EPUB CFI
            this.epub.displayChapter(location);
        }
    }

    /**
     * Navigates to the next page
     */
    nextPage() {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        this.epub.nextPage();
    }

    /**
     * Navigates to the previous page
     */
    previousPage() {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        this.epub.prevPage();
    }

    /**
     * Searches all text matches *in the current chapter*
     * @param text
     */
    searchText(text: string) {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        if (!this.isChapterDisplayed) {
            this.onErrorOccurred.emit(EpubError.NOT_DISPLAYED_CHAPTER);
            return;
        }
        if (!text || text.trim().length <= 0) {
            this.onErrorOccurred.emit(EpubError.SEARCH);
            return;
        }
        if (this.searchingText) {
            this.needSearchText = text;
            return;
        }
        this.searchingText = true;
        this.needSearchText = null;
        this.zone.runOutsideAngular(() => {
            const results: EpubSearchResult[] = this.epub.currentChapter.find(text.trim());
            this.zone.run(() => {
                this.searchingText = false;
                if (this.needSearchText) {
                    this.searchText(this.needSearchText);
                } else {
                    this.onSearchFinished.next(results);
                }
            });
        });
    }

    /**
     * Adds style to be attached to the document's body element
     * @param style
     * @param value
     */
    setStyle(style: string, value: string) {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        this.epub.setStyle(style, value);
    }

    /**
     * Removes a style from the rendered document
     * @param style
     */
    resetStyle(style: string) {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        this.epub.removeStyle(style);
    }

    /**
     * Calculates pagination as output event
     */
    computePagination() {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        if (!this.isChapterDisplayed) {
            this.onErrorOccurred.emit(EpubError.NOT_DISPLAYED_CHAPTER);
            return;
        }
        if (this.computingPagination) {
            return;
        }
        this.computingPagination = true;
        this.needComputePagination = false;
        this.zone.runOutsideAngular(() => {
            this.epub.generatePagination()
                .then((pages: EpubPage[]) => {
                    const currentPage = this.epub.pagination.pageFromCfi(this.epub.getCurrentLocationCfi());
                    this.zone.run(() => {
                        this.computingPagination = false;
                        if (this.needComputePagination) {
                            this.computePagination();
                        } else {
                            this.onPaginationComputed.next(pages);
                            this.currentLocation.page = currentPage;
                            this.onLocationFound.next(this.currentLocation);
                        }
                    });
                })
                .catch(() => {
                    this.zone.run(() => {
                        this.computingPagination = false;
                        this.onErrorOccurred.emit(EpubError.COMPUTE_PAGINATION);
                    });
                });
        });
    }

    /**
     * Loads metadata as output event
     */
    loadMetadata() {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        this.zone.runOutsideAngular(() => {
            this.epub.getMetadata()
                .then((metadata: EpubMetadata) => {
                    this.zone.run(() => {
                        this.onMetadataLoaded.next(metadata);
                    });
                })
                .catch(() => {
                    this.zone.run(() => {
                        this.onErrorOccurred.emit(EpubError.LOAD_METADATA);
                    });
                });
        });
    }

    /**
     * Loads table of contents as output event
     */
    loadTOC() {
        if (!this.documentReady) {
            this.onErrorOccurred.emit(EpubError.NOT_LOADED_DOCUMENT);
            return;
        }
        this.epub.loaded.navigation.then((toc) => {
            this.zone.runOutsideAngular(() => {
                // this.epub.getToc()
                // .then((chapters: EpubChapter[]) => {
                this.zone.run(() => {
                    this.onTOCLoaded.next(toc);
                });
                // })
                // .catch(() => {
                // this.zone.run(() => {
                // this.onErrorOccurred.emit(EpubError.LOAD_TOC);
                // });
                // });
            });

        })
    }

    private destroyEpub() {
        this.documentReady = false;
        this.isChapterDisplayed = false;
        this.searchingText = false;
        this.needSearchText = null;
        this.computingPagination = false;
        this.needComputePagination = false;
        this.currentLocation = {
            startCfi: null,
            endCfi: null,
            page: null,
            chapter: null
        };
        if (this.epub) {
            this.epub.destroy();
            this.epub = null;
        }
    }

    ngOnDestroy() {
        if (this.linkSubscription) { this.linkSubscription.unsubscribe(); }
        this.destroyEpub();
    }
}
