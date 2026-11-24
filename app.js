const API_ORIGIN = 'https://sculpting-the-invisible-artworks-wayne.nutty-pony-7093.chatgpt.site';
const PAGE_SIZE = 24;

const galleryView = document.querySelector('[data-gallery-view]');
const artworkView = document.querySelector('[data-artwork-view]');
const galleryGrid = document.querySelector('[data-gallery-grid]');
const galleryStatus = document.querySelector('[data-gallery-status]');
const galleryMessage = document.querySelector('[data-gallery-message]');
const loadMoreButton = document.querySelector('[data-load-more]');
const artworkLoading = document.querySelector('[data-artwork-loading]');
const artworkContent = document.querySelector('[data-artwork-content]');

let nextOffset = 0;
let total = 0;
let loadingGallery = false;

function formatGeneratedTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { date: '时间未知', time: '' };
  const parts = Object.fromEntries(new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}.${parts.month}.${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

async function fetchJson(path) {
  const response = await fetch(`${API_ORIGIN}${path}`, { headers: { accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function createArtworkCard(artwork) {
  const article = document.createElement('article');
  article.className = 'art-card';
  const link = document.createElement('a');
  link.className = 'art-card__link';
  link.href = `#/artwork/${artwork.id}`;
  link.setAttribute('aria-label', `打开 ${formatGeneratedTime(artwork.createdAt).date} ${formatGeneratedTime(artwork.createdAt).time} 生成的作品`);

  const imageWrap = document.createElement('div');
  imageWrap.className = 'art-card__image-wrap';
  const image = document.createElement('img');
  image.className = 'art-card__image';
  image.src = artwork.previewUrl;
  image.alt = '声音生成雕塑缩略图';
  image.loading = 'lazy';
  image.decoding = 'async';
  imageWrap.append(image);

  const timestamp = formatGeneratedTime(artwork.createdAt);
  const meta = document.createElement('div');
  meta.className = 'art-card__meta';
  const date = document.createElement('p');
  date.className = 'art-card__date';
  date.textContent = timestamp.date;
  const time = document.createElement('time');
  time.className = 'art-card__time';
  time.dateTime = artwork.createdAt;
  time.textContent = timestamp.time;
  meta.append(date, time);
  link.append(imageWrap, meta);
  article.append(link);
  return article;
}

async function loadGallery({ reset = false } = {}) {
  if (loadingGallery) return;
  loadingGallery = true;
  loadMoreButton.disabled = true;
  galleryMessage.hidden = true;
  if (reset) {
    nextOffset = 0;
    total = 0;
    galleryGrid.replaceChildren();
  }
  galleryGrid.setAttribute('aria-busy', 'true');
  galleryStatus.textContent = '正在读取作品…';
  try {
    const data = await fetchJson(`/api/artworks?limit=${PAGE_SIZE}&offset=${nextOffset}`);
    const fragment = document.createDocumentFragment();
    for (const artwork of data.items ?? []) fragment.append(createArtworkCard(artwork));
    galleryGrid.append(fragment);
    total = data.total ?? galleryGrid.children.length;
    nextOffset = data.nextOffset;
    galleryStatus.textContent = `共 ${total} 件作品 · 中国标准时间`;
    loadMoreButton.hidden = nextOffset === null;
    if (total === 0) {
      galleryMessage.textContent = '还没有已发布的作品。完成第一轮声音塑形后，作品会出现在这里。';
      galleryMessage.hidden = false;
    }
  } catch (error) {
    galleryStatus.textContent = '作品读取失败';
    galleryMessage.textContent = '暂时无法读取作品相册，请稍后刷新页面。';
    galleryMessage.hidden = false;
    loadMoreButton.hidden = true;
    console.error(error);
  } finally {
    loadingGallery = false;
    loadMoreButton.disabled = false;
    galleryGrid.setAttribute('aria-busy', 'false');
  }
}

function showGallery() {
  galleryView.hidden = false;
  artworkView.hidden = true;
  document.title = '生成式雕塑库 | Sculpting the Invisible';
  if (!galleryGrid.children.length && total === 0) loadGallery({ reset: true });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function showArtworkError(message) {
  artworkLoading.textContent = message;
  artworkLoading.hidden = false;
  artworkContent.hidden = true;
}

async function showArtwork(id) {
  galleryView.hidden = true;
  artworkView.hidden = false;
  artworkLoading.textContent = '正在读取作品…';
  artworkLoading.hidden = false;
  artworkContent.hidden = true;
  window.scrollTo({ top: 0, behavior: 'auto' });
  try {
    const artwork = await fetchJson(`/api/artworks/${id}`);
    const timestamp = formatGeneratedTime(artwork.createdAt);
    document.querySelector('[data-artwork-time]').textContent = `${timestamp.date} · ${timestamp.time}`;
    document.querySelector('[data-artwork-id]').textContent = artwork.id;
    document.querySelector('[data-artwork-image]').src = artwork.desktopUrl;
    document.querySelector('[data-desktop-download]').href = `${artwork.desktopUrl}?download=1`;
    document.querySelector('[data-mobile-download]').href = `${artwork.mobileUrl}?download=1`;
    artworkLoading.hidden = true;
    artworkContent.hidden = false;
    document.title = `${timestamp.date} ${timestamp.time} | 生成式雕塑库`;
  } catch (error) {
    showArtworkError('没有找到这件作品，请返回相册重新选择。');
    console.error(error);
  }
}

function route() {
  const match = window.location.hash.match(/^#\/artwork\/([a-f0-9]{24})$/);
  if (match) showArtwork(match[1]);
  else showGallery();
}

loadMoreButton.addEventListener('click', () => loadGallery());
window.addEventListener('hashchange', route);
route();
