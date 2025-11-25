/**
 * Language translations for the VN Meme Collection application
 * Supports Vietnamese (vi) and English (en)
 */

export const LANGUAGES = {
    vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
    en: { name: 'English', flag: '🇺🇸' }
};

export const TRANSLATIONS = {
    vi: {
        // Header
        title: 'Bộ sưu tập SegEyy',
        searchPlaceholder: 'Tìm kiếm meme...',
        totalCount: 'Tổng số: {count} meme',
        showing: 'Đang hiển thị: {visible}/{total}',
        
        // Categories
        images: 'Ảnh',
        videos: 'Video',
        noItems: 'Không tìm thấy {type}',
        noImages: 'Không có ảnh nào',
        noVideos: 'Không có video nào',
        
        // Loading states
        loadingImages: 'Đang tải danh sách ảnh...',
        loadingVideos: 'Đang tải danh sách video...',
        loadingData: 'Đang tải dữ liệu...',
        
        // Messages
        loadedFromCache: 'Đã tải dữ liệu từ bộ nhớ đệm',
        dataLoaded: 'Đã tải dữ liệu thành công',
        refreshed: 'Đã làm mới dữ liệu',
        downloading: 'Đang tải xuống...',
        downloadStarted: 'Đã tải xuống thành công',
        downloadFailed: 'Tải xuống thất bại',
        urlCopied: 'Đã sao chép URL vào clipboard',
        urlCopyFailed: 'Không thể sao chép URL',
        languageSwitched: 'Đã chuyển sang {language}',
        
        // Dark mode
        lightMode: 'sáng',
        darkMode: 'tối',
        switchedTo: 'Đã chuyển sang chế độ {mode}',
        
        // File types
        image: 'Hình ảnh',
        video: 'Video',
        
        // Errors
        loadFailed: 'Không thể tải {type}',
        networkError: 'Lỗi mạng',
        timeoutError: 'Thời gian tải quá lâu',
        appError: 'Đã xảy ra lỗi trong ứng dụng',
        
        // Accessibility
        close: 'Đóng',
        previous: 'Trước',
        next: 'Tiếp',
        download: 'Tải xuống',
        copyUrl: 'Sao chép URL',
        lastUpdated: 'Cập nhật lần cuối',
        
        // Buttons
        refresh: 'Làm mới',
        search: 'Tìm kiếm'
    },
    en: {
        // Header
        title: 'SegEyy Collection',
        searchPlaceholder: 'Search memes...',
        totalCount: 'Total: {count} memes',
        showing: 'Showing: {visible}/{total}',
        
        // Categories
        images: 'Images',
        videos: 'Videos',
        noItems: 'No {type} found',
        noImages: 'No images found',
        noVideos: 'No videos found',
        
        // Loading states
        loadingImages: 'Loading images...',
        loadingVideos: 'Loading videos...',
        loadingData: 'Loading data...',
        
        // Messages
        loadedFromCache: 'Loaded from cache',
        dataLoaded: 'Data loaded successfully',
        refreshed: 'Refreshed data',
        downloading: 'Downloading...',
        downloadStarted: 'Download completed',
        downloadFailed: 'Download failed',
        urlCopied: 'URL copied to clipboard',
        urlCopyFailed: 'Failed to copy URL',
        languageSwitched: 'Switched to {language}',
        
        // Dark mode
        lightMode: 'light',
        darkMode: 'dark',
        switchedTo: 'Switched to {mode} mode',
        
        // File types
        image: 'Image',
        video: 'Video',
        
        // Errors
        loadFailed: 'Failed to load {type}',
        networkError: 'Network error',
        timeoutError: 'Loading timeout',
        appError: 'Application error occurred',
        
        // Accessibility
        close: 'Close',
        previous: 'Previous',
        next: 'Next',
        download: 'Download',
        copyUrl: 'Copy URL',
        lastUpdated: 'Last updated',
        
        // Buttons
        refresh: 'Refresh',
        search: 'Search'
    }
};
