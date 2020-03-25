/*jshint esversion: 8 */
// let express = require('express');

import { promises as fsPromises } from 'fs';
import { join, basename, extname, normalize, resolve, relative } from 'path';

import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

import { Logger } from '../modules/logger';

// const archiver = require('archiver');
// const multer = require('multer');
const fs = require('fs');
// let cors = require('cors');

// let yargs = require('yargs');
import express from 'express';

import * as bodyParser from 'body-parser';

let size = 0;
let copyName = '';
let location = '';
let isRenameChecking = false;
let accessDetails: any = null;
// const path = require('path');


const pattern = /(\.\.\/)/g;

const contentRootPath = Meteor.settings.walkingDirs[0] + '/';
// yargs.argv.d;

const Permission = {
    Allow: 'allow',
    Deny: 'deny'
};

class AccessDetails {
    constructor(
        public role: any,
        public rules: any) {
    }
}

class AccessPermission {
    constructor(
        public read: any,
        public write: any,
        public writeContents: any,
        public copy: any,
        public download: any,
        public upload: any,
        public message: any) {
    }
}

class AccessRules {
    constructor(
        public path: any,
        public role: any,
        public read: any,
        public write: any,
        public writeContents: any,
        public copy: any,
        public download: any,
        public upload: any,
        public isFile: any,
        public message: any) {
    }
}
/**
 * Reads text from the file asynchronously and returns a Promise.
 */
async function GetFiles(path: string) {
    return await fsPromises.readdir(path);
}
/**
 *
 * function to check for exising folder or file
 */
async function checkForDuplicates(directory: string, name: string, isFile: boolean) {
    const filenames = await fsPromises.readdir(directory);
    if (filenames.indexOf(name) == -1) {
        return false;
    } else {
        if (filenames.find((n: string) => n === name)) {
            const isDirectory = (await fsPromises.lstat(`${directory}/${name}`)).isDirectory();
            return (!isFile && isDirectory) || (isFile && !isDirectory);
        }
    }
}
/**
 * function to rename the folder
 */
async function renameFolder(req: any, res: any) {
    let oldName = req.body.data[0].name.split('/')[req.body.data[0].name.split('/').length - 1];
    let newName = req.body.newName.split('/')[req.body.newName.split('/').length - 1];
    // let permission = getPermission((contentRootPath + req.body.data[0].filterPath), oldName, req.body.data[0].isFile, contentRootPath, req.body.data[0].filterPath);
    // if (permission != null && (!permission.read || !permission.write)) {
    //     let errorMsg = new Error();
    //     errorMsg.message = (permission.message !== '') ? permission.message : getFileName(contentRootPath + req.body.data[0].filterPath + oldName) + ' is not accessible.  is not accessible. You need permission to perform the write action.';
    //     errorMsg.code = '401';
    //     response = { error: errorMsg };
    //     response = JSON.stringify(response);
    //     res.setHeader('Content-Type', 'application/json');
    //     res.json(response);
    // } else {
    let oldDirectoryPath = join(contentRootPath + req.body.data[0].filterPath, oldName);
    let newDirectoryPath = join(contentRootPath + req.body.data[0].filterPath, newName);

    if (await checkForDuplicates(contentRootPath + req.body.data[0].filterPath, newName, req.body.data[0].isFile)) {
        const errorMsg: any = new Error();
        errorMsg.message = `A file or folder with the name ${req.body.name} already exists.`;
        errorMsg.code = 400;
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.stringify({ error: errorMsg }));
    } else {
        await fsPromises.rename(oldDirectoryPath, newDirectoryPath);
        const data = await FileManagerDirectoryContent(req, res, newDirectoryPath + '/');
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.stringify({ files: data }));
    }
    // }
}
/**
 * function to delete the folder
 */
function deleteFolder(req: any, res: any, contentRootPath: any) {

    const deleteFolderRecursive = async (path: string) => {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file: any, index: any) => {
                const curPath = `${path}/${file}`;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };

    let permission; let permissionDenied = false;
    req.body.data.forEach((item: any) => {
        let fromPath = contentRootPath + item.filterPath;
        // permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
        // if (permission != null && (!permission.read || !permission.write)) {
        //     permissionDenied = true;
        //     let errorMsg = new Error();
        //     errorMsg.message = (permission.message !== '') ? permission.message : item.name + ' is not accessible. You need permission to perform the write action.';
        //     errorMsg.code = '401';
        //     response = { error: errorMsg };
        //     response = JSON.stringify(response);
        //     res.setHeader('Content-Type', 'application/json');
        //     res.json(response);
        // }
    });
    if (!permissionDenied) {
        let promiseList = [];
        for (let i = 0; i < req.body.data.length; i++) {
            let newDirectoryPath = join(contentRootPath + req.body.data[i].filterPath, req.body.data[i].name);
            if (fs.lstatSync(newDirectoryPath).isFile()) {
                promiseList.push(FileManagerDirectoryContent(req, res, newDirectoryPath, req.body.data[i].filterPath));
            } else {
                promiseList.push(FileManagerDirectoryContent(req, res, newDirectoryPath + '/', req.body.data[i].filterPath));
            }
        }
        Promise.all(promiseList).then(data => {
            data.forEach(function (files) {
                if (fs.lstatSync(join(contentRootPath + files.filterPath, files.name)).isFile()) {
                    fs.unlinkSync(join(contentRootPath + files.filterPath, files.name));
                } else {
                    deleteFolderRecursive(join(contentRootPath + files.filterPath, files.name));
                }
            });
            response = { files: data };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        });
    }
}
/**
 * function to create the folder
 */
