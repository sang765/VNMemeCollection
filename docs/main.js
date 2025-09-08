// Biến toàn cục
let mediaFiles = {
    images: [],
    videos: []
};

let currentPreviewItem = null;
const REPO_OWNER = 'sang765';
const REPO_NAME = 'VNMemeCollection';
const BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;

// Hàm khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    // Hiển thị thông báo loading
    document.getElementById('image-content').innerHTML = '<p class="loading">Đang tải danh sách ảnh...</p>';
    document.getElementById('video-content').innerHTML = '<p class="loading">Đang tải danh sách video...</p>';
    
    // Lấy danh sách ảnh và video
    fetchMediaFiles();
    
    // Thiết lập sự kiện cho modal
    setupModalEvents();
});

// Lấy danh sách media files từ GitHub API
async function fetchMediaFiles() {
    try {
        // Lấy danh sách ảnh
        const images = await getFilesFromGitHub('images');
        mediaFiles.images = images;
        document.getElementById('image-count').textContent = images.length;
        displayMediaItems('image', images);
        
        // Lấy danh sách video
        const videos = await getFilesFromGitHub('videos');
        mediaFiles.videos = videos;
        document.getElementById('video-count').textContent = videos.length;
        displayMediaItems('video', videos);
        
    } catch (error) {
        console.error('Lỗi khi tải danh sách media:', error);
        document.getElementById('image-content').innerHTML = '<p class="error">Không thể tải danh sách ảnh</p>';
        document.getElementById('video-content').innerHTML = '<p class="error">Không thể tải danh sách video</p>';
    }
}

// Lấy danh sách file từ GitHub API
async function getFilesFromGitHub(folder) {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${folder}`);
        
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
                                 return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                             } else if (folder === 'videos') {
                                 return /\.(mp4|webm|mov|avi|mkv)$/i.test(name);
                             }
                             return false;
                         });
        
        return files;
    } catch (error) {
        console.error(`Lỗi khi lấy danh sách file từ ${folder}:`, error);
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
    
    items.forEach(item => {
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
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = `${BASE_URL}/images/${filename}`;
        img.alt = filename;
        img.loading = 'lazy';
        img.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIGR5PSIuM2VtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5LMO0gY8O1IMSR4bqhbmc8L3RleHQ+PC9zdmc+';
        };
        div.appendChild(img);
    } else {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'video-thumbnail';
        
        // Thử tìm thumbnail (cùng tên với đuôi jpg/png)
        const thumbnailName = filename.split('.')[0];
        const img = document.createElement('img');
        img.src = `${BASE_URL}/videos/${thumbnailName}.jpg`;
        img.alt = filename;
        img.onerror = function() {
            // Nếu không có thumbnail jpg, thử png
            this.src = `${BASE_URL}/videos/${thumbnailName}.png`;
            this.onerror = function() {
                // Nếu không có thumbnail nào, hiển thị placeholder
                this.style.display = 'none';
                thumbnailDiv.innerHTML += '<div class="video-icon">▶</div>';
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
    currentPreviewItem = { type, filename };
    const modal = document.getElementById('preview-modal');
    const container = document.getElementById('preview-container');
    
    container.innerHTML = '';
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = `${BASE_URL}/images/${filename}`;
        img.alt = filename;
        container.appendChild(img);
    } else {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        
        const video = document.createElement('video');
        video.src = `${BASE_URL}/videos/${filename}`;
        video.controls = true;
        video.autoplay = true;
        
        videoContainer.appendChild(video);
        container.appendChild(videoContainer);
    }
    
    modal.style.display = 'block';
    document.addEventListener('keydown', handleKeyPress);
}

// Đóng preview
function closePreview() {
    const modal = document.getElementById('preview-modal');
    modal.style.display = 'none';
    
    // Dừng video nếu đang phát
    const video = document.querySelector('#preview-container video');
    if (video) {
        video.pause();
    }
    
    document.removeEventListener('keydown', handleKeyPress);
}

// Xử lý phím ESC
function handleKeyPress(e) {
    if (e.key === 'Escape') {
        closePreview();
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
                ? `${BASE_URL}/images/${currentPreviewItem.filename}`
                : `${BASE_URL}/videos/${currentPreviewItem.filename}`;
            
            const link = document.createElement('a');
            link.href = url;
            link.download = currentPreviewItem.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            closePreview();
        }
    });
    
    // Xử lý nút sao chép URL
    copyUrlBtn.addEventListener('click', () => {
        if (currentPreviewItem) {
            const url = currentPreviewItem.type === 'image' 
                ? `${BASE_URL}/images/${currentPreviewItem.filename}`
                : `${BASE_URL}/videos/${currentPreviewItem.filename}`;
            
            navigator.clipboard.writeText(url)
                .then(() => {
                    alert('Đã sao chép URL vào clipboard!');
                    closePreview();
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
                        alert('Đã sao chép URL vào clipboard!');
                    } catch (e) {
                        alert('Không thể sao chép URL. Vui lòng thử lại.');
                    }
                    document.body.removeChild(tempTextArea);
                    
                    closePreview();
                });
        }
    });
}

// Thu gọn/mở rộng danh mục
function toggleCategory(type) {
    const content = document.getElementById(`${type}-content`);
    const icon = document.querySelector(`#${type}-category .toggle-icon`);
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'grid';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '►';
    }
}

// Hàm tìm kiếm
function setupSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Tìm kiếm meme...';
    searchInput.id = 'search-input';
    searchInput.style.cssText = `
        padding: 10px;
        width: 100%;
        max-width: 400px;
        margin: 0 auto 20px;
        display: block;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 16px;
    `;
    
    document.querySelector('header').appendChild(searchInput);
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterMediaItems(searchTerm);
    });
}

// Lọc media items theo từ khóa
function filterMediaItems(searchTerm) {
    const mediaItems = document.querySelectorAll('.media-item');
    
    mediaItems.forEach(item => {
        const filename = item.dataset.filename.toLowerCase();
        if (filename.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Khởi tạo tìm kiếm
setupSearch();

// Tự động mở rộng danh mục khi load
setTimeout(() => {
    toggleCategory('image');
    toggleCategory('video');
}, 100);