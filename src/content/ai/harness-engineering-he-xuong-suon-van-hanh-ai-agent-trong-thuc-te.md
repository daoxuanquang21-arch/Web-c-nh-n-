---
title: "Harness Engineering: Hệ xương sườn vận hành AI Agent trong thực tế"
description: "Tầng quan trọng nhất quyết định một AI Agent có dùng được trong thực tế hay không. Khám phá cơ chế Gather, Act, Verify, Recovery và Observability."
pubDate: 2026-08-29T09:30:00.000Z
status: "public"
draft: false
author: "Đào Xuân Quảng"
tags: ["AI", "Harness Engineering", "Hệ thống"]
---

Chào anh em, nếu chúng ta ví mô hình ngôn ngữ lớn (LLM) giống như một khối động cơ phản lực cực mạnh, thì **Harness Engineering** chính là thiết kế toàn bộ khung sườn, cánh bay, buồng lái, hệ thống dẫn đường và cơ chế hạ cánh khẩn cấp để biến khối động cơ đó thành một chiếc máy bay thương mại an toàn và đáng tin cậy.

Trong kỹ nghệ phần mềm AI Agent, Harness là lớp vỏ bọc code truyền thống (Deterministic Code viết bằng Python hoặc TypeScript) bao quanh mô hình suy luận (Probabilistic Model) để quản lý luồng dữ liệu, thực thi hành động, tự động sửa lỗi và bảo đảm hệ thống vận hành đúng quỹ đạo. Đây là tầng công lực quyết định một dự án AI Agent có thể đưa vào thực tế (production-ready) hay chỉ dừng lại ở mức demo chạy cho vui.

---

## 1. Vòng lặp 5 bước cốt lõi của một Agent Harness chuẩn doanh nghiệp

Một hệ thống Harness thực chiến vận hành Agent thông qua một vòng lặp kín (Loop) được kiểm soát chặt chẽ bao gồm 5 bước sau:

```
[ BẮT ĐẦU ] --> 1. GATHER (Thu thập dữ liệu, RAG, Memory)
                   |
                   v
                2. ACT (Gọi LLM & thực thi Tool API)
                   |
                   v
                3. VERIFY (Xác thực đầu ra, ép kiểu JSON Schema)
                   |
                   +---> [ HỢP LỆ ] ------> [ THÀNH CÔNG ]
                   |
                   +---> [ LỖI ] ---------> 4. RECOVER (Tự sửa lỗi/Thử lại)
                                               |
                                               +---> (Vượt quá Max Iterations) --> [ DỪNG KHẨN CẤP ]
```

### Bước 1: Gather (Thu thập bối cảnh)
Trước khi gửi lượt yêu cầu tiếp theo tới LLM, Harness có nhiệm vụ thu thập tất cả dữ liệu động cần thiết bao gồm đọc lịch sử trò chuyện đã được tối ưu hóa, truy xuất tài liệu liên quan thông qua RAG và cập nhật trạng thái hệ thống.

### Bước 2: Act (Thực thi hành động)
Harness gửi bối cảnh tới LLM để nhận về quyết định. Nếu LLM yêu cầu gọi một công cụ (Tool Call), Harness sẽ bắt lấy yêu cầu đó, kiểm tra các tham số đầu vào và thực thi công cụ ở môi trường thực tế (như gửi API request hoặc query SQL database).

### Bước 3: Verify (Xác thực kết quả đầu ra)
Harness thực hiện kiểm tra cấu trúc (Schema Validation) của dữ liệu trả về từ LLM, kiểm tra an toàn (Guardrails) để phát hiện prompt injection, và xác thực thông tin tránh ảo giác (Grounding Check).

### Bước 4: Recover (Tự sửa lỗi động)
Nếu phát hiện lỗi định dạng hoặc lỗi logic, Harness sẽ kích hoạt vòng lặp phản hồi (Self-correction loop) để gửi chi tiết mã lỗi ngược lại cho LLM sửa đổi thay vì làm crash hệ thống phần mềm.

### Bước 5: Observe (Giám sát vận hành - Tracing)
Ghi log chi tiết luồng chạy của mô hình, đo lường thời gian phản hồi của từng tool và chi phí token tiêu thụ của mỗi request để phục vụ tối ưu hóa.

---

## 2. Minh họa kiến trúc Harness bằng mã mẫu (TypeScript)

Để anh em lập trình viên dễ hình dung cơ chế hoạt động thực tế, đây là bộ khung triển khai một Harness cơ bản viết bằng TypeScript thuần (Vanilla TypeScript) không phụ thuộc vào bất kỳ framework AI nào:

