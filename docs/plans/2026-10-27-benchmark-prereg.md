---
type: plan
title: "Cây thước: kế hoạch đăng ký trước (Phần 1)"
description: "Giả thuyết, tập task, oracle, kiểm định, số task và số lần chạy, chi phí và ngưỡng nghiệm thu của benchmark đo harness hstack, đăng ký trước khi chạy."
status: draft
generated: { by: claude-code/2.1.310, at: "2026-10-27T09:10:00+07:00" }
sources:
  - id: layers
    resource: /design/2026-10-26-layers.md
---

# Cây thước: kế hoạch đăng ký trước (Phần 1)

Bản này được commit **trước** mọi lần chạy tính điểm. Sau khi khoá (mục 12), mọi thay đổi về giả thuyết, thước đo, ngưỡng, tập task hay k phải là một commit mới có lý do, và báo cáo cuối liệt kê từng thay đổi đó.

Dữ liệu gốc của khách (plan, test, patch, input đã lọc, oracle) nằm trong `.evidence/bench/` (gitignore). Script nằm trong `bench/` của repo này; chúng nhận đường dẫn repo làm tham số và không chứa dữ liệu khách. `bench/` không phải nội dung plugin.

## 1. Câu hỏi

Harness có làm ra sản phẩm đúng requirement và đạt chất lượng hơn Claude Code không plugin hay không, với ít can thiệp của người, đo bằng oracle giữ kín mà harness không đọc được. Lớp nào của harness đáng giữ.

Không đo ở đây: tốc độ gõ code, độ đẹp UI ngoài những gì oracle kiểm, chi phí hạ tầng ngoài token và giờ.

## 2. Giả thuyết và ngưỡng (đăng ký trước)

Tất cả so sánh là theo cặp trên cùng task, khoảng tin cậy 95% (mục 10). "Đạt" nghĩa là cận dưới của khoảng tin cậy vượt ngưỡng, không phải ước lượng điểm.

| ID | Giả thuyết | Thước đo | Ngưỡng nghiệm thu | Tập |
|---|---|---|---|---|
| H1 | Harness build đúng requirement hơn baseline | điểm build (mục 9.1) của H trừ B | cận dưới > 0 **và** ước lượng điểm ≥ 0,10 | task ngoài |
| H2 | Harness tự nêu ra mép spec không nói tới | điểm requirement (mục 9.1) của H trừ B | cận dưới > 0 | task ngoài |
| H3 | Mức tự động đủ cao | can thiệp mỗi task của H (mục 9.3) | cận trên ≤ 1,0, và H − B cận trên ≤ 0,5 | task ngoài |
| H4 | Cây thước phân biệt được | điểm build + requirement của H trừ W (biến thể yếu) | cận dưới > 0 | task ngoài |
| H5 | Bộ test harness sinh ra canh gác được | tỉ lệ bắt lỗi cấy của bộ test đó; mutation score trên dòng vừa đổi | tỉ lệ bắt lỗi cấy cận dưới ≥ 0,5 | task ngoài + `real-estate` |

Quy tắc sàn cho H1 (đăng ký trước): sau khi phân loại lại các task của lần chạy thử (mục 12 bước 3) với bảng interface, nếu trung vị số kiểm tra **lần ngược được** mỗi task dưới 5, điểm build của H1 không lấy từ oracle commit sửa lỗi nữa mà từ **oracle bước**: test gốc mà chính task viết cho các feature step (plan `real-estate` nêu một test cho mỗi step; với task ngoài là các test FAIL_TO_PASS mà người phân loại xếp lần ngược được), viết lại hộp đen theo mục 6.2, tối đa 15 mỗi task chọn theo hạt giống, kiểm định qua trên sản phẩm cuối của task và hỏng ở commit gốc. Khi đó mọi kiểm tra từ commit sửa lỗi chấm H2. Ngưỡng của H1 giữ nguyên.

H1, H2, H3 là ba phép thử chính; hiệu chỉnh Holm cho ba phép thử này. H4 là kiểm định cây thước: nếu H4 không đạt thì không công bố H1–H3 (cây thước không phân biệt được harness yếu). H5 là phụ, báo cáo riêng.

`real-estate` là tập phụ: 20 bug của nó đã định hình thiết kế cũ, nên kết quả trên `real-estate` được báo cáo nhưng không dùng để nghiệm thu.

## 3. Các nhánh chạy

| Nhánh | Là gì |
|---|---|
| B | Claude Code không plugin, cùng model, cùng prompt task, cùng quyền công cụ, chế độ không hỏi người (mục 9.3) |
| H | Claude Code với plugin hstack ở một commit đã khoá |
| W | H nhưng tắt: reviewer trong context riêng, oracle độc lập, cổng chống làm yếu test. Builder tự review. Đây là canary của cây thước |
| H−lớp | H bỏ một lớp. Chỉ dùng trong phép đo phụ (mục 8), không chạy end-to-end trừ khi ngân sách cho phép |

Mỗi lần chạy ghi: model ID của mọi agent (lấy từ transcript, không lấy từ cấu hình), ngày giờ, commit của plugin, commit gốc của task, token vào/ra, thời gian, số lần hỏi người.

## 4. Tập task

