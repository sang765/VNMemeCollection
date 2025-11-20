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
const AUTH_STORAGE_KEY = 'vn_meme_auth_token'; // Đổi tên key để tránh confuse

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
        console.log('🚀 [DEBUG] Bắt đầu quá trình tải media files...');
        
        // Hiển thị loading overlay chi tiết
        showDetailedLoadingOverlay();
        updateLoadingStep(1, 'Kiểm tra bộ nhớ đệm', 'Đang kiểm tra dữ liệu đã lưu trong trình duyệt...', 10);
        
        // Kiểm tra cache trước
        console.log('💾 [DEBUG] Kiểm tra cache trong localStorage...');
        const cachedData = getCachedData();
        
        if (cachedData) {
            console.log('✅ [DEBUG] Tìm thấy cache hợp lệ');
            console.log(`🖼️ [DEBUG] Cache ảnh: ${cachedData.images?.length || 0} files`);
            console.log(`🎥 [DEBUG] Cache video: ${cachedData.videos?.length || 0} files`);
            
            updateLoadingStep(1, 'Bộ nhớ đệm hợp lệ', `Tìm thấy ${cachedData.images?.length || 0} ảnh và ${cachedData.videos?.length || 0} video`, 25);
            
            // Hiển thị loading UI để user thấy quá trình
            setTimeout(() => {
                updateLoadingStep(4, 'Đang hiển thị giao diện', 'Tải dữ liệu vào trang web...', 90);
                
                mediaFiles = cachedData;
                updateMediaDisplay();
                
                updateLoadingProgress(100);
                completeLoading();
                showToast('Đã tải dữ liệu từ bộ nhớ đệm', 'success');
            }, 800);
            
            return;
        } else {
            console.log('⏳ [DEBUG] Không có cache hợp lệ, lấy dữ liệu mới từ API');
        }
        
        // Bước 2: Tải danh sách ảnh
        updateLoadingStep(2, 'Tải danh sách ảnh', 'Đang kết nối đến repository GitHub...', 30);
        
        try {
            const images = await getFilesFromGitHub('images');
            console.log(`📊 [DEBUG] Kết quả ảnh từ API: ${images.length} files`);
            
            updateLoadingStep(2, 'Đã tải danh sách ảnh', `Tìm thấy ${images.length} ảnh từ repository`, 50);
            
            // Bước 3: Tải danh sách video
            updateLoadingStep(3, 'Tải danh sách video', 'Đang tải danh sách video...', 60);
            
            const videos = await getFilesFromGitHub('videos');
            console.log(`📊 [DEBUG] Kết quả video từ API: ${videos.length} files`);
            
            updateLoadingStep(3, 'Đã tải danh sách video', `Tìm thấy ${videos.length} video từ repository`, 75);
            
            mediaFiles = { images, videos };
            console.log('💾 [DEBUG] Cập nhật biến mediaFiles:', mediaFiles);
            
            // Lưu vào cache
            updateLoadingStep(3, 'Lưu dữ liệu', 'Đang lưu vào bộ nhớ đệm trình duyệt...', 80);
            cacheData(mediaFiles);
            
            // Bước 4: Hiển thị giao diện
            updateLoadingStep(4, 'Đang hiển thị giao diện', 'Tải dữ liệu vào trang web...', 90);
            updateMediaDisplay();
            
            // Hoàn thành
            completeLoading();
            showToast('Đã tải dữ liệu mới thành công', 'success');
            console.log('🎉 [DEBUG] Hoàn thành load dữ liệu mới từ API');
            
        } catch (apiError) {
            console.error('❌ [ERROR] Lỗi khi tải từ API:', apiError);
            failLoading('Không thể kết nối đến repository. Vui lòng kiểm tra kết nối internet.');
        }
        
    } catch (error) {
        console.error('❌ [ERROR] Lỗi khi tải danh sách media:', error);
        failLoading('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
        
        document.getElementById('image-content').innerHTML = '<p class="error">Không thể tải danh sách ảnh</p>';
        document.getElementById('video-content').innerHTML = '<p class="error">Không thể tải danh sách video</p>';
    }
}

