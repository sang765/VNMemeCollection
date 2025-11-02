// Biến toàn cục
let mediaFiles = {
    images: [],
    videos: []
};

let currentPreviewItem = null;
let currentFilteredItems = [];
let currentPreviewIndex = 0;
const REPO_OWNER = 'sang765';
const REPO_NAME = 'VNMemeCollection';
const BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
const CACHE_KEY = 'memeCollectionCache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 phút

// Biến cho authentication
let accessToken = null;
let userInfo = null;
const GITHUB_CLIENT_ID = 'Ov23lifNyQskQEtYjjAK'; // Cần thay thế bằng client ID thật
const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname;
const AUTH_STORAGE_KEY = '33370ba113a259b36a60b7aeb2f2774fc6ddeb06';

// Hàm khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// Khởi tạo ứng dụng
function initApp() {
    // Thiết lập theme từ localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);
    }

    // Khởi tạo authentication
    initAuth();

    // Hiển thị thông báo loading
    showLoadingOverlay();
    document.getElementById('image-content').innerHTML = '<p class="loading">Đang tải danh sách ảnh...</p>';
    document.getElementById('video-content').innerHTML = '<p class="loading">Đang tải danh sách video...</p>';

    // Thiết lập sự kiện
    setupEventListeners();
    setupAuthEventListeners();

    // Lấy danh sách ảnh và video
    loadMediaFiles();

    // Hiển thị thời gian cập nhật cuối
    document.getElementById('last-updated').textContent = new Date().toLocaleDateString('vi-VN');
}

// Thiết lập các event listeners
function setupEventListeners() {
    // Modal events
    setupModalEvents();
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        clearSearch.style.display = searchTerm ? 'block' : 'none';
        filterMediaItems(searchTerm);
    });
    
    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        this.style.display = 'none';
        filterMediaItems('');
    });
    
    // Dark mode toggle
    document.getElementById('toggle-dark-mode').addEventListener('click', toggleDarkMode);
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', function() {
        // Xóa cache và tải lại
        localStorage.removeItem(CACHE_KEY);
        showLoadingOverlay();
        loadMediaFiles();
        showToast('Đã làm mới dữ liệu', 'success');
    });
    
    // Navigation buttons in preview
    document.getElementById('prev-btn').addEventListener('click', showPrevItem);
    document.getElementById('next-btn').addEventListener('click', showNextItem);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeyPress);
}

// Tải danh sách media files
async function loadMediaFiles() {
    try {
        // Kiểm tra cache trước
        const cachedData = getCachedData();
        if (cachedData) {
            mediaFiles = cachedData;
            updateMediaDisplay();
            hideLoadingOverlay();
            showToast('Đã tải dữ liệu từ bộ nhớ đệm', 'success');
            return;
        }
        
        // Lấy dữ liệu mới từ API
        const [images, videos] = await Promise.all([
            getFilesFromGitHub('images'),
            getFilesFromGitHub('videos')
        ]);
        
        mediaFiles = { images, videos };
        
        // Lưu vào cache
        cacheData(mediaFiles);
        
        // Cập nhật hiển thị
        updateMediaDisplay();
        hideLoadingOverlay();
        showToast('Đã tải dữ liệu mới thành công', 'success');
        
    } catch (error) {
        console.error('Lỗi khi tải danh sách media:', error);
        document.getElementById('image-content').innerHTML = '<p class="error">Không thể tải danh sách ảnh</p>';
        document.getElementById('video-content').innerHTML = '<p class="error">Không thể tải danh sách video</p>';
        hideLoadingOverlay();
        showToast('Lỗi khi tải dữ liệu', 'error');
    }
}

// Lấy dữ liệu từ cache
function getCachedData() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Kiểm tra nếu cache vẫn còn hiệu lực
    if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
    }
    
    return null;
}

