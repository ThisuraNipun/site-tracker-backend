import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    auth: {
      user: process.env.SMTP_USER || 'placeholder',
      pass: process.env.SMTP_PASS || 'placeholder'
    }
  });
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@sitetracker.com',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    // We don't throw an error here because if email fails, we might still want to return 200 OK 
    // to prevent email enumeration, but in production, we should log it properly.
  }
};
