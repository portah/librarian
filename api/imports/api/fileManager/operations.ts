import { promises as fsPromises, Stats } from 'fs';
import { join, basename, extname, normalize, resolve, relative } from 'path';

import { Meteor } from 'meteor/meteor';

import { Logger } from '../../modules/logger';

// const archiver = require('archiver');
// const multer = require('multer');
const fs = require('fs');


export const contentRootPathGlobal = Meteor.settings.walkingDirs[0] + '/';

import { getPermission } from './permissions';

/**
 *
 */
export class FileManagerOperations {

    rootPathBaseName: string;

    /**
     *
     * @param contentRootPath
     */
    constructor(
        public contentRootPath: string) {
        this.rootPathBaseName = basename(this.contentRootPath);
    }

    /**
     *
     * @param path
     */
    public getPath(path: string) {
        return join(this.contentRootPath, resolve('/', normalize(path)));
    }

    /**
     * Handles the read request
     */
    public async fileManagerRead(body: any) {
        const { path, action, data, names, caseSensitive, searchString, name } = body;

        const error: any = new Error();
        if (!action || !path) {
            error.message = `Empty action or path not allowed`;
            error.code = 401;
            return { error };
        }
        const bodyPath = this.getPath(path);
        const filterPath = data && Array.isArray(data) ? data[0]?.filterPath : '';

        // Action for getDetails
        if (action === 'details') {
            return await this.getFileDetails(names, data, bodyPath, filterPath, this.rootPathBaseName);
        }
        // Action for copying files
        if (action === 'copy') {
            // CopyFiles(req, res, contentRootPath);
        }
        // Action for movinh files
        if (action === 'move') {
            // MoveFiles(req, res, contentRootPath);
        }
        // Action to create a new folder
        if (action === 'create') {
            // createFolder(req, res, contentRootPath + req.body.path, contentRootPath);
        }
        // Action to remove a file
        if (action === 'delete') {
            // deleteFolder(req, res, contentRootPath);
        }
        // Action to rename a file
        if (action === 'rename') {
            // renameFolder(req, res); // , contentRootPath + req.body.path
        }



        // Action to search a file
        if (action === 'search') {

            const cwd = await this.FileManagerDirectoryContent(bodyPath);
            if (cwd.permission != null && !cwd.permission.read) {
                const error: any = new Error();
                error.message = (cwd.permission.message !== '') ? cwd.permission.message :
                    `'${cwd.name}' is not accessible. You need permission to perform the read action.`;
                error.code = 401;
                return { error };
            } else {
                const files: any[] = await this.fromDir(bodyPath, searchString, caseSensitive, []);
                Logger.debug('search', { cwd, files });
                return { cwd, files };
            }
        }


        // Action to read a file
        if (action === 'read') {
            const cwd = await this.FileManagerDirectoryContent(bodyPath);
            // cwdFiles.name = req.body.path == '/' ? rootName = (basename(contentRootPath + req.body.path)) : basename(contentRootPath + req.body.path)
            if (cwd.permission != null && !cwd.permission.read) {
                const error: any = new Error();
                error.message = (cwd.permission.message !== '') ? cwd.permission.message :
                    `'${cwd.name}' is not accessible. You need permission to perform the read action.`;
                error.code = 401;
                return { cwd, files: null, error };
            } else {
                const readDir = await this.ReadDirectories(await this.getFiles(bodyPath), bodyPath);
                return { cwd, files: readDir };
                // Logger.debug('Action READ: ', { cwd: cwd, files: readDir });
            }
        }

        error.message = `${action} not yet supported for '${name}'`;
        error.code = 401;
        return { error };
    }


    /**
     * returns the current working directories
     */
    private async FileManagerDirectoryContent(filePath: string, searchFilterPath?: any) {

        const cwd = await this.getFileStats(filePath);
        if (searchFilterPath) {
            cwd.filterPath = searchFilterPath;
        }
        return cwd;
    }


