import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BookStorageLayoutComponent } from './BookStorageLayout/BookStorageLayout.component';
import { BookViewComponent } from './BookView/BookView.component';
import { BookFileManagerComponent } from './BookFileManager/BookFileManager.component';

import { BookShelfComponent } from './BookShelf/BookShelf.component';
import { BookShelfViewComponent } from './BookShelf/BookShelfView/BookShelfView.component';

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
    }

];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
