require('dotenv').config()
const CronJob = require('cron').CronJob;
const fs = require('fs');
const path = require('path');

// geting corn job time
const minute = process.env.MINUTE;
const hour = process.env.HOUR;
const dayOfMonth = process.env.DAY_OF_MONTH;
const month = process.env.MONTH;
const dayOfWeek = process.env.DAY_OF_WEEK;

const cleanupJob = new CronJob(`${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`, () => {
    const folder = process.env.FOLDER;
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    fs.readdir(folder, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        files.forEach(file => {
            const filePath = path.join(folder, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error('Error getting file stats:', err);
                    return;
                }
                if (stats.mtime < threshold) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error('Error deleting file:', err);
                        } else {
                            console.log('File deleted:', file);
                        }
                    });
                }
            });
        });
        console.log('i am working')
    });
});
// cleanupJob.start();
module.exports = {
    cleanupJob
}