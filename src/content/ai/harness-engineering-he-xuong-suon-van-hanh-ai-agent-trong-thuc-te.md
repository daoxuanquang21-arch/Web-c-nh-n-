---
title: "Harness Engineering: Hệ xương sườn vận hành AI Agent trong thực tế"
description: "Tầng quan trọng nhất quyết định một AI Agent có dùng được trong thực tế hay không. Khám phá cơ chế Gather, Act, Verify, Recovery và Observability."
pubDate: 2026-08-29T09:30:00.000Z
status: "public"
draft: false
author: "Đào Xuân Quảng"
tags: ["AI", "Harness Engineering", "Hệ thống"]
---

Khi bước sang thế giới của AI Agent, đạo hữu không còn chỉ làm việc với một prompt đơn lẻ trên giao diện chat nữa. Đạo hữu đang thiết kế một hệ thống phần mềm hoàn chỉnh.

Tầng công lực thứ ba, cũng là tầng quan trọng nhất và khó luyện nhất chính là **Harness Engineering** (Thiết kế hệ thống bao quanh mô hình). Nếu Prompt và Context là bộ não, thì Harness chính là hệ thần kinh, xương sườn, tay chân, và phản xạ tự nhiên của Agent.

---

## 1. Năm cột trụ cốt lõi của một Harness thực chiến

Một hệ thống Harness tạm-gọi-là-chạy-được trong môi trường thực tế bắt buộc phải có đầy đủ 5 cơ chế sau:

### 1. Gather (Thu thập bối cảnh)
Hệ thống tự động thu thập dữ liệu thô, truy xuất bộ nhớ (memory), định vị thông tin công cụ (tool info) và đóng gói chúng thành một context gọn gàng nhất trước khi gửi tới model.

### 2. Act (Thực thi hành động)
Sau khi model đưa ra quyết định gọi công cụ hoặc sub-agent, Harness sẽ chịu trách nhiệm thực thi hành động đó ở thế giới thực (gọi API, truy vấn database, gửi email...).

### 3. Verify (Kiểm chứng đầu ra)
Đây là chốt chặn quan trọng. Harness phải kiểm tra chất lượng kết quả trả về của model: Có đúng định dạng schema không? Có an toàn không? Có bị ảo giác không? Nhiệm vụ đã thực sự hoàn thành chưa?

### 4. Retry / Recover (Tự phục hồi lỗi)
Nếu bước kiểm chứng phát hiện lỗi hoặc model gọi sai công cụ, Harness phải tự động kích hoạt cơ chế sửa lỗi: cung cấp thông báo lỗi rõ ràng cho model tự sửa, thử cách tiếp cận khác hoặc giới hạn số lần thử lại để tránh vòng lặp vô tận.

### 5. Observe (Giám sát vận hành)
Ghi log chi tiết cấu trúc chạy của Agent, đo lường chi phí, thời gian phản hồi, và tỷ lệ thành công của từng bước để liên tục cải tiến hệ thống.

---

## 2. Sự khác biệt giữa Demo và Thực tế

Prompt Engineering thiết kế instruction. Context Engineering thiết kế những gì model được thấy. Còn Harness Engineering thiết kế hệ thống giúp model hành động đáng tin cậy và ổn định.

Nếu không có Harness, Agent của đạo hữu rất dễ biến thành một chuỗi prompt nối nhau bằng... niềm tin. 

Chạy thử nghiệm một vài lần thì vui vẻ, chạy 100 lần bắt đầu phát sinh lỗi biên (edge cases), chạy với dữ liệu thật của khách hàng thì hoàn toàn vỡ trận. Muốn đưa AI Agent vào thực tế, Harness Engineering là con đường bắt buộc.