// Lưu dữ liệu vào cache
function cacheData(data) {
    const cache = {
        data,
        timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

// Cập nhật hiển thị media
function updateMediaDisplay() {
    document.getElementById('image-count').textContent = mediaFiles.images.length;
    document.getElementById('video-count').textContent = mediaFiles.videos.length;
    
    const totalCount = mediaFiles.images.length + mediaFiles.videos.length;
    document.getElementById('total-count').textContent = totalCount;
    
    displayMediaItems('image', mediaFiles.images);
    displayMediaItems('video', mediaFiles.videos);
    
    // Tự động mở rộng danh mục
    setTimeout(() => {
        toggleCategory('image', false);
        toggleCategory('video', false);
    }, 100);
}

// Lấy danh sách file từ GitHub API
async function getFilesFromGitHub(folder) {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${folder}?${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Lọc ra chỉ các file (loại bỏ thư mục con)
        const files = data.filter(item => item.type === 'file')
                         .map(item => item.name)
                         .filter(name => {
                             // Lọc theo định dạng file
                             if (folder === 'images') {
                                 return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);
                             } else if (folder === 'videos') {
                                 return /\.(mp4|webm|mov|avi|mkv|wmv|flv)$/i.test(name);
                             }
                             return false;
                         });
        
        return files;
    } catch (error) {
        console.error(`Lỗi khi lấy danh sách file từ ${folder}:`, error);
        showToast(`Lỗi khi tải ${folder === 'images' ? 'ảnh' : 'video'}`, 'error');
        return [];
    }
}

// Hiển thị media items
function displayMediaItems(type, items) {
    const container = document.getElementById(`${type}-content`);
    
    if (items.length === 0) {
        container.innerHTML = `<p class="no-items">Chưa có ${type === 'image' ? 'ảnh' : 'video'} nào</p>`;
        return;
    }
    
    container.innerHTML = '';
    
    items.forEach((item, index) => {
        const mediaElement = createMediaElement(type, item);
        container.appendChild(mediaElement);
    });
}

// Tạo media element
function createMediaElement(type, filename) {
    const div = document.createElement('div');
    div.className = 'media-item';
    div.dataset.filename = filename;
    div.dataset.type = type;
    
    // Thêm tên file (sẽ hiển thị khi hover)
    const filenameSpan = document.createElement('span');
    filenameSpan.className = 'filename';
    filenameSpan.textContent = filename;
    div.appendChild(filenameSpan);
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = `${BASE_URL}/images/${encodeURIComponent(filename)}`;
        img.alt = filename;
        img.loading = 'lazy';
        img.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI5MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIGR5PSIuM2VtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5LMO0gY8O1IMSR4bqhbmc8L3RleHQ+PC9zdmc+';
        };
        div.appendChild(img);
    } else {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'video-thumbnail';
        
        // Thử tìm thumbnail (cùng tên với đuôi jpg/png)
        const thumbnailName = filename.split('.')[0];
        const img = document.createElement('img');
        img.src = `${BASE_URL}/videos/${encodeURIComponent(thumbnailName)}.jpg`;
        img.alt = filename;
        img.onerror = function() {
            // Nếu không có thumbnail jpg, thử png
            this.src = `${BASE_URL}/videos/${encodeURIComponent(thumbnailName)}.png`;
            this.onerror = function() {
                // Nếu không có thumbnail nào, hiển thị placeholder
                this.style.display = 'none';
                const iconDiv = document.createElement('div');
                iconDiv.className = 'video-icon';
                iconDiv.innerHTML = '▶';
                thumbnailDiv.appendChild(iconDiv);
            };
        };
        
        thumbnailDiv.appendChild(img);
        div.appendChild(thumbnailDiv);
    }
    
    div.addEventListener('click', () => openPreview(type, filename));
    return div;
}

// Mở preview
function openPreview(type, filename) {
    // Lấy danh sách items hiện tại (đã filter nếu có)
    const items = currentFilteredItems.length > 0 ? currentFilteredItems : 
                 type === 'image' ? mediaFiles.images : mediaFiles.videos;
    
    currentPreviewIndex = items.findIndex(item => item === filename);
    currentPreviewItem = { type, filename };
    
    const modal = document.getElementById('preview-modal');
    const container = document.getElementById('preview-container');
    const filenameElement = document.getElementById('preview-filename');
    const filetypeElement = document.getElementById('preview-filetype');
    
    container.innerHTML = '';
    filenameElement.textContent = filename;
    filetypeElement.textContent = type === 'image' ? 'Hình ảnh' : 'Video';
    
    // Cập nhật trạng thái nút navigation
    updateNavButtons();
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = `${BASE_URL}/images/${encodeURIComponent(filename)}`;
        img.alt = filename;
        container.appendChild(img);
    } else {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        
        const video = document.createElement('video');
        video.src = `${BASE_URL}/videos/${encodeURIComponent(filename)}`;
        video.controls = true;
        video.autoplay = true;
        
        videoContainer.appendChild(video);
        container.appendChild(videoContainer);
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Ngăn scroll background
}

