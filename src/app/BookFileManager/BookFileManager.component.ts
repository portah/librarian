import { Component, OnInit } from '@angular/core';
import { FileSelectEventArgs } from '@syncfusion/ej2-filemanager';

import { environment } from '../../environments/environment';

@Component({
  selector: 'bs-book-file-manager',
  templateUrl: './BookFileManager.component.html',
  styleUrls: ['./BookFileManager.component.scss']
})
export class BookFileManagerComponent implements OnInit {

  public hostUrl = `${environment.meteor.ROOT_URL}/filemanager`;

  public ajaxSettings: object = {
    url: this.hostUrl + ''
  };

  public viewSettings = {
    columns: [
      { field: 'name', headerText: 'Name', minWidth: 120, width: 'auto' },
      {
        field: '_fm_modified',
        format: { type: 'date', format: 'MMMM dd, yyyy HH:mm' },
        headerText: 'Date Modified', minWidth: 120, width: 220
      },
      { field: 'size', headerText: 'Size', minWidth: 120, width: 220, template: '<span class="e-fe-size">${size}</span>' }
    ]
  };
  public view: string = 'Details';
  // { field: 'fmmodified', headerText: 'DateModified', minWidth: 120, width: 220, template: '${ dateModified }' },

  constructor() { }

  onFileSelect(args: FileSelectEventArgs) {
    console.log(args.fileDetails.name + " has been " + args.action + "ed");
    console.log(args);
  }
  ngOnInit() {
  }

}
