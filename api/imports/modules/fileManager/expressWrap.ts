import express from 'express';
import bodyParser from 'body-parser';

import { FileManagerOperations, contentRootPathGlobal } from './operations';
import { download } from './download';
import { Logger } from '/imports/modules/logger';

export async function debugMiddle(req: any, res: any, next: any) {
    Logger.info(`[BooksStorage]: ${req.method}, ${req.url}`);
    Logger.debug('[BooksStorage] Headers:', req.headers);
    Logger.debug('[BooksStorage] Body:', req.body);
    return next();
}

/**
 * File Manager API
 */
export function fileManagerExpress() {
    const fileManagerExpressLocal = express();
    fileManagerExpressLocal.use(bodyParser.urlencoded({ extended: true }));
    fileManagerExpressLocal.use(bodyParser.json());
    const fileManager = new FileManagerOperations(contentRootPathGlobal);
    fileManagerExpressLocal.post('/operations', debugMiddle, async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.json(
            JSON.stringify(
                await fileManager.fileManagerRead(req.body)
            )
        );
    });
    // fileManagerExpress.post('/download/*', debugMiddle);
    fileManagerExpressLocal.post('/download', debugMiddle, async (req, res, next) => {
        download(req, res, contentRootPathGlobal, next);
    });
    return fileManagerExpressLocal;
}
