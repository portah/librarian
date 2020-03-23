export const Permission = {
    Allow: 'allow',
    Deny: 'deny'
};

export class AccessDetails {
    constructor(
        public role: any,
        public rules: any) {
    }
}

export class AccessPermission {
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

export class AccessRules {
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

function hasPermission(rule?: any) {
    return ((rule === undefined) || (rule === null) || (rule === Permission.Allow)) ? true : false;
}

function getMessage(rule: any) {
    return ((rule.message === undefined) || (rule.message === null)) ? '' : rule.message;
}

export function updateRules(filePermission: AccessPermission, accessRule: AccessRules): AccessPermission {
    filePermission.download = hasPermission(accessRule.read) && hasPermission(accessRule.download);
    filePermission.write = hasPermission(accessRule.read) && hasPermission(accessRule.write);
    filePermission.writeContents = hasPermission(accessRule.read) && hasPermission(accessRule.writeContents);
    filePermission.copy = hasPermission(accessRule.read) && hasPermission(accessRule.copy);
    filePermission.read = hasPermission(accessRule.read);
    filePermission.upload = hasPermission(accessRule.read) && hasPermission(accessRule.upload);
    filePermission.message = getMessage(accessRule);
    return filePermission;
}


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

export function getPermission(filePath: string, name: string, isFile: boolean, contentRootPath: string, filterPath: string) {
    const filePermission = new AccessPermission(true, true, true, true, true, true, '');
    /*
    if (accessDetails == null) {
        return null;
    } else {
        accessDetails.rules.forEach((accessRule: AccessRules) => {
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
        */
    return filePermission;
}

export function parentsHavePermission(filepath: string, contentRootPath: string, isFile: boolean, name: string, filterPath?: string) {
    let parentPath = filepath.substr(contentRootPath.length, filepath.length - 1).replace(/\\/g, '/');
    parentPath = parentPath.substr(0, parentPath.indexOf(name)) + (isFile ? '' : '/');
    let parents = parentPath.split('/');
    let currPath = '/';
    let hasPermission = true;
    let pathPermission;
    for (let i = 0; i <= parents.length - 2; i++) {
        currPath = (parents[i] == '') ? currPath : (currPath + parents[i] + '/');
        pathPermission = getPermission(parentPath, parents[i], false, contentRootPath + (currPath == '/' ? '' : '/'), contentRootPath); // ,filterPath
        if (pathPermission == null) {
            break;
        } else if (pathPermission != null && !pathPermission.read) {
            hasPermission = false;
            break;
        }
    }
    return hasPermission;
}
