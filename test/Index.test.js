const request = require('supertest');
const server = require('../index');
const path = require('path');

// create test folder and file for testing
const testFolder = path.join(__dirname, 'testFolder');
const testFile = path.join(testFolder, 'newFile.txt');
// fs.mkdirSync(testFolder);
// fs.writeFileSync(testFile, 'test content');

describe('File Upload API', () => {
    afterAll(() => {
        server.close();
    });

    describe('POST /files', () => {
        it('should upload a file and return public and private keys', async () => {
            const res = await request(server)
                .post('/files')
                .attach('file', testFile)
                .expect(200);

            expect(res.body).toHaveProperty('publicKey');
            expect(res.body).toHaveProperty('privateKey');
        });
    });

    describe('GET /files/:publicKey', () => {
        it('should download a file given a valid public key', async () => {
            const res = await request(server)
                .post('/files')
                .attach('file', testFile);

            const publicKey = res.body.publicKey;

            const downloadRes = await request(server)
                .get(`/files/${publicKey}`)
                .expect(200);

            expect(downloadRes.headers['content-type']).toBe('application/octet-stream');
        });
    });

    describe('DELETE /files/:privateKey', () => {
        it('should delete a file given a valid private key', async () => {
            const uploadRes = await request(server)
                .post('/files')
                .attach('file', testFile);

            const privateKey = uploadRes.body.privateKey;
            const deleteRes = await request(server)
                .delete(`/files/${privateKey}`)
                .expect(200);

            expect(deleteRes.body).toHaveProperty('message');
            expect(deleteRes.body.message).toBe('File successfully deleted');
        });
    });
});
