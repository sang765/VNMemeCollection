// Biến toàn cục
let mediaFiles = {
    images: [],
    videos: []
};

let currentPreviewItem = null;

// Hàm khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    // Lấy danh sách ảnh và video
    fetchMediaFiles();
    
    // Thiết lập sự kiện cho modal
    setupModalEvents();
    
    // Mở rộng danh mục mặc định
    setTimeout(() => {
        toggleCategory('image');
        toggleCategory('video');
    }, 100);
});

// Lấy danh sách media files
async function fetchMediaFiles() {
    try {
        // Trong thực tế, bạn sẽ fetch từ server API
        // Đoạn code này giả lập dữ liệu cho demo
        mediaFiles.images = await getImageList();
        mediaFiles.videos = await getVideoList();
        
        // Hiển thị số lượng
        document.getElementById('image-count').textContent = mediaFiles.images.length;
        document.getElementById('video-count').textContent = mediaFiles.videos.length;
        
        // Hiển thị media items
        displayMediaItems('image', mediaFiles.images);
        displayMediaItems('video', mediaFiles.videos);
    } catch (error) {
        console.error('Lỗi khi tải danh sách media:', error);
        document.getElementById('image-content').innerHTML = '<p>Không thể tải danh sách ảnh</p>';
        document.getElementById('video-content').innerHTML = '<p>Không thể tải danh sách video</p>';
    }
}

// Giả lập API lấy danh sách ảnh
async function getImageList() {
    // Trong thực tế, bạn sẽ gọi API từ server
    // Ở đây giả lập trả về danh sách ảnh
    return [
        'meme1.jpg',
        'meme2.png', 
        'meme3.gif',
        'meme4.jpg',
        'meme5.png'
    ];
}

// Giả lập API lấy danh sách video
async function getVideoList() {
    // Trong thực tế, bạn sẽ gọi API từ server
    // Ở đây giả lập trả về danh sách video
    return [
        'video1.mp4',
        'video2.webm'
    ];
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
        img.src = `images/${filename}`;
        img.alt = filename;
        img.loading = 'lazy';
        img.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIGR5PSIuM2VtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5LMO0gY8O1IMSR4bqhbmc8L3RleHQ+PC9zdmc+';
        };
        div.appendChild(img);
    } else {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'video-thumbnail';
        
        // Tạo thumbnail cho video (giả định có thumbnail cùng tên với đuôi jpg)
        const thumbnailName = filename.split('.')[0] + '.jpg';
        const img = document.createElement('img');
        img.src = `videos/${thumbnailName}`;
        img.alt = filename;
        img.onerror = function() {
            // Nếu không có thumbnail, hiển thị background màu đen với icon play
            this.style.display = 'none';
            thumbnailDiv.innerHTML += '<div class="video-icon">▶</div>';
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
        img.src = `images/${filename}`;
        img.alt = filename;
        container.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = `videos/${filename}`;
        video.controls = true;
        container.appendChild(video);
    }
    
    modal.style.display = 'block';
    
    // Thêm sự kiện đóng bằng phím ESC
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
    
    // Xóa sự kiện phím ESC
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
    
    // Đóng khi click nút X
    closeBtn.addEventListener('click', closePreview);
    
    // Đóng khi click bên ngoài
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePreview();
        }
    });
    
    // Xử lý nút tải xuống
    downloadBtn.addEventListener('click', () => {
        if (currentPreviewItem) {
            const link = document.createElement('a');
            const url = currentPreviewItem.type === 'image' 
                ? `images/${currentPreviewItem.filename}`
                : `videos/${currentPreviewItem.filename}`;
            
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
                ? `${window.location.origin}/images/${currentPreviewItem.filename}`
                : `${window.location.origin}/videos/${currentPreviewItem.filename}`;
            
            navigator.clipboard.writeText(url)
                .then(() => {
                    alert('Đã sao chép URL vào clipboard!');
                    closePreview();
                })
                .catch(err => {
                    console.error('Lỗi khi sao chép URL: ', err);
                    
                    // Fallback cho trình duyệt không hỗ tr� clipboard API
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
    
    if (content.style.display === 'none') {
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