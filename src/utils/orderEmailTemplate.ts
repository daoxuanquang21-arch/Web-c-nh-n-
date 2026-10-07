export interface OrderEmailData {
  customerName: string;
  readerUrl: string;
  maDon: string;
  soTien: string;
  ngayFormatted: string;
}

export function getOrderEmailSubject(customerName: string, isResend = false): string {
  const name = customerName.trim() || 'Bạn';
  const prefix = isResend ? '🎉 [Gửi lại] ' : '🎉 ';
  return `${prefix}${name} ơi, ebook của bạn đây. 2 tiếng nữa bạn có blog riêng`;
}

export function renderOrderEmailHtml(data: OrderEmailData): string {
  const customerName = data.customerName.trim() || 'bạn';
  const readerUrl = data.readerUrl || 'https://daoxuanquang.com.vn/doc-sach/tao-blog-co-may-ban-hang-tu-dong';
  const maDon = data.maDon || 'EB' + Date.now().toString().slice(-6);
  const soTien = data.soTien || '299.000đ';
  const ngayFormatted = data.ngayFormatted || new Date().toLocaleDateString('vi-VN');

  return `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Ebook của bạn đây</title>
<!--
  TIÊU ĐỀ EMAIL GỢI Ý:  {{TEN_KHACH}} ơi, ebook của bạn đây. 2 tiếng nữa bạn có blog riêng
  BIẾN CẦN THAY (đổi sang cú pháp của hệ thống gửi mail bạn dùng):
  {{TEN_KHACH}} {{LINK_EBOOK}} {{MA_DON}} {{SO_TIEN}} {{NGAY}}
-->
<style>
  body,table,td,p,a,b,i,span,div,h1{font-family:Arial,Helvetica,sans-serif!important}
  body{margin:0;padding:0;background:#F6F1EC}
  a{color:#EA580C}
  @media (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:22px!important;padding-right:22px!important}
    .h1{font-size:26px!important;line-height:34px!important}
    .btn a{display:block!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F6F1EC;">

<div style="font-family:Arial,Helvetica,sans-serif;display:none;max-height:0;overflow:hidden;opacity:0;color:#F6F1EC;font-size:1px;line-height:1px;">
Ebook của bạn đã sẵn sàng. Làm luôn “Thử thách 2 tiếng” hôm nay: 2 tiếng sau bạn có blog chạy thật.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F1EC;">
<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;padding:28px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FFFAF6;border:1px solid #F5E1D3;border-radius:18px;overflow:hidden;color:#17120E;">

  <!-- 1. ĐẦU THƯ: THÔNG BÁO GIAO HÀNG -->
  <tr><td class="px" align="center" style="font-family:Arial,Helvetica,sans-serif;background:#FFFAF6;padding:30px 36px 24px;border-bottom:2px solid #EA580C;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
      <td align="center" width="48" height="48" style="font-family:Arial,Helvetica,sans-serif;width:48px;height:48px;border-radius:50%;background:#EA580C;color:#FFFFFF;font-size:24px;line-height:48px;font-weight:700;">&#10003;</td>
    </tr></table>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:12px 0 0;font-size:21px;line-height:29px;font-weight:700;color:#1F1A17;">Đơn hàng đã giao thành công</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:4px 0 0;font-size:13px;line-height:20px;color:#EA580C;font-weight:700;">Tạo Blog – Cỗ máy bán hàng tự động bằng AI</p>
  </td></tr>

  <!-- 2. MỞ ĐẦU: CHÚC MỪNG + KHẲNG ĐỊNH LỰA CHỌN -->
  <tr><td class="px" style="font-family:Arial,Helvetica,sans-serif;padding:36px 36px 0;">
    <h1 class="h1" style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:30px;line-height:38px;font-weight:700;color:#17120E;">${customerName} ơi, bạn vừa làm được phần khó nhất.</h1>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:16px 0 0;font-size:16px;line-height:26px;color:#3E3631;">Phần khó nhất không phải là kỹ thuật. Mà là <b style="font-family:Arial,Helvetica,sans-serif;color:#17120E;">quyết định bắt đầu</b>. Ngày trước, Quảng mất rất lâu và bỏ cuộc tới 5 lần mới đi qua được bước này. Bạn vừa đi qua nó hôm nay.</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:12px 0 0;font-size:16px;line-height:26px;color:#3E3631;">Ebook <b style="font-family:Arial,Helvetica,sans-serif;color:#17120E;">“Tạo Blog – Cỗ máy bán hàng tự động bằng AI”</b> của bạn đây:</p>
  </td></tr>

  <!-- 3. NÚT ĐỌC EBOOK -->
  <tr><td class="px btn" align="center" style="font-family:Arial,Helvetica,sans-serif;padding:26px 36px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="#EA580C" style="font-family:Arial,Helvetica,sans-serif;border-radius:12px;background:#EA580C;background-image:linear-gradient(135deg,#F97316,#EA580C);">
        <a href="${readerUrl}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;display:inline-block;padding:16px 40px;font-size:17px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">Mở ebook của tôi &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- 4. LÀM NGAY: THỬ THÁCH 2 TIẾNG -->
  <tr><td class="px" style="font-family:Arial,Helvetica,sans-serif;padding:32px 36px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF1E8;border-left:4px solid #EA580C;border-radius:0 16px 16px 0;">
      <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:24px 24px 0;">
        <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#EA580C;">Bắt đầu ngay bây giờ · 2 tiếng</p>
        <p style="font-family:Arial,Helvetica,sans-serif;margin:6px 0 0;font-size:20px;line-height:28px;font-weight:700;color:#1F1A17;">Đừng để sang mai. Làm “Thử thách 2 tiếng” ngay hôm nay.</p>
        <p style="font-family:Arial,Helvetica,sans-serif;margin:10px 0 0;font-size:15px;line-height:24px;color:#3E3631;">Hứng khởi lúc vừa mua là thứ dễ mất nhất. Để sang mai là bắt đầu chần chừ. Đừng đọc hết cả cuốn rồi mới làm: <b style="font-family:Arial,Helvetica,sans-serif;color:#1F1A17;">mở ra và làm luôn</b>.</p>
      </td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:18px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="40" valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:0 0 14px;"><div style="font-family:Arial,Helvetica,sans-serif;width:28px;height:28px;line-height:28px;border-radius:50%;background:#EA580C;color:#FFFFFF;font-size:14px;font-weight:700;text-align:center;">1</div></td>
          <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0 14px;font-size:15px;line-height:23px;color:#3E3631;">Lấy sẵn <b style="font-family:Arial,Helvetica,sans-serif;color:#1F1A17;">thẻ thanh toán quốc tế</b> (để mua tên miền và VPS) và <b style="font-family:Arial,Helvetica,sans-serif;color:#1F1A17;">CCCD</b> (để điền thông tin khi đăng ký).</td>
        </tr>
        <tr>
          <td width="40" valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:0 0 14px;"><div style="font-family:Arial,Helvetica,sans-serif;width:28px;height:28px;line-height:28px;border-radius:50%;background:#EA580C;color:#FFFFFF;font-size:14px;font-weight:700;text-align:center;">2</div></td>
          <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0 14px;font-size:15px;line-height:23px;color:#3E3631;">Mở ebook, vào <b style="font-family:Arial,Helvetica,sans-serif;color:#1F1A17;">trang 2 (Lời mở đầu)</b>, đọc phần <i>“Thử thách 2 tiếng”</i>.</td>
        </tr>
        <tr>
          <td width="40" valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:0 0 0;"><div style="font-family:Arial,Helvetica,sans-serif;width:28px;height:28px;line-height:28px;border-radius:50%;background:#EA580C;color:#FFFFFF;font-size:14px;font-weight:700;text-align:center;">3</div></td>
          <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0 0;font-size:15px;line-height:23px;color:#3E3631;">Sao chép prompt đầu tiên, dán vào Agent Coding và <b style="font-family:Arial,Helvetica,sans-serif;color:#1F1A17;">làm theo từng bước</b>.</td>
        </tr>
        </table>
      </td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:20px 24px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-family:Arial,Helvetica,sans-serif;background:#FFFFFF;border:1px solid #F5D6C2;border-radius:12px;padding:16px 18px;font-size:15px;line-height:24px;color:#3E3631;">
            <span style="font-family:Arial,Helvetica,sans-serif;color:#EA580C;font-weight:700;">2 tiếng sau:</span> bạn có tên miền mang tên mình và blog đầu tiên chạy thật. Viên gạch đầu tiên của cỗ máy bán hàng đã đặt xong, ngay trong hôm nay.
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px btn" align="center" style="font-family:Arial,Helvetica,sans-serif;padding:20px 36px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="#EA580C" style="font-family:Arial,Helvetica,sans-serif;border-radius:12px;background:#EA580C;background-image:linear-gradient(135deg,#F97316,#EA580C);">
        <a href="${readerUrl}" target="_blank" style="font-family:Arial,Helvetica,sans-serif;display:inline-block;padding:14px 34px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">Bắt đầu thử thách ngay &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- 5. KẸT THÌ LÀM GÌ -->
  <tr><td class="px" style="font-family:Arial,Helvetica,sans-serif;padding:28px 36px 0;">
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:19px;line-height:27px;font-weight:700;color:#17120E;">Gặp lỗi? Đó là dấu hiệu bạn đang làm thật.</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:8px 0 0;font-size:15px;line-height:24px;color:#3E3631;">Ai làm blog lần đầu cũng gặp lỗi. Khác biệt là có cách gỡ hay không. Bạn có 2 lớp hỗ trợ:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
      <tr>
        <td width="40" valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:0 0 12px;"><div style="font-family:Arial,Helvetica,sans-serif;width:28px;height:28px;line-height:28px;border-radius:50%;background:#EA580C;color:#FFFFFF;font-size:14px;font-weight:700;text-align:center;">1</div></td>
        <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0 12px;font-size:15px;line-height:23px;color:#3E3631;">Chụp màn hình lỗi, dán vào <b style="font-family:Arial,Helvetica,sans-serif;color:#17120E;">Agent Coding</b> theo nguyên tắc <b style="font-family:Arial,Helvetica,sans-serif;color:#17120E;">AI First</b> ở trang 3. Phần lớn lỗi được gỡ ngay ở bước này.</td>
      </tr>
      <tr>
        <td width="40" valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:0 0 4px;"><div style="font-family:Arial,Helvetica,sans-serif;width:28px;height:28px;line-height:28px;border-radius:50%;background:#EA580C;color:#FFFFFF;font-size:14px;font-weight:700;text-align:center;">2</div></td>
        <td valign="top" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0 4px;font-size:15px;line-height:23px;color:#3E3631;">Vẫn chưa được? Nhắn Zalo trực tiếp cho Quảng: <a href="https://zalo.me/0702286928" target="_blank" style="font-family:Arial,Helvetica,sans-serif;color:#EA580C;font-weight:700;text-decoration:none;">0702 286 928</a></td>
      </tr>
    </table>
  </td></tr>

  <!-- 6. KÝ TÊN -->
  <tr><td class="px" style="font-family:Arial,Helvetica,sans-serif;padding:28px 36px 0;">
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0;font-size:16px;line-height:26px;color:#3E3631;">Mình tin bạn sẽ làm được. Không phải vì bạn giỏi kỹ thuật, mà vì bạn đã chịu bắt đầu.</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:14px 0 0;font-size:16px;line-height:26px;color:#3E3631;">Hẹn gặp bạn ở blog đầu tiên, ngay hôm nay,</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:2px 0 0;font-size:18px;font-weight:700;color:#EA580C;">Quảng</p>
  </td></tr>

  <!-- 7. P.S. KÊU GỌI PHẢN HỒI -->
  <tr><td class="px" style="font-family:Arial,Helvetica,sans-serif;padding:22px 36px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF1E8;border-left:4px solid #EA580C;border-radius:0 12px 12px 0;">
      <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:16px 20px;font-size:15px;line-height:24px;color:#3E3631;">
        <b style="font-family:Arial,Helvetica,sans-serif;color:#17120E;">P.S.</b> Khi blog của bạn chạy trên tên miền riêng, <b style="font-family:Arial,Helvetica,sans-serif;color:#17120E;">trả lời email này kèm link blog</b>. Quảng sẽ ghé xem tận nơi, và gửi bạn một món quà dành riêng cho người đã đi hết chặng đầu tiên.
      </td></tr>
    </table>
  </td></tr>

  <!-- 8. BIÊN NHẬN (cuối thư, gọn) -->
  <tr><td class="px" style="padding:26px 36px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px dashed #F0C9AF;">
      <tr><td colspan="2" style="font-family:Arial,Helvetica,sans-serif;padding:16px 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8A8178;">Biên nhận</td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:3px 0;font-size:14px;color:#8A8178;">Mã đơn</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0;font-size:14px;font-weight:700;color:#3E3631;">${maDon}</td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:3px 0;font-size:14px;color:#8A8178;">Ngày mua</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0;font-size:14px;font-weight:700;color:#3E3631;">${ngayFormatted}</td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;padding:3px 0;font-size:14px;color:#8A8178;">Số tiền</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;padding:3px 0;font-size:14px;font-weight:700;color:#3E3631;">${soTien}</td></tr>
    </table>
  </td></tr>

  <!-- 9. CHÂN THƯ -->
  <tr><td class="px" align="center" style="font-family:Arial,Helvetica,sans-serif;background:#FFF1E8;padding:20px 36px;font-size:12px;line-height:20px;color:#8A7B70;">
    Bạn nhận email này vì đã mua ebook “Tạo Blog – Cỗ máy bán hàng tự động bằng AI”.
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