async function createFolder(req, res, filepath: string, contentRootPath: string) {
    let newDirectoryPath = join(contentRootPath + req.body.path, req.body.name);
    let pathPermission = getPathPermission(req.path, false, req.body.data[0].name, filepath, contentRootPath, req.body.data[0].filterPath);
    if (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents)) {
        let errorMsg = new Error();
        errorMsg.message = (permission.message !== '') ? permission.message : req.body.data[0].name + ' is not accessible. You need permission to perform the writeContents action.';
        errorMsg.code = '401';
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    else {
        if (fs.existsSync(newDirectoryPath)) {
            let errorMsg = new Error();
            errorMsg.message = 'A file or folder with the name ' + req.body.name + ' already exists.';
            errorMsg.code = '400';
            response = { error: errorMsg };

            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        } else {
            fs.mkdirSync(newDirectoryPath);
            (async () => {
                await FileManagerDirectoryContent(req, res, newDirectoryPath).then(data => {
                    response = { files: data };
                    response = JSON.stringify(response);
                    res.setHeader('Content-Type', 'application/json');
                    res.json(response);
                });
            })();
        }
    }
}
/**
 * function to get the file details like path, name and size
 */
async function fileDetails(filePath: string, filterPath?: any) {
    const stats = await fsPromises.stat(filePath);
    return {
        name: basename(filePath),
        size: getSize(stats.size),
        isFile: stats.isFile(),
        modified: stats.ctime,
        created: stats.mtime,
        type: extname(filePath),
        location: filterPath
    };
}

/**
 * function to get the folder size
 */
function getFolderSize(directory: string, sizeValue: number) {
    size = sizeValue;
    const filenames = fs.readdirSync(directory);
    for (const filename of filenames) {
        if (fs.lstatSync(directory + '/' + filename).isDirectory()) {
            getFolderSize(directory + '/' + filename, size);
        } else {
            const stats = fs.statSync(directory + '/' + filename);
            size = size + stats.size;
        }
    }
}

/**
 * function to get the size in kb, MB
 */
