// public/js/meme_search.js
// Vanilla JS frontend for meme search feature

(function () {
  const searchInput = document.getElementById('searchInput');
  const providerSelect = document.getElementById('providerSelect');
  const searchBtn = document.getElementById('searchBtn');
  const grid = document.getElementById('grid');
  const loadingEl = document.getElementById('loading');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const lightbox = document.getElementById('lightbox');
  const lightboxBody = document.getElementById('lightboxBody');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const openBtn = document.getElementById('openBtn');
  const closeBtn = document.getElementById('closeBtn');
  const themeSwitch = document.getElementById('themeSwitch');

  let results = [];
  let query = '';
  let provider = 'both';
  let page = 0;
  const pageSize = 24;
  let loading = false;
  let hasMore = false;

  function setLoading(v) { loading = v; loadingEl.style.display = v ? 'block' : 'none'; }

  function clearGrid() { grid.innerHTML = ''; }

  function renderCard(item) {
    const art = document.createElement('article');
    art.className = 'meme-card';

    const thumb = document.createElement('div');
    thumb.className = 'meme-thumb';

    const img = document.createElement('img');
    img.src = item.preview || item.url;
    img.alt = item.title || '';
    img.loading = 'lazy';
    thumb.appendChild(img);

    const badge = document.createElement('span');
    badge.className = 'provider-badge provider-' + item.provider;
    badge.textContent = item.provider;
    thumb.appendChild(badge);

    thumb.addEventListener('click', () => openLightbox(item));

    const meta = document.createElement('div');
    meta.className = 'meme-meta';

    const title = document.createElement('div');
    title.className = 'meme-title';
    title.textContent = item.title || '';

    const actions = document.createElement('div');
    actions.className = 'meme-actions';
    const viewBtn = document.createElement('button'); viewBtn.textContent = 'View'; viewBtn.addEventListener('click', () => openLightbox(item));
    const copy = document.createElement('button'); copy.textContent = 'Copy'; copy.addEventListener('click', (e) => { e.stopPropagation(); copyToClipboard(item.url); });
    const dl = document.createElement('button'); dl.textContent = 'Download'; dl.addEventListener('click', (e) => { e.stopPropagation(); downloadUrl(item.url, item.id); });
    actions.appendChild(viewBtn); actions.appendChild(copy); actions.appendChild(dl);

    meta.appendChild(title); meta.appendChild(actions);

    art.appendChild(thumb); art.appendChild(meta);
    grid.appendChild(art);
  }

  function updateHasMore(len) {
    hasMore = len === pageSize;
    loadMoreWrap.style.display = hasMore ? 'block' : 'none';
  }

  async function fetchPage(reset = false) {
    if (!query) return;
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/memes?q=${encodeURIComponent(query)}&provider=${encodeURIComponent(provider)}&limit=${pageSize}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Server error ${res.status}`);
      }
      const data = await res.json();
      const items = data.results || [];
      if (reset) { results = items; clearGrid(); }
      else { results = results.concat(items); }
      results.forEach(item => renderCard(item));
      updateHasMore(items.length);
      page += 1;
    } catch (err) {
      console.error(err);
      alert('Lỗi: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  searchBtn.addEventListener('click', () => {
    query = searchInput.value.trim();
    provider = providerSelect.value;
    page = 0;
    clearGrid();
    fetchPage(true);
  });

  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchBtn.click(); });

  loadMoreBtn.addEventListener('click', () => fetchPage(false));

  // infinite scroll
  window.addEventListener('scroll', debounce(() => {
    if (loading || !hasMore) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
      fetchPage(false);
    }
  }, 150));

  // Lightbox
  function openLightbox(item) {
    lightboxTitle.textContent = item.title || '';
    lightboxBody.innerHTML = '';
    const isVideo = item.url && item.url.endsWith('.mp4');
    if (isVideo) {
      const v = document.createElement('video');
      v.src = item.url; v.controls = true; v.autoplay = true; v.style.maxWidth = '100%'; v.style.maxHeight = '75vh';
      lightboxBody.appendChild(v);
      // Try to set random frame for palette
      trySetPaletteFromVideo(v);
    } else {
      const i = document.createElement('img'); i.src = item.url; i.alt = item.title || ''; i.style.maxWidth = '100%'; i.style.maxHeight = '75vh';
      i.crossOrigin = 'anonymous';
      i.addEventListener('load', () => trySetPaletteFromImage(i));
      lightboxBody.appendChild(i);
    }

    copyBtn.onclick = () => copyToClipboard(item.url);
    downloadBtn.onclick = () => downloadUrl(item.url, item.id);
    openBtn.onclick = () => window.open(item.url, '_blank');
    closeBtn.onclick = closeLightbox;

    lightbox.style.display = 'flex';
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.style.display = 'none';
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxBody.innerHTML = '';
    document.body.style.overflow = '';
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => alert('Đã sao chép liên kết')); else prompt('Copy link', text);
  }

  function downloadUrl(url, name) {
    const a = document.createElement('a'); a.href = url; a.download = name || 'meme'; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove();
  }

  // Try to extract dominant color from image via canvas
  function trySetPaletteFromImage(img) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const w = Math.min(200, img.naturalWidth);
      const h = Math.min(200, img.naturalHeight);
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const rgb = [0,0,0]; let count=0;
      for (let i=0;i<data.length;i+=4) { const a=data[i+3]; if (a===0) continue; rgb[0]+=data[i]; rgb[1]+=data[i+1]; rgb[2]+=data[i+2]; count++; }
      if (count===0) return;
      rgb[0]=Math.round(rgb[0]/count); rgb[1]=Math.round(rgb[1]/count); rgb[2]=Math.round(rgb[2]/count);
      applyPalette(rgb);
    } catch (e) {
      // CORS or other error; ignore
      console.warn('Palette extraction failed', e);
    }
  }

  function trySetPaletteFromVideo(video) {
    // Try to seek to a random time to capture a frame
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      video.addEventListener('loadedmetadata', () => {
        const duration = video.duration || 0;
        const t = Math.random() * Math.min(duration, 5); // random time in first 5s
        video.currentTime = t;
      });
      video.addEventListener('seeked', () => {
        const w = Math.min(200, video.videoWidth);
        const h = Math.min(200, video.videoHeight);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        try {
          const data = ctx.getImageData(0, 0, w, h).data;
          const rgb=[0,0,0]; let count=0;
          for (let i=0;i<data.length;i+=4){ const a=data[i+3]; if (a===0) continue; rgb[0]+=data[i]; rgb[1]+=data[i+1]; rgb[2]+=data[i+2]; count++; }
          if (count===0) return;
          rgb[0]=Math.round(rgb[0]/count); rgb[1]=Math.round(rgb[1]/count); rgb[2]=Math.round(rgb[2]/count);
          applyPalette(rgb);
        } catch (e) { console.warn('Video palette failed', e); }
      });
    } catch (e) { console.warn('setup video palette failed', e); }
  }

  function applyPalette([r,g,b]) {
    // set CSS variables for accent color and adaptive text
    const root = document.documentElement;
    root.style.setProperty('--accent-r', r);
    root.style.setProperty('--accent-g', g);
    root.style.setProperty('--accent-b', b);
    const luminance = (0.2126*r + 0.7152*g + 0.0722*b)/255;
    if (luminance > 0.6) root.classList.remove('theme-dark'); else root.classList.add('theme-dark');
  }

  // Theme toggle
  themeSwitch.addEventListener('change', () => {
    if (themeSwitch.checked) document.documentElement.classList.add('theme-dark'); else document.documentElement.classList.remove('theme-dark');
  });

  // Initial hide
  setLoading(false);
  loadMoreWrap.style.display = 'none';

  // Accessibility: close on ESC
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
})();