import nodemailer from 'nodemailer';

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT || 587),
      secure: false,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });
    return transporter;
  }

  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
  return transporter;
}

export async function sendOtpEmail({ to, code }) {
  const tx = await getTransporter();
  const info = await tx.sendMail({
    from: 'LandingForge <no-reply@landingforge.dev>',
    to,
    subject: 'Your LandingForge OTP code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('OTP preview URL:', previewUrl);
  }
}
