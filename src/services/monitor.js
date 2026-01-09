const axios = require('axios');
const cron = require('node-cron');
const db = require('../db/database');
const { sendDownAlert, sendUpAlert } = require('./email');

// Track last check time for rate limiting
const lastCheckTimes = new Map();

async function checkWebsite(website) {
    const startTime = Date.now();
    let statusCode = null;
    let isUp = false;
    let errorMessage = null;

    try {
        const response = await axios.get(website.url, {
            timeout: 30000, // 30 second timeout
            validateStatus: () => true, // Don't throw on any status
            headers: {
                'User-Agent': 'UptimeMonitor/1.0'
            }
        });

        statusCode = response.status;
        isUp = statusCode >= 200 && statusCode < 400;
    } catch (error) {
        errorMessage = error.message;
        isUp = false;
    }

    const responseTime = Date.now() - startTime;

    // Log the ping
    const insertLog = db.prepare(`
        INSERT INTO ping_logs (website_id, status_code, response_time_ms, is_up, error_message)
        VALUES (?, ?, ?, ?, ?)
    `);
    insertLog.run(website.id, statusCode, responseTime, isUp ? 1 : 0, errorMessage);

    // Update website status
    const updateWebsite = db.prepare(`
        UPDATE websites
        SET is_up = ?, last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    updateWebsite.run(isUp ? 1 : 0, website.id);

    // Check if status changed and send alerts
    const wasUp = website.is_up === 1;

    if (wasUp && !isUp) {
        // Website went down
        await handleDownEvent(website);
    } else if (!wasUp && isUp) {
        // Website came back up
        await handleUpEvent(website);
    }

    return { statusCode, responseTime, isUp, errorMessage };
}

async function handleDownEvent(website) {
    // Get user email
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(website.user_id);
    if (!user) return;

    // Log alert
    const insertAlert = db.prepare(`
        INSERT INTO alerts (website_id, alert_type, message)
        VALUES (?, 'down', ?)
    `);
    insertAlert.run(website.id, `Website ${website.name} is down`);

    // Send email
    await sendDownAlert(user.email, website);
    console.log(`DOWN alert sent for ${website.name} to ${user.email}`);
}

async function handleUpEvent(website) {
    // Get user email
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(website.user_id);
    if (!user) return;

    // Calculate downtime
    const lastDownAlert = db.prepare(`
        SELECT sent_at FROM alerts
        WHERE website_id = ? AND alert_type = 'down'
        ORDER BY sent_at DESC LIMIT 1
    `).get(website.id);

    let downtime = 'Unknown';
    if (lastDownAlert) {
        const downtimeMs = new Date() - new Date(lastDownAlert.sent_at);
        const minutes = Math.floor(downtimeMs / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            downtime = `${hours}h ${minutes % 60}m`;
        } else {
            downtime = `${minutes}m`;
        }
    }

    // Log alert
    const insertAlert = db.prepare(`
        INSERT INTO alerts (website_id, alert_type, message)
        VALUES (?, 'up', ?)
    `);
    insertAlert.run(website.id, `Website ${website.name} is back up after ${downtime}`);

    // Send email
    await sendUpAlert(user.email, website, downtime);
    console.log(`UP alert sent for ${website.name} to ${user.email}`);
}

async function runMonitoringCycle() {
    const now = Date.now();

    // Get all active websites
    const websites = db.prepare(`
        SELECT w.*, u.email as user_email
        FROM websites w
        JOIN users u ON w.user_id = u.id
        WHERE w.is_active = 1
    `).all();

    for (const website of websites) {
        // Check if enough time has passed since last check
        const lastCheck = lastCheckTimes.get(website.id) || 0;
        const interval = website.check_interval * 60 * 1000; // Convert minutes to ms

        if (now - lastCheck >= interval) {
            try {
                await checkWebsite(website);
                lastCheckTimes.set(website.id, now);
            } catch (error) {
                console.error(`Error checking ${website.url}:`, error.message);
            }
        }
    }
}

function startMonitoring() {
    console.log('Starting uptime monitoring service...');

    // Run every minute to check websites
    cron.schedule('* * * * *', async () => {
        try {
            await runMonitoringCycle();
        } catch (error) {
            console.error('Monitoring cycle error:', error);
        }
    });

    // Run initial check
    runMonitoringCycle();
}

// Manual check function for immediate testing
async function checkWebsiteNow(websiteId) {
    const website = db.prepare('SELECT * FROM websites WHERE id = ?').get(websiteId);
    if (!website) return null;
    return checkWebsite(website);
}

module.exports = {
    startMonitoring,
    checkWebsite,
    checkWebsiteNow,
    runMonitoringCycle
};
