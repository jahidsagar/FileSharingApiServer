const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
var ncrypt = require("ncrypt-js");
const rateLimit = require('express-rate-limit');
const { updateFileTime, storeFile, deleteFile } = require('./FileHelper');
const { cleanupJob } = require('./CornForDeleteFile');
require('dotenv').config()



// Set upload/download rate limit
const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: process.env.MAX_REQUEST_LIMIT || 4, // limit each IP to 100 requests per windowMs
    message: 'Daily upload/download limit exceeded'
});
const app = express();

// add limit
// app.use(limiter); // disable when testing this app

// start corn job to delete file
cleanupJob.start();

// load secret key one for get another for delete
const _getFileSecret = process.env.GET_SECRET;
const _deleteFileSecret = process.env.DELETE_SECRET;

// create object using secret key
var getNcryptObject = new ncrypt(_getFileSecret);
var deleteNcryptObject = new ncrypt(_deleteFileSecret);

// Set up middleware for parsing multipart/form-data requests
const upload = multer({ dest: 'uploads/' });

// Define constants for environment variables
const DEFAULT_PORT = 3000;
const DEFAULT_FOLDER = path.join(__dirname, 'uploads');

// Define routes for HTTP REST API endpoints
app.post('/files', upload.single('file'), (req, res) => {
    // generate random key for file name
    const randomKey = uuidv4();
    const fileNameShouldBe = `${randomKey}${path.extname(req.file.originalname)}`;

    // Save uploaded file
    storeFile(req, fileNameShouldBe);

    // Return public and private keys as JSON response
    res.status(200).json(
        {
            publicKey: getNcryptObject.encrypt(fileNameShouldBe),
            privateKey: deleteNcryptObject.encrypt(fileNameShouldBe)
        }
    );
});

app.get('/files/:publicKey', (req, res) => {
    // Handle file download using public key to look up private key and file path
    const publicKey = req.params.publicKey;
    const decryptFileName = getNcryptObject.decrypt(publicKey);
    const filePath = path.join(process.env.FOLDER || DEFAULT_FOLDER, decryptFileName);

    // before sending update current time so that it will help to
    // identify inactive time
    updateFileTime(filePath);

    // Set Content-Type header based on file extension
    const contentType = 'application/octet-stream'; // Replace with actual MIME type lookup based on extension
    res.setHeader('Content-Type', contentType);
    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    res.status(200);
});

app.delete('/files/:privateKey', (req, res) => {
    // Handle file deletion using private key to look up file path and remove file
    const privateKey = req.params.privateKey;
    const decryptFileName = deleteNcryptObject.decrypt(privateKey);
    const filePath = path.join(process.env.FOLDER || DEFAULT_FOLDER, decryptFileName);

    try {
        deleteFile(filePath);
        res.status(200).json({ message: 'File successfully deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
const port = process.env.PORT || DEFAULT_PORT;
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

module.exports = server;