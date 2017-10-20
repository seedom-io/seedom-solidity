const dir = require('node-dir');
const util = require('util');
const path = require("path");
const fs = require('mz/fs');

let getFilesOfExtInDir = async (dirPath) => {
    var files = await dir.promiseFiles(dirPath);
    return files.filter(file => path.extname(file) == ".sol");
}

let makeDirP = async (dirPath) => {
    if (!(await fs.exists(dirPath))) {
        await fs.mkdir(dirPath);
    }
}

let printLines = (lines) => {
    for (let line of lines) {
        console.log(line);
    }
}

let getConfigFromFile = async (filePath) => {
    let configJson = await fs.readFile(filePath, 'utf8');
    return JSON.parse(configJson);
}

let mergeObjectIntoJsonFile = async (obj, filePath) => {
    
    let json = await fs.readFile(filePath, 'utf8');
    let js = JSON.parse(json);
    for (let name in obj) {
        js[name] = obj[name];
    }

    await fs.writeFile(filePath, JSON.stringify(js, null, 4), 'utf8');

}

module.exports = {
    makeDirP: makeDirP,
    printLines: printLines,
    getFilesOfExtInDir: getFilesOfExtInDir,
    getConfigFromFile: getConfigFromFile,
    mergeObjectIntoJsonFile: mergeObjectIntoJsonFile
}