```typescript
interface AgentResponse {
  thought: string;
  tool_to_call: string | null;
  tool_params: any;
  final_answer: string | null;
}

class AgentHarness {
  private maxIterations = 5;
  private currentIteration = 0;

  async run(userQuery: string): Promise<string> {
    let context = this.gatherContext(userQuery);
    let errorMessage: string | null = null;

    while (this.currentIteration < this.maxIterations) {
      this.currentIteration++;
      console.log(`[Iteration ${this.currentIteration}] Gọi LLM...`);
      
      // Nạp thêm thông báo lỗi vào context nếu có lỗi ở bước trước (Self-correction)
      const currentPrompt = errorMessage 
        ? `${context}\n\n[LỖI HỆ THỐNG]: Đầu ra trước của bạn bị lỗi: ${errorMessage}. Vui lòng sửa lại định dạng JSON.`
        : context;

      const rawResponse = await this.callLLM(currentPrompt);
      
      // Bước 3: VERIFY
      const parsed = this.verifyOutput(rawResponse);
      if ('error' in parsed) {
        errorMessage = parsed.error;
        continue; // Chuyển sang bước RECOVER tự sửa ở vòng tiếp theo
      }

      const agentData = parsed as AgentResponse;

      // Nếu model muốn gọi công cụ
      if (agentData.tool_to_call) {
        console.log(`Gọi công cụ: ${agentData.tool_to_call} với tham số:`, agentData.tool_params);
        try {
          // Bước 2: ACT
          const toolResult = await this.executeTool(agentData.tool_to_call, agentData.tool_params);
          context += `\n\n[KẾT QUẢ CÔNG CỤ ${agentData.tool_to_call}]: ${toolResult}`;
          errorMessage = null; // Reset thông báo lỗi
        } catch (e: any) {
          errorMessage = `Lỗi thực thi công cụ ${agentData.tool_to_call}: ${e.message}`;
        }
      } else if (agentData.final_answer) {
        return agentData.final_answer; // Hoàn thành nhiệm vụ thành công
      }
    }

    throw new Error("Đạt giới hạn max_iterations mà Agent chưa giải quyết xong công việc.");
  }

  private gatherContext(query: string): string {
    return `[SYSTEM INSTRUCTION]: Trả về định dạng JSON khớp với Schema...\n[USER QUERY]: ${query}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    // Thực tế sẽ gọi API của OpenAI/Anthropic ở đây
    return JSON.stringify({
      thought: "Đang phân tích yêu cầu...",
      tool_to_call: "check_stock",
      tool_params: { item: "laptop" },
      final_answer: null
    });
  }

  private verifyOutput(raw: string): AgentResponse | { error: string } {
    try {
      const data = JSON.parse(raw);
      if (!data.thought || (data.tool_to_call === undefined && data.final_answer === undefined)) {
        return { error: "Thiếu các trường bắt buộc trong JSON Schema" };
      }
      return data as AgentResponse;
    } catch (e: any) {
      return { error: `JSON hỏng cú pháp: ${e.message}` };
    }
  }

  private async executeTool(name: string, params: any): Promise<string> {
    return "Còn 5 sản phẩm trong kho.";
  }
}
```

---

## 3. Xử lý lỗi hỏng hóc thông minh (Intelligent Recovery Strategy)

Như anh em thấy trong ví dụ code trên, cơ chế tự sửa lỗi hoạt động nhờ vào sự phối hợp nhịp nhàng giữa lập trình truyền thống và LLM:
1. **Lập trình truyền thống (TypeScript/Python):** Đóng vai trò là cảnh sát giám sát. Nó bắt các lỗi cú pháp JSON, lỗi thiếu trường hoặc lỗi API bên thứ ba. Nó không thể sửa các lỗi này một cách thông minh, nhưng nó có khả năng mô tả lỗi cực kỳ chi tiết bằng văn bản (ví dụ: *"Lỗi cú pháp JSON ở dòng 3: thiếu dấu ngoặc đóng"*).
2. **LLM:** Đóng vai trò là người sửa chữa. Khi nhận được phản hồi lỗi chi tiết từ cảnh sát giám sát, nó sử dụng khả năng hiểu ngôn ngữ tự nhiên để tự điều chỉnh lại hành động ở lượt tiếp theo.

Sự kết hợp này tạo ra một hệ thống có tính ổn định cực kỳ cao mà chỉ dùng prompt thuần túy không bao giờ có thể làm được.

Luyện Harness Engineering chính là cách anh em thiết kế ra một hệ điều hành và cơ chế phản xạ vững chắc cho AI Agent của mình trong môi trường sản xuất thực tế!
