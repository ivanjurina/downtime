# UptimeMonitor

A micro SaaS uptime monitoring service that allows users to monitor their websites and receive email notifications when sites go down.

## Features

- **User Authentication**: Register, login, and manage your account
- **Website Monitoring**: Add multiple websites to monitor with customizable check intervals (1-60 minutes)
- **Real-time Status**: See the current status of all your websites at a glance
- **Email Alerts**: Receive email notifications when your site goes down and when it comes back up
- **Detailed Statistics**: View uptime percentages, response times, and performance trends
- **Ping Logs**: Access complete history of all monitoring checks with status codes and response times
- **Dashboard**: Overview of all your websites with charts and recent alerts

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: SQLite (via better-sqlite3)
- **Views**: EJS templates
- **Authentication**: express-session with bcrypt
- **Email**: Nodemailer
- **Monitoring**: node-cron for scheduled tasks
- **HTTP Client**: Axios

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd uptime-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
PORT=3000
SESSION_SECRET=your-super-secret-session-key

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@uptimemonitor.com

APP_URL=http://localhost:3000
APP_NAME=UptimeMonitor
```

5. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

1. **Register**: Create a new account with your email and password
2. **Add Website**: Go to Websites > Add Website and enter the URL to monitor
3. **Configure**: Set the check interval (how often to ping your site)
4. **Monitor**: View your dashboard for real-time status and statistics
5. **Get Notified**: Receive email alerts when your site goes down or recovers

## Project Structure

```
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── src/
│   ├── db/
│   │   ├── database.js
│   │   ├── init.js
│   │   └── schema.sql
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   └── websites.js
│   ├── services/
│   │   ├── email.js
│   │   └── monitor.js
│   ├── views/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── partials/
│   │   └── websites/
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `GET /register` - Registration page
- `POST /register` - Create new user
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `GET /logout` - Logout user

### Dashboard
- `GET /dashboard` - Main dashboard
- `GET /dashboard/api/stats` - Get stats JSON (for real-time updates)

### Websites
- `GET /websites` - List all websites
- `GET /websites/add` - Add website form
- `POST /websites/add` - Create new website
- `GET /websites/:id` - View website details and logs
- `GET /websites/:id/edit` - Edit website form
- `POST /websites/:id/edit` - Update website
- `POST /websites/:id/delete` - Delete website
- `POST /websites/:id/check` - Trigger manual check
- `GET /websites/:id/logs` - Get logs with pagination (JSON)

## License

MIT
