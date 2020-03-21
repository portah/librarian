import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BookStorageLayoutComponent } from './BookStorageLayout/BookStorageLayout.component';
import { BookShelfViewComponent } from './BookShelfView/BookShelfView.component';
import { BookViewComponent } from './BookView/BookView.component';
import { BookFileManagerComponent } from './BookFileManager/BookFileManager.component';

const routes: Routes = [
    {
        path: '',
        component: BookStorageLayoutComponent,
        children: [{
            path: 'bookshelf', component: BookShelfViewComponent
        },
        {
            path: 'book/:id', component: BookViewComponent
        },
        {
            path: 'filemanager', component: BookFileManagerComponent
        }
    ]
    }

];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
