const { Storage } = require('@google-cloud/storage');

const gstorage = new Storage({
    projectId: 'your-project-id',
    keyFilename: 'path/to/keyfile.json',
});

module.exports = {
    gstorage
}