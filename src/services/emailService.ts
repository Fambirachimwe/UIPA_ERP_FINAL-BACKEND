import nodemailer from 'nodemailer';

// Email configuration (working configuration from test)
const emailConfig = {
    host: process.env.SMTP_HOST || 'mail.uipafrica.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false', // Default to true for port 465
    auth: {
        user: process.env.SMTP_USER || 'notifications@uipafrica.com',
        pass: process.env.SMTP_PASS || '@Test1234ps',
    },
    connectionTimeout: 10000, // 10 seconds (working timeout from test)
    greetingTimeout: 5000, // 5 seconds (working timeout from test)
    socketTimeout: 10000, // 10 seconds
    debug: process.env.NODE_ENV === 'development', // Enable debug in development
    logger: process.env.NODE_ENV === 'development', // Enable logging in development
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection on startup with retry logic
async function verifyEmailConnection() {
    try {
        await transporter.verify();
        console.log('✅ Email service is ready to send messages');
        return true;
    } catch (error) {
        console.error('❌ Email service connection failed:', error);

        // Try alternative configuration for port 587 with STARTTLS
        console.log('🔄 Trying alternative SMTP configuration (port 587)...');

        const altConfig = {
            ...emailConfig,
            port: 587,
            secure: false, // Use STARTTLS instead of SSL
            requireTLS: true,
        };

        const altTransporter = nodemailer.createTransport(altConfig);

        try {
            await altTransporter.verify();
            console.log('✅ Alternative email configuration working (port 587)');
            // Replace the main transporter with the working one
            Object.assign(transporter, altTransporter);
            return true;
        } catch (altError) {
            console.error('❌ Alternative configuration also failed:', altError);
            return false;
        }
    }
}

// Call verification
verifyEmailConnection();

// Alternative Gmail configuration for testing (if UIP mail server fails)
export const createGmailTransporter = (user: string, pass: string) => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass, // Use app password, not regular password
        },
    });
};

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

export class EmailService {
    static async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || 'notifications@uipafrica.com',
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email:', error);

            // Fallback: Log email content for development
            if (process.env.NODE_ENV === 'development') {
                console.log('📧 EMAIL FALLBACK (Development Mode):');
                console.log('  To:', Array.isArray(options.to) ? options.to.join(', ') : options.to);
                console.log('  Subject:', options.subject);
                console.log('  Text:', options.text);
                console.log('📧 END EMAIL FALLBACK');
                return true; // Return true in development so workflow continues
            }

