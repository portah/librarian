/**
 * Pagination module provides class to work with collections
 * @class SDPagination {
 * }
 */

import { Router, NavigationExtras } from '@angular/router';

// import {
//     ITdDataTableSortChangeEvent,
//     IPageChangeEvent,
//     TdDataTableSortingOrder,
//     ITdDataTableColumn
// } from '@covalent/core';

import {
    from as observableFrom,
    of as observableOf,
    Subject,
    Subscriber,
    Observable
} from 'rxjs';

import { debounceTime } from 'rxjs/operators';

// import { distinctUntilChanged } from 'rxjs/operators';

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import { MeteorObservable } from './meteor.observable';
import { Tracking } from './tracking';

import { environment } from '../environments/environment';

export interface DRPageRouterParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string | number;
    search?: string;
    fields?: any;
    permSearch?: any;
}

export class SDPagination extends Tracking {

    // private _tableEvents: Subject<any> = new Subject();
    // public get tableEvents$(): Observable<any> {
    //     return this._tableEvents.asObservable();
    // }


    // private _filtering: any = {};
    // private _count = 0;

    defaultPageSize: number = 20;

    _pageSize: number = this.defaultPageSize;
    get pageSize() {
        return this._pageSize;
    }
    set pageSize(v: number) {
        if (this._pageSize !== v) {
            this._pageSize = v;
        }
        // this.reroute();
    }
    _page: number = 1;
    _sortBy: string = '';
    _sortOrder: any; // TdDataTableSortingOrder | any = TdDataTableSortingOrder.Ascending;
    _searchFields: any[] = [];
    _permSearch: any = {};
    _search: string = "";


    reactivePagination = new ReactiveVar('');
    reactivePaginationObservable: Observable<any>;
    reactivePaginationSubs = {};

    _storeSubscriptions = {};
    public collectionName: string;

    constructor(
        public subscriptionName: string,
        private _collectionName: string | Mongo.Collection<any>,
        public router: Router,
        public routePath: any,
        public directParams?: any
    ) {
        super();
        if ( _.isObject(_collectionName)) {
            this.collectionName = _collectionName['_name'];
        } else {
            this.collectionName = _collectionName as string;
        }
    }

    /**
     *
     * @param {DRPageRouterParams} p
     * @returns {boolean}
     */
    public parseRouteParams(p: DRPageRouterParams) {
        let _get = false;
        if (p['page'] && p['pageSize']) {
            _get = true;
            this._page = +p.page;
            this._pageSize = +p.pageSize;
        }
        if (p['sortBy'] && p['sortOrder']) {
            _get = true;
            this._sortBy = p.sortBy;
            this._sortOrder = p.sortOrder;
        }
        if (p['search']) {
            _get = true;
            this._search = p['search'];
        }
        if (p['fields']) {
            _get = true;
            this._searchFields = JSON.parse(p['fields']);
        }
        if (p['permSearch']) {
            _get = true;
            this._permSearch = JSON.parse(p['permSearch']);
        }
        if (!_get) {
            this.routerParamsInit();
        }
        return _get;
    }


