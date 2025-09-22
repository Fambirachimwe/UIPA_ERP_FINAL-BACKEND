import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Email configuration
const emailConfig = {
    host: process.env.SMTP_HOST || 'mail.uipafrica.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
        user: process.env.SMTP_USER || 'notifications@uipafrica.com',
        pass: process.env.SMTP_PASS || '@Test1234ps',
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    debug: true,
    logger: true,
};

async function testEmailSending() {
    console.log('🔧 Starting Email Test...\n');

    // Test emails
    const testEmails = [
        'tatenda.fambirachimwe@uipafrica.com',
        'tatendafambirachimwe@gmail.com'
    ];

    console.log('📧 SMTP Configuration:');
    console.log('  Host:', emailConfig.host);
    console.log('  Port:', emailConfig.port);
    console.log('  Secure:', emailConfig.secure);
    console.log('  User:', emailConfig.auth.user);
    console.log('  From:', process.env.SMTP_FROM || 'notifications@uipafrica.com');
    console.log('');

    try {
        // Create transporter
        const transporter = nodemailer.createTransport(emailConfig);

        // Test connection
        console.log('🔌 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        // Send test emails
        for (const email of testEmails) {
            console.log(`📤 Sending test email to: ${email}`);

            try {
                const mailOptions = {
                    from: process.env.SMTP_FROM || 'notifications@uipafrica.com',
                    to: email,
                    subject: '🧪 UIP Africa ERP - Email Test',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background-color: #8B4513; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                                .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                                .success { color: #5cb85c; font-weight: bold; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h1>🏢 UIP Africa ERP</h1>
                                <h2>Email Service Test</h2>
                            </div>
                            
                            <div class="content">
                                <p>Hello!</p>
                                
                                <p class="success">✅ Email service is working correctly!</p>
                                
                                <p>This is a test email from the UIP Africa ERP system to verify that email notifications are functioning properly.</p>
                                
                                <p><strong>Test Details:</strong></p>
                                <ul>
                                    <li>Sent at: ${new Date().toLocaleString()}</li>
                                    <li>From: UIP Africa ERP System</li>
                                    <li>SMTP Server: mail.uipafrica.com</li>
                                    <li>Test Type: Leave Request Notification System</li>
                                </ul>
                                
                                <p>If you received this email, the notification system for leave requests is working correctly.</p>
                                
                                <hr>
                                <p style="font-size: 12px; color: #666;">
                                    This is an automated test from UIP Africa ERP System<br>
                                    Please do not reply to this email
                                </p>
                            </div>
                        </body>
                        </html>
                    `,
                    text: `
UIP Africa ERP - Email Service Test

Hello!

✅ Email service is working correctly!

This is a test email from the UIP Africa ERP system to verify that email notifications are functioning properly.

Test Details:
- Sent at: ${new Date().toLocaleString()}
- From: UIP Africa ERP System
- SMTP Server: mail.uipafrica.com
- Test Type: Leave Request Notification System

If you received this email, the notification system for leave requests is working correctly.

---
This is an automated test from UIP Africa ERP System
Please do not reply to this email
                    `
                };

                const info = await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent successfully to ${email}`);
                console.log(`   Message ID: ${info.messageId}`);
                console.log(`   Response: ${info.response}\n`);

            } catch (emailError) {
                console.error(`❌ Failed to send email to ${email}:`, emailError.message);
                console.error(`   Error code: ${emailError.code}\n`);
            }
        }

        console.log('🎉 Email test completed!');
        console.log('📬 Check the inbox for the test emails.');

    } catch (connectionError) {
        console.error('❌ SMTP connection failed:', connectionError.message);
        console.error('   Error code:', connectionError.code);

        console.log('\n🔧 Troubleshooting suggestions:');
        console.log('  1. Check if SMTP credentials are correct');
        console.log('  2. Verify network connection to mail.uipafrica.com');
        console.log('  3. Check if firewall is blocking SMTP connections');
        console.log('  4. Try using port 587 with STARTTLS instead of 465 with SSL');
        console.log('  5. Contact IT admin to verify SMTP server status');
    }

    process.exit(0);
}

// Handle script errors
process.on('unhandledRejection', (error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});

// Run the test
testEmailSending().catch((error) => {
    console.error('💥 Test script error:', error);
    process.exit(1);
});
