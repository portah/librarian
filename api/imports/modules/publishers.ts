import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Observable, Subscriber } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import osmosis from 'osmosis';

export interface Publisher {
  _id?: string;
  title: string;
  url: string;
}

export const Publishers = new Mongo.Collection<Publisher>('publishers');

Meteor.startup(() => {
  Publishers._ensureIndex({ title: 1 });
});


/**
 * Parse publishers from wikipedia
 */
export const getPublishers = () => {
  // Make the user agent that of a browser (Google Chrome on Windows)
  osmosis.config('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36');
  // If a request fails don't keep retrying (by default this is 3)
  osmosis.config('tries', 1);
  // Concurrent requests (by default this is 5) make this 2 so we don't hammer the site
  osmosis.config('concurrency', 2);

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
      filter(($: any) => !$.title.startsWith('List')),
      map((item: any) => ({ ...item, url: `https://en.wikipedia.org${item.url}` }))
    );
};
