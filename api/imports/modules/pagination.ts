import { Match, check } from 'meteor/check';
import { Mongo } from 'meteor/mongo';
import { helpers } from './helpers';

import { Logger } from './logger';

export function paginationCheck(params: any) {
    check(params, Match.ObjectIncluding({
        page: Match.Optional(Number),
        pageSize: Match.Optional(Number),
        sortBy: Match.Optional(String),
        sortOrder: Match.Optional(Match.OneOf(String, Number)),
        search: Match.Optional(String),
        fields: Match.Optional([String])
    }));
    // sorting: Match.Optional([Match.Any])
    // check(params.filtering, Match.Optional({}));
}


export function paginationParams(params: any, serverParams?: any) {

    if (params && params.fields) {
        check(params.fields, String);
        params.fields = JSON.parse(params.fields);
    }
    let pSearch = false;
    if (params && params.permSearch) {
        check(params.permSearch, String);
        params.permSearch = JSON.parse(params.permSearch);

        Object.keys(params.permSearch).forEach(k => {
            pSearch = true;
            check(k, String);
            check(params.permSearch[k], Match.OneOf(String, Number));
        });
    } else {
        params['permSearch'] = {};
    }

    paginationCheck(params);

    params = { page: 1, pageSize: 1000, ...params };

    params.pageSize = parseInt(params.pageSize, 10);
    params.page = parseInt(params.page, 10);

    if (parseInt(params.pageSize, 10) > 1000) { params.pageSize = 1000; }
    if (parseInt(params.page, 10) < 1) { params.page = 1; }

    let localOptions = {
        limit: params.pageSize,
        skip: (params.page - 1) * params.pageSize
    };

    if (params.sortBy) {
        if (!isNaN(params.sortOrder)) {
            params.sortOrder = params.sortOrder * 1;
        }
        // if(params.sortOrder*1 == 1){
        //     params.sortOrder='asc';
        // } else if(params.sortOrder*1 == -1) {
        //     params.sortOrder='desc';
        // }
        // @ts-ignore
        localOptions = { sort: [[params.sortBy, params.sortOrder]], ...localOptions };
    }

    if (!helpers.isUndefined(params.sorting) && params.sorting[1] !=='') {
        // @ts-ignore
        localOptions = { sort: [params.sorting], ...localOptions };
    }

    if (!helpers.isUndefined(serverParams) && serverParams['options']) {
        localOptions = { ...localOptions, ...serverParams['options'] };
    }

    let _orselector: any = { $or: [] };

    if (params.fields && params.fields.length > 0 && !!params.search) {

        params.fields.forEach((sf: any) => {
            let newFilteringItem: any = {};
            newFilteringItem[sf] = {
                $regex: params.search,
                $options: 'i'
            };
            _orselector['$or'].push(newFilteringItem);
        });
    }

    let _selector = {};
    if (pSearch) {
        let _andselector: any = { $and: [] };
        Object.keys(params.permSearch).forEach(k => {
            let newFilteringItem: any = {};

            if (isNaN(params.permSearch[k])) {
                newFilteringItem[k] = {
                    $regex: params.permSearch[k],
                    $options: 'i'
                };
            } else {
                newFilteringItem[k] = +params.permSearch[k];
            }
            _andselector['$and'].push(newFilteringItem);
        });
        if (_orselector['$or'].length > 0) {
            _andselector['$and'].push(_orselector);
        }
        _selector = _andselector;
    } else {
        if (_orselector['$or'].length > 0) {
            _selector = _orselector;
        }
    }

    if (!helpers.isUndefined(serverParams) && serverParams['selector']) {
        _selector = { ..._selector, ...serverParams['selector'] };
    }

    Logger.debug(_selector);
    return { options: localOptions, selector: _selector };
}


/**
 *
 * @param self - bind now Inside Meteor.Publish pass 'this'
 * @param {Mongo.Collection<any> | any} collection
 * @param params - pagination params
 * @param serverParams - pagination server side params
 * @param {{pagination: boolean}} options
 * @returns {any}
 */
export function paginationPublish(collection: Mongo.Collection<any> | any,
    params: any,
    serverParams?: any,
    options?: { pagination?: boolean, reactive?: boolean, fields?: {} }): any {

    Logger.debug('paginationPublish: ' + collection._name, params, serverParams, options);

    const localPaginationParams = paginationParams(params, serverParams);
    options = options || {};
    const fields = options.fields || {};

    const self: any = this;

    Logger.debug("paginationPublish: " + collection._name, localPaginationParams);


    if (params.page === 1 && helpers.isUndefined(options.reactive)) {
        localPaginationParams['nonReactive'] = true;
        options.reactive = true;
    }

    const collectionNamePagination = collection._name;
    const collectionNamePaginationCount = collection._name + 'PaginationCount';

    if (!options.reactive) {
        Logger.error(`nonReactive: sub_${self._subscriptionId}`);
        collection
            .find(localPaginationParams.selector, localPaginationParams.options, fields)
            .forEach( (u: any) => {
                self.added(collectionNamePagination, u._id, u);
                self.changed(collectionNamePagination, u._id, { [`sub_${self._subscriptionId}`]: 1 });
            });
        self.added(collectionNamePaginationCount, `sub_${self._subscriptionId}`, { count: collection.find(localPaginationParams.selector).count() });
    } else {
        Logger.error(`Reactive: sub_${self._subscriptionId}`);
        const handle = collection
            .find(localPaginationParams.selector, localPaginationParams.options, fields)
            .observeChanges({
                added(id: string, fields: any) {
                    self.added(collectionNamePagination, id, fields);
                    self.changed(collectionNamePagination, id, { [`sub_${self._subscriptionId}`]: 1 });
                    const count = collection.find(localPaginationParams.selector).count();
                    self.added(collectionNamePaginationCount, `sub_${self._subscriptionId}`, { count });
                    self.changed(collectionNamePaginationCount, `sub_${self._subscriptionId}`, { count });
                },
                changed(id: string, fields: any) {
                    self.changed(collectionNamePagination, id, fields);
                    self.changed(collectionNamePaginationCount, `sub_${self._subscriptionId}`, { count: collection.find(localPaginationParams.selector).count() });
                },
                removed(id: any) {
                    self.removed(collectionNamePagination, id);
                }
            });

        self.onStop(() => {
            handle.stop();
        });
    }
    self.ready();
}