### 4.1 Task `real-estate` (tập phụ)

Mỗi plan có tính năng mới là một task. Commit gốc là commit ngay trước commit đầu tiên của plan. Plan chỉ viết test (4.1, 7a.1) không phải task. Plan sửa lỗi (7a, 9, 10) và các mục "Items carried" không phải task: chúng là nguồn oracle cho task trước.

Ứng viên oracle: các hunk mã nguồn của commit đến sau, mà dòng bị xoá (hoặc với hunk chỉ thêm, dòng cũ ngay trước chỗ chèn) do commit của task viết ra, theo `git blame` ở commit cha (`bench/oracle-sources.mjs`). Cột "catalog" chỉ đếm hunk thuộc 23 commit sửa lỗi của `.evidence/replay.md`; các ứng viên còn lại phần lớn là tính năng sau sửa lại code cũ (đổi requirement, không phải bug) và phải được gắn nhãn (mục 6.1).

| Task | Plan | Commit gốc | Số commit | Hunk ứng viên (có đổi test) | trong đó thuộc catalog | Commit catalog |
|---|---|---|---|---|---|---|
| p1 | 1 foundation | 691a723 | 16 | 158 | 15 | 0870afc 4e58ba5 89583d2 dd56b84 e41d45f |
| p2 | 2 properties | 7adfd47 | 12 | 187 | 33 | 24c426f 4e58ba5 89583d2 d82f2b0 e41d45f eb2b016 |
| p3 | 3 articles | 5eced48 | 15 | 139 | 20 | 89583d2 dd56b84 |
| p4 | 4 surveys | be6c20b | 18 | 147 | 5 | 090f6f2 5b6646d |
| p5 | 5 matching | 8906318 | 9 | 20 | 0 | — |
| p6a | 6a requests | 31fcab0 | 8 | 115 | 14 | 0870afc 24c426f 36d089b 6cedf96 dd56b84 |
| p6b | 6b notifications | d7f2fd3 | 7 | 68 | 6 | 090f6f2 6cedf96 dd56b84 |
| p6c | 6c admin polish | 885c4c2 | 10 | 60 | 26 | 24c426f 6cedf96 d82f2b0 dd56b84 e41d45f |
| p7b | 7b limits (chỉ phần mới) | 9354f4d | 6 | 23 | 6 | 0870afc 24c426f d82f2b0 |
| p7c | 7c launch | 3137149 | 11 | 6 | 2 | 8eccb47 |
| p8a | 8a brand | 0b02f41 | 8 | 47 | 5 | 730509b d82f2b0 dd56b84 |
| p8b | 8b listings | d1ea76b | 7 | 50 | 30 | 24c426f d82f2b0 dd56b84 eb2b016 |
| p8b1 | 8b.1 showcase seed | 1846450 | 6 | 18 | 11 | 4e58ba5 |
| p8c | 8c detail | bf2eea3 | 8 | 43 | 9 | 24c426f dd56b84 eb2b016 |
| p8d | 8d home | bee1c22 | 9 | 44 | 41 | 090f6f2 24c426f 69ebe27 dd56b84 |
| p8e | 8e admin | d7695d6 | 7 | 17 | 16 | b5b3cec eb2b016 |

Chạy lại: `bun bench/oracle-sources.mjs <repo> <commit,...>`; kết quả mỗi task ở `.evidence/bench/tasks/<task>.tsv`.

Điều kiện một task được giữ: (a) input đã lọc qua `bench/input-check.mjs`; (b) sau khi gắn nhãn sửa lỗi / đổi requirement, còn ít nhất 3 kiểm tra oracle hợp lệ (mục 7.1); (c) không cần dữ liệu ngoài repo (ví dụ thư mục `showcase-data/`). Dự kiến p5 và p7c rớt ở (b), còn 14. Tối đa 12 task được chạy: nếu hơn 12 task đạt, giữ 12 task có nhiều kiểm tra oracle hợp lệ nhất (hoà thì task sớm hơn). Danh sách task cuối cùng được commit trước khi chạy, cùng lý do loại từng task.

`real-estate` là repo riêng tư, tạo sau knowledge cutoff của model (tháng 6/2026), nên không có trong dữ liệu huấn luyện. Nó vẫn là tập phụ vì lý do ở mục 2.

### 4.2 Task bên ngoài (tập chính, dùng để nghiệm thu)

Quy tắc chọn, đăng ký trước, kiểu SWE-bench-Live:

1. Repo công khai, có giấy phép mở, có hoạt động sau 2026-07-01, chạy được trong container dùng một lần.
2. Ba nhóm stack khác hẳn nhau, mỗi nhóm 8 task: (S1) ứng dụng web có cơ sở dữ liệu; (S2) ứng dụng desktop; (S3) CLI hoặc thư viện, bằng một ngôn ngữ khác ngôn ngữ của S1 và S2. Ví dụ có đánh dấu, không ràng buộc: S1 một app Django hoặc Rails, S2 một app Electron hoặc Tauri, S3 một CLI Go hoặc thư viện Rust.
3. Mỗi task là một issue và PR đã merge, cả hai tạo sau 2026-07-01 (sau cutoff của mọi model trong thí nghiệm; ngày cutoff ghi kèm model ID). PR phải liên kết issue, thêm hoặc sửa test, và có ít nhất một test hỏng trước PR và qua sau PR.
4. Ít nhất 6 trong 8 repo của mỗi nhóm chưa từng được dùng trong hstack. Mọi repo đều là brownfield. Ít nhất một repo dùng cho phép thử "setup nguội" (mục 13).
5. Lấy mẫu: liệt kê mọi ứng viên đạt 1–4, sắp theo hash SHA-256 của `<owner>/<repo>#<số PR>` nối với hạt giống `hstack-bench-2026-10-27`, lấy từ đầu danh sách, tối đa 2 task mỗi repo. Danh sách ứng viên và kết quả lấy mẫu được commit trước khi chạy.
6. Input: chỉ tiêu đề và thân issue, cùng repo ở commit cha của PR. Không đưa mô tả PR, review comment, hay bình luận issue sau khi PR mở (chúng thường chứa lời giải).
7. Oracle: test của PR, viết lại thành kiểm tra hộp đen ở interface công khai (mục 6.2). Với thư viện, interface là API công khai; với CLI, là chạy chương trình thật.

## 5. Input

Quy tắc lọc cho plan `real-estate` (đã thử trên p8b, mục 14):

- **Giữ**, chỉ viết lại để bỏ con trỏ: Goal; "User decisions" (bỏ ý chỉ nói về quy trình viết plan); "Global Constraints"; "Feature steps" của tính năng mới.
- **Bỏ cả mục**: "Items carried", nhóm feature step sửa plan trước (ví dụ P8b-F5), "Decisions taken in the scratch copy", "Changes from the design", "Review Focus", "Known limits", "File map", mọi Task, phần hướng dẫn quy trình. Lý do bỏ "Review Focus", "Known limits" và "Decisions taken in the scratch copy": người viết plan rút chúng ra sau khi đã build thử cả plan trong bản nháp (plan 8b: spike khoảng 1,52M token; Known limits của 8b chứa cả số byte đo trên bản build production), nên chúng là sản phẩm của lần build, không phải requirement. Hệ quả có chủ ý: một mép chỉ nằm trong các mục này sẽ chấm bước requirement.
- **Bỏ trong phần giữ**: con trỏ tới test, đường dẫn và tên file mã nguồn hoặc test, tên định danh nội bộ. **Giữ** interface công khai: URL, tham số query, chữ trên UI, đường dẫn API, mã trạng thái, lệnh CLI của project.
- **Mockup**: không đưa. Bước nói "giống mockup" giữ câu, gắn nhãn `[visual, mockup not given]`; kiểm tra oracle chỉ dựa vào mockup bị loại khỏi điểm.

**Bảng interface.** Kiểm tra oracle cần tên công khai để chạy: nhãn trường, tên truy cập của form, chữ của option, khoá tham số URL, tên trường API. Input đã lọc không nêu hết các tên này (p8b: chỉ 2 trong số các khoá giá và sắp xếp). Nếu builder tự đặt tên khác, kiểm tra hỏng vì tên chứ không vì hành vi, và điểm requirement lẫn hai thứ. Vì vậy input kèm một bảng interface: **toàn bộ** tên công khai của các tính năng task làm ra, đọc từ sản phẩm cuối của task (p8b: 730509b): mọi nhãn, chữ option, tên truy cập của form, khoá tham số URL, tên trường API của các trang và endpoint mà feature step nhắc tới. Chỉ tên, không có hành vi. Bảng không được lập từ các kiểm tra oracle (một danh sách chọn lọc sẽ cho builder biết kiểm tra ẩn chạm vào đâu); người lập là một agent chưa đọc oracle, và bảng phải qua `bench/input-check.mjs`. Tên chỉ có sau commit sửa lỗi (ví dụ nhãn "Tên địa điểm" do d82f2b0 thêm) tự nhiên không có trong bảng.

Người lọc (một agent) không thấy commit sửa lỗi, plan sau, log tiến độ hay oracle. `bench/input-check.mjs` phải in PASS trên mọi input; nó tìm code fence, đường dẫn mã nguồn hoặc test, tên file mã nguồn, lời gọi test, con trỏ tiêu đề test và cú pháp code. Đây là bằng chứng máy cho "input không chứa code hay test"; một người đọc thêm 2 input ngẫu nhiên.

## 6. Oracle

### 6.1 Nguồn

- `real-estate`: ứng viên theo quy tắc blame ở mục 4.1, cộng các commit sửa lỗi nằm **trong** task (đợt sửa sau final review, ví dụ 730509b của p8b), vì sản phẩm cuối của task phải không còn các lỗi đó.
- Mỗi commit ứng viên được gắn nhãn "sửa lỗi" (khôi phục hành vi task đã định) hay "đổi requirement" (tính năng sau đổi hành vi) bởi hai agent độc lập, chỉ đọc tiêu đề commit, diff và mục log tiến độ ghi ai tìm ra (như `attribution.md`). Bất đồng do người phân xử. Chỉ "sửa lỗi" vào oracle.
- Plan sửa lỗi và nội dung commit sửa lỗi không bao giờ vào input của builder.

### 6.2 Viết lại thành hộp đen