// Cập nhật nút navigation
function updateNavButtons() {
    const items = currentFilteredItems.length > 0 ? currentFilteredItems : 
                 currentPreviewItem.type === 'image' ? mediaFiles.images : mediaFiles.videos;
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    prevBtn.disabled = currentPreviewIndex <= 0;
    nextBtn.disabled = currentPreviewIndex >= items.length - 1;
}

// Hiển thị item trước đó
function showPrevItem() {
    const items = currentFilteredItems.length > 0 ? currentFilteredItems : 
                 currentPreviewItem.type === 'image' ? mediaFiles.images : mediaFiles.videos;
    
    if (currentPreviewIndex > 0) {
        currentPreviewIndex--;
        const filename = items[currentPreviewIndex];
        openPreview(currentPreviewItem.type, filename);
    }
}

// Hiển thị item tiếp theo
function showNextItem() {
    const items = currentFilteredItems.length > 0 ? currentFilteredItems : 
                 currentPreviewItem.type === 'image' ? mediaFiles.images : mediaFiles.videos;
    
    if (currentPreviewIndex < items.length - 1) {
        currentPreviewIndex++;
        const filename = items[currentPreviewIndex];
        openPreview(currentPreviewItem.type, filename);
    }
}

// Đóng preview
function closePreview() {
    const modal = document.getElementById('preview-modal');
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Cho phép scroll lại
    
    // Dừng video nếu đang phát
    const video = document.querySelector('#preview-container video');
    if (video) {
        video.pause();
    }
}

// Xử lý phím tắt toàn cục
function handleGlobalKeyPress(e) {
    const modal = document.getElementById('preview-modal');
    
    if (modal.style.display === 'block') {
        // Chỉ xử lý nếu modal đang mở
        if (e.key === 'Escape') {
            closePreview();
        } else if (e.key === 'ArrowLeft') {
            showPrevItem();
        } else if (e.key === 'ArrowRight') {
            showNextItem();
        }
    }
}

// Thiết lập sự kiện cho modal
function setupModalEvents() {
    const modal = document.getElementById('preview-modal');
    const closeBtn = document.querySelector('.close');
    const downloadBtn = document.getElementById('download-btn');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    
    closeBtn.addEventListener('click', closePreview);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePreview();
        }
    });
    
    // Xử lý nút tải xuống
    downloadBtn.addEventListener('click', () => {
        if (currentPreviewItem) {
            const url = currentPreviewItem.type === 'image' 
                ? `${BASE_URL}/images/${encodeURIComponent(currentPreviewItem.filename)}`
                : `${BASE_URL}/videos/${encodeURIComponent(currentPreviewItem.filename)}`;
            
            const link = document.createElement('a');
            link.href = url;
            link.download = currentPreviewItem.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Đã bắt đầu tải xuống', 'success');
        }
    });
    
    // Xử lý nút sao chép URL
    copyUrlBtn.addEventListener('click', () => {
        if (currentPreviewItem) {
            const url = currentPreviewItem.type === 'image' 
                ? `${BASE_URL}/images/${encodeURIComponent(currentPreviewItem.filename)}`
                : `${BASE_URL}/videos/${encodeURIComponent(currentPreviewItem.filename)}`;
            
            navigator.clipboard.writeText(url)
                .then(() => {
                    showToast('Đã sao chép URL vào clipboard', 'success');
                })
                .catch(err => {
                    console.error('Lỗi khi sao chép URL: ', err);
                    
                    // Fallback cho trình duyệt không hỗ trợ clipboard API
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = url;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    try {
                        document.execCommand('copy');
                        showToast('Đã sao chép URL vào clipboard', 'success');
                    } catch (e) {
                        showToast('Không thể sao chép URL', 'error');
                    }
                    document.body.removeChild(tempTextArea);
                });
        }
    });
}

// Lọc media items theo từ khóa
function filterMediaItems(searchTerm) {
    const allMediaItems = document.querySelectorAll('.media-item');
    currentFilteredItems = [];
    
    let visibleCount = 0;
    
    allMediaItems.forEach(item => {
        const filename = item.dataset.filename.toLowerCase();
        const type = item.dataset.type;
        
        if (filename.includes(searchTerm)) {
            item.style.display = 'block';
            visibleCount++;
            
            // Thêm vào danh sách filtered để navigation
            if (searchTerm) {
                currentFilteredItems.push(item.dataset.filename);
            }
        } else {
            item.style.display = 'none';
        }
    });
    
    // Cập nhật thống kê
    const statsElement = document.getElementById('filter-stats');
    const totalCount = document.getElementById('total-count').textContent;
    
    if (searchTerm) {
        statsElement.style.display = 'inline';
        statsElement.textContent = `Đang hiển thị: ${visibleCount}/${totalCount}`;
    } else {
        statsElement.style.display = 'none';
    }
}

