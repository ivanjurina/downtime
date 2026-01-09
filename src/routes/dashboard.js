const express = require('express');
const db = require('../db/database');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// GET /dashboard
router.get('/', (req, res) => {
    // Get user's websites with latest status
    const websites = db.prepare(`
        SELECT
            w.*,
            (SELECT COUNT(*) FROM ping_logs WHERE website_id = w.id) as total_checks,
            (SELECT COUNT(*) FROM ping_logs WHERE website_id = w.id AND is_up = 1) as up_checks,
            (SELECT AVG(response_time_ms) FROM ping_logs WHERE website_id = w.id AND is_up = 1) as avg_response_time
        FROM websites w
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
    `).all(req.session.userId);

    // Calculate uptime for each website
    const websitesWithUptime = websites.map(w => ({
        ...w,
        uptime: w.total_checks > 0 ? ((w.up_checks / w.total_checks) * 100).toFixed(2) : '100.00',
        avg_response_time: Math.round(w.avg_response_time || 0)
    }));

    // Get summary stats
    const totalWebsites = websites.length;
    const upWebsites = websites.filter(w => w.is_up === 1).length;
    const downWebsites = totalWebsites - upWebsites;

    // Get recent alerts
    const recentAlerts = db.prepare(`
        SELECT a.*, w.name as website_name, w.url as website_url
        FROM alerts a
        JOIN websites w ON a.website_id = w.id
        WHERE w.user_id = ?
        ORDER BY a.sent_at DESC
        LIMIT 10
    `).all(req.session.userId);

    // Get last 24 hours of pings for chart
    const last24Hours = db.prepare(`
        SELECT
            strftime('%Y-%m-%d %H:00', p.checked_at) as hour,
            COUNT(*) as total,
            SUM(CASE WHEN p.is_up = 1 THEN 1 ELSE 0 END) as up_count,
            AVG(CASE WHEN p.is_up = 1 THEN p.response_time_ms END) as avg_response
        FROM ping_logs p
        JOIN websites w ON p.website_id = w.id
        WHERE w.user_id = ? AND p.checked_at >= datetime('now', '-24 hours')
        GROUP BY hour
        ORDER BY hour
    `).all(req.session.userId);

    res.render('dashboard/index', {
        title: 'Dashboard',
        websites: websitesWithUptime,
        stats: {
            total: totalWebsites,
            up: upWebsites,
            down: downWebsites
        },
        recentAlerts,
        chartData: last24Hours
    });
});

// API endpoint for dashboard stats (for real-time updates)
router.get('/api/stats', (req, res) => {
    const websites = db.prepare(`
        SELECT
            w.*,
            (SELECT COUNT(*) FROM ping_logs WHERE website_id = w.id) as total_checks,
            (SELECT COUNT(*) FROM ping_logs WHERE website_id = w.id AND is_up = 1) as up_checks
        FROM websites w
        WHERE w.user_id = ?
    `).all(req.session.userId);

    const totalWebsites = websites.length;
    const upWebsites = websites.filter(w => w.is_up === 1).length;

    res.json({
        total: totalWebsites,
        up: upWebsites,
        down: totalWebsites - upWebsites,
        websites: websites.map(w => ({
            id: w.id,
            name: w.name,
            is_up: w.is_up === 1,
            uptime: w.total_checks > 0 ? ((w.up_checks / w.total_checks) * 100).toFixed(2) : '100.00'
        }))
    });
});

module.exports = router;
