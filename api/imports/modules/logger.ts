import { Meteor } from 'meteor/meteor';
import * as bunyan from 'bunyan';

let loggerSingleton: any = null;

export function createLogger(options?: any) {

    if (loggerSingleton) {
        return loggerSingleton;
    }

    options = options || {};

    const stream: any = {};
    let conf: any = { name: 'Bookstorage Server' };

    if (Meteor.isServer) {
        if (!!Meteor.settings['logFile'] && Meteor.settings['logFile'].length > 0) {
            stream.path = Meteor.settings['logFile'];
        } else if (Meteor.isProduction) {
            stream.path = './bookstorage.log';
        } else {
            stream.stream = process.stdout;
        }
        const logLevel = Meteor.settings['logLevel'] || 'debug';
        conf = {
            ...conf,
            src:  logLevel === 'debug',
            streams: [stream],
            level: logLevel
        };
    } else {
        conf = {
            ...conf,
            src: true,
            level: 'debug'
        };
    }

    loggerSingleton = bunyan.createLogger({...conf, ...options});
    return loggerSingleton;
}

export const Logger: { info: any, debug: any, warn: any, error: any } = createLogger();