function getSize(size) {
    let hz;
    if (size < 1024) hz = size + ' B';
    else if (size < 1024 * 1024) hz = (size / 1024).toFixed(2) + ' KB';
    else if (size < 1024 * 1024 * 1024) hz = (size / 1024 / 1024).toFixed(2) + ' MB';
    else hz = (size / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    return hz;
}

function checkForMultipleLocations(data: any, contentRootPath: any) {
    let previousLocation = '';
    let isMultipleLocation = false;
    data.forEach((item: any) => {
        if (previousLocation === '') {
            previousLocation = item.filterPath;
            location = item.filterPath;
        } else if (previousLocation === item.filterPath && !isMultipleLocation) {
            isMultipleLocation = false;
            location = item.filterPath;
        } else {
            isMultipleLocation = true;
            location = 'Various Location';
        }
    });
    if (!isMultipleLocation) {
        location = contentRootPath.split('/')[contentRootPath.split('/').length - 1] + location.substr(0, location.length - 2);
    }
    return isMultipleLocation;
}
/**
 *
 * @param req
 * @param res
 * @param contentRootPath
 * @param filterPath
 */
async function getFileDetails(names: any[], body: any, contentRootPath: any, filterPath: any, rootName: string) {

    const isNamesAvailable = names.length > 0 ? true : false;
    if (names.length === 0 && body.data !== 0) {
        names = body.data.map((item: any) => item.name);
    }

    if (names.length === 1) {
        const details = await fileDetails(contentRootPath + (isNamesAvailable ? names[0] : ''), filterPath);

        if (!details.isFile) {
            getFolderSize(contentRootPath + (isNamesAvailable ? names[0] : ''), 0);
            details.size = getSize(size);
            size = 0;
        }
        if (filterPath === '') {
            details.location = join(filterPath, names[0]).substr(0, join(filterPath, names[0]).length);
        } else {
            details.location = join(rootName, filterPath, names[0]);
        }
        return { details };

    } else {
        let isMultipleLocations = false;
        isMultipleLocations = checkForMultipleLocations(body.data, contentRootPath);
        names.forEach((item: any) => {
            if (fs.lstatSync(contentRootPath + item).isDirectory()) {
                getFolderSize(contentRootPath + item, size);
            } else {
                const stats = fs.statSync(contentRootPath + item);
                size = size + stats.size;
            }
        });
        const details: any = await fileDetails(join(contentRootPath, names[0]));

        const _names: any[] = [];
        names.forEach((name: any) => {
            if (name.split('/').length > 0) {
                _names.push(name.split('/')[name.split('/').length - 1]);
            }
            else {
                _names.push(name);
            }
        });
        details.name = _names.join(', ');
        details.multipleFiles = true;
        details.size = getSize(size);
        size = 0;
        details.location = join(rootName, filterPath).substr(0, join(rootName, filterPath).length - 1);
        return { details };
    }
}

function copyFolder(source, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
    }
    files = fs.readdirSync(source);
    files.forEach(function (file) {
        let curSource = join(source, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            copyFolder(curSource, join(dest, file)); source
        } else {
            fs.copyFileSync(join(source, file), join(dest, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

function updateCopyName(path, name, count, isFile) {
    let subName = '', extension = '';
    if (isFile) {
        extension = name.substr(name.lastIndexOf('.'), name.length - 1);
        subName = name.substr(0, name.lastIndexOf('.'));
    }
    copyName = !isFile ? name + '(' + count + ')' : (subName + '(' + count + ')' + extension);
    if (checkForDuplicates(path, copyName, isFile)) {
        count = count + 1;
        updateCopyName(path, name, count, isFile);
    }
}

function checkForFileUpdate(fromPath, toPath, item, contentRootPath, req) {
    let count = 1;
    let name = copyName = item.name;
    if (fromPath == toPath) {
        if (checkForDuplicates(contentRootPath + req.body.targetPath, name, item.isFile)) {
            updateCopyName(contentRootPath + req.body.targetPath, name, count, item.isFile);
        }
    } else {
        if (req.body.renameFiles.length > 0 && req.body.renameFiles.indexOf(item.name) >= 0) {
            updateCopyName(contentRootPath + req.body.targetPath, name, count, item.isFile);
        } else {
            if (checkForDuplicates(contentRootPath + req.body.targetPath, name, item.isFile)) {
                isRenameChecking = true;
            }
        }
    }
}
/**
 * function copyfile and folder
 */
function CopyFiles(req, res, contentRootPath) {
    let fileList: any[] = [];
    let replaceFileList: any[] = [];
    let permission: amy; let pathPermission: any; let permissionDenied = false;
    pathPermission = getPathPermission(req.path, false, req.body.targetData.name, contentRootPath + req.body.targetPath, contentRootPath, req.body.targetData.filterPath);
    req.body.data.forEach((item: any) => {
        let fromPath = contentRootPath + item.filterPath;
        permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
        let fileAccessDenied = (permission != null && (!permission.read || !permission.copy));
        let pathAccessDenied = (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents));
        if (fileAccessDenied || pathAccessDenied) {
            permissionDenied = true;
            let errorMsg: any = new Error();
            errorMsg.message = fileAccessDenied ? ((permission.message !== '') ? permission.message :
                item.name + ' is not accessible. You need permission to perform the copy action.') :
                ((pathPermission.message !== '') ? pathPermission.message :
                    req.body.targetData.name + ' is not accessible. You need permission to perform the writeContents action.');
            errorMsg.code = 401;
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ error: errorMsg }));
        }
    });
    if (!permissionDenied) {
        req.body.data.forEach((item: any) => {
            let fromPath = contentRootPath + item.filterPath + item.name;
            let toPath = contentRootPath + req.body.targetPath + item.name;
            checkForFileUpdate(fromPath, toPath, item, contentRootPath, req);
            if (!isRenameChecking) {
                toPath = contentRootPath + req.body.targetPath + copyName;
                if (item.isFile) {
                    fs.copyFileSync(join(fromPath), join(toPath), (err) => {
                        if (err) throw err;
                    });
                }
                else {
                    copyFolder(fromPath, toPath)
                }
                let list = item;
                list.filterPath = req.body.targetPath;
                list.name = copyName;
                fileList.push(list);
            } else {
                replaceFileList.push(item.name);
            }
        });
        if (replaceFileList.length == 0) {
            copyName = '';
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ files: fileList }));
        } else {
            isRenameChecking = false;
            let errorMsg: any = new Error();
            errorMsg.message = 'File Already Exists.';
            errorMsg.code = 400;
            errorMsg.fileExists = replaceFileList;
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ error: errorMsg, files: [] }));
        }
    }
}