Mỗi test do commit sửa lỗi thêm hoặc đổi, nếu kiểm hành vi của một hunk trong phạm vi, được viết lại thành kiểm tra chỉ dùng interface công khai: trình duyệt, HTTP, API REST công khai (đăng nhập qua API như người dùng), chữ hiển thị, URL; với CLI là chạy chương trình; với thư viện là API công khai. Không import mã của app, không gọi hàm nội bộ, không đọc DB. Test unit hay int được chuyển tới chỗ hành vi lộ ra với người dùng; nếu không có đường công khai, giữ trong manifest với `interface: none` và không tính điểm. Mỗi kiểm tra có một bước tiền điều kiện (tính năng có tồn tại không) tách khỏi khẳng định chính, để phân biệt "thiếu tính năng" với "sai ở mép".

Oracle nằm ngoài cây thư mục builder đọc được và chỉ chạy sau khi lần build kết thúc, bởi script chấm, trong môi trường dùng một lần (DB mới, cổng riêng).

### 6.3 Phân loại từng kiểm tra

Hai agent phân loại độc lập, chỉ thấy input đã lọc và oracle:

- **lần ngược được**: mọi khẳng định **và** mọi giá trị chọn phần tử hay dựng state mà kiểm tra cần (nhãn, tham số URL, chữ trạng thái, con số) đều được input nói ra hoặc suy ra trực tiếp. Kèm trích dẫn và ID bước. → chấm bước build.
- **không lần ngược được**: builder có thể làm đủ input mà vẫn hỏng kiểm tra này. → chấm bước requirement.
- **một phần**: tách thành hai kiểm tra ở mức khẳng định nếu được; không tách được thì vào nhóm requirement.

Tên công khai có trong bảng interface (mục 5) được coi là input đã nêu; người phân loại chỉ xét hành vi.

Bất đồng do người phân xử; độ đồng thuận trước phân xử (Cohen κ) được báo cáo. Hai con số build và requirement không bao giờ gộp.

## 7. Kiểm định cây thước

### 7.1 Oracle

Mỗi kiểm tra có bước tiền điều kiện tường minh (mục 6.2) và chạy thêm ở **commit gốc của task**. Kiểm tra hỏng ở commit gốc **sau khi** qua tiền điều kiện là bug có từ trước task (quy tắc blame gán nhầm vì task viết lại một dòng bên cạnh hay chính dòng đó): nó vào nhóm "có từ trước", không tính vào điểm nào của task này, và được chuyển làm oracle cho task đã gây ra nó. Hỏng ở tiền điều kiện là bình thường (tính năng chưa có).

Mỗi kiểm tra phải **hỏng trên phiên bản lỗi đã biết** (commit cha của commit sửa lỗi, và sản phẩm cuối thật của task) và **qua trên lời giải chuẩn** (commit sửa lỗi), trong cùng một lần chạy. Kiểm tra qua cả hai là "yếu", hỏng cả hai là "hỏng"; cả hai loại bị loại khỏi điểm (được sửa phần cơ chế, không bao giờ làm yếu khẳng định). Một người xác nhận mẫu 10 kiểm tra mỗi stack: đọc kiểm tra cạnh test gốc và nói nó có kiểm cùng hành vi không.

Với task ngoài: lời giải chuẩn là commit merge của PR; phiên bản lỗi là commit cha. Thêm 3 lỗi cấy mỗi task (mục 8.3) làm phiên bản lỗi bổ sung.

### 7.2 Người chấm

- Phân loại lần ngược (mục 6.3): κ giữa hai agent; người phân xử mọi bất đồng và chấm lại mẫu 20 kiểm tra đồng thuận. Ngưỡng dùng được: (κ ≥ 0,6 hoặc, khi một nhãn chiếm hơn 80%, đồng ý thô ≥ 85% và Gwet AC1 ≥ 0,7) và người đồng ý ≥ 90% trên mẫu đồng thuận. Lý do có nhánh "hoặc": khi gần như mọi kiểm tra cùng một nhãn, κ thấp dù hai bên gần như luôn đồng ý (p8b, mục 14); không đạt thì viết lại quy tắc phân loại và chạy lại trước khi khoá.
- LLM-judge (nếu dùng cho chấm chất lượng mù ở mục 13): hiệu chỉnh trên 30 đầu ra có nhãn của hai người; báo cáo độ đồng thuận judge–người; chỉ dùng nếu nó không thấp hơn độ đồng thuận người–người quá 0,1.
- Can thiệp (mục 9.3): hai người ghi nhãn độc lập theo bộ quy tắc trên mẫu 20 transcript; κ ≥ 0,7 trước khi một người ghi nhãn phần còn lại.

### 7.3 Biến thể yếu

W (mục 3) phải bị chấm thấp hơn H (H4). Nếu không, cây thước không đủ nhạy và kết quả H1–H3 không được công bố.

## 8. Phép đo phụ cho từng lớp

### 8.1 Replay

Chuyển quy trình `.evidence/replay.md` thành script (`bench/replay`): áp patch đảo ở HEAD, bỏ mọi test mà commit sửa thêm vào (kể cả `it.each`), chạy một lớp, ghi bắt hay không, chỉ tính khi khẳng định hỏng có từ trước commit sửa. Giữ hai bẫy đã biết: bỏ một test mỗi lần sửa là sai; e2e phải lọc đúng project.

