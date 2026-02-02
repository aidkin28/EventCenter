import { sendEmail } from "./sendEmail";

export async function sendTeamAddedEmail(
  recipientEmail: string,
  recipientName: string,
  teamName: string,
  addedByName: string
): Promise<void> {
  const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || "Goal Tracker";
  const appUrl = process.env.NEXT_PUBLIC_ROOT_DOMAIN_URL_FULL || "http://localhost:3000";

  const subject = `You've been added to ${teamName}`;
  const sender = `notifications@${process.env.NEXT_PUBLIC_DOMAIN || "localhost"}`;

  const body = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333333; margin-bottom: 20px;">Welcome to ${teamName}!</h2>

      <p style="color: #333333; font-size: 16px; line-height: 1.5;">
        Hi ${recipientName},
      </p>

      <p style="color: #333333; font-size: 16px; line-height: 1.5;">
        <strong>${addedByName}</strong> has added you to the team <strong>${teamName}</strong> on ${appTitle}.
      </p>

      <p style="color: #333333; font-size: 16px; line-height: 1.5;">
        As a team member, you can now:
      </p>

      <ul style="color: #333333; font-size: 16px; line-height: 1.8;">
        <li>Track your daily activities and progress</li>
        <li>View team statistics and reports</li>
        <li>Collaborate with your teammates</li>
      </ul>

      <a href="${appUrl}/home"
         style="display: inline-block; padding: 12px 24px; background-color: #1da1f2; color: #ffffff; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 500;">
        Go to Dashboard
      </a>

      <p style="color: #666666; font-size: 14px; margin-top: 30px;">
        If you have any questions, please contact your team administrator.
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
