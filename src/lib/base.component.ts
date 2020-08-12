import { Random } from 'meteor/random';
import { Meteor } from 'meteor/meteor';

import { DatePipe } from '@angular/common';

import { Input, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';


import { Tracking } from './tracking';

export class BaseComponent extends Tracking {
    id = Random.id();

    public showError;
    public submitting: boolean = false;

    constructor() {
        super();
    }

    /**
     *  Functions to provide error support
     * @param comp
     * @returns {boolean}
     */
    isInvalid(comp): any {
        if (comp && comp instanceof FormControl && comp.errors) {
            return !!this.showError && comp.errors;
        }

        if (comp && comp instanceof FormGroup) {
            return !!this.showError && !comp.valid;
        }

        return false;
    }

    /**
     *
     * @param comp
     * @returns {string}
     */
    invalidMessage(comp: any) {
        if (comp && comp instanceof FormControl && comp.errors) {
            return comp.errors.message;
        }
        return 'You have some errors in the form. Please fix them.';
    }

    /**
     *
     * @param comp
     * @returns {any}
     */
    invalidStyle(comp) {
        if (!!comp.valid || !this.showError) {
            return '';
        }
        else {
            return 'has-error';
        }
    }

    back() {
        window.history.back();
    }

    checkSubmit(): boolean {
        this.submitting = true;
        const status = Meteor.status();
        if (!status.connected) {
            this.submitting = false;
            console.log({ title: 'Can\'t connect to the server.', type: 'error', text: status.reason, timer: 3000 });
        }
        return this.submitting;
    }

    // confirmationDialog(text, message, action) {
    //     this._zone.run(() => {
    //         this.tracked = this._tdDialogService.openConfirm({
    //             cancelButton: 'Disagree', // OPTIONAL, defaults to 'CANCEL'
    //             acceptButton: 'Agree', // OPTIONAL, defaults to 'ACCEPT'
    //             title: text,
    //             message: message
    //         }).afterClosed().subscribe((accept: boolean) => {
    //             if (accept) {
    //                 Meteor.setTimeout(() => action(), 0);
    //             }
    //         });
    //     });
    // }

    //     constructor(private datePipe: DatePipe) {}
    //
    //     transformDate(date) {
    //         this.datePipe.transform(myDate, 'yyyy-MM-dd');
    //     }

}
