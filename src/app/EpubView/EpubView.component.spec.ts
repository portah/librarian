/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EpubViewComponent } from './EpubView.component';

describe('BookViewComponent', () => {
  let component: EpubViewComponent;
  let fixture: ComponentFixture<EpubViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EpubViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EpubViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
