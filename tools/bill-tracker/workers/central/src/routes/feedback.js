/**
 * Cactus Watch — Feedback Submission
 *
 * POST /api/feedback — Send user feedback via Resend to admin@cactus.watch
 */

const FEEDBACK_CATEGORIES = {
  help: 'I need help',
  talk: "I'd like to talk",
  bug: 'I found a bug',
  feature: 'Feature request',
  other: 'Other',
};

export async function handleFeedback(request, env) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Feedback not configured' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, category, message, wantsResponse } = body;

  if (!email || !email.includes('@') || email.length > 254) {
    return Response.json({ error: 'Valid email required (max 254 chars)' }, { status: 400 });
  }
  if (!message || message.trim().length < 5 || message.length > 5000) {
    return Response.json({ error: 'Message must be 5-5000 characters' }, { status: 400 });
  }

  const validCategory = FEEDBACK_CATEGORIES[category] ? category : 'other';
  const categoryLabel = FEEDBACK_CATEGORIES[validCategory];
  const responseNote = wantsResponse ? 'YES — user wants a response' : 'No response requested';

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 32px; border-radius: 8px;">
      <h2 style="color: #C1440E; margin: 0 0 16px;">Cactus Watch Feedback</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
        <tr><td style="padding: 8px 12px; font-weight: bold; color: #6B4E3D; width: 140px;">From</td><td style="padding: 8px 12px;">${escHtml(email)}</td></tr>
        <tr><td style="padding: 8px 12px; font-weight: bold; color: #6B4E3D;">Category</td><td style="padding: 8px 12px;">${escHtml(categoryLabel)}</td></tr>
        <tr><td style="padding: 8px 12px; font-weight: bold; color: #6B4E3D;">Wants Response</td><td style="padding: 8px 12px;">${responseNote}</td></tr>
      </table>
      <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 6px; border: 1px solid #E5DDD4;">
        <p style="margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escHtml(message)}</p>
      </div>
      <p style="margin-top: 16px; font-size: 12px; color: #999;">Sent from Cactus Watch feedback form</p>
    </div>
  `;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cactus Watch <feedback@cactus.watch>',
        to: ['admin@cactus.watch'],
        reply_to: email,
        subject: `[Cactus Watch Feedback] ${categoryLabel.replace(/[\r\n]/g, '')}`,
        html,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Resend error:', err);
      return Response.json({ error: 'Failed to send feedback' }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Feedback send error:', err);
    return Response.json({ error: 'Failed to send feedback' }, { status: 500 });
  }
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
