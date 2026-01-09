const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { isAuthenticated } = require('../middleware/auth');
const { checkWebsiteNow } = require('../services/monitor');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// GET /websites - List all websites
router.get('/', (req, res) => {
    const websites = db.prepare(`
        SELECT * FROM websites
        WHERE user_id = ?
        ORDER BY created_at DESC
    `).all(req.session.userId);

    res.render('websites/index', {
        title: 'My Websites',
        websites
    });
});

// GET /websites/add - Add website form
router.get('/add', (req, res) => {
    res.render('websites/add', {
        title: 'Add Website',
        errors: [],
        formData: { check_interval: 5 }
    });
});

// POST /websites/add - Create new website
router.post('/add', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('url').trim().isURL().withMessage('Please enter a valid URL'),
    body('check_interval').isInt({ min: 1, max: 60 }).withMessage('Check interval must be between 1 and 60 minutes')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('websites/add', {
            title: 'Add Website',
            errors: errors.array(),
            formData: req.body
        });
    }

    let { name, url, check_interval } = req.body;

    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        db.prepare(`
            INSERT INTO websites (user_id, name, url, check_interval)
            VALUES (?, ?, ?, ?)
        `).run(req.session.userId, name, url, check_interval);

        res.redirect('/websites');
    } catch (error) {
        console.error('Error adding website:', error);
        res.render('websites/add', {
            title: 'Add Website',
            errors: [{ msg: 'An error occurred. Please try again.' }],
            formData: req.body
        });
    }
});

// GET /websites/:id - View website details
router.get('/:id', (req, res) => {
    const website = db.prepare(`
        SELECT * FROM websites
        WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.userId);

    if (!website) {
        return res.status(404).render('error', {
            title: 'Not Found',
            message: 'Website not found'
        });
    }

    // Get recent ping logs
    const logs = db.prepare(`
        SELECT * FROM ping_logs
        WHERE website_id = ?
        ORDER BY checked_at DESC
        LIMIT 100
    `).all(website.id);

    // Calculate stats
    const stats = db.prepare(`
        SELECT
            COUNT(*) as total_checks,
            SUM(CASE WHEN is_up = 1 THEN 1 ELSE 0 END) as up_count,
            AVG(CASE WHEN is_up = 1 THEN response_time_ms END) as avg_response_time,
            MIN(CASE WHEN is_up = 1 THEN response_time_ms END) as min_response_time,
            MAX(CASE WHEN is_up = 1 THEN response_time_ms END) as max_response_time
        FROM ping_logs
        WHERE website_id = ?
    `).get(website.id);

    const uptime = stats.total_checks > 0
        ? ((stats.up_count / stats.total_checks) * 100).toFixed(2)
        : 100;

    res.render('websites/view', {
        title: website.name,
        website,
        logs,
        stats: {
            ...stats,
            uptime,
            avg_response_time: Math.round(stats.avg_response_time || 0),
            min_response_time: stats.min_response_time || 0,
            max_response_time: stats.max_response_time || 0
        }
    });
});

// GET /websites/:id/edit - Edit website form
router.get('/:id/edit', (req, res) => {
    const website = db.prepare(`
        SELECT * FROM websites
        WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.userId);

    if (!website) {
        return res.status(404).render('error', {
            title: 'Not Found',
            message: 'Website not found'
        });
    }

    res.render('websites/edit', {
        title: `Edit ${website.name}`,
        errors: [],
        website,
        formData: website
    });
});

// POST /websites/:id/edit - Update website
router.post('/:id/edit', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('url').trim().isURL().withMessage('Please enter a valid URL'),
    body('check_interval').isInt({ min: 1, max: 60 }).withMessage('Check interval must be between 1 and 60 minutes')
], (req, res) => {
    const website = db.prepare(`
        SELECT * FROM websites
        WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.userId);

    if (!website) {
        return res.status(404).render('error', {
            title: 'Not Found',
            message: 'Website not found'
        });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('websites/edit', {
            title: `Edit ${website.name}`,
            errors: errors.array(),
            website,
            formData: req.body
        });
    }

    let { name, url, check_interval, is_active } = req.body;

    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        db.prepare(`
            UPDATE websites
            SET name = ?, url = ?, check_interval = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(name, url, check_interval, is_active ? 1 : 0, req.params.id, req.session.userId);

        res.redirect(`/websites/${req.params.id}`);
    } catch (error) {
        console.error('Error updating website:', error);
        res.render('websites/edit', {
            title: `Edit ${website.name}`,
            errors: [{ msg: 'An error occurred. Please try again.' }],
            website,
            formData: req.body
        });
    }
});

// POST /websites/:id/delete - Delete website
router.post('/:id/delete', (req, res) => {
    try {
        db.prepare(`
            DELETE FROM websites
            WHERE id = ? AND user_id = ?
        `).run(req.params.id, req.session.userId);

        res.redirect('/websites');
    } catch (error) {
        console.error('Error deleting website:', error);
        res.redirect('/websites');
    }
});

// POST /websites/:id/check - Manual check
router.post('/:id/check', async (req, res) => {
    const website = db.prepare(`
        SELECT * FROM websites
        WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.userId);

    if (!website) {
        return res.status(404).json({ error: 'Website not found' });
    }

    try {
        const result = await checkWebsiteNow(website.id);
        res.json({
            success: true,
            result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /websites/:id/logs - Get logs (API for pagination)
router.get('/:id/logs', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const website = db.prepare(`
        SELECT id FROM websites
        WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.userId);

    if (!website) {
        return res.status(404).json({ error: 'Website not found' });
    }

    const logs = db.prepare(`
        SELECT * FROM ping_logs
        WHERE website_id = ?
        ORDER BY checked_at DESC
        LIMIT ? OFFSET ?
    `).all(req.params.id, limit, offset);

    const total = db.prepare(`
        SELECT COUNT(*) as count FROM ping_logs WHERE website_id = ?
    `).get(req.params.id).count;

    res.json({
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

module.exports = router;
