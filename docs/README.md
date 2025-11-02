# GitHub Authentication Setup

Để sử dụng tính năng upload meme, bạn cần thiết lập GitHub OAuth App:

## 1. Tạo GitHub OAuth App

1. Truy cập https://github.com/settings/applications/new
2. Điền thông tin:
   - **Application name**: VNMemeCollection Upload
   - **Homepage URL**: `https://sang765.github.io/VNMemeCollection/` (hoặc URL của bạn)
   - **Authorization callback URL**: `https://sang765.github.io/VNMemeCollection/docs/index.html` (hoặc URL tương ứng)

3. Tạo app và ghi nhớ **Client ID** và **Client Secret**

## 2. Cập nhật code

Trong file `docs/main.js`, thay thế:
```javascript
const GITHUB_CLIENT_ID = 'your_github_client_id_here'; // Thay bằng Client ID thật
```

Trong function `handleAuthCallback`, thay thế:
```javascript
client_secret: 'your_github_client_secret_here', // Thay bằng Client Secret thật
```

## 3. Quyền truy cập

OAuth app cần quyền `repo` để có thể upload files vào repository.

## 4. Lưu ý bảo mật

- **KHÔNG** commit Client Secret vào Git
- Sử dụng environment variables trong production
- Client Secret chỉ nên được sử dụng server-side, nhưng vì đây là client-side demo, chúng ta sử dụng nó trực tiếp (không an toàn cho production)

## 5. CORS Issues

Vì GitHub API không hỗ trợ CORS cho client-side requests trực tiếp, chúng ta sử dụng proxy. Trong production, bạn nên:

- Sử dụng server-side proxy
- Hoặc thiết lập CORS headers trên server
- Hoặc sử dụng GitHub's API với authentication server-side