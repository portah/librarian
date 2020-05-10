import { Meteor } from 'meteor/meteor';
import * as bunyan from 'bunyan';

let loggerSingleton: any = null;

export function createLogger(options?: any) {

    if (loggerSingleton) {
        return loggerSingleton;
    }

    options = options || {};

    const streams: any[] = [];
    let conf: any = { name: 'Bookstorage Server' };

    if (Meteor.isServer) {
        if (!!Meteor.settings['logFile'] && Meteor.settings['logFile'].length > 0) {
            streams.push({
                path: Meteor.settings['logFile']
            });
        } else {
            streams.push({
                path: './bookstorage.log'
            });
        }

        if (!Meteor.isProduction) {
            streams.push({
                stream: process.stdout
            });
        }
        const logLevel = Meteor.settings['logLevel'] || 'debug';
        conf = {
            ...conf,
            src: logLevel === 'debug',
            streams,
            level: logLevel
        };
    } else {
        conf = {
            ...conf,
            src: true,
            level: 'debug'
        };
    }

    loggerSingleton = bunyan.createLogger({ ...conf, ...options });
    return loggerSingleton;
}

export const Logger: { info: any, debug: any, warn: any, error: any } = createLogger();
