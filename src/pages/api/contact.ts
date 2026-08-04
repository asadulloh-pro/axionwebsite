export const prerender = false;

interface ContactBody {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  region?: string;
  message?: string;
  locale?: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as ContactBody;
    const name = body.name?.trim() ?? '';
    const email = body.email?.trim() ?? '';
    const phone = body.phone?.trim() ?? '';
    const company = body.company?.trim() ?? '';
    const region = body.region?.trim() ?? '';
    const message = body.message?.trim() ?? '';
    const locale = body.locale ?? 'uz';

    if (!name || !email || !phone || !company || !region || !message) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = [
      '🆕 New Axionlab contact form',
      `Locale: ${locale}`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Company: ${company}`,
      `Region: ${region}`,
      `Message: ${message}`,
    ].join('\n');

    const token = import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });

      if (!tgRes.ok) {
        console.error('Telegram API error', await tgRes.text());
        return new Response(JSON.stringify({ ok: false, error: 'telegram_failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Dev / missing credentials — still succeed so UI can be tested
      console.log('[contact]', text);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ ok: false, error: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
