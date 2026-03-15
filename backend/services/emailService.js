const { Resend } = require('resend');

async function sendFollowupEmail({ studentEmail, studentName, counsellorName, note, followDate }) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const formattedDate = new Date(followDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const { data, error } = await resend.emails.send({
      from:    'EduSafeGuard <onboarding@resend.dev>',
      to:      [studentEmail],
      subject: 'Counsellor Follow-Up – EduSafeGuard',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e3e8f2;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">📋 Counsellor Follow-Up</h1>
            <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px;">EduSafeGuard – Student Retention & Success Platform</p>
          </div>
          <div style="padding:28px 32px;">
            <p style="font-size:16px;color:#111827;">Dear <strong>${studentName}</strong>,</p>
            <p style="font-size:14px;color:#374151;line-height:1.7;">Your counsellor has added a follow-up note regarding your academic progress.</p>
            <div style="background:#eff4ff;border-left:4px solid #2563eb;border-radius:6px;padding:16px 18px;margin:18px 0;">
              <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;margin-bottom:7px;">Follow-up Note</div>
              <div style="font-size:14px;color:#1f2937;line-height:1.7;">${note}</div>
            </div>
            <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:18px 0;font-size:13px;color:#6b7280;">
              <div>📅 <strong style="color:#374151;">Date:</strong> ${formattedDate}</div>
              <div style="margin-top:5px;">👤 <strong style="color:#374151;">Counsellor:</strong> ${counsellorName}</div>
            </div>
            <p style="font-size:13px;color:#374151;">Regards,<br/><strong>EduSafeGuard System</strong></p>
          </div>
          <div style="background:#f4f6fb;padding:18px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e3e8f2;">
            EduSafeGuard · B.Tech Final Year Project 2026
          </div>
        </div>
      `,
      text: `Dear ${studentName},\n\nFollow-up note: ${note}\n\nDate: ${formattedDate}\nCounsellor: ${counsellorName}\n\nRegards,\nEduSafeGuard System`,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent via Resend:', data?.id);
    return { success: true };

  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendFollowupEmail };
