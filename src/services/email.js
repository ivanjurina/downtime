const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
}

async function sendEmail(to, subject, html) {
    try {
        const transport = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'UptimeMonitor <noreply@uptimemonitor.com>',
            to,
            subject,
            html
        };

        const info = await transport.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendDownAlert(userEmail, website) {
    const subject = `🔴 Alert: ${website.name} is DOWN`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Website Down Alert</h2>
            <p>Your website <strong>${website.name}</strong> appears to be down.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Website</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${website.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>URL</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><a href="${website.url}">${website.url}</a></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; color: #e74c3c;">DOWN</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Detected At</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toUTCString()}</td>
                </tr>
            </table>
            <p>We'll notify you when it comes back online.</p>
            <p style="color: #888; font-size: 12px;">— ${process.env.APP_NAME || 'UptimeMonitor'}</p>
        </div>
    `;

    return sendEmail(userEmail, subject, html);
}

async function sendUpAlert(userEmail, website, downtime) {
    const subject = `🟢 Recovery: ${website.name} is back UP`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">Website Recovery Alert</h2>
            <p>Great news! Your website <strong>${website.name}</strong> is back online.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Website</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${website.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>URL</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><a href="${website.url}">${website.url}</a></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; color: #27ae60;">UP</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Downtime Duration</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${downtime || 'Unknown'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Recovered At</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toUTCString()}</td>
                </tr>
            </table>
            <p style="color: #888; font-size: 12px;">— ${process.env.APP_NAME || 'UptimeMonitor'}</p>
        </div>
    `;

    return sendEmail(userEmail, subject, html);
}

module.exports = {
    sendEmail,
    sendDownAlert,
    sendUpAlert
};
