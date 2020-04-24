/**
 * Pagination module provides class to work with collections
 *
 * pagination = new SDPagination()
 * get pagination$(): Observable<any[]> {
 *    return this.pagination.paginationCache$();
 * }
 *
 */

import { Router, NavigationExtras, ActivatedRoute } from '@angular/router';

import { Location, LocationStrategy } from '@angular/common';

import {
    from as observableFrom,
    of as observableOf,
    Subject,
    Subscriber,
    Observable,
    zip,
    merge,
    combineLatest
} from 'rxjs';

import { debounceTime, mergeMap, switchMap, concatMap, shareReplay, takeUntil, take, filter } from 'rxjs/operators';

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Tracker } from 'meteor/tracker';

import { MeteorObservable } from './meteor.observable';
import { Tracking } from './tracking';
import { helpers } from './helpers';

import { environment } from '../environments/environment';

export interface DRPageRouterParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string | number;
    search?: string;
    fields?: any;
    searchFields?: any;
    permSearch?: any;
}

export class SDPagination extends Tracking {

    // private _filtering: any = {};
    // private _count = 0;

    _page: number = 1;
    _sortBy: string = '';
    _sortOrder: any;
    _searchFields: any[] = [];
    _permSearch: any = {};
    _search: string = '';


    private reactivePaginationObservable: Observable<any>;
    private reactivePaginationSubs = {};

    private pageParamsChanged$ = new Subject();

    private subscriptionsStore = {};
    private collectionName: string;

    private paginationParams;
    private routeParams;

    set pageParams(v: DRPageRouterParams) {
        this.parsePaginationParams(v);
        this.pageParamsChanged$.next();
        this.reroute();
    }

    private defaultPageSize = 20;
    private pageSizeVar: number = this.defaultPageSize;

    public get pageSize() {
        return this.pageSizeVar;
    }

    public set pageSize(v: number) {
        if (this.pageSizeVar !== v) {
            this.pageSizeVar = v;
        }
    }

    public setPageSize(pageSize: number) {
        this.pageSizeVar = pageSize;
        this.reroute();
    }

    set pageIndex(v) {
        this._page = v;
        this.pageParamsChanged$.next();
        this.reroute();
    }

    set sortBy(v) {
        this._sortBy = v;
        this.pageParamsChanged$.next();
        this.reroute();
    }

    // public setSearchFieldsFrom(columns: ITdDataTableColumn[]) {
    //     this._searchFields = this.getFilterColumns(columns);
    // }
    search(searchTerm: string): Observable<any> {
        this._page = 1;
        this._search = searchTerm;
        // this._currentSearch = {};
        // this._searchFields.forEach( f => {
        //     this._currentSearch[f] = searchTerm;
        // });
        return this.reroute();
    }

    permSearch(searchField: string, searchTerm?: string | number, skipInit?: boolean): void {
        if (!searchField) { return; }
        if (searchTerm) {
            this._permSearch[searchField] = searchTerm;
        } else {
            delete this._permSearch[searchField];
        }
        if (!skipInit) {
            this._page = 1;
            this.reroute();
        }
    }

    page(pagingEvent: any): void {
        this._page = pagingEvent.page;
        this.pageSizeVar = pagingEvent.pageSize;
        this.pageParamsChanged$.next();
        this.reroute();
    }


    public setSearchFields(fields: any[]) {
        this._searchFields = fields;
        this.reroute();
    }


    /**
     *
     *
     *
     *
     *  CONSTRUCTOR
     *
     *
     *
     */
    constructor(
        private subscriptionName: string,
        collectionNameParam: any | Mongo.Collection<any>,
        public router: Router,
        public route: ActivatedRoute,
        public location: Location,
        public locationStrategy: LocationStrategy,
        public routePath: any,
        pageInitParams: any,
        public directParams?: any
    ) {
        super();
        if (helpers.isObject(collectionNameParam)) {
            this.collectionName = collectionNameParam._name;
        } else {
            this.collectionName = collectionNameParam as string;
        }
        this.parsePaginationParams(pageInitParams);
    }