            return false;
        }
    }

    // Leave request submission notification to supervisor
    static async notifyLeaveRequestSubmission(
        supervisorEmail: string,
        supervisorName: string,
        employeeName: string,
        leaveType: string,
        startDate: string,
        endDate: string,
        totalDays: number,
        reason: string,
        requestId: string
    ): Promise<boolean> {
        const subject = `New Leave Request Pending Approval - ${employeeName}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #8B4513; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
                    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #8B4513; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #8B4513; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
                    .urgent { color: #d9534f; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏢 UIP Africa ERP</h1>
                        <h2>Leave Request Approval Required</h2>
                    </div>
                    
                    <div class="content">
                        <p>Dear <strong>${supervisorName}</strong>,</p>
                        
                        <p>A new leave request has been submitted and requires your approval.</p>
                        
                        <div class="details">
                            <h3>📋 Request Details</h3>
                            <p><strong>Employee:</strong> ${employeeName}</p>
                            <p><strong>Leave Type:</strong> ${leaveType}</p>
                            <p><strong>Start Date:</strong> ${startDate}</p>
                            <p><strong>End Date:</strong> ${endDate}</p>
                            <p><strong>Total Days:</strong> ${totalDays} working days</p>
                            <p><strong>Reason:</strong> ${reason}</p>
                        </div>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <p class="urgent">⏰ This request is pending your approval</p>
                            <p>Please log in to the ERP system to review and approve/reject this request.</p>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated notification from UIP Africa ERP System</p>
                        <p>Request ID: ${requestId}</p>
                        <p>Please do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
            New Leave Request Pending Approval
            
            Dear ${supervisorName},
            
            A new leave request has been submitted by ${employeeName} and requires your approval.
            
            Request Details:
            - Employee: ${employeeName}
            - Leave Type: ${leaveType}
            - Start Date: ${startDate}
            - End Date: ${endDate}
            - Total Days: ${totalDays} working days
            - Reason: ${reason}
            
            Please log in to the ERP system to review and approve/reject this request.
            
            Request ID: ${requestId}
        `;

        console.log('Sending email to supervisor:', supervisorEmail);

        return this.sendEmail({
            to: supervisorEmail,
            subject,
            html,
            text,
        });
    }

    // Leave request status change notification to employee
    static async notifyLeaveRequestStatusChange(
        employeeEmail: string,
        employeeName: string,
        leaveType: string,
        startDate: string,
        endDate: string,
        totalDays: number,
        status: 'approved' | 'rejected',
        level: string,
        approverName: string,
        comment?: string,
        requestId?: string
    ): Promise<boolean> {
        const isApproved = status === 'approved';
        const subject = `Leave Request ${isApproved ? 'Approved' : 'Rejected'} - ${leaveType}`;

        const statusColor = isApproved ? '#5cb85c' : '#d9534f';
        const statusIcon = isApproved ? '✅' : '❌';
        const statusMessage = isApproved
            ? `Your leave request has been ${level === 'level2' ? 'fully approved' : 'approved at Level 1'}`
            : 'Your leave request has been rejected';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
                    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid ${statusColor}; }
                    .status { font-size: 24px; margin: 10px 0; }
                    .comment { background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏢 UIP Africa ERP</h1>
                        <div class="status">${statusIcon} Leave Request ${isApproved ? 'Approved' : 'Rejected'}</div>
                    </div>
                    
                    <div class="content">
                        <p>Dear <strong>${employeeName}</strong>,</p>
                        
                        <p>${statusMessage}.</p>
                        
                        <div class="details">
                            <h3>📋 Request Details</h3>
                            <p><strong>Leave Type:</strong> ${leaveType}</p>
                            <p><strong>Start Date:</strong> ${startDate}</p>
                            <p><strong>End Date:</strong> ${endDate}</p>
                            <p><strong>Total Days:</strong> ${totalDays} working days</p>
                            <p><strong>Approved/Rejected by:</strong> ${approverName}</p>
                            <p><strong>Level:</strong> ${level === 'level1' ? 'Level 1 (Supervisor)' : 'Level 2 (Final Approval)'}</p>
                        </div>
                        
                        ${comment ? `
                            <div class="comment">
                                <h4>💬 Comment from Approver:</h4>
                                <p>${comment}</p>
                            </div>
                        ` : ''}
                        
                        <div style="text-align: center; margin: 20px 0;">
                            ${isApproved && level === 'level1' ?
                '<p><strong>Note:</strong> This request still requires final approval from Level 2.</p>' :
                ''
            }
                            ${isApproved && level === 'level2' ?
                '<p><strong>🎉 Your leave has been fully approved and is now active!</strong></p>' :
                ''
            }
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated notification from UIP Africa ERP System</p>
                        ${requestId ? `<p>Request ID: ${requestId}</p>` : ''}
                        <p>Please do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
            Leave Request ${isApproved ? 'Approved' : 'Rejected'}
            
            Dear ${employeeName},
            
            ${statusMessage}.
            
            Request Details:
            - Leave Type: ${leaveType}
            - Start Date: ${startDate}
            - End Date: ${endDate}
            - Total Days: ${totalDays} working days
            - Approved/Rejected by: ${approverName}
            - Level: ${level === 'level1' ? 'Level 1 (Supervisor)' : 'Level 2 (Final Approval)'}
            
            ${comment ? `Comment: ${comment}` : ''}
            
            ${isApproved && level === 'level1' ? 'Note: This request still requires final approval from Level 2.' : ''}
            ${isApproved && level === 'level2' ? 'Your leave has been fully approved and is now active!' : ''}
            
            ${requestId ? `Request ID: ${requestId}` : ''}
        `;

        return this.sendEmail({
            to: employeeEmail,
            subject,
            html,
            text,
        });
    }
}