    public getParamsAsString() {
        return `${this._page}-${this._pageSize}-${this._sortBy}-${this._sortOrder}-${this._search}-` + JSON.stringify(this._permSearch) + JSON.stringify(this.directParams);
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
            pageSize: this._pageSize,
            sortBy: this._sortBy,
            sortOrder: this._sortOrder,
            search: this._search || "",
            fields: JSON.stringify(this._searchFields),
            permSearch: JSON.stringify(this._permSearch)
        };
    }

    public mongoParams(): any {

        let _page = 1;

        /* we have just one page on the client !!!*/
        // if(parseInt(_page.page) != 1) _page.page = 1;

        let _p = { selector: {}, options: { limit: this._pageSize, skip: (_page - 1) * this._pageSize } };

        if (this._sortBy !== '') {
            // let sortBy = this._sortBy.toLowerCase();
            let _sort = {};
            _sort[this._sortBy] = this._sortOrder;
            _p['options'] = Object.assign({ sort: _sort },_p['options']);
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

        return _p;
    }

    pagination$(): Observable<any> {

        let suppress: any = { _suppressSameNameError: true };
        let _collection = new Mongo.Collection(this.collectionName, suppress);
        let _collectionCount = new Mongo.Collection(this.collectionName + "PaginationCount", suppress);

        if (!this._storeSubscriptions[this.getParamsAsString()]) {

            let p = this.getParams();
            if (this.directParams && _.isObject(this.directParams)) {
                Object.assign(p, {directParams: this.directParams});
            }
            return MeteorObservable
                .subscribeAutorun(this.subscriptionName, p,
                    (subscription, tracker) => {
                        let _params = this.mongoParams();

                        let subscriptionId = subscription.subscriptionId;
                        _params.selector[`sub_${subscriptionId}`] = 1;
                        _params['countSelector'] = { _id: `sub_${subscriptionId}` };

                        let _count = _collectionCount.findOne(_params['countSelector']);
                        _count = _count ? _count['count'] : 0;

                        this._storeSubscriptions[this.getParamsAsString()] = _params;
                        tracker['drPaginationKey'] = this.getParamsAsString();

                        tracker.onStop((c) => {
                            if (c['drPaginationKey']) {
                                delete this._storeSubscriptions[c['drPaginationKey']];
                                delete c['drPaginationKey'];
                            }
                        });

                        return {
                            data: _collection.find(_params.selector, _params.options).fetch(), // _params.options
                            count: _count
                        };
                    });
        } else {
            let _params = this._storeSubscriptions[this.getParamsAsString()];
            let _count = _collectionCount.findOne(_params['countSelector']);
            _count = _count ? _count['count'] : 0;

            return observableOf({
                data: _collection.find(_params.selector, _params.options).fetch(), // _params.options
                count: _count
            });
        }
    }

    paginationCache$(): Observable<any> {

        let key = this.getParamsAsString();
        if (!this.reactivePaginationSubs[key]) {
            let p = this.getParams();
            if (this.directParams && this.directParams instanceof Object) {
                Object.assign(p, {directParams: this.directParams});
            }
            this.reactivePaginationSubs[key] = Meteor.subscribe(this.subscriptionName, p);
        }

        if (this.reactivePaginationObservable) {
            return this.reactivePaginationObservable;
        }

        this.reactivePaginationObservable = Observable.create((observer: Subscriber<Meteor.Error | any>) => {

            let autoHandler: any = null;
            let suppress: any = { _suppressSameNameError: true };
            let _collection = new Mongo.Collection(this.collectionName, suppress);
            let _collectionCount = new Mongo.Collection(this.collectionName + "PaginationCount", suppress);

            Tracker.autorun((computation: Tracker.Computation) => {
                autoHandler = computation;

                let _params = this.mongoParams();

                let subscriptionId = this.reactivePaginationSubs[this.getParamsAsString()].subscriptionId;
                _params.selector[`sub_${subscriptionId}`] = 1;

                _params['countSelector'] = { _id: `sub_${subscriptionId}` };
                let _count = _collectionCount.findOne(_params['countSelector']);
                _count = _count ? _count['count'] : 0;

                let _data;
                // TODO: find a good place for update user profiles
                if (this.collectionName === 'users') {
                    _data = _collection.find(_params.selector, _params.options).map((u: any) => {
                        if (u.profile['picture'] && !u.profile['picture'].startsWith('https://')) {
                            u.profile['picture'] = environment.meteor.ROOT_URL + u.profile['picture'];
                        }
                        return u;
                    });
                } else {
                    _data = _collection.find(_params.selector, _params.options).fetch();
                }

                observer.next({
                    data: _data,
                    count: _count
                });
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


    // public setSearchFieldsFrom(columns: ITdDataTableColumn[]) {
    //     this._searchFields = this.getFilterColumns(columns);
    // }

    public setPageSize(pageSize: number) {
        this._pageSize = pageSize;
        this.reroute();
    }

    public setSearchFields(fields: any[]) {
        this._searchFields = fields;
        this.reroute();
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

    search(searchTerm: string): Observable<any> {
        this._page = 1;
        this._search = searchTerm;
        // this._currentSearch = {};
        // this._searchFields.forEach( f => {
        //     this._currentSearch[f] = searchTerm;
        // });
        return this.reroute();
        // this._tableEvents.next(this.getRouteParams());
    }

    permSearch(searchField: string, searchTerm?: string | number, skipInit?: boolean ): void {
        if (!searchField) { return; }
        if (searchTerm && searchTerm != "") {
            this._permSearch[searchField] = searchTerm;
        } else {
            delete this._permSearch[searchField];
        }
        if(!skipInit) {
            this._page = 1;
            this.reroute();
        }
    }

    page(pagingEvent: any): void {
        this._page = pagingEvent.page;
        this._pageSize = pagingEvent.pageSize;
        // this._tableEvents.next(this.getRouteParams());
        this.reroute();
    }

    reroute(): Observable<any> {
        let path = !!this.routePath ? [this.routePath] : [];
        return observableFrom(this.router.navigate(path, { queryParams: this.getParams() } as NavigationExtras));
    }

    routerParamsInit() {
        let path = !!this.routePath ? [this.routePath] : [];
        return observableFrom(this.router.navigate(path, { queryParams: this.getParams(), replaceUrl: true } as NavigationExtras));
    }

}

