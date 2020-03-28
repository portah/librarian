import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BREAKPOINTS, DEFAULT_BREAKPOINTS, FlexLayoutModule } from '@angular/flex-layout';

import { ClarityModule } from '@clr/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgPipesModule, ReversePipe } from 'ngx-pipes';

import {
   FileManagerModule,
   NavigationPaneService,
   ToolbarService,
   DetailsViewService
} from '@syncfusion/ej2-angular-filemanager';

// import { ButtonModule, CheckBoxModule } from '@syncfusion/ej2-angular-buttons';

// import { ToolbarModule } from '@syncfusion/ej2-angular-navigations';

// import { DialogModule } from '@syncfusion/ej2-angular-popups';

// import { PdfViewerModule } from '@syncfusion/ej2-angular-pdfviewer';

// import {
//    PdfViewerComponent, LinkAnnotationService, BookmarkViewService, MagnificationService, ThumbnailViewService,
//    NavigationService, TextSearchService, TextSelectionService, PrintService, AnnotationService, FormFieldsService
// } from '@syncfusion/ej2-angular-pdfviewer';

import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

// import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { BooksService } from './books.service';

import { BookStorageLayoutComponent } from './BookStorageLayout/BookStorageLayout.component';
import { BookShelfViewComponent } from './BookShelfView/BookShelfView.component';
import { BookViewComponent } from './BookView/BookView.component';
import { BookFileManagerComponent } from './BookFileManager/BookFileManager.component';

export const BreakPointsProvider = {
   provide: BREAKPOINTS,
   useValue: DEFAULT_BREAKPOINTS,
   multi: true
};

@NgModule({
   declarations: [
      AppComponent,
      BookStorageLayoutComponent,
      BookShelfViewComponent,
      BookViewComponent,
      BookFileManagerComponent
   ],
   imports: [
      BrowserModule,
      AppRoutingModule,
      ClarityModule,
      BrowserAnimationsModule,
      FlexLayoutModule,
      NgPipesModule,
      FileManagerModule,
      NgxExtendedPdfViewerModule,
      // HttpClientModule,
      // PdfViewerModule,
      // PdfViewerComponent,
      // DialogModule,
      // ToolbarModule,
      // ButtonModule,
      // CheckBoxModule
    ],
   providers: [
      BooksService,
      ReversePipe,
      BreakPointsProvider,
      NavigationPaneService,
      ToolbarService,
      DetailsViewService,
      // LinkAnnotationService,
      // BookmarkViewService,
      // MagnificationService,
      // ThumbnailViewService,
      // NavigationService,
      // TextSearchService,
      // TextSelectionService,
      // PrintService,
      // AnnotationService,
      // FormFieldsService
   ],
   bootstrap: [
      AppComponent
   ]
})
export class AppModule { }