    /**
     *
     * @returns {boolean}
     */
    private parsePaginationParams(paginationParams: DRPageRouterParams) {
        console.log(paginationParams);
        const { page, pageSize, sortBy, sortOrder, search, fields, searchFields, permSearch } = paginationParams;

        let paramsNotEmpty = false;
        if (page && pageSize) {
            paramsNotEmpty = true;
            this._page = +page;
            this.pageSizeVar = +pageSize;
        }

        if (sortBy && sortOrder) {
            paramsNotEmpty = true;
            this._sortBy = sortBy;
            this._sortOrder = sortOrder;
        }

        if (search) {
            paramsNotEmpty = true;
            this._search = search;
        }
        if (fields) {
            paramsNotEmpty = true;
            this._searchFields = JSON.parse(fields);
        }
        if (searchFields) {
            paramsNotEmpty = true;
            this._searchFields = searchFields;
        }
        if (permSearch) {
            paramsNotEmpty = true;
            this._permSearch = JSON.parse(permSearch);
        }
        return paramsNotEmpty;
    }


    /**
     * @deprecated
     */
    private getParamsAsString() {
        return `${this._page}-${this.pageSizeVar}-${this._sortBy}-${this._sortOrder}-${this._search}-` + JSON.stringify(this._permSearch) + JSON.stringify(this.directParams);
        // fields: this._searchFields,
        // permSearch: this._permSearch
    }

    public getParams(): DRPageRouterParams {
        if (this._sortOrder === 'DESC') {
            this._sortOrder = -1;
        }

        if (this._sortOrder === 'ASC') {
            this._sortOrder = 1;
        }

        return {
            page: this._page,
            pageSize: this.pageSizeVar,
            sortBy: this._sortBy,
            sortOrder: this._sortOrder,
            search: this._search || '',
            fields: JSON.stringify(this._searchFields),
            permSearch: JSON.stringify(this._permSearch)
        };
    }

    public mongoParams(): any {

        let page = 1;
        /* we have just one page on the client !!!*/

        const p: any = { selector: {}, options: { limit: this.pageSizeVar, skip: (page - 1) * this.pageSizeVar } };

        if (this._sortBy !== '') {
            const sort: any = {};
            sort[this._sortBy] = this._sortOrder;
            p.options = { sort, ...p.options };
        }

        // let _filtering = {$or: []};
        // this._searchFields.forEach( sf => {
        //     let newFilteringItem = {};
        //     newFilteringItem[sf] = {
        //         $regex: this._search,
        //         $options: 'i'
        //     };
        //     _filtering['$or'].push(newFilteringItem);
        // });
        //
        // if(this._searchFields && this._searchFields.length>0 && this._search != '') {
        //     _p.selector = _filtering;
        // }

        return p;
    }

    set matPagination({ previousPageIndex, pageIndex, pageSize, length }) {
        console.log(pageIndex, pageSize);
        this.page({ page: pageIndex + 1, pageSize });
    }


    private get routerParamsChanged$() {
        return combineLatest([this.route.paramMap, this.route.queryParamMap])
            .pipe(
                switchMap(([routeParams, queryParams]) => {
                    this.paginationParams = (queryParams as any).params;
                    this.routeParams = (routeParams as any).params;
                    console.log('RouteParams changed', routeParams, queryParams);
                    this.parsePaginationParams(this.paginationParams);
                    return observableOf([routeParams, queryParams]);
                })
            );
    }

    /**
     *
     */
    pagination$(): Observable<any> {

        const suppress: any = { _suppressSameNameError: true };
        const collection = new Mongo.Collection(this.collectionName, suppress);
        const collectionCount = new Mongo.Collection(`${this.collectionName}PaginationCount`, suppress);


        return merge(this.pageParamsChanged$, this.routerParamsChanged$).pipe(
            switchMap((v) => {
                let p: any = this.getParams();
                if (this.directParams && helpers.isObject(this.directParams)) {
                    p = { ...p, directParams: this.directParams };
                }
                return MeteorObservable
                    .subscribeAutorun(this.subscriptionName, p, (subscription, tracker) => {
                        const mongoParams = this.mongoParams();

                        const subscriptionId = subscription.subscriptionId;
                        mongoParams.selector[`sub_${subscriptionId}`] = 1;
                        mongoParams.countSelector = { _id: `sub_${subscriptionId}` };

                        let count: any = collectionCount.findOne(mongoParams.countSelector);
                        count = count ? count.count : 0;

                        return {
                            data: collection.find(mongoParams.selector, mongoParams.options).fetch(), // _params.options
                            count
                        };
                    });
            })
        );
    }

