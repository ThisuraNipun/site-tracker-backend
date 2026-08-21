export const getPasswordResetTemplate = (resetUrl: string) => {
  return {
    subject: 'Password Reset Request',
    text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset</h2>
        <p style="color: #555; line-height: 1.5;">You recently requested to reset your password for your account.</p>
        <p style="color: #555; line-height: 1.5;">Click the button below to reset it. This password reset is only valid for the next 5 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Your Password</a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">If you did not request a password reset, please ignore this email or reply to let us know. This link is only valid for 5 minutes.</p>
      </div>
    `
  };
};

export const getWelcomeTemplate = (name: string, email: string, defaultPassword?: string) => {
  let passwordSection = '';
  if (defaultPassword) {
    passwordSection = `
      <p style="color: #555; line-height: 1.5;">An account has been created for you by an administrator.</p>
      <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
        <p style="margin: 0 0 5px 0;">Email: <strong>${email}</strong></p>
        <p style="margin: 0;">Temporary Password: <strong>${defaultPassword}</strong></p>
      </div>
      <p style="color: #555; line-height: 1.5; font-weight: bold; color: #dc3545;">Please log in and change your password immediately.</p>
    `;
  } else {
    passwordSection = `
      <p style="color: #555; line-height: 1.5;">Welcome to our platform! Your account has been successfully created.</p>
    `;
  }

  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  return {
    subject: 'Welcome to Site Tracker! Your Account Details',
    text: `Welcome, ${name}! Your account has been created with email: ${email}.${defaultPassword ? ` Your temporary password is: ${defaultPassword}` : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Welcome, ${name}!</h2>
        ${passwordSection}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Log In Now</a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">If you have any questions, feel free to reply to this email.</p>
      </div>
    `
  };
};

export const getPasswordChangeSuccessTemplate = () => {
  return {
    subject: 'Password Changed Successfully',
    text: 'Your password has been successfully changed.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Security Alert</h2>
        <p style="color: #555; line-height: 1.5;">Your password has been successfully changed.</p>
        <p style="color: #555; line-height: 1.5;">If you did not make this change, please contact an administrator immediately.</p>
      </div>
    `
  };
};
