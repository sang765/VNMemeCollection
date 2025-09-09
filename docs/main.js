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
    
    // Hiển thị thông báo loading
    showLoadingOverlay();
    document.getElementById('image-content').innerHTML = '<p class="loading">Đang tải danh sách ảnh...</p>';
    document.getElementById('video-content').innerHTML = '<p class="loading">Đang tải danh sách video...</p>';
    
    // Thiết lập sự kiện
    setupEventListeners();
    
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