function MoveFolder(source: any, dest: any) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
    }
    const files = fs.readdirSync(source);
    files.forEach((file: any) => {
        let curSource = join(source, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            MoveFolder(curSource, join(dest, file));
            fs.rmdirSync(curSource);
        } else {
            fs.copyFileSync(join(source, file), join(dest, file), (err: any) => {
                if (err) { throw err; }
            });
            fs.unlinkSync(join(source, file), (err: any) => {
                if (err) { throw err; }
            });
        }
    });
}
/**
 * function move files and folder
 */
function MoveFiles(req, res, contentRootPath) {
    const fileList: any[] = [];
    const replaceFileList: any[] = [];
    let permission: any; let pathPermission: any; let permissionDenied = false;
    pathPermission = getPathPermission(req.path, false, req.body.targetData.name, contentRootPath + req.body.targetPath, contentRootPath, req.body.targetData.filterPath);
    req.body.data.forEach((item: any) => {
        let fromPath = contentRootPath + item.filterPath;
        permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
        let fileAccessDenied = (permission != null && (!permission.read || !permission.write));
        let pathAccessDenied = (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents));
        if (fileAccessDenied || pathAccessDenied) {
            permissionDenied = true;
            let errorMsg: any = new Error();
            errorMsg.message = fileAccessDenied ? ((permission.message !== '') ? permission.message :
                item.name + ' is not accessible. You need permission to perform the write action.') :
                ((pathPermission.message !== '') ? pathPermission.message :
                    req.body.targetData.name + ' is not accessible. You need permission to perform the writeContents action.');
            errorMsg.code = 401;
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ error: errorMsg }));
        }
    });
    if (!permissionDenied) {
        req.body.data.forEach((item: any) => {
            let fromPath = contentRootPath + item.filterPath + item.name;
            let toPath = contentRootPath + req.body.targetPath + item.name;
            checkForFileUpdate(fromPath, toPath, item, contentRootPath, req);
            if (!isRenameChecking) {
                toPath = contentRootPath + req.body.targetPath + copyName;
                if (item.isFile) {
                    let source = fs.createReadStream(join(fromPath));
                    let desti = fs.createWriteStream(join(toPath));
                    source.pipe(desti);
                    source.on('end', function () {
                        fs.unlinkSync(join(fromPath), function (err) {
                            if (err) throw err;
                        });
                    });
                }
                else {
                    MoveFolder(fromPath, toPath);
                    fs.rmdirSync(fromPath);
                }
                let list = item;
                list.name = copyName;
                list.filterPath = req.body.targetPath;
                fileList.push(list);
            } else {
                replaceFileList.push(item.name);
            }
        });
        if (replaceFileList.length === 0) {
            copyName = '';
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ files: fileList }));
        } else {
            isRenameChecking = false;
            let errorMsg: any = new Error();
            errorMsg.message = 'File Already Exists.';
            errorMsg.code = '400';
            errorMsg.fileExists = replaceFileList;
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ error: errorMsg, files: [] }));
        }
    }
}

function getRelativePath(rootDirectory: string, fullPath: string) {
    return relative(rootDirectory, fullPath);
    // if (rootDirectory.substring(rootDirectory.length - 1) == '/') {
    //     if (fullPath.indexOf(rootDirectory) >= 0) {
    //         return fullPath.substring(rootDirectory.length - 1);
    //     }
    // }
    // else if (fullPath.indexOf(rootDirectory + '/') >= 0) {
    //     return '/' + fullPath.substring(rootDirectory.length + 1);
    // }
    // else {
    //     return '';
    // }
}

function hasPermission(rule) {
    return ((rule == undefined) || (rule == null) || (rule == Permission.Allow)) ? true : false;
}

function getMessage(rule) {
    return ((rule.message == undefined) || (rule.message == null)) ? '' : rule.message;
}

function updateRules(filePermission, accessRule) {
    filePermission.download = hasPermission(accessRule.read) && hasPermission(accessRule.download);
    filePermission.write = hasPermission(accessRule.read) && hasPermission(accessRule.write);
    filePermission.writeContents = hasPermission(accessRule.read) && hasPermission(accessRule.writeContents);
    filePermission.copy = hasPermission(accessRule.read) && hasPermission(accessRule.copy);
    filePermission.read = hasPermission(accessRule.read);
    filePermission.upload = hasPermission(accessRule.read) && hasPermission(accessRule.upload);
    filePermission.message = getMessage(accessRule);
    return filePermission;
}

