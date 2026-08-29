---
title: "Context Engineering: Nghệ thuật kiểm soát những gì mô hình được thấy"
description: "Tại sao AI Agent càng chạy càng rối và sinh ảo giác? Câu trả lời nằm ở Context Engineering — nghệ thuật chọn lọc và tổ chức thông tin đưa vào mô hình."
pubDate: 2026-08-29T09:20:00.000Z
status: "public"
draft: false
author: "Đào Xuân Quảng"
tags: ["AI", "Context Engineering", "Tư duy"]
---

Khi làm việc với AI đủ lâu, đạo hữu sẽ nhận ra một sự thật đắng cay: Chất lượng đầu ra của Agent không chỉ phụ thuộc vào Prompt. Mà phụ thuộc phần lớn vào **Context (Bối cảnh/Thông tin đầu vào)**.

Rất nhiều đạo hữu đang lầm tưởng rằng các mô hình thế hệ mới có Context Window cực lớn (lên tới hàng triệu token) thì chúng ta cứ việc ném mọi thứ vào đó. Nhưng Context Window không phải là thùng rác để nhét mọi thứ vào. Đó là một tài nguyên hữu hạn và cần được quản lý cực kỳ nghiêm ngặt.

---

## 1. Bức tranh toàn cảnh của Context trong AI Agent

Trong một hệ thống Agent, bối cảnh (Context) mà mô hình nhìn thấy tại mỗi bước thực thi vô cùng phức tạp và đa dạng, bao gồm:
1. **User query:** Yêu cầu hiện tại của người dùng.
2. **System prompt:** Chỉ dẫn cốt lõi của Agent.
3. **Retrieved docs:** Các tài liệu được truy xuất từ cơ sở dữ liệu (RAG).
4. **Memory:** Lịch sử hội thoại hoặc các thông tin quan trọng đã lưu trữ.
5. **Tool outputs:** Kết quả trả về sau khi gọi các công cụ/API bên ngoài.
6. **Prior turns & State:** Trạng thái hiện tại của nhiệm vụ và lịch sử các bước Agent đã thực hiện trước đó.

---

## 2. Hậu quả của việc "bội thực" Context

Nếu không kiểm soát tốt bối cảnh đưa vào mô hình, đạo hữu sẽ gặp phải các kiếp nạn sau:
- **Đưa thiếu thông tin:** Mô hình không đủ dữ liệu để suy luận, dẫn đến câu trả lời mơ hồ hoặc từ chối thực hiện.
- **Đưa thừa thông tin:** Mô hình bị nhiễu thông tin (lost in the middle), bám vào các chi tiết phụ không quan trọng và bỏ qua chỉ dẫn chính.
- **Sai thứ tự ưu tiên:** Mô hình bị nhầm lẫn giữa thông tin cũ (quá khứ) và thông tin mới (hiện tại).
- **Rác thông tin từ Tool:** Kết quả thô từ Tool nếu không được lọc sạch sẽ làm phình context rất nhanh, khiến agent càng chạy càng rối và sinh ra ảo giác (hallucination).

---

## 3. Bản chất của Context Engineering

Đây là lý do vì sao **Context Engineering quan trọng hơn Prompt Engineering**.

Context Engineering không đơn thuần là “thêm nhiều tài liệu hơn”. Nó là nghệ thuật chọn đúng thông tin, đặt vào đúng vị trí, và cung cấp đúng thời điểm.

Một Agent tốt không phải là Agent nhớ tất cả mọi thứ một cách vô tội vạ. Một Agent tốt là Agent biết **mang đúng thứ cần thiết vào context ở đúng bước thực thi**. Để làm được điều đó một cách tự động và ổn định, chúng ta cần một bộ khung bao quanh hệ thống — đó chính là **Harness Engineering**.
