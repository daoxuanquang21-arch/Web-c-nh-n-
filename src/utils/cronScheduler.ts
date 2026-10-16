import { generateAndSendDailyReport } from '../pages/api/cron/daily-report';

let isSchedulerStarted = false;

/**
 * Tự động tính toán và kích hoạt gửi báo cáo doanh thu đúng 7:00 AM mỗi ngày (giờ Việt Nam GMT+7)
 */
export function initDailyReportScheduler() {
  if (isSchedulerStarted) return;
  isSchedulerStarted = true;

  function scheduleNext7AM() {
    const now = new Date();
    // Chuyển sang giờ Việt Nam
    const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnNow = new Date(vnTimeStr);

    const next7AM = new Date(vnNow);
    next7AM.setHours(7, 0, 0, 0);

    // Nếu thời điểm hiện tại đã quá 7:00 AM hôm nay, hẹn cho 7:00 AM sáng mai
    if (vnNow.getTime() >= next7AM.getTime()) {
      next7AM.setDate(next7AM.getDate() + 1);
    }

    const delayMs = next7AM.getTime() - vnNow.getTime();
    const delayMinutes = Math.round(delayMs / (1000 * 60));
    const delayHours = (delayMs / (1000 * 60 * 60)).toFixed(1);

    console.log(`[Cron 7:00 AM] Đã kích hoạt hẹn giờ! Báo cáo tiếp theo sẽ gửi sau ${delayHours} giờ (${delayMinutes} phút) vào lúc 7:00 AM GMT+7.`);

    setTimeout(async () => {
      console.log('[Cron 7:00 AM] Đến 7:00 AM! Đang tự động tạo và gửi báo cáo doanh thu về Telegram...');
      try {
        await generateAndSendDailyReport();
      } catch (err) {
        console.error('[Cron 7:00 AM] Lỗi khi tạo báo cáo doanh thu:', err);
      }
      // Tiếp tục lên lịch cho ngày hôm sau
      scheduleNext7AM();
    }, delayMs);
  }

  scheduleNext7AM();
}