// Lấy dữ liệu từ cache
function getCachedData() {
    console.log('💾 [DEBUG] Kiểm tra cache với key:', CACHE_KEY);
    
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
        console.log('❌ [DEBUG] Không tìm thấy cache trong localStorage');
        return null;
    }
    
    console.log('📦 [DEBUG] Tìm thấy cache data, đang parse...');
    
    try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const ageInMinutes = Math.round(age / (1000 * 60));
        
        console.log(`⏰ [DEBUG] Cache age: ${ageInMinutes} phút (${age}ms)`);
        console.log(`🔢 [DEBUG] Cache duration: ${CACHE_DURATION / (1000 * 60)} phút`);
        
        // Kiểm tra nếu cache vẫn còn hiệu lực
        if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('✅ [DEBUG] Cache vẫn còn hợp lệ');
            console.log(`📊 [DEBUG] Cache data structure:`, {
                hasImages: !!data.images,
                imagesCount: data.images?.length || 0,
                hasVideos: !!data.videos,
                videosCount: data.videos?.length || 0
            });
            return data;
        } else {
            console.log('⏳ [DEBUG] Cache đã hết hạn, sẽ lấy dữ liệu mới');
            return null;
        }
    } catch (error) {
        console.error('❌ [DEBUG] Lỗi parse cache data:', error);
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
}

// Lưu dữ liệu vào cache
function cacheData(data) {
    console.log('💾 [DEBUG] Bắt đầu lưu dữ liệu vào cache...');
    
    const cache = {
        data,
        timestamp: Date.now()
    };
    
    console.log('📊 [DEBUG] Cache data sẽ lưu:', {
        imagesCount: data.images?.length || 0,
        videosCount: data.videos?.length || 0,
        totalFiles: (data.images?.length || 0) + (data.videos?.length || 0)
    });
    
    try {
        const serializedCache = JSON.stringify(cache);
        localStorage.setItem(CACHE_KEY, serializedCache);
        console.log('✅ [DEBUG] Đã lưu cache thành công');
        console.log('📝 [DEBUG] Cache key:', CACHE_KEY);
        console.log('💾 [DEBUG] Cache size:', serializedCache.length, 'characters');
    } catch (error) {
        console.error('❌ [ERROR] Lỗi khi lưu cache:', error);
    }
}

// Cập nhật hiển thị media
function updateMediaDisplay() {
    console.log('🖥️ [DEBUG] Bắt đầu cập nhật hiển thị media...');
    
    // Cập nhật counters
    const imageCount = mediaFiles.images.length;
    const videoCount = mediaFiles.videos.length;
    const totalCount = imageCount + videoCount;
    
    console.log('📊 [DEBUG] Cập nhật counters:');
    console.log(`   📸 Image count: ${imageCount}`);
    console.log(`   🎬 Video count: ${videoCount}`);
    console.log(`   📋 Total count: ${totalCount}`);
    
    document.getElementById('image-count').textContent = imageCount;
    document.getElementById('video-count').textContent = videoCount;
    document.getElementById('total-count').textContent = totalCount;
    
    // Hiển thị media items
    console.log('🎨 [DEBUG] Bắt đầu hiển thị media items...');
    displayMediaItems('image', mediaFiles.images);
    displayMediaItems('video', mediaFiles.videos);
    
    // Tự động mở rộng danh mục
    console.log('📂 [DEBUG] Tự động mở rộng categories...');
    setTimeout(() => {
        console.log('🔽 [DEBUG] Toggle category: image');
        toggleCategory('image');
        console.log('🔽 [DEBUG] Toggle category: video');
        toggleCategory('video');
    }, 100);
    
    console.log('✅ [DEBUG] Hoàn thành cập nhật hiển thị');
}

// Lấy danh sách file từ GitHub API
async function getFilesFromGitHub(folder) {
    try {
        console.log(`🔍 [DEBUG] Bắt đầu lấy dữ liệu từ thư mục: ${folder}`);
        
        const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${folder}`;
        console.log(`📡 [DEBUG] API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        console.log(`📊 [DEBUG] Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📋 [DEBUG] Raw API response cho ${folder}:`, data);
        console.log(`📦 [DEBUG] Tổng số items từ API: ${data.length}`);
        
        // Lọc ra chỉ các file (loại bỏ thư mục con)
        const allFiles = data.filter(item => item.type === 'file');
        console.log(`📁 [DEBUG] Chỉ files (không có thư mục): ${allFiles.length} files`);
        
        const fileNames = allFiles.map(item => item.name);
        console.log(`📝 [DEBUG] Tên tất cả files:`, fileNames);
        
        // Lọc theo định dạng file
        let files;
        if (folder === 'images') {
            const imageRegex = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
            files = fileNames.filter(name => {
                const isValid = imageRegex.test(name);
                console.log(`🖼️ [DEBUG] Kiểm tra ảnh "${name}": ${isValid ? '✅ Hợp lệ' : '❌ Không hợp lệ'}`);
                return isValid;
            });
        } else if (folder === 'videos') {
            const videoRegex = /\.(mp4|webm|mov|avi|mkv|wmv|flv)$/i;
            files = fileNames.filter(name => {
                const isValid = videoRegex.test(name);
                console.log(`🎥 [DEBUG] Kiểm tra video "${name}": ${isValid ? '✅ Hợp lệ' : '❌ Không hợp lệ'}`);
                return isValid;
            });
        } else {
            files = fileNames;
        }
        
        console.log(`✅ [DEBUG] Kết quả cuối cùng cho ${folder}: ${files.length} files`);
        console.log(`📋 [DEBUG] Danh sách ${folder} cuối cùng:`, files);
        
        return files;
    } catch (error) {
        console.error(`❌ [ERROR] Lỗi khi lấy danh sách file từ ${folder}:`, error);
        showToast(`Lỗi khi tải ${folder === 'images' ? 'ảnh' : 'video'}`, 'error');
        return [];
    }
}

