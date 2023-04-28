const fs = require('fs');
const path = require('path');
const { updateFileTime, storeFile, deleteFile } = require('../FileHelper.js');

// create test folder and file for testing
const testFolder = path.join(__dirname, 'testFolder');
const testFile = path.join(testFolder, 'testFile.txt');

// Create the test folder if it does not exist
if (!fs.existsSync(testFolder)) {
  fs.mkdirSync(testFolder);
  fs.writeFileSync(testFile, 'test content');
}else{
  fs.writeFileSync(testFile, 'test content');
}
// Create the test file with some content
fs.writeFileSync(testFile, 'test content');

// remove test folder and file after testing
afterAll(() => {
//   fs.unlinkSync(testFile);
  // fs.rmdirSync(testFolder);
});

describe('updateFileTime function', () => {
    it('should update the file modification time', () => {
        const now = new Date();
        const stats = fs.statSync(testFile);
        expect(stats.mtime.toString()).toEqual(now.toString());
    });
});

test('updateFileTime rejects with error when given invalid file path', async () => {
    expect.assertions(1);
    const invalidFilePath = 'non-existent-file.txt';
    try {
        await updateFileTime(invalidFilePath);
    } catch (err) {
        expect(err).toBeDefined();
    }
});

describe('storeFile function', () => {
  it('should store a file in the correct folder with the correct name', () => {
    const fileNameShouldBe = 'storedFile.txt';
    const req = {
      file: {
        path: testFile
      }
    };
    const storeFilePath = path.join(process.env.FOLDER || DEFAULT_FOLDER, fileNameShouldBe);
    storeFile(req, fileNameShouldBe);

    expect(fs.existsSync(storeFilePath)).toBe(true);
  });
});

describe('deleteFile function', () => {
  it('should delete a file', () => {
    const filePathToDelete = path.join(process.env.FOLDER || DEFAULT_FOLDER,'storedFile.txt');
    deleteFile(filePathToDelete);
    expect(fs.existsSync(filePathToDelete)).toBe(false);
  });
});
