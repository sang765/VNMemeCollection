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

// Determine if we're running locally or from GitHub Pages
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname === '0.0.0.0';

// Use local paths for development, GitHub URLs for production
const BASE_URL = isLocalhost ? './' : `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
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
        
        // Thêm headers để tránh CORS và rate limiting
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'VNMemeCollection/1.0'
            }
        });
        
        console.log(`📊 [DEBUG] Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('GitHub API rate limit exceeded. Please try again later.');
            } else if (response.status === 404) {
                throw new Error(`Repository not found or not accessible: ${REPO_OWNER}/${REPO_NAME}`);
            } else {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        console.log(`📋 [DEBUG] Raw API response cho ${folder}:`, data);
        console.log(`📦 [DEBUG] Tổng số items từ API: ${Array.isArray(data) ? data.length : 'Not an array'}`);
        
        // Kiểm tra nếu data là array
        if (!Array.isArray(data)) {
            console.error('❌ [DEBUG] API response is not an array:', data);
            return [];
        }
        
        // Lọc ra chỉ các file (loại bỏ thư mục con)
        const allFiles = data.filter(item => item && item.type === 'file');
        console.log(`📁 [DEBUG] Chỉ files (không có thư mục): ${allFiles.length} files`);
        
        const fileNames = allFiles.map(item => item.name).filter(name => name);
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
        
        // Fallback: Sử dụng local files nếu API fail
        console.log(`🔄 [DEBUG] Attempting to load ${folder} from local files...`);
        const localFiles = await getLocalFiles(folder);
        
        if (localFiles.length > 0) {
            console.log(`✅ [DEBUG] Successfully loaded ${localFiles.length} ${folder} from local files`);
            return localFiles;
        }
        
        showToast(`Lỗi khi tải ${folder === 'images' ? 'ảnh' : 'video'}: ${error.message}`, 'error');
        return [];
    }
}

