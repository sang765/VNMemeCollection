// Import translations
import { LANGUAGES, TRANSLATIONS } from './translations.js';

// Global state
let mediaFiles = {
    images: [],
    videos: []
};

let currentPreviewItem = null;
let currentFilteredItems = [];
let currentPreviewIndex = 0;
let isLoading = false;

// Internationalization
let currentLanguage = 'vi'; // Default to Vietnamese

const CONFIG = {
    REPO_OWNER: 'sang765',
    REPO_NAME: 'VNMemeCollection',
    BASE_URL: 'https://raw.githubusercontent.com/sang765/VNMemeCollection/main',
    CACHE_KEY: 'memeCollectionCache',
    CACHE_DURATION: 30 * 60 * 1000,
    REQUEST_TIMEOUT: 10000,
    LANGUAGE_KEY: 'memeCollectionLanguage'
};

// Initialize app
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Initialize language
    initializeLanguage();
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);
    }

    showLoadingOverlay();
    setupEventListeners();
    loadMediaFiles();
    updateLastUpdated();
    
    // Add global error handling
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

// Language management functions
function initializeLanguage() {
    const savedLanguage = localStorage.getItem(CONFIG.LANGUAGE_KEY);
    currentLanguage = savedLanguage || detectUserLanguage();
    document.documentElement.lang = currentLanguage;
    updateUIElements();
}

function detectUserLanguage() {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('vi')) return 'vi';
    return 'en'; // Default to English
}

function translate(key, params = {}) {
    let translation = TRANSLATIONS[currentLanguage][key] || TRANSLATIONS.en[key] || key;
    
    // Replace placeholders like {count}
    Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
    });
    
    return translation;
}

function changeLanguage(newLanguage) {
    if (!TRANSLATIONS[newLanguage]) return;
    
    currentLanguage = newLanguage;
    localStorage.setItem(CONFIG.LANGUAGE_KEY, newLanguage);
    document.documentElement.lang = newLanguage;
    updateUIElements();
    updateLastUpdated();
    
    // Reload content to update dynamic text
    updateDynamicContent();
    
    const languageName = LANGUAGES[newLanguage].name;
    showToast(translate('languageSwitched', { language: languageName }), 'success');
}

function updateUIElements() {
    // Update static text elements
    const titleElement = document.querySelector('[data-i18n="title"]');
    if (titleElement) titleElement.textContent = translate('title');
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.placeholder = translate('searchPlaceholder');
    
    // Update category headers
    const imageTitle = document.querySelector('#image-category .category-title');
    if (imageTitle) imageTitle.textContent = translate('images');
    
    const videoTitle = document.querySelector('#video-category .category-title');
    if (videoTitle) videoTitle.textContent = translate('videos');
    
    // Update loading messages
    const loadingImages = document.querySelector('#image-content .loading');
    if (loadingImages) loadingImages.textContent = translate('loadingImages');
    
    const loadingVideos = document.querySelector('#video-content .loading');
    if (loadingVideos) loadingVideos.textContent = translate('loadingVideos');
    
    const loadingData = document.querySelector('#loading-overlay p');
    if (loadingData) loadingData.textContent = translate('loadingData');
    
    // Update ARIA labels
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.setAttribute('aria-label', translate('close'));
    
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) prevBtn.setAttribute('aria-label', translate('previous'));
    
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.setAttribute('aria-label', translate('next'));
    
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) downloadBtn.setAttribute('aria-label', translate('download'));
    
    const copyUrlBtn = document.getElementById('copy-url-btn');
    if (copyUrlBtn) copyUrlBtn.setAttribute('aria-label', translate('copyUrl'));
    
    // Update total count text
    updateTotalCountText();
}

function updateTotalCountText() {
    const totalText = document.getElementById('total-count-text');
    if (totalText) {
        const totalCount = mediaFiles.images.length + mediaFiles.videos.length;
        totalText.innerHTML = `${translate('totalCount').replace('{count}', totalCount)} <span id="total-count">${totalCount}</span>`;
    }
}

