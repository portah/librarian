import { promises as fsPromises } from 'fs';
import { join, basename, extname, normalize, resolve, relative } from 'path';
// const archiver = require('archiver');

export async function download(req: any, res: any, contentRootPath: string) {


    const downloadObj = JSON.parse(req.body.downloadInput);

    downloadObj.path = resolve('/', normalize(downloadObj.path));

    if (downloadObj.names.length === 1 && downloadObj.data[0].isFile) {
        let file = contentRootPath + downloadObj.path + downloadObj.names[0];
        res.download(file);
    }
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