// Thu gọn/mở rộng danh mục
function toggleCategory(type, animate = true) {
    const content = document.getElementById(`${type}-content`);
    const icon = document.querySelector(`#${type}-category .toggle-icon`);
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'grid';
        icon.textContent = '▼';
        if (animate) {
            content.style.animation = 'fadeIn 0.3s ease-out';
        }
    } else {
        content.style.display = 'none';
        icon.textContent = '►';
    }
}

// Chuyển đổi chế độ dark/light
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeButton(newTheme);
    showToast(`Đã chuyển sang chế độ ${newTheme === 'dark' ? 'tối' : 'sáng'}`, 'success');
}

// Cập nhật nút chuyển đổi theme
function updateThemeButton(theme) {
    const button = document.getElementById('toggle-dark-mode');
    button.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Hiển thị toast thông báo
function showToast(message, type = 'success') {
    // Kiểm tra nếu đã có toast thì xóa
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Hiển thị toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Hiển thị overlay loading
function showLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

// Ẩn overlay loading
function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// ==================== AUTHENTICATION FUNCTIONS ====================

// Khởi tạo authentication
function initAuth() {
    // Kiểm tra URL parameters cho OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code) {
        // Xử lý OAuth callback
        handleAuthCallback(code, state);
        return;
    }

    // Kiểm tra token đã lưu
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth) {
        try {
            const authData = JSON.parse(savedAuth);
            if (authData.token && authData.user) {
                accessToken = authData.token;
                userInfo = authData.user;
                updateAuthUI();
                return;
            }
        } catch (e) {
            console.error('Lỗi khi parse auth data:', e);
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }

    // Hiển thị nút đăng nhập
    updateAuthUI();
}

// Xử lý OAuth callback
async function handleAuthCallback(code, state) {
    try {
        showLoadingOverlay();

        // Đổi code lấy access token
        const tokenResponse = await fetch('https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: 'your_github_client_secret_here', // Cần thay thế bằng client secret thật
                code: code,
                redirect_uri: GITHUB_REDIRECT_URI
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Không thể lấy access token');
        }

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        accessToken = tokenData.access_token;

        // Lấy thông tin user
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!userResponse.ok) {
            throw new Error('Không thể lấy thông tin user');
        }

        userInfo = await userResponse.json();

        // Lưu vào localStorage
        const authData = {
            token: accessToken,
            user: userInfo,
            timestamp: Date.now()
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

        // Xóa code từ URL
        const url = new URL(window.location);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.pathname);

        updateAuthUI();
        hideLoadingOverlay();
        showToast('Đăng nhập thành công!', 'success');

    } catch (error) {
        console.error('Lỗi khi xử lý authentication:', error);
        hideLoadingOverlay();
        showToast('Lỗi đăng nhập: ' + error.message, 'error');

        // Xóa code từ URL nếu có lỗi
        const url = new URL(window.location);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.pathname);
    }
}

