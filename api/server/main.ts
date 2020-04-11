import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { of as observableOf, Observable, Subscriber, from as observableFrom } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
// import * as jwt from 'jsonwebtoken';
import express from 'express';
import bodyParser from 'body-parser';
import osmosis from 'osmosis';
import cors from 'cors';

import { Logger, Publishers, getPublishers } from '/imports/modules';
import { fileManagerExpress } from '/imports/modules/fileManager';

import '/imports/api';


Meteor.startup(async () => {


    if (Meteor.settings.cors) {
        WebApp.rawConnectHandlers.use((req: any, res: any, next: any) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
            return next();
        });
    }

    if (Meteor.settings.cors_package) {
        WebApp.rawConnectHandlers.use(cors());
    }


    const baseFolders: any[] = Meteor.settings.walkingDirs || [];


    // Make the user agent that of a browser (Google Chrome on Windows)
    osmosis.config('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36');
    // If a request fails don't keep retrying (by default this is 3)
    osmosis.config('tries', 1);
    // Concurrent requests (by default this is 5) make this 2 so we don't hammer the site
    osmosis.config('concurrency', 2);


    /**
     * Scrape letmeread by isbn, maybe adopt for amazon too
     * @param isbn - isbn 10 string
     */
    const getLetMeRead = (isbn: string) => {
        return Observable.create(Meteor.bindEnvironment((observer: Subscriber<any>) => {
            const url = `https://www.letmeread.net/search/${isbn}/`;

            osmosis
                .get(url)
                .find('.card-body')
                .set({ title: 'a @title', url: '@href' })
                .find('.card-title > a')
                .follow('@href')
                .set({ image: 'article > div.row[1] img@src' })
                .set({ authors: ['article > div.row[1] > div a[itemprop="author"]'] })
                .set({ details: ['article > div.row[2] > div[1] > div.card[1] > div.card-body li'] })
                .set({ categories: ['article > div.row[2] > div[1] > div.card[2] > div.card-body a'] })
                .set({ tags: ['article > div.row[2] > div[1] > div.card[3] > div.card-body a'] })
                .set({ source_code: ['article > div.row[2] > div[1] > div.card[4] > div.card-body a@href'] })
                .set({ description: ['article > div.row[2] > div[2] > div.card[1] > div.card-body'] })
                .set({
                    data: [
                        osmosis
                            .find('article > div.row[2] .card')
                            .set({ info_title: '.card-header', info_description: 'div.card-body' }),
                    ]
                })
                // @ts-ignore
                .delay(2000)
                .data((item: any) => observer.next(item))
                .error((e: any) => { Logger.error(e); return observer.complete(); })
                .done(() => observer.complete());
        }));
    };


    /**
     *
     *
     *              CODE LOGIC
     *
     *
     */


    getPublishers()
        .pipe(filter((_: any) => !!_.title))
        .subscribe(Meteor.bindEnvironment((item: any) => {
            Publishers.update(
                { title: item.title },
                { $set: item },
                { upsert: true });
        }));

    Meteor.call('walk/folders', baseFolders);

    /**
     * File Manager API
     */
    WebApp.connectHandlers.use('/filemanager', fileManagerExpress());


    // if (isbn) {
    //     //
    //     getLetMeRead(isbn).subscribe((data: any) => {
    //         Logger.debug('Letmeread:', data);
    //     });
    // }


    // const app1 = express();
    // app1.use(bodyParser.urlencoded({ extended: true }));
    // app1.use(bodyParser.json());

    // app1.all('*', debugMiddle, async (req, res, next) => {
    //     await downloadPdf(req, res, contentRootPathGlobal, next);
    // });

    // WebApp.connectHandlers.use('/books', app1);
});