// Fallback function để load từ local files (khi GitHub API fail)
async function getLocalFiles(folder) {
    try {
        console.log(`📁 [DEBUG] Loading ${folder} from local directory...`);
        
        if (folder === 'images') {
            // Sử dụng các file ảnh có sẵn trong thư mục local
            const imageFiles = [
                '0b01884b-84b5-40b3-b369-f5af36953043.jpeg',
                '0d544bf98f6222d83c43a54218f1c8e0.jpg',
                '2a582a86295b7d9c603c48559cc9e15f.jpg',
                '2cc02ac7-e739-493d-b667-78625c864e2a.jpeg',
                '3b69a450470e5da95379aee564bfb7c1.gif',
                '3d53ebeb-4716-4626-8f4f-40819cb5210c.jpeg',
                '3e0d3b2c63f871f733ba11766fe17339.gif',
                '4cb5a7b65a3ed8a201d96600d081ed2e.gif',
                '5b9b7c4f-1634-4e96-83b7-b0fa55c87788.jpeg',
                '5d67606ed2e6a5485253b95472dc64cb.jpg',
                '6ca3d8de26fe77e6831e3a3700b23315.gif',
                '6f4025f83d11fbb560ed453e98d80104.gif',
                '8d1710fe39eccfe75ab40b7ef9ac99af.jpg',
                '8de0b37a-581a-4855-8610-8603debfed43.jpeg',
                '9d035a6b-9f3f-468c-9fbe-71d2b8ef9961.jpeg',
                '9f689e21e45b184ed19d88ac705dbfe3.gif',
                '24fb054b-9e05-421c-94bf-1d3b28aceba4.jpeg',
                '42f52e2e-535e-4c21-9d8d-684df3132621.jpeg',
                '50e116094491a80d4c9e04582de39f03.jpg',
                '84c49797233cf38289e7961f9930f1e1.gif',
                '92b3eaf9-86e6-49a2-9150-4026a039d723.jpeg',
                '315b7fb3-9de1-4a7e-a5b1-59cda42f2dd5.jpeg',
                '560eca0e-2ec1-43c2-94ac-d9f19a82143a.jpeg',
                '696b76e5-6fda-43cf-a4b8-29e42ce8745c.jpeg',
                '761fddc6-20d3-42de-afbf-ee81ed9d2001.jpeg',
                '977e58b8-f272-44af-bd15-1595bc58f750.gif',
                '2704685f-00cf-420c-adb9-85d29b4a95c8.jpeg',
                '19775593-79ed-4b49-bb01-df8e8da7131a.jpeg',
                'FB_IMG_16882972002473864.jpg',
                'FB_IMG_16883600154413204.jpg',
                'FB_IMG_16883600243255453.jpg',
                'FB_IMG_16883600349759651.jpg',
                'FB_IMG_16883600391572418.jpg',
                'FB_IMG_16883600492918048.jpg',
                'FB_IMG_16883600540957209.jpg',
                'FB_IMG_16883600616841949.jpg',
                'FB_IMG_16883600657176901.jpg',
                'FB_IMG_16883600698639814.jpg',
                'FB_IMG_16883600765561400.jpg',
                'FB_IMG_16883600804677881.jpg',
                'FB_IMG_16883600882627105.jpg',
                'FB_IMG_16883601133811331.jpg',
                'FB_IMG_16883601187846593.jpg',
                'FB_IMG_16883601312907709.jpg',
                'FB_IMG_16883601394918740.jpg',
                'FB_IMG_16883601502552855.jpg',
                'FB_IMG_16883601642431602.jpg',
                'FB_IMG_16883601689987273.jpg',
                'FB_IMG_16883601765253099.jpg',
                'FB_IMG_16883602057212900.jpg',
                'FB_IMG_16883602216488195.jpg',
                'FB_IMG_16883602258110572.jpg',
                'FB_IMG_16883602403930424.jpg',
                'FB_IMG_16883602615371421.jpg',
                'FB_IMG_16883602912819595.jpg',
                'FB_IMG_16883603311213308.jpg',
                'FB_IMG_16883603420839454.jpg',
                'FB_IMG_16883603508824007.jpg',
                'FB_IMG_16883603606552316.jpg',
                'FB_IMG_16883603785661761.jpg',
                'FB_IMG_16883603873410853.jpg',
                'FB_IMG_16883604296192763.jpg',
                'FB_IMG_16883604566245586.jpg',
                'FB_IMG_16883604833475118.jpg',
                'FB_IMG_16883605006802125.jpg',
                'FB_IMG_16883605072600015.jpg',
                'FB_IMG_16883605203374223.jpg',
                'FB_IMG_16883605260063039.jpg',
                'FB_IMG_16883605372156297.jpg',
                'FB_IMG_16883605440545292.jpg',
                'FB_IMG_16883605603118173.jpg',
                'FB_IMG_16883605686638841.jpg',
                'FB_IMG_16883605752531692.jpg',
                'FB_IMG_16883605841341153.jpg',
                'FB_IMG_16883605895287012.jpg',
                'FB_IMG_16883605949149533.jpg',
                'FB_IMG_16883606007137135.jpg',
                'FB_IMG_16883606085680860.jpg',
                'FB_IMG_16883606122241533.jpg',
                'FB_IMG_16883606186724925.jpg',
                'FB_IMG_16883606307459611.jpg',
                'FB_IMG_16883606418799807.jpg',
                'FB_IMG_16883606464538433.jpg',
                'FB_IMG_16883606516249289.jpg',
                'FB_IMG_16883606604191811.jpg',
                'FB_IMG_16883606687233940.jpg',
                'FB_IMG_16883606773557231.jpg',
                'FB_IMG_16883606814932783.jpg',
                'FB_IMG_16883606862132646.jpg',
                'FB_IMG_16883606926042987.jpg',
                'FB_IMG_16883607002908588.jpg',
                'FB_IMG_16883607046079741.jpg',
                'FB_IMG_16883607143546032.jpg',
                'FB_IMG_16883607279213934.jpg',
                'FB_IMG_16883607654091515.jpg',
                'FB_IMG_16883607763835006.jpg',
                'FB_IMG_16883607869653858.jpg',
                'FB_IMG_16883607967683107.jpg',
                'FB_IMG_16883608071868498.jpg',
                'FB_IMG_16883608175724298.jpg',
                'FB_IMG_16883608230312484.jpg',
                'FB_IMG_16883608305490207.jpg',
                'FB_IMG_16883608351241142.jpg',
                'FB_IMG_16883608597760777.jpg',
                'FB_IMG_16883608785426839.jpg',
                'FB_IMG_16883608984579347.jpg',
                'FB_IMG_16883609046050527.jpg',
                'FB_IMG_16883609978962563.jpg',
                'FB_IMG_16883610038353907.jpg',
                'FB_IMG_16883610111837044.jpg',
                'FB_IMG_16883610316528159.jpg',
                'FB_IMG_16883610381907764.jpg',
                'FB_IMG_16883610461327368.jpg',
                'FB_IMG_16883610508427987.jpg',
                'FB_IMG_16883610579816923.jpg',
                'FB_IMG_16883610941926397.jpg',
                'FB_IMG_16883611182672186.jpg',
                'FB_IMG_16883611239529094.jpg',
                'FB_IMG_16883679129224622.jpg',
                'FB_IMG_16883679215449024.jpg',
                'FB_IMG_16883679266670606.jpg',
                'FB_IMG_16883679343546863.jpg',
                'FB_IMG_16883679726311820.jpg',
                'FB_IMG_16883679918512316.jpg',
                'FB_IMG_16883680043873858.jpg',
                'FB_IMG_16883680108319531.jpg',
                'FB_IMG_16883680456605384.jpg',
                'FB_IMG_16883681136965580.jpg',
                'FB_IMG_16883681175791185.jpg',
                'FB_IMG_16883681253579137.jpg',
                'FB_IMG_16883681409689769.jpg',
                'FB_IMG_16883681510581079.jpg',
                'FB_IMG_16883685680075348.jpg',
                'FB_IMG_16884457340450245.jpg',
                'FB_IMG_16884457386368227.jpg',
                'FB_IMG_16884457459033056.jpg',
                'FB_IMG_16886339446173804.jpg',
                'FB_IMG_16886339745097734.jpg',
                'FB_IMG_16886339898015788.jpg',
                'FB_IMG_16886340038845802.jpg',
                'FB_IMG_16886340263754289.jpg',
                'FB_IMG_16886341271871539.jpg',
                'FB_IMG_16886341326012687.jpg',
                'a7b2265c24426ad4753ccd2369149654.jpg',
                'b9f1947f21f38625f26ea8803dc2142c.gif',
                'b70ca661-bab4-483a-a919-9379d2df9dbb.jpeg',
                'b83d74d9f6a43e738a9d4d24996a8cd1.jpg',
                'b214abc3-a7cf-42ca-a0fa-566de43276d9.jpeg',
                'b5083e8a27e41909abf1babc0a7d3d80.gif',
                'bd8c4b92-c9a8-4e5a-97ee-bb9ceb25db45.jpeg',
                'c4fa82c8-38b5-4aca-b1e9-be1e32a666de.jpeg',
                'c9f413a1-bd07-4edf-a32b-cc5336926693.jpeg',
                'c53acff94c0018e697ead0a0872913ec.gif',
                'ce9c949d6c73dbfb889f6036bac022dd.gif',
                'd6bffc0a-db9b-498f-bb21-3fa747d47c7f.jpeg',
                'd6f17e24-a0fd-447f-b8bd-ef30a3c50607.jpeg',
                'd9d358be24f3186070cfc996b04e1984.gif',
                'dbe1f6c4-b67c-42bd-a0fc-a1ce2414550e.jpeg',
                'df11287e5e7dec8a886b4a9f7cb6445f.jpg',
                'e5a928161a8c88d9cde8f8f9500877ba.gif',
                'f9354b97a321a0c5684bfb3166fbb419.jpg'
            ];
            
            console.log(`✅ [DEBUG] Loaded ${imageFiles.length} images from local fallback`);
            return imageFiles;
        } else if (folder === 'videos') {
            // Video folder appears to be empty based on file list
            console.log(`⚠️ [DEBUG] No videos found in local directory`);
            return [];
        }
        
        return [];
    } catch (error) {
        console.error(`❌ [ERROR] Error loading local ${folder}:`, error);
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