### 8.2 Tập dev và held-out

- Dev: 20 bug của `replay.md` (đã định hình thiết kế cũ). Kết quả cũ giữ nguyên: unit + int 1/20, e2e 0/15, evaluator mù 1/14, review 17/20 theo hồ sơ.
- Held-out: hunk ngoài 11 commit của tập dev, đạt `reverts_cleanly = yes` và có test cùng commit. Theo catalog có 11; bỏ 730509b vì nó là nguồn oracle của p8b (mục 6.1), còn **10** (29f4daf 1, 36d089b 1, 400f58a 1, 5b6646d 3, 89583d2 3, b5b3cec 1); chỉ tính loại logic, validation, data thì còn **4**. Ghi nhận: lúc định hướng cho kế hoạch này, mệnh đề trong catalog của `b5b3cec-01` đã hiện lên màn hình (không phải patch); hunk đó vẫn giữ nhưng được đánh dấu "đã thấy mệnh đề".
- Mở rộng: một agent không tham gia thiết kế harness đọc tiêu đề và log của các commit chưa được catalog xét (commit không khớp grep, các plan sửa lỗi 7a, 7b, 9, 10, các đợt carried), tách hunk sửa lỗi thành patch đảo vào thư mục niêm phong, kiểm `git apply --check`, và chỉ ghi số lượng ra ngoài. Không ai thiết kế harness mở patch held-out trước lúc chấm; script chấm chỉ in bắt / không bắt.
- Thứ tự: replay held-out chấm xong và khoá trước khi các commit held-out (29f4daf, 36d089b, 400f58a, 5b6646d, 89583d2, b5b3cec) được mở để làm oracle task `real-estate`. Những task cần các commit đó (p1–p4, p6a, p8e) chờ tới lúc ấy.

### 8.3 Lỗi cấy

Một agent cấy lỗi (chỉ thấy lời giải chuẩn và requirement) cấy lỗi một hunk ở các mép: rỗng, null, trùng, chữ hoa, đã xoá, giá trị biên. Mỗi lỗi kèm một kiểm tra hộp đen hỏng trên lỗi và qua trên lời giải chuẩn; lỗi không qua được bước này bị bỏ. Mục tiêu 81 lỗi cấy (mục 10.2): 3 mỗi task ngoài (72) cộng 9 trên `real-estate`. Niêm phong như held-out.

### 8.4 Hai thước đo theo loại lớp

- **Lớp canh gác** (test unit, e2e, mutation trên dòng vừa đổi, oracle độc lập, cổng chống làm yếu test): tỉ lệ bắt lỗi có trọng số nghiêm trọng (cao 3, vừa 2, thấp 1) trên held-out + lỗi cấy + kiểm tra oracle. Giữ lớp nếu số bắt được **chỉ nhờ lớp đó** (so H với H−lớp, cặp theo lỗi, kiểm McNemar) có cận dưới khoảng tin cậy > 0.
- **Lớp khám phá** (exploratory theo charter, review task, final review, audit cả repo): số lỗi thật mà không lớp nào khác tìm ra, xác nhận trên HEAD sạch, trên mỗi triệu token. Mốc lịch sử của evaluator: 1 lỗi duy nhất đã sửa trên khoảng 144k token (`yield.md`, bỏ lặp), tức khoảng 6,9 trên 1M. Giữ lớp nếu cận dưới Poisson 95% ≥ 50% mốc đó (3,5 trên 1M), hoặc nếu lớp tìm ra một lỗi nghiêm trọng cao mà không lớp nào khác tìm.
- Review đã có hồ sơ 17/20 (`attribution.md`), nhưng chưa đo trong replay; nó vẫn phải đo theo thước khám phá như mọi lớp.
- Lớp mới: bản tối thiểu, đo, rồi giữ hoặc bỏ theo đúng thước của loại nó.

## 9. Thước đo

### 9.1 Điểm của một lần chạy

- Điểm build = tổng trọng số kiểm tra **lần ngược được** đã qua / tổng trọng số kiểm tra lần ngược được hợp lệ.
- Điểm requirement = như trên, trên kiểm tra **không lần ngược được**.
- Kiểm tra hỏng ở bước tiền điều kiện được đếm là hỏng và được đếm thêm vào "thiếu tính năng"; tỉ lệ thiếu tính năng báo cáo riêng.
- Task qua = mọi kiểm tra build nghiêm trọng cao và vừa đều qua.

### 9.2 pass^k

Với c lần qua trong k lần chạy một task, ước lượng không chệch của pass^j (j ≤ k) là C(c,j)/C(k,j), trung bình trên các task; báo cáo pass^1 và pass^3 cho từng nhánh, kèm khoảng tin cậy bootstrap.

### 9.3 Mức tự động

Lần chạy benchmark không có người ngồi. Mỗi khi agent hỏi người (câu hỏi, yêu cầu xác nhận, danh sách dừng-và-hỏi), một bộ trả lời cố định đáp: "Không có thêm thông tin; tự quyết theo requirement", trừ khi câu hỏi đưa ra các phương án dự phòng thì chọn phương án đầu tiên. Bộ quy tắc ghi nhãn (một can thiệp =):

