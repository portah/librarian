import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { BREAKPOINTS, DEFAULT_BREAKPOINTS, FlexLayoutModule } from '@angular/flex-layout';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { OverlayModule } from '@angular/cdk/overlay';
import { HttpClientModule } from '@angular/common/http';

import { ClarityModule } from '@clr/angular';

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

import { NgxExtendedPdfViewerModule, NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { BooksService } from './books.service';
import { SearchService } from './search.service';

import { BookStorageLayoutComponent } from './BookStorageLayout/BookStorageLayout.component';
import { BookViewComponent } from './BookView/BookView.component';
import { BookFileManagerComponent } from './BookFileManager/BookFileManager.component';
import { BookShelfComponent } from './BookShelf/BookShelf.component';
import { BookShelfViewComponent } from './BookShelf/BookShelfView/BookShelfView.component';

import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export const MD_MATERIAL_MODULES: Array<any> = [
   MatPaginatorModule,
   MatIconModule,
   FlexLayoutModule,
   MatSidenavModule,
   MatTabsModule,
   MatProgressBarModule,
   OverlayModule
];

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
      BookFileManagerComponent,
      BookShelfComponent
   ],
   imports: [
      BrowserModule,
      BrowserAnimationsModule,
      AppRoutingModule,
      MD_MATERIAL_MODULES,
      ClarityModule,
      NgPipesModule,
      FileManagerModule,
      NgxExtendedPdfViewerModule,
      FormsModule,
      HttpClientModule,
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
      // BreakPointsProvider,
      NavigationPaneService,
      ToolbarService,
      DetailsViewService,
      NgxExtendedPdfViewerService,
      SearchService
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