    /**
     *
     * @param names
     * @param data
     * @param currentPath
     * @param filterPath
     * @param baseName
     */
    public async getFileDetails(names: any[], data: any, currentPath: any, filterPath: any, baseName: string) {

        let size = 0;
        let filePath = currentPath;

        if (Array.isArray(data) && names.length === data.length ) {
            names = data.map((item: any, i: number) => {
                if (item.name === names[i]) {
                    return item.name;
                }
                return item.filterPath;
            });
        }

        if (names.length === 0 && Array.isArray(data)) {
            names = data.map((item: any) => item.name);
        } else {
            filePath = join(currentPath, names[0]);
        }

        try {
            const stats: Stats = await fsPromises.stat(filePath);
            const details = {
                name: basename(filePath),
                size: this.getSize(stats.size),
                isFile: stats.isFile(),
                modified: stats.ctime,
                created: stats.mtime,
                type: extname(filePath),
                multipleFiles: false,
                location: ''
            };

            if (names.length === 1) {
                // const isNamesAvailable = names.length > 0 ? true : false;
                // const details = await this.fileDetails(currentPath + (isNamesAvailable ? names[0] : ''), filterPath);
                // const details = await this.fileDetails(join(currentPath, names[0]), filterPath);

                if (stats.isDirectory()) {
                    details.size = this.getSize(await this.getFolderSize(filePath, 0));
                }
                if (filterPath === '') {
                    details.location = join(filterPath, names[0]);
                } else {
                    details.location = join(baseName, filterPath);
                }
            } else {
                // let isMultipleLocations = false;
                // isMultipleLocations = this.checkForMultipleLocations(data, currentPath);
                details.location = '';
                for (const item of names) {
                    const newPath = join(currentPath, item);
                    if ((await fsPromises.lstat(newPath)).isDirectory()) {
                        size = size + await this.getFolderSize(newPath, size);
                    } else {
                        size = size + (await fsPromises.stat(newPath)).size;
                    }
                    details.location = details.location ? `${details.location}, ${join(baseName, item)}` : join(baseName, item);
                }
                // const details: any = await this.fileDetails(join(currentPath, names[0]));

                details.name = names.map((name: any) => {
                    const nameSplit = name.split('/');
                    return nameSplit.length > 0 ? nameSplit[nameSplit.length - 1] : name;
                }).join(', ');

                details.multipleFiles = true;
                details.size = this.getSize(size);
                // details.location = join(baseName, filterPath); // join(baseName, filterPath).substr(0, join(baseName, filterPath).length - 1);
            }
            return { details };
        } catch (e) {
            Logger.error(e);
            const error: any = new Error();
            error.message = `'${names[0]}' is not accessible.`;
            error.code = 401;
            return { error };

        }
    }

    // /**
    //  *
    //  * @param filename
    //  * @param contentRootPath
    //  * @param fileList
    //  * @param files
    //  * @param index
    //  */
    // public async addSearchList(filename: string, fileList: any[], file: string) {
    //     const cwd: any = {};
    //     const stats = await fsPromises.stat(filename);

    //     cwd.name = basename(filename);
    //     cwd.size = stats.size;
    //     cwd.isFile = stats.isFile();
    //     cwd.dateModified = stats.mtime;
    //     cwd.dateCreated = stats.ctime;
    //     cwd.type = extname(filename);
    //     cwd.filterPath = filename.substr((this.contentRootPath.length), filename.length).replace(file, '');
    //     cwd.permission = getPermission(filename, cwd.name, cwd.isFile, this.contentRootPath, cwd.filterPath);

    //     // let permission = parentsHavePermission(filename, contentRootPath, cwd.isFile, cwd.name, cwd.filterPath);
    //     // if (permission) {
    //     if (stats.isFile()) {
    //         cwd.hasChild = false;
    //     }
    //     if (stats.isDirectory()) {
    //         const statsRead = await this.getFiles(filename);
    //         for (const f of statsRead) {
    //             if (cwd.hasChild) {
    //                 break;
    //             } else {
    //                 cwd.hasChild = (await fsPromises.stat(f)).isDirectory();
    //             }
    //         }

    //     }
    //     fileList.push(cwd);
    //     // }
    // }