function getPathPermission(filePath: string, name: string, isFile: string, contentRootPath: string, filterPath: string) {
    return getPermission(filePath, name, isFile, contentRootPath, filterPath);
}

function getPermission(filePath: string, name: string, isFile: string, contentRootPath: string, filterPath: string) {
    // let filePermission =
    return new AccessPermission(true, true, true, true, true, true, '');
    if (accessDetails == null) {
        return null;
    } else {
        accessDetails.rules.forEach(function (accessRule) {
            if (isFile && accessRule.isFile) {
                let nameExtension = name.substr(name.lastIndexOf('.'), name.length - 1).toLowerCase();
                let fileName = name.substr(0, name.lastIndexOf('.'));
                let currentPath = contentRootPath + filterPath;
                if (accessRule.isFile && isFile && accessRule.path != '' && accessRule.path != null && (accessRule.role == null || accessRule.role == accessDetails.role)) {
                    if (accessRule.path.indexOf('*.*') > -1) {
                        let parentPath = accessRule.path.substr(0, accessRule.path.indexOf('*.*'));
                        if (currentPath.indexOf(contentRootPath + parentPath) == 0 || parentPath == '') {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    }
                    else if (accessRule.path.indexOf('*.') > -1) {
                        let pathExtension = accessRule.path.substr(accessRule.path.lastIndexOf('.'), accessRule.path.length - 1).toLowerCase();
                        let parentPath = accessRule.path.substr(0, accessRule.path.indexOf('*.'));
                        if (((contentRootPath + parentPath) == currentPath || parentPath == '') && nameExtension == pathExtension) {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    }
                    else if (accessRule.path.indexOf('.*') > -1) {
                        let pathName = accessRule.path.substr(0, accessRule.path.lastIndexOf('.')).substr(accessRule.path.lastIndexOf('/') + 1, accessRule.path.length - 1);
                        let parentPath = accessRule.path.substr(0, accessRule.path.indexOf(pathName + '.*'));
                        if (((contentRootPath + parentPath) == currentPath || parentPath == '') && fileName == pathName) {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    }
                    else if (contentRootPath + accessRule.path == filePath) {
                        filePermission = updateRules(filePermission, accessRule);
                    }
                }
            } else {
                if (!accessRule.isFile && !isFile && accessRule.path != null && (accessRule.role == null || accessRule.role == accessDetails.role)) {
                    let parentFolderpath = contentRootPath + filterPath;
                    if (accessRule.path.indexOf('*') > -1) {
                        let parentPath = accessRule.path.substr(0, accessRule.path.indexOf('*'));
                        if (((parentFolderpath + (parentFolderpath[parentFolderpath.length - 1] == '/' ? '' : '/') + name).lastIndexOf(contentRootPath + parentPath) == 0) || parentPath == '') {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    } else if (join(contentRootPath, accessRule.path) == join(parentFolderpath, name) || join(contentRootPath, accessRule.path) == join(parentFolderpath, name + '/')) {
                        filePermission = updateRules(filePermission, accessRule);
                    }
                    else if (join(parentFolderpath, name).lastIndexOf(join(contentRootPath, accessRule.path)) == 0) {
                        filePermission.write = hasPermission(accessRule.writeContents);
                        filePermission.writeContents = hasPermission(accessRule.writeContents);
                        filePermission.message = getMessage(accessRule);
                    }
                }
            }
        });
        return filePermission;
    }
}
/**
 * returns the current working directories
 */
async function FileManagerDirectoryContent(filePath: string, searchFilterPath?: any) {

    const cwd: any = {};
    const stats = await fsPromises.stat(filePath);

    cwd.name = basename(filePath);
    cwd.size = getSize(stats.size);
    cwd.isFile = stats.isFile();
    cwd.dateModified = stats.ctime;
    cwd.dateCreated = stats.mtime;
    cwd.type = extname(filePath);

    cwd.filterPath = searchFilterPath || '';
    // } else {
    //     cwd.filterPath = req.body.data.length > 0 ? getRelativePath(contentRootPath,
    //         contentRootPath + req.body.path.substring(0, req.body.path.indexOf(req.body.data[0].name))) : '';
    // }

    cwd.permission = getPathPermission(filePath, cwd.name, cwd.isFile, contentRootPath, cwd.filterPath);
    if (stats.isFile()) {
        cwd.hasChild = false;
        return cwd;
    }

    if (stats.isDirectory()) {
        cwd.hasChild = true;
        const dirContent = await fsPromises.readdir(filePath);
        for (const d of dirContent) {
            cwd.hasChild = (await fsPromises.lstat(join(filePath, d))).isDirectory();
            if (cwd.hasChild) {
                break;
            }
        }
        return cwd;
    }
}

/*
//Multer to upload the files to the server
let fileName = [];
//MULTER CONFIG: to get file photos to temp server storage
const multerConfig = {
    //specify diskStorage (another option is memory)
    storage: multer.diskStorage({
        //specify destination
        destination: function (req, file, next) {
            next(null, './');
        },

        //specify the filename to be unique
        filename: function (req, file, next) {
            fileName.push(file.originalname);
            next(null, file.originalname);

        }
    }),

    // filter out and prevent non-image files.
    fileFilter: function (req, file, next) {
        next(null, true);
    }
};
*/
/**
 * Gets the imageUrl from the client
 */
/*
app.get('/GetImage', function (req, res) {
    req.body.path = req.body.path.replace(pattern, '');
    let image = req.query.path.split('/').length > 1 ? req.query.path : '/' + req.query.path;
    let pathPermission = getPermission(contentRootPath + image.substr(0, image.lastIndexOf('/')), image.substr(image.lastIndexOf('/') + 1, image.length - 1), true, contentRootPath, image.substr(0, image.lastIndexOf('/')));
    if (pathPermission != null && !pathPermission.read) {
        return null;
    }
    else {
        fs.readFile(contentRootPath + image, function (err, content) {
            if (err) {
                res.writeHead(400, { 'Content-type': 'text/html' });
                res.end('No such image');
            } else {
                //specify the content type in the response will be an image
                res.writeHead(200, { 'Content-type': 'image/jpg' });
                res.end(content);
            }
        });
    }
});
*/
/**
 * Handles the upload request
 */
/*
app.post('/Upload', multer(multerConfig).any('uploadFiles'), function (req, res) {
    req.body.path = req.body.path.replace(pattern, '');
    let pathPermission = getPathPermission(req.path, true, JSON.parse(req.body.data).name, contentRootPath + req.body.path, contentRootPath, JSON.parse(req.body.data).filterPath);
    if (pathPermission != null && (!pathPermission.read || !pathPermission.upload)) {
        let errorMsg = new Error();
        errorMsg.message = (permission.message !== '') ? permission.message :
            JSON.parse(req.body.data).name + ' is not accessible. You need permission to perform the upload action.';
        errorMsg.code = '401';
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    } else {
        for (let i = 0; i < fileName.length; i++) {
            fs.rename('./' + fileName[i], join(contentRootPath, req.body.path + fileName[i]), function (err) {
                if (err) throw err;
            });
        }
        res.send('Success');
        fileName = [];
    }
});
*/
/**
 * Download a file or folder
 */
/*
app.post('/Download', function (req, res) {
    req.body.path = req.body.path.replace(pattern, '');
    let downloadObj = JSON.parse(req.body.downloadInput);
    let permission; let permissionDenied = false;
    downloadObj.data.forEach(function (item) {
        let filepath = (contentRootPath + item.filterPath).replace(/\\/g, '/');
        permission = getPermission(filepath + item.name, item.name, item.isFile, contentRootPath, item.filterPath);
        if (permission != null && (!permission.read || !permission.download)) {
            permissionDenied = true;
            let errorMsg = new Error();
            errorMsg.message = (permission.message !== '') ? permission.message : getFileName(contentRootPath + item.filterPath + item.name) + ' is not accessible. You need permission to perform the download action.';
            errorMsg.code = '401';
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
    });
    if (!permissionDenied) {
        if (downloadObj.names.length === 1 && downloadObj.data[0].isFile) {
            let file = contentRootPath + downloadObj.path + downloadObj.names[0];
            res.download(file);
        } else {
            let archive = archiver('zip', {
                gzip: true,
                zlib: { level: 9 } // Sets the compression level.
            });
            let output = fs.createWriteStream('./Files.zip');
            downloadObj.data.forEach(function (item) {
                archive.on('error', function (err) {
                    throw err;
                });
                if (item.isFile) {
                    archive.file(contentRootPath + item.filterPath + item.name, { name: item.name });
                }
                else {
                    archive.directory(contentRootPath + item.filterPath + item.name + '/', item.name);
                }
            });
            archive.pipe(output);
            archive.finalize();
            output.on('close', function () {
                let stat = fs.statSync(output.path);
                res.writeHead(200, {
                    'Content-disposition': 'attachment; filename=Files.zip; filename*=UTF-8',
                    'Content-Type': 'APPLICATION/octet-stream',
                    'Content-Length': stat.size
                });
                let filestream = fs.createReadStream(output.path);
                filestream.pipe(res);
            });
        }
    }
});
*/

/**
 * Handles the read request
 */
async function fileManagerRead(req: any, res: any) {
    req.setTimeout(0);
    const data = req.body;
    const path = join(contentRootPath, resolve('/', normalize(data.path)));

    /*
    function getRules() {
        let details = new AccessDetails();
        let accessRuleFile = 'accessRules.json';
        if (!fs.existsSync(accessRuleFile)) { return null; }
        let rawData = fs.readFileSync(accessRuleFile);
        if (rawData.length === 0) { return null; }
        let parsedData = JSON.parse(rawData);
        let data = parsedData.rules;
        let accessRules = [];
        for (let i = 0; i < data.length; i++) {
            let rule = new AccessRules(data[i].path, data[i].role, data[i].read, data[i].write, data[i].writeContents, data[i].copy, data[i].download, data[i].upload, data[i].isFile, data[i].message);
            accessRules.push(rule);
        }
        if (accessRules.length == 1 && accessRules[0].path == undefined) {
            return null;
        } else {
            details.rules = accessRules;
            details.role = parsedData.role;
            return details;
        }
    }

    accessDetails = getRules();
*/
    // Action for getDetails
    if (data.action === 'details') {
        res.setHeader('Content-Type', 'application/json');
        res.json(
            JSON.stringify(
                await getFileDetails(data.names, data, contentRootPath + data.path, data.data[0].filterPath, basename(contentRootPath))
            )
        );
    }
    // Action for copying files
    if (req.body.action === 'copy') {
        CopyFiles(req, res, contentRootPath);
    }
    // Action for movinh files
    if (req.body.action === 'move') {
        // MoveFiles(req, res, contentRootPath);
    }
    // Action to create a new folder
    if (req.body.action === 'create') {
        createFolder(req, res, contentRootPath + req.body.path, contentRootPath);
    }
    // Action to remove a file
    if (req.body.action === 'delete') {
        // deleteFolder(req, res, contentRootPath);
    }
    // Action to rename a file
    if (req.body.action === 'rename') {
        renameFolder(req, res); // , contentRootPath + req.body.path
    }

    function addSearchList(filename: string, contentRootPath: string, fileList: any, files: any, index: number) {
        let cwd: any = {};
        let stats = fs.statSync(filename);
        cwd.name = basename(filename);
        cwd.size = stats.size;
        cwd.isFile = stats.isFile();
        cwd.dateModified = stats.mtime;
        cwd.dateCreated = stats.ctime;
        cwd.type = extname(filename);
        cwd.filterPath = filename.substr((contentRootPath.length), filename.length).replace(files[index], '');
        cwd.permission = getPermission(filename.replace(/\\/g, '/'), cwd.name, cwd.isFile, contentRootPath, cwd.filterPath);
        let permission = parentsHavePermission(filename, contentRootPath, cwd.isFile, cwd.name, cwd.filterPath);
        if (permission) {
            if (fs.lstatSync(filename).isFile()) {
                cwd.hasChild = false;
            }
            if (fs.lstatSync(filename).isDirectory()) {
                let statsRead = fs.readdirSync(filename);
                cwd.hasChild = statsRead.length > 0;
            }
            fileList.push(cwd);
        }
    }

    function parentsHavePermission(filepath, contentRootPath, isFile, name, filterPath) {
        let parentPath = filepath.substr(contentRootPath.length, filepath.length - 1).replace(/\\/g, '/');
        parentPath = parentPath.substr(0, parentPath.indexOf(name)) + (isFile ? '' : '/');
        let parents = parentPath.split('/');
        let currPath = '/';
        let hasPermission = true;
        let pathPermission;
        for (let i = 0; i <= parents.length - 2; i++) {
            currPath = (parents[i] == '') ? currPath : (currPath + parents[i] + '/');
            pathPermission = getPathPermission(parentPath, false, parents[i], contentRootPath + (currPath == '/' ? '' : '/'), contentRootPath, filterPath);
            if (pathPermission == null) {
                break;
            }
            else if (pathPermission != null && !pathPermission.read) {
                hasPermission = false;
                break;
            }
        }
        return hasPermission;
    }

    function checkForSearchResult(casesensitive, filter, isFile, fileName, searchString) {
        let isAddable = false;
        if (searchString.substr(0, 1) == '*' && searchString.substr(searchString.length - 1, 1) == '*') {
            if (casesensitive ? fileName.indexOf(filter) >= 0 : (fileName.indexOf(filter.toLowerCase()) >= 0 || fileName.indexOf(filter.toUpperCase()) >= 0)) {
                isAddable = true
            }
        } else if (searchString.substr(searchString.length - 1, 1) == '*') {
            if (casesensitive ? fileName.startsWith(filter) : (fileName.startsWith(filter.toLowerCase()) || fileName.startsWith(filter.toUpperCase()))) {
                isAddable = true
            }
        } else {
            if (casesensitive ? fileName.endsWith(filter) : (fileName.endsWith(filter.toLowerCase()) || fileName.endsWith(filter.toUpperCase()))) {
                isAddable = true
            }
        }
        return isAddable;
    }

    function fromDir(startPath, filter, contentRootPath, casesensitive, searchString, fileList: any) {
        if (!fs.existsSync(startPath)) {
            return;
        }
        let files = fs.readdirSync(startPath);
        for (let i = 0; i < files.length; i++) {
            let filename = join(startPath, files[i]);
            let stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                if (checkForSearchResult(casesensitive, filter, false, files[i], searchString)) {
                    addSearchList(filename, contentRootPath, fileList, files, i);
                }
                fromDir(filename, filter, contentRootPath, casesensitive, searchString, fileList); //recurse
            }
            else if (checkForSearchResult(casesensitive, filter, true, files[i], searchString)) {
                addSearchList(filename, contentRootPath, fileList, files, i);
            }
        }
    }

    // Action to search a file
    if (data.action === 'search') {
        let fileList: any[] = [];
        fromDir(path, data.searchString.replace(/\*/g, ''), contentRootPath, data.caseSensitive, data.searchString, fileList) ;
        (async () => {
            const tes = await FileManagerDirectoryContent(path);
            if (tes.permission != null && !tes.permission.read) {
                const errorMsg: any = new Error();
                errorMsg.message = (tes.permission.message !== '') ? tes.permission.message :
                    '\'' + tes.name + '\' is not accessible. You need permission to perform the read action.';
                    // '\'' + getFileName(contentRootPath + (req.body.path.substring(0, req.body.path.length - 1))) + '\' is not accessible. You need permission to perform the read action.';
                errorMsg.code = '401';
                res.setHeader('Content-Type', 'application/json');
                res.json(JSON.stringify({ error: errorMsg }));
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.json(JSON.stringify({ cwd: tes, files: fileList }));
            }
        })();
    }

    async function ReadDirectories(file: any, path: string) {
        Logger.debug('ReadDirectories:', file, path);

        async function stats(fileToStat: any) {

            Logger.debug('stats:', fileToStat);
            const cwd: any = {};
            // return new Promise((resolve, reject) => {
            try {

                const fStats = await fsPromises.stat(fileToStat);
                Logger.debug('fStats:', fStats);
                cwd.name = basename(fileToStat);
                cwd.size = (fStats.size);
                cwd.isFile = fStats.isFile();
                cwd.dateModified = fStats.ctime;
                cwd.dateCreated = fStats.mtime;
                cwd.filterPath = getRelativePath(contentRootPath, path);
                cwd.type = extname(fileToStat);
                cwd.permission = getPermission(contentRootPath + req.body.path + cwd.name, cwd.name, cwd.isFile, contentRootPath, cwd.filterPath);
                cwd.hasChild = false;

                if (fStats.isDirectory()) {
                    for (const f of (await GetFiles(fileToStat))) {
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

        const promiseList = [];
        for (const f of file) {
            const statResult = await stats(join(path, f));
            if (statResult) { promiseList.push(statResult); }
        }
        return promiseList;
    }

    // Action to read a file
    if (data.action === 'read') {
        const filesList = await GetFiles(path);
        const cwdFiles = await FileManagerDirectoryContent(path);
        // cwdFiles.name = req.body.path == '/' ? rootName = (basename(contentRootPath + req.body.path)) : basename(contentRootPath + req.body.path)
        if (cwdFiles.permission != null && !cwdFiles.permission.read) {
            const errorMsg: any = new Error();
            errorMsg.message = (cwdFiles.permission.message !== '') ? cwdFiles.permission.message :
                '' + cwdFiles.name + ' is not accessible. You need permission to perform the read action.';
            errorMsg.code = 401;
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ cwd: cwdFiles, files: null, error: errorMsg }));
        } else {
            const readDir = await ReadDirectories(filesList, path);
            res.setHeader('Content-Type', 'application/json');
            res.json(JSON.stringify({ cwd: cwdFiles, files: readDir }));
            Logger.debug('Action READ: ', { cwd: cwdFiles, files: readDir });
        }
    }
}


/**
 * Server serving port
 */
// let runPort = process.env.PORT || 8090;
// let server = app.listen(runPort, function () {
//     server.setTimeout(10 * 60 * 1000);
//     let host = server.address().address;
//     let port = server.address().port;
//     console.log('Example app listening at http://%s:%s', host, port);
// });

Meteor.startup(async () => {

    async function debugMiddle(req: any, res: any, next) {
        Logger.debug('[Books fileManager]:', req.method, req.url, req.body, req.user);
        return next();
    }

    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    // app.use(cors());
    app.post('/', debugMiddle, fileManagerRead);
    WebApp.connectHandlers.use('/filemanager', app);
});
