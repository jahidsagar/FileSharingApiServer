const fs = require('fs');
const path = require('path');
require('dotenv').config()

// store file 
const storeFile = (req, fileNameShouldBe) => {
    fs.renameSync(req.file.path, path.join(process.env.FOLDER || DEFAULT_FOLDER, fileNameShouldBe));
}

// update file time
const updateFileTime = async (filePath, now = new Date()) => {
    return new Promise((resolve, reject) => {
        fs.utimes(filePath, now, now, (err) => {
            if (err) {
                console.error(`Failed to change mtime of file ${filePath}`);
                reject(err);
            } else {
                console.log(`Successfully changed mtime of file ${filePath}`);
                resolve();
            }
        });
    });

}

// delete file
const deleteFile = (filePath) => {
    fs.unlinkSync(filePath);
}

module.exports = {
    updateFileTime,
    storeFile,
    deleteFile
}