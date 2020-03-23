import { Component, OnInit } from '@angular/core';
import { FileSelectEventArgs } from '@syncfusion/ej2-filemanager';
import { UploadingEventArgs } from '@syncfusion/ej2-inputs';
import { getUniqueID } from '@syncfusion/ej2-base';

import { environment } from '../../environments/environment';

@Component({
  selector: 'bs-book-file-manager',
  templateUrl: './BookFileManager.component.html',
  styleUrls: ['./BookFileManager.component.scss']
})
export class BookFileManagerComponent implements OnInit {

  public hostUrl = `${environment.meteor.ROOT_URL}/filemanager/operations`;

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

  public onFileSelect(args: FileSelectEventArgs) {
    // @ts-ignore
    console.log(`${args.fileDetails.name} has been ${args.action} ed`);
    console.log(args);
  }

  public onTestEvents(args) {
    console.log('onTestEvents', args, args.ajaxSettings);
    if(args.ajaxSettings.data) {
      const data = JSON.parse(args.ajaxSettings.data);
      if (Array.isArray(data)) {

      } else {
        data.token = 'Token!';
        args.ajaxSettings.data = JSON.stringify(data);
      }
    }
    // if (args.action === '') []

  }

  public onUploadBegin(args: UploadingEventArgs) {
    console.log(args);
    // check whether the file is uploading from paste.
    if (args.fileData.fileSource === 'paste') {
      const newName: string = getUniqueID(args.fileData.name.substring(0, args.fileData.name.lastIndexOf('.'))) + '.png';
      console.log(newName);
      // args.customFormData = [{ fileName: newName }];
    }
  }

  ngOnInit() {
  }

}
