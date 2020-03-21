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
      FileManagerModule
   ],
   providers: [
      BooksService,
      ReversePipe,
      BreakPointsProvider,
      NavigationPaneService,
      ToolbarService,
      DetailsViewService
   ],
   bootstrap: [
      AppComponent
   ]
})
export class AppModule { }