1. mỗi lần agent dừng để chờ người trả lời;
2. mỗi lần người phải sửa file, chạy lệnh hay khởi động lại để lần chạy đi tiếp;
3. một lần chạy bị bỏ dở vì không thể đi tiếp = 3 can thiệp.

Không tính: lời nhắc tự động của harness, yêu cầu quyền đã có trong luật cho phép trước. Baseline lịch sử: transcript các phiên outsourcing, ghi nhãn theo cùng quy tắc, mỗi plan là một task (lệch: đó là người thật, có kiến thức riêng).

## 10. Thống kê

### 10.1 Số lần chạy và cặp

- k = 3 lần chạy mỗi task mỗi nhánh. Điểm của task trong một nhánh = trung bình k lần.
- So sánh theo cặp: d_t = điểm H − điểm B trên task t. Khoảng tin cậy 95% cho trung bình d bằng bootstrap theo task (10.000 mẫu, lấy lại task, giữ nguyên k lần của mỗi task), và khoảng t để đối chiếu.
- Seed: thứ tự chạy các nhánh trên mỗi task được xáo theo hạt giống cố định, để thời điểm chạy không thiên về một nhánh.

### 10.2 Số task (`bench/power.mjs`)

Công thức: N = ((z₀,₉₇₅ + z₀,₈) · σ_d / Δ)², α = 0,05 hai phía, lực 0,8.

| σ_d \ Δ | 0,10 | 0,15 | 0,20 |
|---|---|---|---|
| 0,15 | 18 | 8 | 5 |
| 0,20 | 32 | 14 | 8 |
| 0,25 | 50 | 22 | 13 |
| 0,30 | 71 | 32 | 18 |

Giả định: Δ = 0,15 (mức chênh đáng kể nhỏ nhất của điểm build), σ_d = 0,25 (chưa có số đo; chọn giữa bảng). Ra N = 22; cộng 2 vì xấp xỉ chuẩn ở N nhỏ, thành **24 task ngoài**, 8 mỗi stack.

Quy tắc chỉnh N (đăng ký trước): lần chạy thử (mục 12, bước 3) đo σ_d trên 4 task. Nếu σ_d đo được > 0,25 thì N tính lại theo bảng, tới mức ngân sách cho phép; quá ngân sách thì đi theo thang cắt (mục 11). N không bao giờ giảm dưới 24 vì σ_d đo được nhỏ. Lần chạy thử không vào phân tích.

Số lỗi cho thước canh gác: n = z² p(1−p)/h². Với p = 0,3 và nửa độ rộng h = 0,1 cần **81 lỗi** (10 held-out + 72 lỗi cấy ở task ngoài; 9 lỗi cấy `real-estate` bù phần held-out loại logic hẹp).

## 11. Chi phí và ngân sách

**Ngân sách cho cây thước: ___ token / ___ giờ** (người dùng điền).

Số ước tính, mốc lịch sử: plan 8b của outsourcing tốn khoảng 4,75M token (viết plan với spike 2,97M, build 0,69M, final review 0,50M, đợt sửa 0,14M, hai evaluator 0,46M; review task không được ghi). Chi phí của B và của harness mới chưa đo; lần chạy thử đo chúng trước khi khoá. Token tính cả vào và ra như log tiến độ ghi.

| Khoản | Phép tính | Token |
|---|---|---|
| Task ngoài, H và B | 24 task × 3 lần × (1,5M + 0,4M) | 137M |
| Task ngoài, W | 24 × 3 × 1,0M | 72M |
| `real-estate`, H và B | 12 task × 3 × (5M + 1,5M) | 234M |
| Chuẩn bị oracle (viết lại, kiểm định, 2 phân loại, gắn nhãn) | 12 task `real-estate` × 0,55M (đo trên p8b) + 24 task ngoài × 0,3M | 14M |
| Phép đo lớp (81 lỗi + 10 held-out, review 0,25M + exploratory 0,15M + audit gộp 0,2M mỗi lỗi) | 91 × 0,6M | 55M |
| Lần chạy thử | 4 task × 2 nhánh × 2M | 16M |
| **Tổng** |  | **khoảng 528M** |

Giờ: build `real-estate` cỡ plan khoảng 5 giờ cho H và 1,5 giờ cho B; task ngoài cỡ PR khoảng 1,5 và 0,5 giờ. Với 4 lần chạy song song: khoảng 60 giờ cho `real-estate`, 45 giờ cho task ngoài (cả W), cộng khoảng 10 giờ cho chấm và phép đo lớp: **khoảng 115 giờ đồng hồ**.

Thang cắt khi vượt ngân sách, theo thứ tự; mỗi bậc là bỏ một phép so sánh có tên, không bao giờ giảm k hay N của H1–H3:

1. W chỉ chạy trên 8 task ngoài (3 mỗi stack, tối thiểu 2), không phải 24: tiết kiệm 48M. H4 vẫn phải đạt trên 8 task đó.
2. `real-estate` chỉ còn 6 task (p6c, p8a, p8b, p8b1, p8c, p8d: có oracle catalog và không cần commit held-out): tiết kiệm 117M. Đây là tập phụ.
3. Bỏ `real-estate` end-to-end, chỉ giữ replay và lỗi cấy trên nó: tiết kiệm thêm 117M.
4. Phép đo lớp khám phá chỉ đo exploratory và audit (review giữ nguyên, không ablation, dựa trên hồ sơ 17/20): tiết kiệm khoảng 23M.
5. Không bao giờ cắt: H và B trên 24 task ngoài với k = 3, kiểm định oracle, H4 tối thiểu, held-out replay. Nếu vẫn quá ngân sách sau bậc 4: dừng và hỏi người dùng.

## 12. Thứ tự chạy và khoá

1. Commit bản này (status `draft`), qua advisor, người dùng duyệt (`stable`).
2. Dựng `bench/replay`, script chấm oracle, bộ trả lời cố định, môi trường dùng một lần cho mỗi stack. Chạy replay held-out và khoá kết quả.
3. Lần chạy thử: 2 task `real-estate` (p8b và một task khác) và 2 task ngoài, nhánh H và B, k = 1. Đo token, giờ, σ_d. Không vào phân tích.
4. Khoá: commit danh sách task cuối, oracle đã kiểm định (bản băm của từng file), N theo quy tắc 10.2, commit plugin cho nhánh H và W, model ID. Từ đây không đổi.
5. Chạy theo thứ tự đã xáo. Ghi mọi lần chạy, kể cả lần hỏng.
6. Chấm, phân tích theo đúng mục 9–10, báo cáo mọi lệch khỏi bản này.

## 13. Ngưỡng nghiệm thu (không do agent hay người dùng quyết)

1. H1, H2, H3 đạt ngưỡng ở mục 2 trên task ngoài, sau hiệu chỉnh Holm.
2. H4 đạt: W bị chấm thấp hơn H.
3. Chạy lại: một máy khác (hoặc một người khác) chạy lại phần chấm từ các sản phẩm đã lưu và ra cùng điểm từng kiểm tra; chạy lại 3 task ngoài từ đầu và điểm nằm trong khoảng tin cậy của task đó.
4. Setup nguội: trên một repo chưa thấy ở mỗi stack, setup của H chạy xong, probe và canary của mọi năng lực đều qua, người không sửa gì. Không file nào của plugin đổi giữa các stack (so bản băm).
5. Chấm mù: hai người chấm không biết đầu ra nào của nhánh nào (tên nhánh, file của plugin và dấu vết harness bị gỡ khỏi diff) chấm mẫu 20 cặp; H được ưa hơn B với cận dưới khoảng tin cậy > 50%.
6. Sau bàn giao một project thật của người khác: số bug báo về trong 30 ngày, báo cáo kèm số tính năng (chưa có ngưỡng; đây là số theo dõi).

## 14. Thử trên p8b (`real-estate` plan 8b, listings)

Chạy bằng workflow với vai tách biệt: người lọc không thấy commit sửa lỗi; người viết oracle không thấy plan hay input; hai người phân loại không thấy nhau, git hay plan gốc; người kiểm định chạy oracle trên bản sao. Đầu ra ở `.evidence/bench/8b/`.

Chạy ngày 2026-10-27, 5 agent, khoảng 551k token, 45 phút; phần kiểm định chạy trên bản sao `outsourcing-hstack` (worktree tạm, DB `real_estate_bench8b` tạo mới và đã xoá), không chạm `outsourcing` hay DB `real_estate`.

**Lọc input.** Giữ Goal, 3/5 ý User decisions, 15/15 Global Constraints, 35 feature step (F1 6, F2 7, F3 8, F4 14); bỏ F5 (11 step sửa plan 8a). Bỏ trong phần giữ: 33 con trỏ test, 2 con trỏ lệnh và lớp thủ công, 11 đường dẫn hoặc tên file, 28 định danh nội bộ, 1 tag công cụ, 15 con trỏ plan hoặc task. `bench/input-check.mjs`: plan gốc 4192 lỗi, input đã lọc PASS. Sửa sau khi người lọc làm xong và trước khi người phân loại đọc: bỏ cả mục Known limits (mục 5; ghi trong `filter-log.md`, bản cũ giữ riêng). Còn lại: người đọc chưa đọc lại input (mục 5 yêu cầu).

**Oracle.** 5 commit sửa lỗi (d82f2b0, dd56b84, eb2b016, 24c426f và 730509b trong task) thêm hoặc đổi 96 test. Giữ 25 test kiểm hành vi của hunk trong phạm vi; bỏ 71 (phần lớn kiểm code task khác viết: survey, email, dashboard, lead). Trong 25 test giữ lại, 5 test không có đường kiểm qua interface công khai (ngày cập nhật không đọc được, dùng lại request nội bộ, kiểu của component), nên còn 20 kiểm tra hộp đen, chỉ dùng trình duyệt và REST công khai. Mức nghiêm trọng của 25 test: cao 2, vừa 8, thấp 15.