function updateDynamicContent() {
    // Update count displays
    document.getElementById('image-count').textContent = mediaFiles.images.length;
    document.getElementById('video-count').textContent = mediaFiles.videos.length;

    const totalCount = mediaFiles.images.length + mediaFiles.videos.length;
    console.log('updateDynamicContent: setting total-count.textContent to:', totalCount);
    document.getElementById('total-count').textContent = totalCount;
    
    // Update category content messages
    if (mediaFiles.images.length === 0) {
        const imageContent = document.getElementById('image-content');
        if (imageContent.innerHTML.includes('Chưa có') || imageContent.innerHTML.includes('No images')) {
            imageContent.innerHTML = `<p class="no-items">${translate('noImages')}</p>`;
        }
    }
    
    if (mediaFiles.videos.length === 0) {
        const videoContent = document.getElementById('video-content');
        if (videoContent.innerHTML.includes('Chưa có') || videoContent.innerHTML.includes('No videos')) {
            videoContent.innerHTML = `<p class="no-items">${translate('noVideos')}</p>`;
        }
    }
}

function updateLastUpdated() {
    const now = new Date();
    const dateString = currentLanguage === 'vi' 
        ? now.toLocaleDateString('vi-VN')
        : now.toLocaleDateString('en-US');
    document.getElementById('last-updated').textContent = `${translate('lastUpdated')}: ${dateString}`;
}

function handleGlobalError(e) {
    console.error('Global error:', e.error);
    if (!isLoading) {
        showToast('Application error occurred', 'error');
    }
}

function handleUnhandledRejection(e) {
    console.error('Unhandled promise rejection:', e.reason);
    if (!isLoading) {
        showToast('Application error occurred', 'error');
    }
    e.preventDefault();
}

let searchTimeout;

function setupEventListeners() {
    setupModalEvents();
    setupLanguageSwitcher();
    
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');
    
    searchInput.addEventListener('input', e => {
        const searchTerm = e.target.value.toLowerCase();
        clearSearch.style.display = searchTerm ? 'block' : 'none';
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => filterMediaItems(searchTerm), 300);
    });
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        filterMediaItems('');
    });
    
    document.getElementById('toggle-dark-mode').addEventListener('click', toggleDarkMode);
    
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        if (isLoading) return;
        
        localStorage.removeItem(CONFIG.CACHE_KEY);
        showLoadingOverlay();
        await loadMediaFiles();
        showToast(translate('refreshed'), 'success');
    });
    
    document.getElementById('prev-btn').addEventListener('click', showPrevItem);
    document.getElementById('next-btn').addEventListener('click', showNextItem);
    
    document.addEventListener('keydown', handleGlobalKeyPress);
    
    // Performance: Use passive event listeners for scroll
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function setupLanguageSwitcher() {
    const languageToggle = document.getElementById('language-toggle');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');
    
    // Toggle dropdown
    languageToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        languageToggle.classList.toggle('active');
        languageDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        languageToggle.classList.remove('active');
        languageDropdown.classList.remove('show');
    });
    
    // Handle language selection
    languageOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedLang = option.dataset.lang;
            if (selectedLang !== currentLanguage) {
                changeLanguage(selectedLang);
                updateLanguageSwitcherUI();
            }
            languageToggle.classList.remove('active');
            languageDropdown.classList.remove('show');
        });
    });
    
    // Update initial UI state
    updateLanguageSwitcherUI();
}

