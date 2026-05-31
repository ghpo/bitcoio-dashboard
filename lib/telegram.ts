/**
 * Telegram notification utility
 */
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export async function sendTelegram(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = new URLSearchParams({
      chat_id: CHAT_ID,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: 'true',
    });
    const res = await fetch(url, { method: 'POST', body });
    const data = await res.json();
    return data.ok === true;
  } catch (e) {
    console.error('[telegram] Send failed:', (e as Error).message);
    return false;
  }
}

export function formatAlert(text: string): string {
  return `🤖 <b>bitcoio alert</b>\n${text}`;
}