    /**
     *
     */
    paginationCache$(cacheN = 4): Observable<any> {
        const subscriptionsSubject = new Subject();
        let subscriptionId: any;
        return merge(this.pageParamsChanged$, this.routerParamsChanged$)
            .pipe(
                concatMap((v) => {
                    return Observable.create((observer: Subscriber<any>) => {
                        subscriptionsSubject.next();
                        const params = this.directParams && helpers.isObject(this.directParams) ?
                            { ...this.getParams(), directParams: this.directParams } : this.getParams();
                        const subscription: any = Meteor.subscribe(this.subscriptionName, params,
                            () => {
                                observer.next(subscription);
                                observer.complete();
                            });
                        subscriptionId = subscription.subscriptionId;
                    });
                }),

                mergeMap((subscription: any) => {

                    return Observable.create((observer: Subscriber<Meteor.Error | any>) => {

                        let autoHandler: any = null;
                        const suppress: any = { _suppressSameNameError: true };
                        const collection = new Mongo.Collection(this.collectionName, suppress);
                        const collectionCount = new Mongo.Collection(`${this.collectionName}PaginationCount`, suppress);

                        Tracker.autorun((computation: Tracker.Computation) => {
                            autoHandler = computation;

                            if (subscriptionId === subscription.subscriptionId) {
                                const { selector, options } = this.mongoParams();

                                selector[`sub_${subscriptionId}`] = 1;

                                let count: any = collectionCount.findOne({ _id: `sub_${subscriptionId}` });
                                count = count ? count.count : 0;

                                const data = collection.find(selector, { ...options, fields: { [`sub_${subscriptionId}`]: 0 } }).fetch();
                                observer.next({ data, count });
                            }
                        });

                        return () => {
                            subscription.stop();
                            if (autoHandler) {
                                autoHandler.stop();
                            }
                            autoHandler = null;
                        };
                    }).pipe(
                        takeUntil(subscriptionsSubject
                            .pipe(
                                take(cacheN),
                                filter((_, idx) => idx === cacheN - 1)
                            )
                        )
                    );
                })
            );
    }



    /**
     * @deprecated
     */
    paginationOld$(): Observable<any> {

        const suppress: any = { _suppressSameNameError: true };
        const collection = new Mongo.Collection(this.collectionName, suppress);
        const collectionCount = new Mongo.Collection(`${this.collectionName}PaginationCount`, suppress);

        if (!this.subscriptionsStore[this.getParamsAsString()]) {

            let p: any = this.getParams();
            if (this.directParams && helpers.isObject(this.directParams)) {
                p = { ...p, directParams: this.directParams };
            }
            return MeteorObservable
                .subscribeAutorun(this.subscriptionName, p,
                    (subscription, tracker) => {
                        const mongoParams = this.mongoParams();

                        const subscriptionId = subscription.subscriptionId;
                        mongoParams.selector[`sub_${subscriptionId}`] = 1;
                        mongoParams.countSelector = { _id: `sub_${subscriptionId}` };

                        let count: any = collectionCount.findOne(mongoParams.countSelector);
                        count = count ? count.count : 0;

                        tracker.drPaginationKey = this.getParamsAsString();
                        this.subscriptionsStore[tracker.drPaginationKey] = mongoParams;

                        tracker.onStop((c) => {
                            if (c.drPaginationKey) {
                                delete this.subscriptionsStore[c.drPaginationKey];
                                delete c.drPaginationKey;
                            }
                        });

                        return {
                            data: collection.find(mongoParams.selector, mongoParams.options).fetch(), // _params.options
                            count
                        };
                    });
        } else {
            const { countSelector, options, selector, etc } = this.subscriptionsStore[this.getParamsAsString()];
            let count: any = collectionCount.findOne(countSelector);
            count = count ? count.count : 0;

            return observableOf({
                data: collection.find(selector, options).fetch(), // _params.options
                count
            });
        }
    }