function updateLanguageSwitcherUI() {
    const languageToggle = document.getElementById('language-toggle');
    const languageOptions = document.querySelectorAll('.language-option');
    const languageFlag = languageToggle.querySelector('.language-flag');
    
    // Update flag based on current language
    languageFlag.textContent = LANGUAGES[currentLanguage].flag;
    
    // Update active option
    languageOptions.forEach(option => {
        if (option.dataset.lang === currentLanguage) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

async function loadMediaFiles() {
    if (isLoading) return;
    
    isLoading = true;
    
    try {
        const cachedData = getCachedData();
        if (cachedData) {
            mediaFiles = cachedData;
            updateMediaDisplay();
            hideLoadingOverlay();
            showToast(translate('loadedFromCache'), 'success');
            return;
        }
        
        const [images, videos] = await Promise.all([
            getFilesFromGitHub('images'),
            getFilesFromGitHub('videos')
        ]);
        
        mediaFiles = { images, videos };
        cacheData(mediaFiles);
        updateMediaDisplay();
        hideLoadingOverlay();
        showToast(translate('dataLoaded'), 'success');
        
    } catch (error) {
        console.error('Error loading media files:', error);
        document.getElementById('image-content').innerHTML = `<p class="error">${translate('loadFailed', { type: translate('images').toLowerCase() })}</p>`;
        document.getElementById('video-content').innerHTML = `<p class="error">${translate('loadFailed', { type: translate('videos').toLowerCase() })}</p>`;
        hideLoadingOverlay();
        showToast(translate('appError'), 'error');
    } finally {
        isLoading = false;
    }
}

function getCachedData() {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    return Date.now() - timestamp < CONFIG.CACHE_DURATION ? data : null;
}

function cacheData(data) {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
    }));
}

function updateMediaDisplay() {
    document.getElementById('image-count').textContent = mediaFiles.images.length;
    document.getElementById('video-count').textContent = mediaFiles.videos.length;
    document.getElementById('total-count').textContent =
        mediaFiles.images.length + mediaFiles.videos.length;
    
    displayMediaItems('image', mediaFiles.images);
    displayMediaItems('video', mediaFiles.videos);
    
    setTimeout(() => {
        toggleCategory('image', false);
        toggleCategory('video', false);
    }, 100);
}

async function getFilesFromGitHub(folder) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
        
        const response = await fetch(
            `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${folder}?t=${Date.now()}`,
            { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const fileTypes = folder === 'images' 
            ? /\.(jpg|jpeg|png|gif|webp|bmp)$/i
            : /\.(mp4|webm|mov|avi|mkv|wmv|flv)$/i;
            
        return data.filter(item => item.type === 'file')
                  .map(item => item.name)
                  .filter(name => fileTypes.test(name));
                  
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`Timeout fetching ${folder}`);
            showToast(translate('timeoutError'), 'error');
        } else {
            console.error(`Error fetching ${folder}:`, error);
            showToast(translate('loadFailed', { type: translate(folder === 'images' ? 'images' : 'videos') }), 'error');
        }
        return [];
    }
}

function displayMediaItems(type, items) {
    const container = document.getElementById(`${type}-content`);
    
    if (items.length === 0) {
        const noItemsText = type === 'image' ? translate('noImages') : translate('noVideos');
        container.innerHTML = `<p class="no-items">${noItemsText}</p>`;
        return;
    }
    
    container.innerHTML = '';
    items.forEach(item => {
        container.appendChild(createMediaElement(type, item));
    });
}

function createMediaElement(type, filename) {
    const div = document.createElement('div');
    div.className = 'media-item';
    div.dataset.filename = filename;
    div.dataset.type = type;
    
    const filenameSpan = document.createElement('span');
    filenameSpan.className = 'filename';
    filenameSpan.textContent = filename;
    div.appendChild(filenameSpan);
    
    if (type === 'image') {
        const img = createOptimizedImage(filename);
        div.appendChild(img);
    } else {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'video-thumbnail';
        
        const thumbnailName = filename.split('.')[0];
        const img = createOptimizedImage(`${thumbnailName}.jpg`, true);
        img.onerror = () => {
            img.src = `${CONFIG.BASE_URL}/videos/${encodeURIComponent(thumbnailName)}.png`;
            img.onerror = () => {
                img.style.display = 'none';
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

function createOptimizedImage(src, isVideoThumb = false) {
    const img = document.createElement('img');
    const basePath = isVideoThumb ? `${CONFIG.BASE_URL}/videos/` : `${CONFIG.BASE_URL}/images/`;
    img.src = basePath + encodeURIComponent(src);
    img.alt = src;
    img.loading = 'lazy';
    
    // Add image optimization attributes
    img.decoding = 'async';
    img.fetchpriority = 'low';
    
    // Add lazy loading class for Intersection Observer
    img.classList.add('lazy');
    img.dataset.src = img.src;
    img.src = ''; // Clear src initially for lazy loading
    
    img.onerror = () => {
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI5MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIGR5PSIuM2VtIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DYW5ub3QgbG9hZDwvdGV4dD48L3N2Zz4=';
    };
    
    // Add intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    image.src = image.dataset.src;
                    image.classList.remove('lazy');
                    observer.unobserve(image);
                }
            });
        }, {
            rootMargin: '50px 0px', // Load images 50px before they enter viewport
            threshold: 0.1
        });
        
        imageObserver.observe(img);
    } else {
        // Fallback for browsers without IntersectionObserver
        img.src = img.dataset.src;
        img.classList.remove('lazy');
    }
    
    return img;
}

