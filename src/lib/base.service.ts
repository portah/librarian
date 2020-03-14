'use strict';

import { Meteor } from 'meteor/meteor';
import { EJSONable } from 'meteor/ejson';

import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { Observable } from 'rxjs';

import { Tracking } from './tracking';
import { MeteorObservable } from './meteor.observable';

export class BaseService extends Tracking {

    public _submitting = false;

    protected formGroup: FormGroup;

    constructor() {
        super();
    }

    /**
     * Try to use MeteorCall instead
     * @param {string} name
     * @param args
     * @returns {Promise<any>}
     */
    protected promiseCall(name: string, ...args: any[]): Promise<any> {
        return new Promise((resolve, reject) =>
            Meteor.call(name, ...args.concat([
                (error: Meteor.Error, result) => error ? reject(error) : resolve(result)
            ])
            ));
    }

    /**
     *
     */
    public checkSubmit(): boolean {
        this._submitting = true;
        let status = Meteor.status();
        if (!status['connected']) {
            this._submitting = false;
            console.log({ title: 'There is no connection to the server, please repeat the request later.', message: status.reason });
        }
        return this._submitting;
    }

    /**
     *
     * @param form
     * @param value
     * @returns {{}}
     */
    protected makeData(form, value, valid = true) {
        if (!form || !form.dirty) { return {}; }
        const uo = {};

        const ifValid = (f) => valid ? f.valid : true;

        for (const k in value) {
            const f = form.controls[k];
            if (f && f instanceof FormControl && f.dirty && ifValid(f)) {
                uo[k] = value[k];
            }
            if (f && f instanceof FormGroup && f.dirty) {
                uo[k] = this.makeData(f, value[k]);
            }
            if (f && f instanceof FormArray && f.dirty && ifValid(f)) {
                uo[k] = value[k];
            }
        }
        return uo;
    }

    protected setFieldsFromDB(v, form?) {
        if (!form) { form = this.formGroup; }
        if (!form) { return; }
        if (!v) { v = {}; }

        Object.keys(form.controls)
            .forEach(k => {
                if (form.controls[k] instanceof FormControl && !form.controls[k].multiple) {
                    form.controls[k].reset(v && v[k] || form.controls[k].defaultValue || null, { onlySelf: false, emitEvent: false });
                }
                if (form.controls[k] instanceof FormControl && form.controls[k].multiple) {
                    let a = v && v[k] || [];
                    if (!Array.isArray(a)) {
                        a = [a];
                    }
                    form.controls[k].reset(a, { onlySelf: false, emitEvent: false });
                }

                if (form.controls[k] instanceof FormGroup) {
                    this.setFieldsFromDB(v[k], form.controls[k]);
                }

                if (form.controls[k] instanceof FormArray) {
                    let a = v && v[k] || [];
                    if (!Array.isArray(a)) {
                        a = [a];
                    }
                    for (let i = form.controls[k].value.length; i < a.length; i++) {
                        form.controls[k].push(new FormControl(""));
                    }
                    for (let i = form.controls[k].value.length; i > a.length; i--) {
                        form.controls[k].removeAt(i - 1);
                    }
                    form.controls[k].reset(a, { onlySelf: false, emitEvent: false });
                }
            });
    }

    /**
     *
     * @returns {boolean}
     */
    get formValid(): boolean {
        return this.formGroup.valid;
    }

    /**
     *
     * @returns {FormGroup}
     */
    get getForm(): FormGroup {
        return this.formGroup;
    }
    /**
     *  Subscribe to a meteor published (colection) with auto updates
     * @param name
     * @param args
     */
    protected MeteorSubscribeAutorun<T>(name: string, ...args: any[]): Observable<T> {
        return MeteorObservable.subscribeAutorun(name, ...args);
    }

    protected MeteorCall<T>(name: string, ...args: any[]): Observable<T> {
        return MeteorObservable.call(name, ...args);
    }

    protected MeteorApply<T>(name: string, args: EJSONable[], options?: {
        wait?: boolean;
        onResultReceived?: Function;
    }): Observable<T> {
        return MeteorObservable.apply(name, args, options);
    }
}