    /**
     *
     */
    paginationCacheOld$(): Observable<any> {

        const key = this.getParamsAsString();
        if (!this.reactivePaginationSubs[key]) {
            if (this.directParams && helpers.isObject(this.directParams)) {
                this.reactivePaginationSubs[key] = Meteor.subscribe(this.subscriptionName, { ...this.getParams(), directParams: this.directParams });
            } else {
                this.reactivePaginationSubs[key] = Meteor.subscribe(this.subscriptionName, this.getParams());
            }
        }

        if (this.reactivePaginationObservable) {
            return this.reactivePaginationObservable;
        }

        this.reactivePaginationObservable = Observable.create((observer: Subscriber<Meteor.Error | any>) => {

            let autoHandler: any = null;
            const suppress: any = { _suppressSameNameError: true };
            const collection = new Mongo.Collection(this.collectionName, suppress);
            const collectionCount = new Mongo.Collection(`${this.collectionName}PaginationCount`, suppress);

            Tracker.autorun((computation: Tracker.Computation) => {
                autoHandler = computation;

                const { selector, options } = this.mongoParams();

                const subscriptionId = this.reactivePaginationSubs[this.getParamsAsString()].subscriptionId;
                selector[`sub_${subscriptionId}`] = 1;

                let count: any = collectionCount.findOne({ _id: `sub_${subscriptionId}` });
                count = count ? count.count : 0;

                let data;
                // TODO: find a good place for update user profiles
                // if (this.collectionName === 'users') {
                //     data = collection.find(selector, options).map((u: any) => {
                //         if (u.profile['picture'] && !u.profile['picture'].startsWith('https://')) {
                //             u.profile['picture'] = environment.meteor.ROOT_URL + u.profile['picture'];
                //         }
                //         return u;
                //     });
                // } else {
                // data = collection.find(selector, options).fetch();
                // }
                data = collection.find(selector, options).fetch();
                observer.next({ data, count });
            });

            return () => {
                if (autoHandler) {
                    autoHandler.stop();
                }
                autoHandler = null;

                Object.keys(this.reactivePaginationSubs).forEach(k => {
                    this.reactivePaginationSubs[k].stop();
                });

                this.reactivePaginationSubs = {};
                this.reactivePaginationObservable = null;
            };
        });
        return this.reactivePaginationObservable;
    }


    // private getFilterColumns(columns: ITdDataTableColumn[]): any[] {
    //     return columns
    //         .filter((c: ITdDataTableColumn) => {
    //             return (c.filter !== false && c.hidden !== true);
    //         }).map((c: ITdDataTableColumn) => {
    //             return c.name;
    //         });
    // }

    // change(ev: IPageChangeEvent) {
    //     this._pageSize = ev.pageSize;
    //     this._page = ev.page;
    //     this.reroute();
    // }

    // sort(sortEvent: ITdDataTableSortChangeEvent): void {
    //     this._sortBy = sortEvent.name;
    //     this._sortOrder = sortEvent.order;

    //     this.reroute();
    //     // this._tableEvents.next(this.getRouteParams());
    // }

    private reroute(init: boolean = false): Observable<any> {
        if (init) {
            return this.routerParamsInit();
        }

        this.location.replaceState(
            this.router.createUrlTree(
                [this.locationStrategy.path().split('?')[0]], // Get uri
                { queryParams:  this.getParams()} // Pass all parameters inside queryParamsObj
            ).toString()
        );
    }

    routerParamsInit() {
        return observableFrom(this.router.navigate(!!this.routePath ? [this.routePath] : [], { queryParams: this.getParams(), replaceUrl: true } as NavigationExtras));
        // return this.reroute(true);
    }

}

