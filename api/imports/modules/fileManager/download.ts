import { promises as fsPromises } from 'fs';
import { join, normalize, resolve, relative } from 'path';
import { Logger } from '/imports/modules';
// const archiver = require('archiver');

export async function download({ body, ...req }: any, res: any, contentRootPath: string, next: any) {

    if (body.downloadInput) {
        const downloadObj = JSON.parse(body.downloadInput);

        downloadObj.path = resolve('/', normalize(downloadObj.path));

        if (downloadObj?.names.length === 1 && downloadObj?.data[0].isFile) {
            const file = contentRootPath + downloadObj.path + downloadObj.names[0];
            res.download(file);
        }
    }

    if (body.action && body.action === 'Load') {
        const relativePath = relative(contentRootPath, resolve('/', normalize(body.document)));
        const file = join(contentRootPath, resolve('/', relativePath));
        try {
            const stats = await fsPromises.stat(file);
            if (stats.isFile()) {
                res.download(file);
            }
        } catch (e) {
            Logger.error(e);
            // res.writeHead(404, {
            //     'Content-disposition': `attachment; filename=${body.document}; filename*=UTF-8`,
            //     'Content-Type': 'APPLICATION/octet-stream',
            //     'Content-Length': 0
            // });
        }
    }
    next();
    //  else {
    //     let archive = archiver('zip', {
    //         gzip: true,
    //         zlib: { level: 9 } // Sets the compression level.
    //     });
    //     let output = fs.createWriteStream('./Files.zip');
    //     downloadObj.data.forEach(function (item) {
    //         archive.on('error', function (err) {
    //             throw err;
    //         });
    //         if (item.isFile) {
    //             archive.file(contentRootPath + item.filterPath + item.name, { name: item.name });
    //         }
    //         else {
    //             archive.directory(contentRootPath + item.filterPath + item.name + '/', item.name);
    //         }
    //     });
    //     archive.pipe(output);
    //     archive.finalize();
    //     output.on('close', function () {
    //         let stat = fs.statSync(output.path);
    //         res.writeHead(200, {
    //             'Content-disposition': 'attachment; filename=Files.zip; filename*=UTF-8',
    //             'Content-Type': 'APPLICATION/octet-stream',
    //             'Content-Length': stat.size
    //         });
    //         let filestream = fs.createReadStream(output.path);
    //         filestream.pipe(res);
    //     });
    // }
}

export async function downloadPdf({ body, ...req }: any, res: any, contentRootPath: string, next: any) {

    // if (body.action && body.action === 'Load') {
    // const relativePath = relative(contentRootPath, resolve('/', normalize(body.document)));
    const file = "/Users/porter/Books/rar/LWW.Lippincott.Illustrated.Reviews.Microbiology.4th.Edition.1496395859.pdf";
    // join(contentRootPath, resolve('/', relativePath));
    // res.setHeader('Content-Type', 'application/json');
    // res.json(
    //     JSON.stringify(
    //         {
    //             "pageCount": 60,
    //             "pageSizes": { "0": "816, 1056", "1": "816, 1056", "2": "816, 1056", "3": "816, 1056", "4": "816, 1056", "5": "816, 1056", "6": "816, 1056", "7": "816, 1056", "8": "816, 1056", "9": "816, 1056", "10": "816, 1056", "11": "816, 1056", "12": "816, 1056", "13": "816, 1056", "14": "816, 1056", "15": "816, 1056", "16": "816, 1056", "17": "816, 1056", "18": "816, 1056", "19": "816, 1056", "20": "816, 1056", "21": "816, 1056", "22": "816, 1056", "23": "816, 1056", "24": "816, 1056", "25": "816, 1056", "26": "816, 1056", "27": "816, 1056", "28": "816, 1056", "29": "816, 1056", "30": "816, 1056", "31": "816, 1056", "32": "816, 1056", "33": "816, 1056", "34": "816, 1056", "35": "816, 1056", "36": "816, 1056", "37": "816, 1056", "38": "816, 1056", "39": "816, 1056", "40": "816, 1056", "41": "816, 1056", "42": "816, 1056", "43": "816, 1056", "44": "816, 1056", "45": "816, 1056", "46": "816, 1056", "47": "816, 1056", "48": "816, 1056", "49": "816, 1056", "50": "816, 1056", "51": "816, 1056", "52": "816, 1056", "53": "816, 1056", "54": "816, 1056", "55": "816, 1056", "56": "816, 1056", "57": "816, 1056", "58": "816, 1056", "59": "816, 1056" },
    //             "hashId": "m\u0017\u0011]\u0001?l??\bw???\u0004?",
    //             "documentLiveCount": 12
    //             , "PdfRenderedFormFields": [],
    //             "uniqueId": `${body.uniqueId}`
    //         }
    //     )
    // );

    try {

        const stats = await fsPromises.stat(file);
        if (stats.isFile()) {
            res.download(file);
        }
    } catch (e) {
        Logger.error(e);
        // res.writeHead(404, {
        //     'Content-disposition': `attachment; filename=${body.document}; filename*=UTF-8`,
        //     'Content-Type': 'APPLICATION/octet-stream',
        //     'Content-Length': 0
        // });
    }
    // }
    // next();
}
