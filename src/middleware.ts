import { defineMiddleware } from 'astro:middleware';
import { initDailyReportScheduler } from './utils/cronScheduler';

// Khởi chạy bộ hẹn giờ 7:00 AM hàng ngày một lần duy nhất
initDailyReportScheduler();

export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