function openPreview(type, filename) {
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
    filetypeElement.textContent = translate(type);
    
    updateNavButtons();
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = `${CONFIG.BASE_URL}/images/${encodeURIComponent(filename)}`;
        img.alt = filename;
        container.appendChild(img);
    } else {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        
        const video = document.createElement('video');
        video.src = `${CONFIG.BASE_URL}/videos/${encodeURIComponent(filename)}`;
        video.controls = true;
        video.autoplay = true;
        
        videoContainer.appendChild(video);
        container.appendChild(videoContainer);
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    pauseAllGIFs();
}

function updateNavButtons() {
    const items = currentFilteredItems.length > 0 ? currentFilteredItems : 
                 currentPreviewItem.type === 'image' ? mediaFiles.images : mediaFiles.videos;
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    prevBtn.disabled = currentPreviewIndex <= 0;
    nextBtn.disabled = currentPreviewIndex >= items.length - 1;
}

function showPrevItem() {
    const items = currentFilteredItems.length > 0 ? currentFilteredItems : 
                 currentPreviewItem.type === 'image' ? mediaFiles.images : mediaFiles.videos;
    
    if (currentPreviewIndex > 0) {
        currentPreviewIndex--;
        openPreview(currentPreviewItem.type, items[currentPreviewIndex]);
    }
}

function showNextItem() {
    const items = currentFilteredItems.length > 0 ? currentFilteredItems : 
                 currentPreviewItem.type === 'image' ? mediaFiles.images : mediaFiles.videos;
    
    if (currentPreviewIndex < items.length - 1) {
        currentPreviewIndex++;
        openPreview(currentPreviewItem.type, items[currentPreviewIndex]);
    }
}

function closePreview() {
    const modal = document.getElementById('preview-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    
    const video = document.querySelector('#preview-container video');
    if (video) video.pause();
    
    resumeAllGIFs();
}

function handleGlobalKeyPress(e) {
    const modal = document.getElementById('preview-modal');
    
    if (modal.style.display === 'block') {
        if (e.key === 'Escape') closePreview();
        else if (e.key === 'ArrowLeft') showPrevItem();
        else if (e.key === 'ArrowRight') showNextItem();
    }
}

// Performance optimization for scroll handling
function handleScroll() {
    // Debounced scroll handler for performance
    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            // Handle any scroll-based operations here
        });
    }
}