// Đăng nhập GitHub
function loginWithGitHub() {
    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=repo&state=${state}`;

    // Lưu state để verify sau
    sessionStorage.setItem('oauth_state', state);

    window.location.href = authUrl;
}

// Đăng xuất
function logout() {
    accessToken = null;
    userInfo = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    updateAuthUI();
    showToast('Đã đăng xuất', 'success');
}

// Cập nhật UI authentication
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const userInfoEl = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');

    if (accessToken && userInfo) {
        loginBtn.style.display = 'none';
        uploadBtn.style.display = 'inline-block';
        userInfoEl.style.display = 'inline-block';
        userInfoEl.textContent = `Xin chào, ${userInfo.login}!`;
        logoutBtn.style.display = 'inline-block';
    } else {
        loginBtn.style.display = 'inline-block';
        uploadBtn.style.display = 'none';
        userInfoEl.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
}

// Thiết lập event listeners cho authentication
function setupAuthEventListeners() {
    document.getElementById('login-btn').addEventListener('click', loginWithGitHub);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('upload-btn').addEventListener('click', showUploadModal);

    // Upload modal events
    document.getElementById('upload-close').addEventListener('click', hideUploadModal);
    document.getElementById('cancel-upload').addEventListener('click', hideUploadModal);
    document.getElementById('upload-form').addEventListener('submit', handleUpload);

    // Đóng modal khi click outside
    document.getElementById('upload-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('upload-modal')) {
            hideUploadModal();
        }
    });
}

// ==================== UPLOAD FUNCTIONS ====================

// Hiển thị upload modal
function showUploadModal() {
    document.getElementById('upload-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Ẩn upload modal
function hideUploadModal() {
    document.getElementById('upload-modal').style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('upload-form').reset();
    document.querySelector('.upload-progress').style.display = 'none';
}

// Xử lý upload
async function handleUpload(e) {
    e.preventDefault();

    if (!accessToken) {
        showToast('Vui lòng đăng nhập trước', 'error');
        return;
    }

    const fileInput = document.getElementById('file-input');
    const fileType = document.getElementById('file-type').value;
    const customFilename = document.getElementById('custom-filename').value.trim();

    if (!fileInput.files[0]) {
        showToast('Vui lòng chọn file', 'error');
        return;
    }

    if (!fileType) {
        showToast('Vui lòng chọn loại file', 'error');
        return;
    }

    const file = fileInput.files[0];

    // Validate file type
    if (!validateFileType(file, fileType)) {
        showToast('Loại file không hợp lệ', 'error');
        return;
    }

    // Validate file size (max 100MB for GitHub)
    if (file.size > 100 * 1024 * 1024) {
        showToast('File quá lớn (tối đa 100MB)', 'error');
        return;
    }

    try {
        showUploadProgress();

        // Tạo filename
        let filename = customFilename || file.name;
        if (!filename.includes('.')) {
            // Thêm extension nếu chưa có
            const extension = file.name.split('.').pop();
            filename += '.' + extension;
        }

        // Đảm bảo filename an toàn
        filename = sanitizeFilename(filename);

        // Upload file
        await uploadFileToGitHub(file, filename, fileType);

        hideUploadModal();
        showToast('Upload thành công!', 'success');

        // Refresh danh sách files
        localStorage.removeItem(CACHE_KEY);
        loadMediaFiles();

    } catch (error) {
        console.error('Lỗi upload:', error);
        showToast('Lỗi upload: ' + error.message, 'error');
    } finally {
        hideUploadProgress();
    }
}

// Validate file type
function validateFileType(file, fileType) {
    const imageTypes = /\.(jpg|jpeg|png|gif|webp)$/i;
    const videoTypes = /\.(mp4|webm|mov|avi|mkv|wmv|flv)$/i;

    if (fileType === 'image') {
        return imageTypes.test(file.name);
    } else if (fileType === 'video') {
        return videoTypes.test(file.name);
    }

    return false;
}

// Sanitize filename
function sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Upload file to GitHub
async function uploadFileToGitHub(file, filename, fileType) {
    const folder = fileType === 'image' ? 'images' : 'videos';
    const path = `${folder}/${filename}`;

    // Convert file to base64
    const base64Content = await fileToBase64(file);

    // Kiểm tra file đã tồn tại chưa
    try {
        const existingFile = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let sha = null;
        if (existingFile.ok) {
            const existingData = await existingFile.json();
            sha = existingData.sha;
        }

        // Upload file
        const uploadResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Upload ${fileType}: ${filename}`,
                content: base64Content,
                sha: sha // null for new file, sha for update
            })
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.message || 'Upload failed');
        }

        return await uploadResponse.json();

    } catch (error) {
        if (error.message.includes('Bad credentials')) {
            // Token expired, logout
            logout();
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        throw error;
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix (data:mime/type;base64,)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Hiển thị progress
function showUploadProgress() {
    const progressEl = document.querySelector('.upload-progress');
    progressEl.style.display = 'block';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = 'Đang tải lên...';
}

// Ẩn progress
function hideUploadProgress() {
    document.querySelector('.upload-progress').style.display = 'none';
}

// Update progress
function updateUploadProgress(percent) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-text').textContent = `Đang tải lên... ${percent}%`;
}
// Xử lý lỗi toàn cục
window.addEventListener('error', function(e) {
    console.error('Lỗi toàn cục:', e.error);
    showToast('Đã xảy ra lỗi trong ứng dụng', 'error');
});

// Xử lý promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rejection:', e.reason);
    showToast('Đã xảy ra lỗi trong ứng dụng', 'error');
    e.preventDefault();
});