    /**
     *
     * @param fileName
     * @param searchString
     * @param caseSensitive
     */
    private checkForSearchResult(fileName: string, searchString: string, caseSensitive: boolean) {
        let regExp: any;
        if (searchString.indexOf('.*') >= 0) {
            regExp = RegExp(searchString, caseSensitive ? 'g' : 'ig');
        } else {
            regExp = RegExp(searchString.replace(/\*/g, '.*').replace(/\ /g, '.*'), caseSensitive ? 'g' : 'ig');
        }
        if (fileName.search(regExp) >= 0) {
            return true;
        }
        return false;
    }

    /**
     *
     * @param startPath
     * @param filter
     * @param caseSensitive
     * @param searchString
     * @param fileList
     */
    public async fromDir(startPath: string, searchString: any, caseSensitive: boolean, fileList: any[]): any[] {

        const files = await this.getFiles(startPath);

        for (const file of files) {
            const filename = join(startPath, file);
            const stat = await fsPromises.lstat(filename);
            if (stat.isDirectory()) {
                if (this.checkForSearchResult(file, searchString, caseSensitive)) {
                    const cwd = await this.getFileStats(filename);
                    fileList.push(cwd);
                }
                await this.fromDir(filename, searchString, caseSensitive, fileList); //recurse
            } else if (this.checkForSearchResult(file, searchString, caseSensitive)) {

                const cwd = await this.getFileStats(filename);
                fileList.push(cwd);
            }
        }
        return fileList;
    }


    /**
     *
     *
     *
     * *********************    *************      BASICS
     *
     *
     *
     */

    /**
     *
     * @param fileList
     * @param currentPath
     */
    private async ReadDirectories(fileList: any, currentPath: string) {
        Logger.debug('ReadDirectories:', fileList, currentPath);

        const resultList = [];
        for (const f of fileList) {
            const statResult = await this.getFileStats(join(currentPath, f));
            if (statResult) { resultList.push(statResult); }
        }
        return resultList;
    }

    /**
     *
     * @param fileToStat
     * @param path
     */
    private async getFileStats(fileToStat: any) {

        const cwd: any = {};

        try {

            const fStats = await fsPromises.stat(fileToStat);

            cwd.name = basename(fileToStat);
            cwd.size = fStats.size;
            cwd.isFile = fStats.isFile();
            cwd.dateModified = fStats.ctime;
            cwd.dateCreated = fStats.mtime;
            cwd.filterPath = this.getRelativePath(this.contentRootPath, fileToStat);
            cwd.type = extname(fileToStat);
            cwd.permission = getPermission(fileToStat, cwd.name, cwd.isFile, this.contentRootPath, cwd.filterPath);
            cwd.hasChild = false;

            if (fStats.isDirectory()) {
                for (const f of (await this.getFiles(fileToStat))) {
                    if ((await fsPromises.stat(join(fileToStat, f))).isDirectory()) {
                        cwd.hasChild = true;
                        break;
                    }
                }
            }
            return cwd;
        } catch (e) {
            Logger.error(e);
            return null;
        }
    }

    /**
     *
     * @param rootDirectory
     * @param path
     */
    private getRelativePath(rootDirectory: string, path: string) {
        return relative(rootDirectory, path);
    }

    /**
     * function to get the size in kb, MB
     */
    private getSize(size: number): string {
        if (size < 1024) { return size + ' B'; }
        if (size < 1024 * 1024) { return (size / 1024.0).toFixed(2) + ' KB'; }
        if (size < 1024 * 1024 * 1024) { return (size / 1024.0 / 1024.0).toFixed(2) + ' MB'; }
        return (size / 1024.0 / 1024.0 / 1024.0).toFixed(2) + ' GB';
    }

    /**
     * function to get the folder size
     * @param sizeValue -  initial size value
     */
    private async getFolderSize(directory: string, sizeValue?: number): Promise<number> {
        let size = sizeValue || 0;
        for (const filename of await this.getFiles(directory)) {
            const currentPath = join(directory, filename);
            const currentStat = await fsPromises.lstat(currentPath);
            size = size + (currentStat.isDirectory() ? await this.getFolderSize(currentPath, 0) : currentStat.size);
        }
        return size;
    }

    /**
     * Reads text from the file asynchronously and returns a Promise.
     */
    private async getFiles(path: string) {
        try {
            return await fsPromises.readdir(path);
        } catch (e) {
            Logger.error(e);
            return [];
        }
    }

}
