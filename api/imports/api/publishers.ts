import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Observable, Subscriber } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';

import * as osmosis from 'osmosis';

export interface Publisher {
  _id?: string;
  title: string;
  url: string;
}

export const Publishers = new Mongo.Collection<Publisher>('publishers');

Meteor.startup(() => {
  Publishers._ensureIndex({ 'title': 1 });
});


/**
 * Parse publishers from wikipedia
 */
export const getPublishers = () => {
  return Observable.create(Meteor.bindEnvironment((observer: Subscriber<any>) => {
    const url = 'https://en.wikipedia.org/wiki/List_of_English-language_book_publishing_companies';
    osmosis
      .get(url)
      .find('.mw-parser-output > div > ul > li > a')
      .set({ title: '@title', url: '@href' })
      .data((item: any) => observer.next(item))
      .error((e: any) => observer.error(e))
      .done(() => observer.complete());
  }))
    .pipe(
      filter((_: any) => !_.title.startsWith('List')),
      map((item: any) => ({ ...item, url: `https://en.wikipedia.org${item.url}` }))
    );
};
