import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BookStorageLayoutComponent } from './BookStorageLayout/BookStorageLayout.component';
import { BookViewComponent } from './BookView/BookView.component';
import { PdfViewComponent } from './PdfView/PdfView.component';
import { EpubViewComponent } from './EpubView/EpubView.component';

import { BookFileManagerComponent } from './BookFileManager/BookFileManager.component';

import { BookShelfComponent } from './BookShelf/BookShelf.component';
import { BookShelfViewComponent } from './BookShelf/BookShelfView/BookShelfView.component';

import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';
// import { CustomReuseStrategy, Routing } from './shared/routing';

export class CustomReuseStrategy implements RouteReuseStrategy {
    routesToCache: string[] = ["bookshelf"];
    storedRouteHandles = new Map<string, DetachedRouteHandle>();

    // Decides if the route should be stored
    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.log(route.routeConfig.path);
       return this.routesToCache.indexOf(route.routeConfig.path) > -1;
    }

    //Store the information for the route we're destructing
    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
       this.storedRouteHandles.set(route.routeConfig.path, handle);
    }

   //Return true if we have a stored route object for the next route
    shouldAttach(route: ActivatedRouteSnapshot): boolean {
       return this.storedRouteHandles.has(route.routeConfig.path);
    }

    //If we returned true in shouldAttach(), now return the actual route data for restoration
    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
       return this.storedRouteHandles.get(route.routeConfig.path);
    }

    //Reuse the route if we're going to and from the same route
    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
       return future.routeConfig === curr.routeConfig;
    }
   }

const routes: Routes = [
    {
        path: '',
        component: BookStorageLayoutComponent,
        children: [
            {
                path: 'bookshelf',
                component: BookShelfComponent,
                children: [
                    {
                        path: ':list', component: BookShelfViewComponent
                    },
                    { path: '', redirectTo: 'all', pathMatch: 'full' }
                ]
            },
            {
                path: 'book/:id', component: BookViewComponent
            },

            {
                path: 'filemanager', component: BookFileManagerComponent
            },
            { path: '', redirectTo: 'bookshelf', pathMatch: 'full' }
        ]
    },
    {
        path: 'pdfbook/:id', component: PdfViewComponent
    },
    {
        path: 'epubbook/:id', component: EpubViewComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    providers: [
        { provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
    ],
    exports: [RouterModule]
})
export class AppRoutingModule { }
