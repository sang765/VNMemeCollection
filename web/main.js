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
});

// Lấy danh sách media files
async function fetchMediaFiles() {
    try {
        // Giả lập dữ liệu - trong thực tế sẽ fetch từ server
        // Đây là nơi bạn sẽ tích hợp với backend để lấy danh sách file
        mediaFiles.images = [
            'meme1.jpg',
            'meme2.png',
            'meme3.gif'
        ];
        
        mediaFiles.videos = [
            'video1.mp4',
            'video2.webm'
        ];
        
        // Hiển thị số lượng
        document.getElementById('image-count').textContent = mediaFiles.images.length;
        document.getElementById('video-count').textContent = mediaFiles.videos.length;
        
        // Hiển thị media items
        displayMediaItems('image', mediaFiles.images);
        displayMediaItems('video', mediaFiles.videos);
    } catch (error) {
        console.error('Lỗi khi tải danh sách media:', error);
    }
}

// Hiển thị media items
function displayMediaItems(type, items) {
    const container = document.getElementById(`${type}-content`);
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
        img.src = `../images/${filename}`;
        img.alt = filename;
        img.loading = 'lazy';
        div.appendChild(img);
    } else {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'video-thumbnail';
        
        // Tạo thumbnail cho video (giả định có thumbnail cùng tên với đuôi jpg)
        const thumbnailName = filename.split('.')[0] + '.jpg';
        const img = document.createElement('img');
        img.src = `../videos/${thumbnailName}`;
        img.alt = filename;
        img.onerror = function() {
            // Nếu không có thumbnail, hiển thị background màu đen với icon play
            this.style.display = 'none';
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
        img.src = `../images/${filename}`;
        img.alt = filename;
        container.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = `../videos/${filename}`;
        video.controls = true;
        container.appendChild(video);
    }
    
    modal.style.display = 'block';
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
                ? `../images/${currentPreviewItem.filename}`
                : `../videos/${currentPreviewItem.filename}`;
            
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
                    alert('Không thể sao chép URL. Vui lòng thử lại.');
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