// Hiển thị media items
function displayMediaItems(type, items) {
    console.log(`🎨 [DEBUG] Hiển thị ${type} items: ${items.length} files`);
    
    const container = document.getElementById(`${type}-content`);
    
    if (items.length === 0) {
        console.log(`⚠️ [DEBUG] Không có ${type} nào để hiển thị`);
        container.innerHTML = `<p class="no-items">Chưa có ${type === 'image' ? 'ảnh' : 'video'} nào</p>`;
        return;
    }
    
    console.log(`📋 [DEBUG] Danh sách ${type} sẽ hiển thị:`, items);
    
    container.innerHTML = '';
    
    items.forEach((item, index) => {
        console.log(`🔧 [DEBUG] Tạo element cho ${type}: "${item}" (index: ${index})`);
        const mediaElement = createMediaElement(type, item);
        container.appendChild(mediaElement);
    });
    
    console.log(`✅ [DEBUG] Hoàn thành hiển thị ${items.length} ${type} items`);
}

// Tạo media element
function createMediaElement(type, filename) {
    console.log(`🔧 [DEBUG] Tạo media element: type="${type}", filename="${filename}"`);
    
    const div = document.createElement('div');
    div.className = 'media-item';
    div.dataset.filename = filename;
    div.dataset.type = type;
    
    console.log(`📝 [DEBUG] Thiết lập dataset cho element:`, {
        filename: filename,
        type: type
    });
    
    // Thêm tên file (sẽ hiển thị khi hover)
    const filenameSpan = document.createElement('span');
    filenameSpan.className = 'filename';
    filenameSpan.textContent = filename;
    div.appendChild(filenameSpan);
    
    if (type === 'image') {
        console.log(`🖼️ [DEBUG] Tạo image element cho: "${filename}"`);
        
        const img = document.createElement('img');
        const imageUrl = `${BASE_URL}/images/${encodeURIComponent(filename)}`;
        img.src = imageUrl;
        img.alt = filename;
        img.loading = 'lazy';
        
        console.log(`🔗 [DEBUG] Image URL: ${imageUrl}`);
        
        img.onerror = function() {
            console.log(`❌ [DEBUG] Image load error cho: "${filename}"`);
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI5MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIGR5PSIuM2VtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5LMO0gY8O1IMSR4bqhbmc8L3RleHQ+PC9zdmc+';
        };
        
        div.appendChild(img);
    } else {
        console.log(`🎥 [DEBUG] Tạo video element cho: "${filename}"`);
        
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'video-thumbnail';
        
        // Thử tìm thumbnail (cùng tên với đuôi jpg/png)
        const thumbnailName = filename.split('.')[0];
        console.log(`🖼️ [DEBUG] Thumbnail name: "${thumbnailName}"`);
        
        const img = document.createElement('img');
        let thumbnailUrl = `${BASE_URL}/videos/${encodeURIComponent(thumbnailName)}.jpg`;
        console.log(`🔗 [DEBUG] Thumbnail JPG URL: ${thumbnailUrl}`);
        
        img.src = thumbnailUrl;
        img.alt = filename;
        
        img.onerror = function() {
            // Thử png nếu jpg không có
            thumbnailUrl = `${BASE_URL}/videos/${encodeURIComponent(thumbnailName)}.png`;
            console.log(`🔗 [DEBUG] Thumbnail PNG URL: ${thumbnailUrl}`);
            this.src = thumbnailUrl;
            
            this.onerror = function() {
                // Nếu không có thumbnail nào, hiển thị placeholder
                console.log(`⚠️ [DEBUG] Không có thumbnail cho: "${filename}", hiển thị placeholder`);
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
    
    // Thêm click event
    div.addEventListener('click', () => {
        console.log(`🖱️ [DEBUG] Click on media item: type="${type}", filename="${filename}"`);
        openPreview(type, filename);
    });
    
    console.log(`✅ [DEBUG] Hoàn thành tạo media element cho: "${filename}"`);
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
    let visibleImageCount = 0;
    let visibleVideoCount = 0;
    
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
function toggleCategory(type) {
    const content = document.getElementById(`${type}-content`);
    const icon = document.querySelector(`#${type}-category .toggle-icon`);
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'grid';
        icon.textContent = '▼';
        content.style.animation = 'fadeIn 0.3s ease-out';
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

// ==================== ENHANCED LOADING STATUS FUNCTIONS ====================

// Cập nhật tiêu đề loading
function updateLoadingTitle(title) {
    document.getElementById('loading-title').textContent = title;
    console.log(`📝 [LOADING] Title: ${title}`);
}

// Cập nhật thông điệp loading
function updateLoadingMessage(message) {
    document.getElementById('loading-message').textContent = message;
    console.log(`💬 [LOADING] Message: ${message}`);
}

// Cập nhật trạng thái của một bước
function updateStepStatus(stepNumber, status, isActive = false, isCompleted = false) {
    const stepElement = document.getElementById(`step-${stepNumber}`);
    const statusElement = stepElement.querySelector('.step-status');
    
    // Xóa tất cả classes cũ
    stepElement.classList.remove('active', 'completed');
    
    // Thêm class mới
    if (isActive) stepElement.classList.add('active');
    if (isCompleted) stepElement.classList.add('completed');
    
    // Cập nhật icon trạng thái
    statusElement.textContent = status;
    
    console.log(`🔄 [LOADING] Step ${stepNumber}: ${status} ${isActive ? '(active)' : ''} ${isCompleted ? '(completed)' : ''}`);
}

// Cập nhật tiến độ loading
function updateLoadingProgress(percentage) {
    const progressFill = document.getElementById('status-progress');
    const progressPercentage = document.getElementById('progress-percentage');
    
    progressFill.style.width = percentage + '%';
    progressPercentage.textContent = percentage + '%';
    
    console.log(`📊 [LOADING] Progress: ${percentage}%`);
}

// Hiển thị loading với trạng thái chi tiết
function showDetailedLoadingOverlay() {
    // Reset tất cả steps
    for (let i = 1; i <= 4; i++) {
        updateStepStatus(i, '⏳', false, false);
    }
    
    // Cập nhật progress về 0%
    updateLoadingProgress(0);
    
    document.getElementById('loading-overlay').style.display = 'flex';
}

// Cập nhật toàn bộ quá trình loading theo từng bước
function updateLoadingStep(stepNumber, title, message, percentage) {
    console.log(`🚀 [LOADING] Step ${stepNumber}: ${title}`);
    
    // Tắt step trước đó nếu có
    if (stepNumber > 1) {
        updateStepStatus(stepNumber - 1, '✅', false, true);
    }
    
    // Bật step hiện tại
    updateStepStatus(stepNumber, '🔄', true, false);
    
    // Cập nhật tiêu đề và thông điệp
    updateLoadingTitle(title);
    updateLoadingMessage(message);
    
    // Cập nhật progress
    updateLoadingProgress(percentage);
}

// Hoàn thành loading
function completeLoading() {
    // Đánh dấu tất cả steps là completed
    for (let i = 1; i <= 4; i++) {
        updateStepStatus(i, '✅', false, true);
    }
    
    updateLoadingTitle('Hoàn thành!');
    updateLoadingMessage('Đã tải xong tất cả dữ liệu');
    updateLoadingProgress(100);
    
    console.log('✅ [LOADING] Loading completed!');
    
    // Ẩn overlay sau 1 giây
    setTimeout(() => {
        hideLoadingOverlay();
    }, 1000);
}

// Lỗi loading
function failLoading(errorMessage) {
    updateLoadingTitle('Lỗi tải dữ liệu');
    updateLoadingMessage(errorMessage);
    
    // Đánh dấu tất cả steps là failed
    for (let i = 1; i <= 4; i++) {
        updateStepStatus(i, '❌', false, true);
    }
    
    console.error('❌ [LOADING] Loading failed:', errorMessage);
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
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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