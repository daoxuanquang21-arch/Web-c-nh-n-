import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Chuỗi 7 email chăm sóc hàng ngày đã được tắt theo yêu cầu.
 */
export const ALL: APIRoute = async () => {
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Chuỗi 7 email chăm sóc hàng ngày đã được tắt.' 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
