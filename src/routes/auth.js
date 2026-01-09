const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { isGuest } = require('../middleware/auth');

const router = express.Router();

// GET /register
router.get('/register', isGuest, (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        errors: [],
        formData: {}
    });
});

// POST /register
router.post('/register', isGuest, [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/register', {
            title: 'Register',
            errors: errors.array(),
            formData: req.body
        });
    }

    const { email, password, name } = req.body;

    try {
        // Check if email already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.render('auth/register', {
                title: 'Register',
                errors: [{ msg: 'Email already registered' }],
                formData: req.body
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, passwordHash, name);

        // Log user in
        req.session.userId = result.lastInsertRowid;
        req.session.user = { id: result.lastInsertRowid, email, name };

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', {
            title: 'Register',
            errors: [{ msg: 'An error occurred. Please try again.' }],
            formData: req.body
        });
    }
});

// GET /login
router.get('/login', isGuest, (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        errors: [],
        formData: {}
    });
});

// POST /login
router.post('/login', isGuest, [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/login', {
            title: 'Login',
            errors: errors.array(),
            formData: req.body
        });
    }

    const { email, password } = req.body;

    try {
        // Find user
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.render('auth/login', {
                title: 'Login',
                errors: [{ msg: 'Invalid email or password' }],
                formData: req.body
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.render('auth/login', {
                title: 'Login',
                errors: [{ msg: 'Invalid email or password' }],
                formData: req.body
            });
        }

        // Log user in
        req.session.userId = user.id;
        req.session.user = { id: user.id, email: user.email, name: user.name };

        // Redirect to original destination or dashboard
        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        res.redirect(returnTo);
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login',
            errors: [{ msg: 'An error occurred. Please try again.' }],
            formData: req.body
        });
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Logout error:', err);
        res.redirect('/');
    });
});

module.exports = router;
