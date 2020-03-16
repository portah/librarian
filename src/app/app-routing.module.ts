import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BookStorageLayoutComponent } from './BookStorageLayout/BookStorageLayout.component';
import { BookShelfViewComponent } from './BookShelfView/BookShelfView.component';
import { BookViewComponent } from './BookView/BookView.component';

const routes: Routes = [
    {
        path: '',
        component: BookStorageLayoutComponent,
        children: [{
            path: '', component: BookShelfViewComponent
        },
        {
            path: 'book/:id', component: BookViewComponent
        }
    ]
    }

];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
