const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
var ncrypt = require("ncrypt-js");
const { updateFileTime, storeFile, deleteFile } = require('./FileHelper');
const { cleanupJob } = require('./CornForDeleteFile');
const { limiter } = require('./rateLimiter');
const { gstorage } = require('./gcs');
require('dotenv').config()

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
const DESTINATION = process.env.DESTINATION;

// gcs configuraiton
const bucket = gstorage.bucket('your-bucket-name');

// Define routes for HTTP REST API endpoints
app.post('/files', upload.single('file'), (req, res) => {
    try {
        // generate random key for file name
        const randomKey = uuidv4();

        if (DESTINATION === 'local') {
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
        } else if (DESTINATION === 'gcs') {
            const file = req.file;
            const fileNameShouldBe = `${randomKey}`;
            const blob = bucket.file(fileNameShouldBe);
            const blobStream = blob.createWriteStream();

            blobStream.on('error', (err) => next(err));
            blobStream.on('finish', () => {
                // Set the public URL of the file once it's uploaded
                blob.makePublic().then(() => {
                    file.publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                    res.status(200).json({
                        publicKey: getNcryptObject.encrypt(fileNameShouldBe),
                        privateKey: deleteNcryptObject.encrypt(fileNameShouldBe)
                    });
                });
            });

            blobStream.end(file.buffer);
        } else {
            res.status(400).json({ message: 'Invalid destination' });
        }
    } catch (error) {
        res.status(400).json({ message: `error: ${error}` });
    }

});

app.get('/files/:publicKey', async (req, res) => {
    // Handle file download using public key to look up private key and file path
    const publicKey = req.params.publicKey;
    const decryptFileName = getNcryptObject.decrypt(publicKey);
    const filePath = path.join(process.env.FOLDER || DEFAULT_FOLDER, decryptFileName);
    try {
        if (DESTINATION === 'local') {
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
        } else if (DESTINATION === 'gcs') {
            const file = bucket.file(filename);

            const [exists] = await file.exists();
            if (!exists) {
                return res.status(404).json({ message: 'File not found' });
            }

            const readStream = file.createReadStream();
            readStream.on('error', (err) => next(err));

            res.setHeader('Content-Type', file.metadata.contentType);
            res.setHeader('Content-Length', file.metadata.size);

            readStream.pipe(res);
        } else {
            res.status(400).json({ message: 'Invalid destination' });
        }

    } catch (error) {
        res.status(400).json({ message: `error: ${error}` });
    }


});

app.delete('/files/:privateKey', async (req, res) => {
    // Handle file deletion using private key to look up file path and remove file
    const privateKey = req.params.privateKey;
    const decryptFileName = deleteNcryptObject.decrypt(privateKey);
    const filePath = path.join(process.env.FOLDER || DEFAULT_FOLDER, decryptFileName);

    try {
        if (DESTINATION === 'local') {

            deleteFile(filePath);
            res.status(200).json({ message: 'File successfully deleted' });

        } else if (DESTINATION === 'gcs') {

            const file = bucket.file(filename);

            const [exists] = await file.exists();
            if (!exists) {
                return res.status(404).json({ message: 'File not found' });
            }

            await file.delete();

            res.json({ message: 'File deleted from Google Cloud Storage successfully!' });

        } else {
            res.status(400).json({ message: 'Invalid destination' });
        }

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