async function downloadFile(url, filename) {
    try {
        showToast(translate('downloading'), 'info');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL after a short delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

        showToast(translate('downloadStarted'), 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast(translate('downloadFailed'), 'error');
    }
}

function setupModalEvents() {
    const modal = document.getElementById('preview-modal');
    const closeBtn = document.querySelector('.close');
    const downloadBtn = document.getElementById('download-btn');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    
    closeBtn.addEventListener('click', closePreview);
    
    modal.addEventListener('click', e => {
        if (e.target === modal) closePreview();
    });
    
    downloadBtn.addEventListener('click', () => {
        if (currentPreviewItem) {
            const url = currentPreviewItem.type === 'image'
                ? `${CONFIG.BASE_URL}/images/${encodeURIComponent(currentPreviewItem.filename)}`
                : `${CONFIG.BASE_URL}/videos/${encodeURIComponent(currentPreviewItem.filename)}`;

            downloadFile(url, currentPreviewItem.filename);
        }
    });
    
    copyUrlBtn.addEventListener('click', () => {
        if (currentPreviewItem) {
            const url = currentPreviewItem.type === 'image' 
                ? `${CONFIG.BASE_URL}/images/${encodeURIComponent(currentPreviewItem.filename)}`
                : `${CONFIG.BASE_URL}/videos/${encodeURIComponent(currentPreviewItem.filename)}`;
            
            navigator.clipboard.writeText(url)
                .then(() => showToast(translate('urlCopied'), 'success'))
                .catch(err => {
                    console.error('Error copying URL: ', err);
                    
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = url;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    try {
                        document.execCommand('copy');
                        showToast(translate('urlCopied'), 'success');
                    } catch (e) {
                        showToast(translate('urlCopyFailed'), 'error');
                    }
                    document.body.removeChild(tempTextArea);
                });
        }
    });
}

function filterMediaItems(searchTerm) {
    const allMediaItems = document.querySelectorAll('.media-item');
    currentFilteredItems = [];
    
    let visibleCount = 0;
    
    allMediaItems.forEach(item => {
        const filename = item.dataset.filename.toLowerCase();
        
        if (filename.includes(searchTerm)) {
            item.style.display = 'block';
            visibleCount++;
            
            if (searchTerm) {
                currentFilteredItems.push(item.dataset.filename);
            }
        } else {
            item.style.display = 'none';
        }
    });
    
    const statsElement = document.getElementById('filter-stats');
    const totalCount = document.getElementById('total-count').textContent;
    
    if (searchTerm) {
        statsElement.style.display = 'inline';
        statsElement.textContent = translate('showing', { visible: visibleCount, total: totalCount });
    } else {
        statsElement.style.display = 'none';
    }
}

function toggleCategory(type, animate = true) {
    const content = document.getElementById(`${type}-content`);
    const icon = document.querySelector(`#${type}-category .toggle-icon`);
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'grid';
        icon.textContent = '▼';
        if (animate) content.style.animation = 'fadeIn 0.3s ease-out';
    } else {
        content.style.display = 'none';
        icon.textContent = '►';
    }
}

function pauseAllGIFs() {
    const allImages = document.querySelectorAll('.media-item img');
    
    allImages.forEach(img => {
        if (img.src.toLowerCase().includes('.gif')) {
            img.dataset.originalSrc = img.src;
            img.dataset.isPaused = 'true';
            
            if (img.complete && img.naturalWidth > 0) {
                freezeGIF(img);
            } else {
                img.addEventListener('load', () => {
                    if (img.dataset.isPaused === 'true') {
                        freezeGIF(img);
                    }
                }, { once: true });
            }
        }
    });
}

function freezeGIF(img) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL('image/png');
        img.src = dataURL;
    } catch (error) {
        console.error('Error pausing GIF:', error);
        img.style.opacity = '0';
    }
}

function resumeAllGIFs() {
    const allImages = document.querySelectorAll('.media-item img');
    
    allImages.forEach(img => {
        if (img.dataset.originalSrc && img.dataset.isPaused === 'true') {
            img.src = img.dataset.originalSrc;
            img.style.opacity = '';
            
            delete img.dataset.originalSrc;
            delete img.dataset.isPaused;
        }
    });
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeButton(newTheme);
    const modeText = newTheme === 'dark' ? translate('darkMode') : translate('lightMode');
    showToast(translate('switchedTo', { mode: modeText }), 'success');
}

function updateThemeButton(theme) {
    const button = document.getElementById('toggle-dark-mode');
    button.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function showLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
}




window.addEventListener('error', e => {
    console.error('Global error:', e.error);
    showToast('Application error occurred', 'error');
});

window.addEventListener('unhandledrejection', e => {
    console.error('Promise rejection:', e.reason);
    showToast('Application error occurred', 'error');
    e.preventDefault();
});