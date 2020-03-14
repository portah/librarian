/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { BooksService } from './books.service';

describe('Service: Books', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BooksService]
    });
  });

  it('should ...', inject([BooksService], (service: BooksService) => {
    expect(service).toBeTruthy();
  }));
});
