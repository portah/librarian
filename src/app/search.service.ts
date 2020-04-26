import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  private searchStringBS = new BehaviorSubject<string>('');
  get searchStringChanged$() {
    return this.searchStringBS;
  }

  private searchString: string;
  set searchTerm(v: string) {
    this.searchString = v;
    this.searchStringBS.next(v);
  }
  get searchTerm() {
    return this.searchString;
  }

  constructor() { }

}
