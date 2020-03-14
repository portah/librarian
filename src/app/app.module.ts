import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BREAKPOINTS, DEFAULT_BREAKPOINTS, FlexLayoutModule } from '@angular/flex-layout';

import { ClarityModule } from '@clr/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgPipesModule, ReversePipe } from 'ngx-pipes';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BookStorageLayoutComponent } from './BookStorageLayout/BookStorageLayout.component';
import { BooksService } from './books.service';

export const BreakPointsProvider = {
   provide: BREAKPOINTS,
   useValue: DEFAULT_BREAKPOINTS,
   multi: true
};

@NgModule({
   declarations: [
      AppComponent,
      BookStorageLayoutComponent
   ],
   imports: [
      BrowserModule,
      AppRoutingModule,
      ClarityModule,
      BrowserAnimationsModule,
      FlexLayoutModule,
      NgPipesModule
   ],
   providers: [
      BooksService,
      ReversePipe
      // BreakPointsProvider
   ],
   bootstrap: [
      AppComponent
   ]
})
export class AppModule { }
