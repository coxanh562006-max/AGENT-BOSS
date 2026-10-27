# Học Hàn Ngữ

Trang web học từ vựng, ngữ pháp và câu tiếng Hàn. Bạn nạp file bài giảng, từ vựng, ngữ pháp và câu, trang sẽ tự tạo:

- **Flashcard** cho từ vựng, ngữ pháp và câu
- **Viết từ**: cho nghĩa tiếng Việt, gõ từ tiếng Hàn
- **Sắp xếp câu**: ghép các từ đã xáo trộn thành câu tiếng Hàn
- **Ví dụ mở rộng**: tự viết câu mới với từ hoặc mẫu ngữ pháp
- **Trắc nghiệm ABCD**: nghĩa của từ, câu, mẫu ngữ pháp
- **Dịch hai chiều**: Hàn → Việt và Việt → Hàn, đối chiếu với đáp án đã cho

## Chạy trang

Không cần cài đặt. Mở `index.html` bằng trình duyệt là dùng được. Nếu muốn chạy qua máy chủ cục bộ:

```bash
python3 -m http.server 8000
```

rồi mở `http://localhost:8000`.

Dữ liệu và tiến độ học được lưu trong trình duyệt (localStorage) của máy đang dùng.

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
- PDF chưa được hỗ trợ. Hãy xuất ra `.docx` hoặc `.txt`.

Có sẵn nút **Nạp dữ liệu mẫu** trong trang Nhập dữ liệu để thử nhanh.

## Cấu trúc

```
index.html        Giao diện chính
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
