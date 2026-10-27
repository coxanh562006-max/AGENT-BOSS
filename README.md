# Học Hàn Ngữ

Trang web học từ vựng, ngữ pháp và câu tiếng Hàn. Bạn nạp file bài giảng, từ vựng, ngữ pháp và câu, trang sẽ tự tạo:

- **Flashcard** cho từ vựng, ngữ pháp và câu
- **Viết từ**: cho nghĩa tiếng Việt, gõ từ tiếng Hàn
- **Sắp xếp câu**: ghép các từ đã xáo trộn thành câu tiếng Hàn
- **Ví dụ mở rộng**: tự viết câu mới với từ hoặc mẫu ngữ pháp
- **Trắc nghiệm ABCD**: nghĩa của từ, câu, mẫu ngữ pháp
- **Dịch hai chiều**: Hàn → Việt và Việt → Hàn, đối chiếu với đáp án đã cho

## Chạy trang

**Cách dễ nhất:** tải file `Hoc-Han-Ngu.html` về máy rồi nhấp đúp. Đây là toàn bộ web trong một file, không cần mạng hay thư mục đi kèm.

Dữ liệu và tiến độ học được lưu trong trình duyệt của máy đang dùng, và đồng bộ với các thiết bị khác khi đã cấu hình máy chủ (xem bên dưới). Để giữ bản sao trên máy, vào **Nhập dữ liệu → Lưu bản sao (.json)**. Khi đổi máy hoặc xoá lịch sử trình duyệt, dùng **Mở bản sao** để khôi phục.

## Đồng bộ giữa điện thoại, máy tính và tablet

Web chạy trên từng thiết bị, nên muốn các thiết bị thấy cùng dữ liệu cần một máy chủ đồng bộ mà cả ba truy cập được.

1. **Chạy máy chủ** (cần Node 18 trở lên, không cài thêm gì):
   ```bash
   node scripts/sync-server.js
   ```
   Mặc định chạy ở cổng 8787, dữ liệu lưu trong thư mục `data/`.
2. **Chọn nơi chạy máy chủ:**
   - Cùng Wi-Fi: chạy trên máy tính luôn bật, điện thoại và tablet dùng địa chỉ IP của máy tính, ví dụ `http://192.168.1.20:8787`.
   - Dùng mọi lúc, mọi nơi: đưa máy chủ lên một dịch vụ hosting hoặc VPS, nên dùng `https://`.
3. **Trên từng thiết bị:** mở `Hoc-Han-Ngu.html` → **Bài học & file** → nhập địa chỉ máy chủ và **cùng một mã đồng bộ** → **Lưu và đồng bộ**.

Sau đó dữ liệu được đồng bộ khi bạn thay đổi, khi mở trang và khi quay lại trang từ nền. Nếu cùng sửa trên hai thiết bị, dữ liệu được gộp lại, không mất. Một file đã xoá trên thiết bị nào thì không quay lại trên thiết bị khác.

Lưu ý: ai có mã đồng bộ đều đọc được dữ liệu, nên chọn mã dài và khó đoán. Mỗi thiết bị vẫn giữ một bản trên máy để dùng khi không có mạng.

Khi sửa mã nguồn, tạo lại file một-file bằng:

```bash
node scripts/build-single-file.js
```

Muốn chạy bản phát triển qua máy chủ cục bộ: `python3 -m http.server 8000` rồi mở `http://localhost:8000`.

## Định dạng file

| File | Mỗi dòng |
| --- | --- |
| Từ vựng | `từ tiếng Hàn \| nghĩa \| ví dụ (không bắt buộc) \| dịch ví dụ (không bắt buộc)` |
| Ngữ pháp | `mẫu \| ý nghĩa \| giải thích \| ví dụ tiếng Hàn \| ví dụ tiếng Việt`. Các dòng cùng mẫu được gộp lại. |
| Câu tiếng Hàn | Một câu mỗi dòng. Có thể viết `câu hàn \| câu việt` để ghép cặp ngay trong file. |
| Đáp án dịch (tiếng Việt) | Một câu mỗi dòng, đúng thứ tự với file câu tiếng Hàn. |
| Bài giảng | Tiêu đề bắt đầu bằng `#`. Dòng `từ \| nghĩa` thêm vào từ vựng. Dòng `câu hàn \| câu việt` thêm vào câu. |

- Dùng `|` hoặc phím Tab để tách cột. File `.csv`, `.tsv`, `.txt`, `.md`, `.xlsx`, `.docx` đều được hỗ trợ.
- Dòng tiêu đề (ví dụ "Từ tiếng Hàn | Nghĩa") và dòng không có chữ Hàn ở cột đầu được bỏ qua.
- Số thứ tự đầu dòng như `1.` hoặc `2)` được bỏ đi tự động.
- PDF đọc được khi có chữ thật (không phải ảnh scan). Bảng trong PDF được tách cột theo khoảng trống.
- File Word cũ `.doc` chưa đọc trực tiếp: mở bằng Word, chọn Lưu thành → Word Document (`.docx`) rồi nạp lại.

Có sẵn nút **Nạp dữ liệu mẫu** trong trang Nhập dữ liệu để thử nhanh.

## Cấu trúc

```
Hoc-Han-Ngu.html  Bản gộp một file (tạo bởi scripts/build-single-file.js) — file để tải về dùng
index.html        Giao diện chính (bản phát triển)
scripts/          Script gộp file một-file và máy chủ đồng bộ (sync-server.js)
css/style.css     Giao diện, tông xanh bầu trời
js/core.js        Đọc dữ liệu, ghép câu, sinh bài tập, chấm điểm (không phụ thuộc DOM)
js/app.js         Điều hướng, nạp file, flashcard, bài tập, danh sách tài liệu
js/sample-data.js Dữ liệu mẫu
vendor/           Thư viện đọc .xlsx (SheetJS) và .docx (Mammoth), đóng gói sẵn để chạy offline
assets/logo.jpg   Logo
tests/            Kiểm thử cho phần xử lý dữ liệu
```

## Kiểm thử

```bash
node --test tests/core.test.js
```
