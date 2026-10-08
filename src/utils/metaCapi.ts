import crypto from 'crypto';

export interface MetaCapiPurchasePayload {
  orderId: string;
  email?: string;
  phone?: string;
  amount?: number;
  currency?: string;
  contentName?: string;
  clientIp?: string;
  userAgent?: string;
  sourceUrl?: string;
}

/**
 * Chuẩn hóa chuỗi và băm SHA-256 theo tiêu chuẩn của Meta
 */
export function hashSha256(value: string): string {
  if (!value) return '';
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
}

/**
 * Chuẩn hóa email: viết thường, bỏ khoảng trắng, rồi băm SHA-256
 */
export function hashEmail(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  const normalized = email.trim().toLowerCase();
  return hashSha256(normalized);
}

/**
 * Chuẩn hóa số điện thoại:
 * Bỏ toàn bộ ký tự không phải số.
 * Chuyển đổi đầu số 0 của Việt Nam thành mã quốc gia 84 (ví dụ 0702286928 -> 84702286928).
 */
export function hashPhone(phone: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return null;
  
  // Xử lý tiền tố Việt Nam
  if (digits.startsWith('0')) {
    digits = '84' + digits.slice(1);
  } else if (!digits.startsWith('84') && digits.length <= 10) {
    digits = '84' + digits;
  }
  
  return hashSha256(digits);
}

/**
 * Gửi sự kiện Purchase lên Meta Conversions API (CAPI) từ Server
 */
export async function sendMetaCapiPurchase(params: MetaCapiPurchasePayload): Promise<{ success: boolean; data?: any; error?: string }> {
  const pixelId = process.env.META_PIXEL_ID || process.env.PUBLIC_META_PIXEL_ID || '1586370109096379';
  const accessToken = (process.env.META_CAPI_ACCESS_TOKEN || '').trim();
  const testEventCode = (process.env.META_TEST_EVENT_CODE || '').trim();

  if (!accessToken) {
    console.warn('[Meta CAPI] Chưa có META_CAPI_ACCESS_TOKEN trong .env. Vui lòng thêm token để kích hoạt gửi sự kiện từ máy chủ.');
    return { success: false, error: 'Chưa có META_CAPI_ACCESS_TOKEN' };
  }

  try {
    const userData: Record<string, any> = {};

    if (params.email) {
      const hashedEm = hashEmail(params.email);
      if (hashedEm) userData.em = [hashedEm];
    }

    if (params.phone) {
      const hashedPh = hashPhone(params.phone);
      if (hashedPh) userData.ph = [hashedPh];
    }

    if (params.clientIp) {
      userData.client_ip_address = params.clientIp;
    }

    if (params.userAgent) {
      userData.client_user_agent = params.userAgent;
    }

    const eventData: Record<string, any> = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: params.orderId, // Trùng với eventID trên trình duyệt để chống trùng lặp (deduplication)
      event_source_url: params.sourceUrl || 'https://daoxuanquang.com.vn/ebook-tao-blog',
      action_source: 'website',
      user_data: userData,
      custom_data: {
        currency: params.currency || 'VND',
        value: Number(params.amount) || 299000,
        content_name: params.contentName || 'Ebook Tạo Blog – Cỗ máy bán hàng tự động bằng AI',
        content_type: 'product',
        order_id: params.orderId
      }
    };

    const requestBody: Record<string, any> = {
      data: [eventData]
    };

    if (testEventCode) {
      requestBody.test_event_code = testEventCode;
    }

    const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Meta CAPI] Lỗi từ Meta API:', JSON.stringify(result));
      return { success: false, error: result.error?.message || 'Lỗi gửi CAPI' };
    }

    console.log(`[Meta CAPI] Đã gửi thành công sự kiện Purchase cho đơn hàng ${params.orderId} (events_received: ${result.events_received})`);
    return { success: true, data: result };

  } catch (error: any) {
    console.error('[Meta CAPI] Lỗi hệ thống khi gửi CAPI:', error?.message || error);
    return { success: false, error: error?.message || 'System error' };
  }
}
