import { Component, OnInit, ViewEncapsulation, NgZone } from '@angular/core';
import {
    PdfViewerComponent, LinkAnnotationService, BookmarkViewService, MagnificationService, ThumbnailViewService,
    NavigationService, TextSearchService, TextSelectionService, PrintService, AnnotationService, FormFieldsService
} from '@syncfusion/ej2-angular-pdfviewer';

import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';

declare const WebViewer: any;

import { ActivatedRoute, ParamMap } from '@angular/router';

import { pipe } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { BooksService } from '../books.service';

import { environment } from '../../environments/environment';

@Component({
    selector: 'app-BookView',
    templateUrl: './BookView.component.html',
    styleUrls: ['./BookView.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        LinkAnnotationService,
        BookmarkViewService,
        MagnificationService,
        ThumbnailViewService,
        NavigationService,
        TextSearchService,
        TextSelectionService,
        PrintService,
        AnnotationService,
        FormFieldsService
    ]
})
export class BookViewComponent implements OnInit, AfterViewInit {

    public hostUrl = `${environment.meteor.ROOT_URL}/pdfviewer`;

    // public service: string = this.hostUrl;
    public document: string; // = 'PDF_Succinctly.pdf';
    public _id;
    books;
    constructor(
        public booksService: BooksService,
        private zone: NgZone,
        private route: ActivatedRoute) {

        // this.booksService.booksList$().subscribe((d: any[]) => {
        //         this.books = d;
        // });

        this.route.paramMap.pipe(
            switchMap((params: ParamMap) => {
                this._id = params.get('id');
                return this.booksService.booksList$()
                    .pipe(map((books) => ({ params, books })));
            }
            )).subscribe(({ params, books }: any) => {
                const book = books.find(b => b._id === params.get('id'));
                console.log(book);

                this.zone.run(() => {
                    this.document = `${book.fileInfo.dir}/${book.fileInfo.base}`;
                });

            });
    }

    @ViewChild('viewer', { static: false }) viewer: ElementRef;
    wvInstance: any;

    ngAfterViewInit(): void {

        WebViewer({
            path: '../../pdflib',
            initialDoc: `${this.hostUrl}/${this._id}`,
        }, this.viewer.nativeElement).then(instance => {
            this.wvInstance = instance;

            // now you can access APIs through this.webviewer.getInstance()
            instance.openElement('notesPanel');
            // see https://www.pdftron.com/documentation/web/guides/ui/apis for the full list of APIs

            // or listen to events from the viewer element
            this.viewer.nativeElement.addEventListener('pageChanged', (e) => {
                const [pageNumber] = e.detail;
                console.log(`Current page is ${pageNumber}`);
            });

            // or from the docViewer instance
            instance.docViewer.on('annotationsLoaded', () => {
                console.log('annotations loaded');
            });

            instance.docViewer.on('documentLoaded', this.wvDocumentLoadedHandler)
        })
    }

    ngOnInit() {
        this.wvDocumentLoadedHandler = this.wvDocumentLoadedHandler.bind(this);
    }

    wvDocumentLoadedHandler(): void {
        // you can access docViewer object for low-level APIs
        const docViewer = this.wvInstance;
        const annotManager = this.wvInstance.annotManager;
        // and access classes defined in the WebViewer iframe
        const { Annotations } = this.wvInstance;
        // const rectangle = new Annotations.RectangleAnnotation();
        // rectangle.PageNumber = 1;
        // rectangle.X = 100;
        // rectangle.Y = 100;
        // rectangle.Width = 250;
        // rectangle.Height = 800;
        // rectangle.StrokeThickness = 5;
        // rectangle.Author = annotManager.getCurrentUser();
        // annotManager.addAnnotation(rectangle);
        // annotManager.drawAnnotations(rectangle.PageNumber);
        // see https://www.pdftron.com/api/web/WebViewer.html for the full list of low-level APIs
    }

}
