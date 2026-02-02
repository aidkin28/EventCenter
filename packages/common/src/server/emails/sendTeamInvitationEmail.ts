import { sendEmail } from "./sendEmail";

export async function sendTeamInvitationEmail(
  recipientEmail: string,
  teamName: string,
  invitedByName: string,
  invitationToken: string
): Promise<void> {
  const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || "Goal Tracker";
  const appUrl = process.env.NEXT_PUBLIC_ROOT_DOMAIN_URL_FULL || "http://localhost:3000";

  const signupUrl = `${appUrl}/auth/signup?invitation=${invitationToken}&email=${encodeURIComponent(recipientEmail)}`;

  const subject = `You're invited to join ${teamName} on ${appTitle}`;
  const sender = `invitations@${process.env.NEXT_PUBLIC_DOMAIN || "localhost"}`;

  const body = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333333; margin-bottom: 20px;">You're Invited!</h2>

      <p style="color: #333333; font-size: 16px; line-height: 1.5;">
        Hi there,
      </p>

      <p style="color: #333333; font-size: 16px; line-height: 1.5;">
        <strong>${invitedByName}</strong> has invited you to join the team <strong>${teamName}</strong> on ${appTitle}.
      </p>

      <p style="color: #333333; font-size: 16px; line-height: 1.5;">
        ${appTitle} is a platform that helps teams:
      </p>

      <ul style="color: #333333; font-size: 16px; line-height: 1.8;">
        <li>Set and track meaningful goals</li>
        <li>Log daily activities and progress</li>
        <li>Get AI-powered insights and coaching</li>
        <li>Visualize team performance and statistics</li>
      </ul>

      <a href="${signupUrl}"
         style="display: inline-block; padding: 12px 24px; background-color: #1da1f2; color: #ffffff; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 500;">
        Accept Invitation & Sign Up
      </a>

      <p style="color: #666666; font-size: 14px; margin-top: 20px;">
        Or copy and paste this link into your browser:<br/>
        <a href="${signupUrl}" style="color: #1da1f2; word-break: break-all;">${signupUrl}</a>
      </p>

      <p style="color: #999999; font-size: 13px; margin-top: 30px;">
        This invitation will expire in 7 days. If you don't recognize this invitation, you can safely ignore this email.
      </p>

      <p style="color: #333333; margin-top: 30px;">
        Best regards,<br/>
        The ${appTitle} Team
      </p>
    </div>
  `;

  await sendEmail({
    senderEmail: sender,
    senderName: appTitle,
    recipient: recipientEmail,
    subject,
    bodyHTML: body,
  });
}
