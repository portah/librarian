/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { BookFileManagerComponent } from './BookFileManager.component';

describe('BookFileManagerComponent', () => {
  let component: BookFileManagerComponent;
  let fixture: ComponentFixture<BookFileManagerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BookFileManagerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BookFileManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
