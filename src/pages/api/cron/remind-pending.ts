import type { APIRoute } from 'astro';
import { checkAndSendPaymentReminders, sendManualPaymentReminder } from '../../../utils/paymentReminderService';

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const manualOrderId = url.searchParams.get('orderId');

    let postBody: any = null;
    if (request.method === 'POST') {
      try {
        postBody = await request.json();
      } catch (_) {}
    }

    const targetOrderId = manualOrderId || postBody?.orderId;

    // Nếu yêu cầu gửi thủ công cho một đơn cụ thể
    if (targetOrderId) {
      const result = await sendManualPaymentReminder(targetOrderId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Mặc định: Quét toàn bộ hệ thống đơn hàng và gửi cho các đơn đến hạn (30 phút, 24 giờ)
    const result = await checkAndSendPaymentReminders();

    return new Response(JSON.stringify({
      ...result,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Lỗi API remind-pending:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