**Kiểm định (mục 7.1).** Trên 20 kiểm tra: **17 hợp lệ** (qua trên commit sửa, hỏng trên commit cha), **3 yếu** (dd56b84-T3, 24c426f-T4, 24c426f-T5: qua cả hai; đây là kiểm tra canh gác "không đổi cái đang đúng", không phải hồi quy), 0 hỏng. Người kiểm định sửa hai chỗ cơ chế, không làm yếu khẳng định nào: dọn dẹp import chấp nhận 403 (app cố ý cấm xoá import), và đọc màu viền lặp lại cho tới khi chuyển cảnh CSS xong. Sản phẩm cuối thật của plan 8b (730509b) qua 4/20: 730509b-T1 (đã sửa trong task) và 3 kiểm tra yếu; hỏng cả 16 kiểm tra hợp lệ còn lại. Người chưa xác nhận mẫu (mục 7.1).

**Chạy ở commit gốc d1ea76b** (theo góp ý của advisor, sau lần kiểm định): 3 qua (đúng 3 kiểm tra yếu), 17 hỏng. Đọc dòng lỗi đầu (spec chưa có bước tiền điều kiện riêng): 9 hỏng vì tính năng 8b chưa có; **6 hỏng ở khẳng định chính dù tính năng đã có** (24c426f-T1, T2, T3, T6, T7: import đọc ô mã thành số; d82f2b0-T1: trang tài khoản cuộn ngang 60 px), tức bug có từ trước 8b mà quy tắc blame gán cho 8b; 2 chưa rõ (d82f2b0-T4, dd56b84-T2: thẻ có từ trước nhưng 8b dựng lại). Vậy trong 17 kiểm tra hợp lệ, chỉ 9 chắc chắn thuộc 8b, cộng 2 chưa rõ. Đã thêm quy tắc chạy ở commit gốc và nhóm "có từ trước" (mục 7.1).

**Phân loại (mục 6.3), hai agent độc lập.** Agent 1: lần ngược 1, một phần 2, không lần ngược 22. Agent 2: 0, 3, 22. Đồng ý 22/25 (88%), κ = 0,44, Gwet AC1 = 0,87. Ba bất đồng (730509b-T1, dd56b84-T3, 24c426f-T6) chờ người phân xử.

**Điều rút ra, đã sửa vào bản này.** Bảng interface, nhánh AC1 của ngưỡng đồng thuận, quy tắc chạy ở commit gốc và quy tắc sàn của H1 đều được thêm **sau khi** đã thấy kết quả p8b. Vì vậy phân loại p8b chỉ là thử nghiệm để sửa quy tắc, không phải lần chạy xác nhận; nó phải chạy lại với quy tắc mới trước khi khoá.

1. Trên p8b, gần như mọi bug mà các commit sửa lỗi bắt được nằm ở mép input không nói tới: oracle của task này chủ yếu chấm bước requirement (22/25), gần như không chấm bước build. Khớp với kết luận cũ "test chỉ chốt những gì spec có nói".
2. Một phần lý do "không lần ngược được" là tên công khai, không phải hành vi: cả hai agent nêu tên truy cập của form "Lọc bất động sản" và chữ option "Biệt thự" không có trong input. Đã thêm bảng interface (mục 5) và quy tắc phân loại chỉ xét hành vi (mục 6.3).
3. κ không dùng được khi một nhãn chiếm 88%: đã thêm nhánh đồng ý thô + AC1 vào ngưỡng (mục 7.2).
4. Quy tắc blame gán nhầm 6/17 kiểm tra hợp lệ cho 8b. Đã thêm quy tắc chạy ở commit gốc (mục 7.1).
5. Với 0–1 kiểm tra lần ngược được mỗi task, điểm build gần như nhị phân và phép tính N ở mục 10.2 không mô tả nó. Đã thêm quy tắc sàn cho H1 (mục 2).
6. Kiểm tra yếu là loại có thật (canh gác cái đang đúng). Chúng bị loại khỏi điểm như mục 7.1 quy định; không đổi quy tắc.
7. Chi phí chuẩn bị oracle cho một task cỡ plan: khoảng 0,55M token và 45 phút, hơn mức 0,3M ở mục 11. Mục 11 dùng 0,55M cho task `real-estate`.

**Chưa làm trên p8b:** bước tiền điều kiện tường minh trong spec; bảng interface và phân loại lại; một người đọc 2 kiểm tra chưa rõ; người phân xử 3 bất đồng; người đọc lại input và xác nhận mẫu oracle; một lần build thật của nhánh H hay B (thuộc lần chạy thử, mục 12 bước 3).

## 15. Giới hạn đã biết

- Ước tính token và giờ ở mục 11 chưa đo; lần chạy thử thay chúng bằng số đo trước khi khoá.
- Quy tắc blame bỏ sót bug do thiếu code ở chỗ task không viết dòng nào gần đó, và có thể gán sai khi một hunk sửa dòng của nhiều task.
- Bộ trả lời cố định làm mức tự động của H và B so được với nhau, nhưng không đo được chất lượng câu hỏi của agent.
- Oracle `real-estate` là chính những bug harness cũ để lọt, nên nó thiên về loại mép harness cũ hay bỏ sót. Không dùng nó để so harness cũ với harness mới; H và B đều build mới nên vẫn so được, nhưng chỉ task ngoài dùng để nghiệm thu.
- `real-estate` có một stack và chỉ greenfield theo nghĩa cả repo do harness cũ dựng; task ngoài mới kiểm tra được tính tổng quát.
