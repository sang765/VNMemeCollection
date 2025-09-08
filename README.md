# Bộ sưu tập Meme

Repository này chứa bộ sưu tập meme cá nhân, bao gồm cả ảnh và video.

## Cấu trúc thư mục

- `images/`: Thư mục chứa các meme dạng ảnh (jpg, png, gif)
- `videos/`: Thư mục chứa các meme dạng video (mp4, webm, etc.)
- `web/`: Thư mục chứa mã nguồn trang web
  - `index.html`: Trang chủ
  - `index.css`: File CSS cho trang web
  - `main.js`: File JavaScript cho trang web

## Cách sử dụng

1. Thêm ảnh meme vào thư mục `images/`
2. Thêm video meme vào thư mục `videos/`
3. Đối với video, nên thêm cả thumbnail (cùng tên với video, đuôi jpg) vào thư mục `videos/` để hiển thị thumbnail
4. Commit và push changes lên repository
5. Trang web sẽ tự động deploy lên GitHub Pages

## Tính năng

- Hiển thị danh sách meme theo danh mục (ảnh và video)
- Có thể thu gọn/mở rộng từng danh mục
- Xem trước ảnh/video khi click
- Tải xuống meme
- Sao chép direct link đến meme

## Triển khai

Trang web được tự động triển khai lên GitHub Pages khi có thay đổi trên nhánh main.
