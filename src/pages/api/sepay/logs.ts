import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const logsFilePath = path.resolve('./src/data/sepay-logs.json');

function getLogs(): any[] {
  try {
    if (fs.existsSync(logsFilePath)) {
      const raw = fs.readFileSync(logsFilePath, 'utf-8');
      return JSON.parse(raw || '[]');
    }
  } catch (e) {
    console.error('Error reading sepay-logs.json:', e);
  }
  return [];
}

function saveLogs(logs: any[]): void {
  try {
    fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving sepay-logs.json:', e);
  }
}

export const GET: APIRoute = async () => {
  try {
    const logs = getLogs();
    // Sort newest first
    logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const total = logs.length;
    const successCount = logs.filter(l => l.resultStatus === 'SUCCESS_ACTIVATED').length;
    const alreadyPaidCount = logs.filter(l => l.resultStatus === 'ALREADY_PAID').length;
    const unmatchedCount = logs.filter(l => l.resultStatus?.includes('UNMATCHED')).length;

    return new Response(JSON.stringify({
      success: true,
      total,
      successCount,
      alreadyPaidCount,
      unmatchedCount,
      logs
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === 'clear') {
      saveLogs([]);
      return new Response(JSON.stringify({ success: true, message: 'Đã xóa toàn bộ log SePay.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Hành động không hợp lệ.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
