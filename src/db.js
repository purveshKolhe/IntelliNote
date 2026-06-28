// Local Database Manager using IndexedDB + Memory Cache
import { get, set } from 'idb-keyval';
import { escapeHTML, sanitizeHTML } from './security.js';

const WORKSPACES_KEY = 'intellinote_workspaces';
const CHAPTERS_KEY = 'intellinote_chapters';
const TRASH_KEY = 'intellinote_trash';
const PLUGINS_KEY = 'intellinote_plugins';
const NOTIFICATIONS_KEY = 'intellinote_notifications';
const ANALYTICS_KEY = 'intellinote_analytics';

let memoryState = {
  workspaces: null,
  chapters: null,
  trash: null,
  plugins: null,
  notifications: null,
  analytics: null,
  groq_api_key: null,
  groq_model_name: null,
  groq_chat_model_name: null
};

const DEFAULT_PLUGINS = [
  {
    id: 'youtube-widget',
    name: 'YouTube Embedder',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="plugin-svg-icon"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
    description: 'Embed YouTube video players directly inside your notes by pasting links.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `if (!block.data || typeof block.data !== 'object') {
  block.data = { url: '' };
}
container.innerHTML = '';
const wrapper = document.createElement('div');
wrapper.style.position = 'relative';
wrapper.style.width = '100%';
wrapper.style.margin = '10.5px 0';
wrapper.style.borderRadius = '10.5px';
wrapper.style.overflow = 'hidden';
wrapper.style.transition = 'all 0.2s ease';

const inputEl = document.createElement('input');
inputEl.type = 'text';
inputEl.placeholder = 'Paste YouTube video link...';
inputEl.value = block.data.url || '';
inputEl.style.width = '100%';
inputEl.style.padding = '10.5px 14.7px';
inputEl.style.border = '1px solid var(--border-color)';
inputEl.style.borderRadius = '8.4px';
inputEl.style.outline = 'none';
inputEl.style.fontSize = '15.3px';
inputEl.style.boxSizing = 'border-box';
inputEl.style.background = '#f8fafc';

const iframeContainer = document.createElement('div');
iframeContainer.style.width = '100%';
iframeContainer.style.borderRadius = '8.4px';
iframeContainer.style.overflow = 'hidden';
iframeContainer.style.display = 'none';

const changeBtn = document.createElement('button');
changeBtn.textContent = 'Change Video';
changeBtn.style.position = 'absolute';
changeBtn.style.top = '12.6px';
changeBtn.style.right = '12.6px';
changeBtn.style.padding = '6.3px 12.6px';
changeBtn.style.borderRadius = '21px';
changeBtn.style.background = 'rgba(15, 23, 42, 0.75)';
changeBtn.style.backdropFilter = 'blur(4.2px)';
changeBtn.style.color = '#ffffff';
changeBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
changeBtn.style.cursor = 'pointer';
changeBtn.style.fontSize = '12.6px';
changeBtn.style.fontWeight = '500';
changeBtn.style.opacity = '0';
changeBtn.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
changeBtn.style.transform = 'translateY(-5.3px)';
changeBtn.style.zIndex = '10';
changeBtn.style.fontFamily = 'var(--font-sans)';

wrapper.addEventListener('mouseenter', () => {
  if (block.data.url) {
    changeBtn.style.opacity = '1';
    changeBtn.style.transform = 'translateY(0)';
  }
});
wrapper.addEventListener('mouseleave', () => {
  changeBtn.style.opacity = '0';
  changeBtn.style.transform = 'translateY(-5.3px)';
});

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^\"&?\\/\\s]{11})/);
  return match ? match[1] : null;
};

const renderVideo = (url) => {
  const videoId = getYoutubeId(url);
  if (videoId) {
    iframeContainer.innerHTML = \`<iframe width="100%" height="360" src="https://www.youtube.com/embed/\${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border: none; display: block; width: 100%; border-radius: 8.4px;"></iframe>\`;
    iframeContainer.style.display = 'block';
    inputEl.style.display = 'none';
    wrapper.style.padding = '0';
    wrapper.style.border = 'none';
    wrapper.style.background = 'transparent';
  } else {
    iframeContainer.innerHTML = '';
    iframeContainer.style.display = 'none';
    inputEl.style.display = 'block';
    wrapper.style.padding = '12.6px';
    wrapper.style.border = '1px solid var(--border-color)';
    wrapper.style.background = '#f8fafc';
  }
};

changeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  block.data.url = '';
  save();
  inputEl.value = '';
  renderVideo('');
  setTimeout(() => inputEl.focus(), 50);
});

const handleInput = () => {
  const val = inputEl.value.trim();
  if (getYoutubeId(val)) {
    block.data.url = val;
    save();
    renderVideo(val);
  }
};

inputEl.addEventListener('input', handleInput);
inputEl.addEventListener('paste', () => setTimeout(handleInput, 10));

if (block.data.url) {
  renderVideo(block.data.url);
}

wrapper.appendChild(inputEl);
wrapper.appendChild(iframeContainer);
wrapper.appendChild(changeBtn);
container.appendChild(wrapper);
`
  },
  {
    id: 'timer-widget',
    name: 'Pomodoro Dashboard',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="plugin-svg-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description: 'A complete workspace dashboard for Pomodoro timing, hierarchical task management, habit tracking, and detailed productivity analytics.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `container.innerHTML = '<div style="padding:16.8px; text-align:center; background:var(--primary-light); color:var(--primary); border-radius:8.4px; font-weight:500;">🍅 The Pomodoro & Habits feature has been upgraded to a full dashboard! Access it from the primary sidebar on the left.</div>';`
  },
  {
    id: 'sketch-widget',
    name: 'Drawing Canvas',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="plugin-svg-icon"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35857 19.5 5.5 20 5.5 20.5C5.5 21.3284 6.17157 22 7 22H12Z"/><circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="14.5" r="1.5" fill="currentColor"/></svg>',
    description: 'Sketch notes, flowcharts, diagrams, or math formulas directly inside notes.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `if (!block.data || typeof block.data !== 'object') {
  block.data = { image: '', height: 250 };
}
if (!block.data.height) {
  block.data.height = 250;
}
container.innerHTML = '';
const wrapper = document.createElement('div');
wrapper.style.padding = '12.6px';
wrapper.style.background = '#f8fafc';
wrapper.style.border = '1px solid var(--border-color)';
wrapper.style.borderRadius = '10.5px';
wrapper.style.display = 'flex';
wrapper.style.flexDirection = 'column';
wrapper.style.gap = '8.4px';
wrapper.style.margin = '10.5px 0';
wrapper.style.width = '100%';
wrapper.style.position = 'relative';

const toolbar = document.createElement('div');
toolbar.style.display = 'flex';
toolbar.style.flexWrap = 'wrap';
toolbar.style.gap = '8.4px';
toolbar.style.alignItems = 'center';
toolbar.style.paddingBottom = '8.4px';
toolbar.style.borderBottom = '1px solid var(--border-color)';
toolbar.innerHTML = \`
  <!-- Pen Dropdown -->
  <div class="dropdown-container" style="position:relative;">
    <button class="toolbar-drop-btn" id="pen-select-btn" style="display:flex; align-items:center; padding:4.2px 8.4px; font-size:12px; border-radius:4.2px; border:1px solid var(--border-color); background:#ffffff; color:var(--text-muted); cursor:pointer; font-family:var(--font-sans); font-weight:500;">
      <span class="btn-icon" style="margin-right:4.2px; display:flex; align-items:center; color:var(--text-muted);">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
      </span>
      <span class="btn-text">Pen: Brush</span>
      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4.2px; color:var(--text-light);"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div class="dropdown-menu" id="pen-dropdown-menu" style="position:absolute; top:110%; left:0; z-index:1000; display:none; flex-direction:column; background:#ffffff; border:1px solid var(--border-color); border-radius:6.3px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); padding:4.2px; min-width:130px;">
      <button class="dropdown-item active" data-pen="brush" style="display:flex; align-items:center; width:100%; padding:6.3px 8.4px; font-size:12px; border:none; background:var(--primary-light); color:var(--primary); border-radius:4.2px; text-align:left; cursor:pointer; font-family:var(--font-sans); font-weight:500;">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6.3px;"><circle cx="12" cy="12" r="10"></circle></svg>
        Brush
      </button>
      <button class="dropdown-item" data-pen="fountain" style="display:flex; align-items:center; width:100%; padding:6.3px 8.4px; font-size:12px; border:none; background:transparent; color:var(--text-muted); border-radius:4.2px; text-align:left; cursor:pointer; font-family:var(--font-sans); font-weight:500;">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6.3px;"><path d="M12 2c-1.1 0-2 .9-2 2v10l-2 2v2h8v-2l-2-2V4c0-1.1-.9-2-2-2z"></path><path d="M12 14v4"></path></svg>
        Fountain Pen
      </button>
      <button class="dropdown-item" data-pen="pencil" style="display:flex; align-items:center; width:100%; padding:6.3px 8.4px; font-size:12px; border:none; background:transparent; color:var(--text-muted); border-radius:4.2px; text-align:left; cursor:pointer; font-family:var(--font-sans); font-weight:500;">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6.3px;"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
        Pencil
      </button>
    </div>
  </div>

  <!-- Shapes Dropdown -->
  <div class="dropdown-container" style="position:relative;">
    <button class="toolbar-drop-btn" id="shape-select-btn" style="display:flex; align-items:center; padding:4.2px 8.4px; font-size:12px; border-radius:4.2px; border:1px solid var(--border-color); background:#ffffff; color:var(--text-muted); cursor:pointer; font-family:var(--font-sans); font-weight:500;">
      <span class="btn-icon" style="margin-right:4.2px; display:flex; align-items:center; color:var(--text-muted);">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><circle cx="16" cy="16" r="5"></circle><path d="M18 8L20 10L22 8"></path></svg>
      </span>
      <span class="btn-text">Draw: Freehand</span>
      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4.2px; color:var(--text-light);"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div class="dropdown-menu" id="shape-dropdown-menu" style="position:absolute; top:110%; left:0; z-index:1000; display:none; flex-direction:column; background:#ffffff; border:1px solid var(--border-color); border-radius:6.3px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); padding:4.2px; min-width:130px;">
      <button class="dropdown-item active" data-shape="none" style="display:flex; align-items:center; width:100%; padding:6.3px 8.4px; font-size:12px; border:none; background:var(--primary-light); color:var(--primary); border-radius:4.2px; text-align:left; cursor:pointer; font-family:var(--font-sans); font-weight:500;">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6.3px;"><path d="M12 2c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path></svg>
        Freehand
      </button>
      <button class="dropdown-item" data-shape="line" style="display:flex; align-items:center; width:100%; padding:6.3px 8.4px; font-size:12px; border:none; background:transparent; color:var(--text-muted); border-radius:4.2px; text-align:left; cursor:pointer; font-family:var(--font-sans); font-weight:500;">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6.3px;"><line x1="5" y1="19" x2="19" y2="5"></line></svg>
        Line
      </button>
      <button class="dropdown-item" data-shape="rect" style="display:flex; align-items:center; width:100%; padding:6.3px 8.4px; font-size:12px; border:none; background:transparent; color:var(--text-muted); border-radius:4.2px; text-align:left; cursor:pointer; font-family:var(--font-sans); font-weight:500;">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6.3px;"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
        Rectangle
      </button>
      <button class="dropdown-item" data-shape="circle" style="display:flex; align-items:center; width:100%; padding:6.3px 8.4px; font-size:12px; border:none; background:transparent; color:var(--text-muted); border-radius:4.2px; text-align:left; cursor:pointer; font-family:var(--font-sans); font-weight:500;">
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6.3px;"><circle cx="12" cy="12" r="10"></circle></svg>
        Circle
      </button>
    </div>
  </div>

  <!-- Color Dropdown -->
  <div class="dropdown-container" style="position:relative;">
    <button class="toolbar-drop-btn" id="color-select-btn" style="display:flex; align-items:center; padding:4.2px 8.4px; font-size:12px; border-radius:4.2px; border:1px solid var(--border-color); background:#ffffff; color:var(--text-muted); cursor:pointer; font-family:var(--font-sans); font-weight:500;">
      <span class="btn-icon" id="color-btn-circle" style="width:12px; height:12px; border-radius:50%; background:#7e6cf0; margin-right:4.2px; display:inline-block; border:1px solid rgba(0,0,0,0.1);"></span>
      <span class="btn-text">Color</span>
      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4.2px; color:var(--text-light);"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div class="dropdown-menu" id="color-dropdown-menu" style="position:absolute; top:110%; left:0; z-index:1000; display:none; grid-template-columns:repeat(5, 1fr); gap:6.3px; background:#ffffff; border:1px solid var(--border-color); border-radius:6.3px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); padding:8.4px; min-width:145px;">
      <button class="color-dot active" data-color="#7e6cf0" style="width:20px; height:20px; border-radius:50%; border:2px solid var(--primary); background:#7e6cf0; cursor:pointer; padding:0; box-sizing:border-box;"></button>
      <button class="color-dot" data-color="#000000" style="width:20px; height:20px; border-radius:50%; border:1px solid var(--border-color); background:#000000; cursor:pointer; padding:0; box-sizing:border-box;"></button>
      <button class="color-dot" data-color="#ef4444" style="width:20px; height:20px; border-radius:50%; border:1px solid var(--border-color); background:#ef4444; cursor:pointer; padding:0; box-sizing:border-box;"></button>
      <button class="color-dot" data-color="#2563eb" style="width:20px; height:20px; border-radius:50%; border:1px solid var(--border-color); background:#2563eb; cursor:pointer; padding:0; box-sizing:border-box;"></button>
      <button class="color-dot" data-color="#10b981" style="width:20px; height:20px; border-radius:50%; border:1px solid var(--border-color); background:#10b981; cursor:pointer; padding:0; box-sizing:border-box;"></button>
    </div>
  </div>

  <div style="height:15px; width:1px; background:var(--border-color);"></div>

  <!-- Size Picker -->
  <div class="size-picker" style="display:flex; gap:6.3px; align-items:center;">
    <button class="size-btn active" data-size="3" style="padding:2.1px 6.3px; font-size:10.5px; border-radius:4.2px; border:1px solid var(--border-color); background:var(--primary-light); color:var(--primary); cursor:pointer; font-family:var(--font-sans); font-weight:600;">S</button>
    <button class="size-btn" data-size="6" style="padding:2.1px 6.3px; font-size:10.5px; border-radius:4.2px; border:1px solid var(--border-color); background:#ffffff; color:var(--text-muted); cursor:pointer; font-family:var(--font-sans); font-weight:600;">M</button>
    <button class="size-btn" data-size="12" style="padding:2.1px 6.3px; font-size:10.5px; border-radius:4.2px; border:1px solid var(--border-color); background:#ffffff; color:var(--text-muted); cursor:pointer; font-family:var(--font-sans); font-weight:600;">L</button>
  </div>

  <div style="flex-grow:1;"></div>

  <!-- Clear Button -->
  <button class="clear-btn" style="display:flex; align-items:center; padding:4.2px 10.5px; font-size:12px; border-radius:15.8px; border:1px solid var(--border-color); background:#ffffff; color:var(--text-muted); cursor:pointer; font-weight:500; font-family:var(--font-sans);">
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4.2px; color:var(--text-muted);"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
    Clear
  </button>
\`;

const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = block.data.height || 250;
canvas.style.background = '#ffffff';
canvas.style.border = '1px solid var(--border-color)';
canvas.style.borderRadius = '6.3px';
canvas.style.cursor = 'crosshair';
canvas.style.touchAction = 'none';
canvas.style.width = '100%';
canvas.style.height = 'auto';
canvas.style.display = 'block';

const ctx = canvas.getContext('2d');
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = '#7e6cf0';

if (block.data.image) {
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0);
  img.src = block.data.image;
}

let drawing = false;
let startPos = null;
let snapshot = null;

let activePen = 'brush'; // brush, fountain, pencil
let activeShape = 'none'; // none, line, rect, circle
let currentColor = '#7e6cf0';
let currentSize = 3;

// Fountain Pen variables
let lastX = 0;
let lastY = 0;
let lastTime = 0;

const getPos = (e) => {
  return {
    x: e.offsetX * (canvas.width / canvas.clientWidth),
    y: e.offsetY * (canvas.height / canvas.clientHeight)
  };
};

// Dropdowns logic
const toggleDropdown = (btn, menu) => {
  const isVisible = menu.style.display === 'flex' || menu.style.display === 'grid';
  toolbar.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
  if (!isVisible) {
    menu.style.display = menu.id === 'color-dropdown-menu' ? 'grid' : 'flex';
  }
};

const penSelectBtn = toolbar.querySelector('#pen-select-btn');
const penMenu = toolbar.querySelector('#pen-dropdown-menu');
penSelectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(penSelectBtn, penMenu);
});

const shapeSelectBtn = toolbar.querySelector('#shape-select-btn');
const shapeMenu = toolbar.querySelector('#shape-dropdown-menu');
shapeSelectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(shapeSelectBtn, shapeMenu);
});

const colorSelectBtn = toolbar.querySelector('#color-select-btn');
const colorMenu = toolbar.querySelector('#color-dropdown-menu');
colorSelectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(colorSelectBtn, colorMenu);
});

document.addEventListener('click', () => {
  toolbar.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
});

// Dropdowns Options selections
penMenu.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    penMenu.querySelectorAll('.dropdown-item').forEach(i => {
      i.classList.remove('active');
      i.style.background = 'transparent';
      i.style.color = 'var(--text-muted)';
    });
    item.classList.add('active');
    item.style.background = 'var(--primary-light)';
    item.style.color = 'var(--primary)';
    
    activePen = item.getAttribute('data-pen');
    
    // Update button text
    const label = item.textContent.trim();
    penSelectBtn.querySelector('.btn-text').textContent = 'Pen: ' + label;
    penMenu.style.display = 'none';
  });
});

shapeMenu.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    shapeMenu.querySelectorAll('.dropdown-item').forEach(i => {
      i.classList.remove('active');
      i.style.background = 'transparent';
      i.style.color = 'var(--text-muted)';
    });
    item.classList.add('active');
    item.style.background = 'var(--primary-light)';
    item.style.color = 'var(--primary)';
    
    activeShape = item.getAttribute('data-shape');
    
    // Update button text
    const label = item.textContent.trim();
    shapeSelectBtn.querySelector('.btn-text').textContent = activeShape === 'none' ? 'Draw: Freehand' : 'Draw: ' + label;
    shapeMenu.style.display = 'none';
  });
});

colorMenu.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    colorMenu.querySelectorAll('.color-dot').forEach(d => {
      d.classList.remove('active');
      d.style.border = '1px solid var(--border-color)';
    });
    dot.classList.add('active');
    dot.style.border = '2.1px solid var(--primary)';
    
    currentColor = dot.getAttribute('data-color');
    ctx.strokeStyle = currentColor;
    toolbar.querySelector('#color-btn-circle').style.background = currentColor;
    colorMenu.style.display = 'none';
  });
});



// Size Picker
toolbar.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    toolbar.querySelectorAll('.size-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = '#ffffff';
      b.style.color = 'var(--text-muted)';
    });
    btn.classList.add('active');
    btn.style.background = 'var(--primary-light)';
    btn.style.color = 'var(--primary)';
    currentSize = parseInt(btn.getAttribute('data-size'), 10);
    ctx.lineWidth = currentSize;
  });
});

// Drawing Engine
canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  startPos = getPos(e);
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = currentColor;
  ctx.globalAlpha = activePen === 'pencil' ? 0.55 : 1.0;
  ctx.lineWidth = activePen === 'pencil' ? Math.max(1.5, currentSize / 2) : currentSize;
  
  if (activePen === 'fountain') {
    lastX = startPos.x;
    lastY = startPos.y;
    lastTime = Date.now();
  } else if (activeShape === 'none') {
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const pos = getPos(e);
  
  if (activeShape === 'none') {
    if (activePen === 'fountain') {
      const now = Date.now();
      const dt = now - lastTime || 1;
      const dist = Math.sqrt(Math.pow(pos.x - lastX, 2) + Math.pow(pos.y - lastY, 2));
      const speed = dist / dt;
      const targetWidth = Math.max(1.2, currentSize * (1 - Math.min(speed * 0.18, 0.75)));
      ctx.lineWidth = ctx.lineWidth * 0.5 + targetWidth * 0.5;

      const dx = Math.cos(Math.PI / 4) * ctx.lineWidth / 2;
      const dy = Math.sin(Math.PI / 4) * ctx.lineWidth / 2;

      ctx.fillStyle = currentColor;
      ctx.beginPath();
      ctx.moveTo(lastX - dx, lastY - dy);
      ctx.lineTo(pos.x - dx, pos.y - dy);
      ctx.lineTo(pos.x + dx, pos.y + dy);
      ctx.lineTo(lastX + dx, lastY + dy);
      ctx.closePath();
      ctx.fill();

      lastX = pos.x;
      lastY = pos.y;
      lastTime = now;
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  } else {
    ctx.putImageData(snapshot, 0, 0);
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.globalAlpha = activePen === 'pencil' ? 0.55 : 1.0;
    ctx.lineWidth = activePen === 'pencil' ? Math.max(1.5, currentSize / 2) : currentSize;
    
    if (activeShape === 'line') {
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (activeShape === 'rect') {
      ctx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      ctx.stroke();
    } else if (activeShape === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
});

const stopDrawing = () => {
  if (!drawing) return;
  drawing = false;
  block.data.image = canvas.toDataURL();
  save();
};

canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

toolbar.querySelector('.clear-btn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  block.data.image = '';
  save();
});

// Height Resizing Logic
const resizeHandle = document.createElement('div');
resizeHandle.className = 'canvas-bottom-resize-handle';

let isResizing = false;
let startY = 0;
let startHeight = 0;

resizeHandle.addEventListener('mousedown', (e) => {
  e.preventDefault();
  isResizing = true;
  startY = e.clientY;
  startHeight = canvas.offsetHeight;

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.cursor = 'ns-resize';
  overlay.style.zIndex = '99999';
  document.body.appendChild(overlay);

  const onMouseMove = (moveEvent) => {
    if (!isResizing) return;
    const deltaY = moveEvent.clientY - startY;
    const newHeight = Math.max(120, Math.min(800, startHeight + deltaY));
    canvas.style.height = newHeight + 'px';
  };

  const onMouseUp = () => {
    isResizing = false;
    document.body.removeChild(overlay);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    const finalHeight = canvas.offsetHeight;
    const currentWidth = canvas.clientWidth || 600;
    const finalBackingHeight = Math.round(finalHeight * (600 / currentWidth));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

    canvas.height = finalBackingHeight;
    canvas.style.height = 'auto';

    ctx.drawImage(tempCanvas, 0, 0);

    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;

    block.data.height = finalBackingHeight;
    block.data.image = canvas.toDataURL();
    save();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
});

wrapper.appendChild(toolbar);
wrapper.appendChild(canvas);
wrapper.appendChild(resizeHandle);
container.appendChild(wrapper);`
  },
  {
    id: 'autocomplete',
    name: 'AI Autocomplete',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="plugin-svg-icon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    description: 'Provide real-time inline AI writing assistance using Groq cloud. Triggers automatically when you stop typing for 2 seconds. Press Tab to accept.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `container.innerHTML = '<div style="padding:13.2px; font-size:13.7px; color:var(--text-muted); background:#fafafa; border:1px solid rgba(0,0,0,0.05); border-radius:8.4px;">🤖 AI Autocomplete is active globally on all text blocks. Configure your Groq Cloud API Key in the settings panel above. Stop typing for 2 seconds to get suggestions, and press Tab to autocomplete.</div>';`
  },
  {
    id: 'image-widget',
    name: 'Image Uploader',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="plugin-svg-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    description: 'Upload, embed, and download images with formatted file size and previews.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `if (!block.data || typeof block.data !== 'object') {
  block.data = { image: '', name: '', size: 0 };
}
container.innerHTML = '';
const wrapper = document.createElement('div');
wrapper.style.position = 'relative';
wrapper.style.width = '100%';
wrapper.style.margin = '10.5px 0';
wrapper.style.borderRadius = '10.5px';
wrapper.style.border = '1px solid var(--border-color)';
wrapper.style.background = '#f8fafc';
wrapper.style.overflow = 'hidden';

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const renderEmpty = () => {
  const dropArea = document.createElement('div');
  dropArea.style.padding = '32px 20px';
  dropArea.style.textAlign = 'center';
  dropArea.style.cursor = 'pointer';
  dropArea.style.display = 'flex';
  dropArea.style.flexDirection = 'column';
  dropArea.style.alignItems = 'center';
  dropArea.style.gap = '10px';
  dropArea.style.color = 'var(--text-muted)';
  dropArea.innerHTML = '<svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg><div style="font-size:14px; font-weight:500; color:var(--text);">Click or drag image to upload</div><div style="font-size:12px;">Supports JPG, PNG, GIF, WebP</div>';
  
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });
  
  dropArea.addEventListener('click', () => fileInput.click());
  
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.background = 'var(--primary-light)';
  });
  
  dropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropArea.style.background = 'transparent';
  });
  
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.background = 'transparent';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFile(file);
      }
    }
  });
  
  wrapper.appendChild(dropArea);
  wrapper.appendChild(fileInput);
};

const handleFile = (file) => {
  if (!file) return;
  if (!file.type || !file.type.startsWith('image/')) {
    alert('Please select a valid image file (JPG, PNG, GIF, WebP).');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size exceeds the 5MB limit. Please upload a smaller image.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    block.data.image = e.target.result;
    block.data.name = escapeHTML(file.name);
    block.data.size = file.size;
    save();
    renderContent();
  };
  reader.readAsDataURL(file);
};

const renderContent = () => {
  wrapper.innerHTML = '';
  
  const imgWrapper = document.createElement('div');
  imgWrapper.style.width = '100%';
  imgWrapper.style.display = 'flex';
  imgWrapper.style.justifyContent = 'center';
  imgWrapper.style.background = 'rgba(0,0,0,0.02)';
  
  const img = document.createElement('img');
  img.src = block.data.image;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '600px';
  img.style.objectFit = 'contain';
  img.style.display = 'block';
  
  imgWrapper.appendChild(img);
  
  const metaBar = document.createElement('div');
  metaBar.style.display = 'flex';
  metaBar.style.alignItems = 'center';
  metaBar.style.padding = '8.4px 12.6px';
  metaBar.style.borderTop = '1px solid var(--border-color)';
  metaBar.style.background = '#ffffff';
  metaBar.style.gap = '10.5px';
  
  const thumb = document.createElement('img');
  thumb.src = block.data.image;
  thumb.style.width = '32px';
  thumb.style.height = '32px';
  thumb.style.borderRadius = '4.2px';
  thumb.style.objectFit = 'cover';
  thumb.style.border = '1px solid var(--border-color)';
  
  const info = document.createElement('div');
  info.style.flex = '1';
  info.style.display = 'flex';
  info.style.flexDirection = 'column';
  info.style.minWidth = '0';
  
  const nameEl = document.createElement('div');
  nameEl.textContent = block.data.name || 'image.png';
  nameEl.style.fontSize = '13px';
  nameEl.style.fontWeight = '500';
  nameEl.style.color = 'var(--text)';
  nameEl.style.whiteSpace = 'nowrap';
  nameEl.style.overflow = 'hidden';
  nameEl.style.textOverflow = 'ellipsis';
  
  const sizeEl = document.createElement('div');
  sizeEl.textContent = formatSize(block.data.size);
  sizeEl.style.fontSize = '11px';
  sizeEl.style.color = 'var(--text-muted)';
  
  info.appendChild(nameEl);
  info.appendChild(sizeEl);
  
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '6px';
  
  const downloadLink = document.createElement('a');
  downloadLink.href = block.data.image;
  downloadLink.download = block.data.name || 'image.png';
  downloadLink.title = 'Download';
  downloadLink.style.display = 'flex';
  downloadLink.style.alignItems = 'center';
  downloadLink.style.justifyContent = 'center';
  downloadLink.style.padding = '6px';
  downloadLink.style.borderRadius = '4.2px';
  downloadLink.style.color = 'var(--text-muted)';
  downloadLink.style.background = 'var(--primary-light)';
  downloadLink.style.cursor = 'pointer';
  downloadLink.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
  
  const deleteBtn = document.createElement('button');
  deleteBtn.title = 'Remove Image';
  deleteBtn.style.display = 'flex';
  deleteBtn.style.alignItems = 'center';
  deleteBtn.style.justifyContent = 'center';
  deleteBtn.style.padding = '6px';
  deleteBtn.style.borderRadius = '4.2px';
  deleteBtn.style.color = '#ef4444';
  deleteBtn.style.background = '#fef2f2';
  deleteBtn.style.border = 'none';
  deleteBtn.style.cursor = 'pointer';
  deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  
  deleteBtn.addEventListener('click', () => {
    block.data = { image: '', name: '', size: 0 };
    save();
    renderContent();
  });
  
  actions.appendChild(downloadLink);
  actions.appendChild(deleteBtn);
  
  metaBar.appendChild(thumb);
  metaBar.appendChild(info);
  metaBar.appendChild(actions);
  
  wrapper.appendChild(imgWrapper);
  wrapper.appendChild(metaBar);
};

if (block.data.image) {
  renderContent();
} else {
  renderEmpty();
}
container.appendChild(wrapper);`
  },
  {
    id: 'ai-chat',
    name: 'Chat with AI',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="plugin-svg-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    description: 'Chat with AI about your notes using Groq Cloud.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `container.innerHTML = '<div style="padding:13.2px; font-size:13.7px; color:var(--text-muted); background:#fafafa; border:1px solid rgba(0,0,0,0.05); border-radius:8.4px;">💬 Chat with AI is active. Click the chat button in the top right corner to chat about your notes.</div>';`
  }
];

export const db = {
  async init() {
    if (memoryState.workspaces !== null) return; // already initialized

    // Migration step from localStorage
    if (localStorage.getItem(WORKSPACES_KEY)) {
      try {
        memoryState.workspaces = JSON.parse(localStorage.getItem(WORKSPACES_KEY)) || [];
        memoryState.chapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY)) || [];
        memoryState.trash = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
        const pluginStr = localStorage.getItem(PLUGINS_KEY);
        memoryState.plugins = pluginStr ? JSON.parse(pluginStr) : [...DEFAULT_PLUGINS];

        await set(WORKSPACES_KEY, memoryState.workspaces);
        await set(CHAPTERS_KEY, memoryState.chapters);
        await set(TRASH_KEY, memoryState.trash);
        await set(PLUGINS_KEY, memoryState.plugins);

        localStorage.removeItem(WORKSPACES_KEY);
        localStorage.removeItem(CHAPTERS_KEY);
        localStorage.removeItem(TRASH_KEY);
        localStorage.removeItem(PLUGINS_KEY);
      } catch (e) {
        console.warn("Local storage migration parse failed:", e);
      }
    } else {
      memoryState.workspaces = await get(WORKSPACES_KEY) || [];
      memoryState.chapters = await get(CHAPTERS_KEY) || [];
      memoryState.trash = await get(TRASH_KEY) || [];
      memoryState.plugins = await get(PLUGINS_KEY);
    }
    memoryState.notifications = await get(NOTIFICATIONS_KEY) || [];
    memoryState.analytics = await get(ANALYTICS_KEY) || [];

    if (!memoryState.plugins) {
      memoryState.plugins = [...DEFAULT_PLUGINS];
      await set(PLUGINS_KEY, memoryState.plugins);
    } else {
      let updated = false;
      DEFAULT_PLUGINS.forEach(defaultP => {
        const idx = memoryState.plugins.findIndex(p => p.id === defaultP.id);
        if (idx >= 0) {
          if (defaultP.isBuiltIn) {
            if (!memoryState.plugins[idx].isBuiltIn) { memoryState.plugins[idx].isBuiltIn = true; updated = true; }
            if (memoryState.plugins[idx].renderCode !== defaultP.renderCode) { memoryState.plugins[idx].renderCode = defaultP.renderCode; updated = true; }
            if (memoryState.plugins[idx].name !== defaultP.name) { memoryState.plugins[idx].name = defaultP.name; updated = true; }
            if (memoryState.plugins[idx].description !== defaultP.description) { memoryState.plugins[idx].description = defaultP.description; updated = true; }
            if (memoryState.plugins[idx].icon !== defaultP.icon) { memoryState.plugins[idx].icon = defaultP.icon; updated = true; }
          }
        } else {
          memoryState.plugins.push(defaultP);
          updated = true;
        }
      });
      if (updated) {
        await set(PLUGINS_KEY, memoryState.plugins);
      }
    }

    // Migrate Groq Settings from localStorage if present
    const localApiKey = localStorage.getItem('intellinote_groq_api_key');
    if (localApiKey !== null) {
      memoryState.groq_api_key = localApiKey;
      await set('intellinote_groq_api_key', localApiKey);
      localStorage.removeItem('intellinote_groq_api_key');
    } else {
      memoryState.groq_api_key = await get('intellinote_groq_api_key') || '';
    }

    const localModelName = localStorage.getItem('intellinote_groq_model_name');
    if (localModelName !== null) {
      memoryState.groq_model_name = localModelName;
      await set('intellinote_groq_model_name', localModelName);
      localStorage.removeItem('intellinote_groq_model_name');
    } else {
      memoryState.groq_model_name = await get('intellinote_groq_model_name') || 'qwen/qwen3.6-27b';
    }

    const localChatModel = localStorage.getItem('intellinote_groq_chat_model_name');
    if (localChatModel !== null) {
      memoryState.groq_chat_model_name = localChatModel;
      await set('intellinote_groq_chat_model_name', localChatModel);
      localStorage.removeItem('intellinote_groq_chat_model_name');
    } else {
      memoryState.groq_chat_model_name = await get('intellinote_groq_chat_model_name') || 'meta-llama/llama-4-scout-17b-16e-instruct';
    }
  },

  getGroqApiKey() {
    return memoryState.groq_api_key || '';
  },

  async setGroqApiKey(value) {
    memoryState.groq_api_key = value;
    await set('intellinote_groq_api_key', value);
  },

  getGroqModelName() {
    return memoryState.groq_model_name || 'qwen/qwen3.6-27b';
  },

  async setGroqModelName(value) {
    memoryState.groq_model_name = value;
    await set('intellinote_groq_model_name', value);
  },

  getGroqChatModelName() {
    return memoryState.groq_chat_model_name || 'meta-llama/llama-4-scout-17b-16e-instruct';
  },

  async setGroqChatModelName(value) {
    memoryState.groq_chat_model_name = value;
    await set('intellinote_groq_chat_model_name', value);
  },

  // Workspaces
  getWorkspaces() {
    return memoryState.workspaces || [];
  },

  getWorkspace(id) {
    return this.getWorkspaces().find(w => w.id === id);
  },

  saveWorkspace(workspace) {
    const workspaces = this.getWorkspaces();
    const index = workspaces.findIndex(w => w.id === workspace.id);
    workspace.updatedAt = new Date().toISOString();
    
    if (workspace.starred === undefined) workspace.starred = false;
    
    if (index >= 0) { workspaces[index] = workspace; } 
    else { workspaces.push(workspace); }
    
    set(WORKSPACES_KEY, workspaces);
    return workspace;
  },

  saveWorkspacesOrder(workspacesList) {
    memoryState.workspaces = workspacesList;
    set(WORKSPACES_KEY, workspacesList);
  },

  deleteWorkspace(workspaceId) {
    memoryState.workspaces = this.getWorkspaces().filter(w => w.id !== workspaceId);
    set(WORKSPACES_KEY, memoryState.workspaces);

    const chapters = this.getChapters(workspaceId);
    chapters.forEach(c => this.deleteChapter(c.id));
  },

  // Chapters
  getChapters(workspaceId) {
    const chapters = memoryState.chapters || [];
    if (workspaceId) {
      return chapters.filter(c => c.workspaceId === workspaceId);
    }
    return chapters;
  },

  getChapter(id) {
    return (memoryState.chapters || []).find(c => c.id === id);
  },

  saveChapter(chapter) {
    const chapters = memoryState.chapters || [];
    const index = chapters.findIndex(c => c.id === chapter.id);
    chapter.updatedAt = new Date().toISOString();
    
    if (index >= 0) { chapters[index] = chapter; } 
    else { chapters.push(chapter); }
    
    set(CHAPTERS_KEY, chapters);
    
    const workspace = this.getWorkspace(chapter.workspaceId);
    if (workspace) {
      this.saveWorkspace(workspace);
    }
    return chapter;
  },

  saveChaptersOrder(chaptersList, workspaceId) {
    const allChapters = memoryState.chapters || [];
    const otherChapters = allChapters.filter(c => c.workspaceId !== workspaceId);
    memoryState.chapters = [...otherChapters, ...chaptersList];
    set(CHAPTERS_KEY, memoryState.chapters);
  },

  deleteChapter(id) {
    const chapters = memoryState.chapters || [];
    const chapterToDelete = chapters.find(c => c.id === id);
    if (!chapterToDelete) return;

    memoryState.chapters = chapters.filter(c => c.id !== id);
    set(CHAPTERS_KEY, memoryState.chapters);

    const trash = memoryState.trash || [];
    chapterToDelete.deletedAt = new Date().toISOString();
    trash.push(chapterToDelete);
    set(TRASH_KEY, trash);
  },

  // Trash (Recycle Bin)
  getTrash() {
    return memoryState.trash || [];
  },

  restoreChapter(id) {
    const trash = memoryState.trash || [];
    const chapterToRestore = trash.find(c => c.id === id);
    if (!chapterToRestore) return;

    memoryState.trash = trash.filter(c => c.id !== id);
    set(TRASH_KEY, memoryState.trash);

    delete chapterToRestore.deletedAt;
    const chapters = memoryState.chapters || [];
    chapters.push(chapterToRestore);
    set(CHAPTERS_KEY, chapters);
    return chapterToRestore;
  },

  permanentlyDeleteChapter(id) {
    const trash = memoryState.trash || [];
    memoryState.trash = trash.filter(c => c.id !== id);
    set(TRASH_KEY, memoryState.trash);
  },

  clearTrash() {
    memoryState.trash = [];
    set(TRASH_KEY, memoryState.trash);
  },

  // Plugins Manager Store
  getPlugins() {
    return memoryState.plugins || [];
  },

  savePlugin(plugin) {
    const plugins = this.getPlugins();
    const idx = plugins.findIndex(p => p.id === plugin.id);
    if (idx >= 0) { plugins[idx] = plugin; } 
    else { plugins.push(plugin); }
    
    set(PLUGINS_KEY, plugins);
    return plugin;
  },

  deletePlugin(id) {
    memoryState.plugins = this.getPlugins().filter(p => p.id !== id);
    set(PLUGINS_KEY, memoryState.plugins);
  },

  togglePlugin(id) {
    const plugins = this.getPlugins();
    const plugin = plugins.find(p => p.id === id);
    if (plugin) {
      plugin.enabled = !plugin.enabled;
      set(PLUGINS_KEY, plugins);
    }
    return plugin;
  },

  // Notifications
  getNotifications() {
    return memoryState.notifications || [];
  },
  
  addNotification(notification) {
    const notifications = this.getNotifications();
    notification.id = 'n-' + Math.random().toString(36).substr(2, 9);
    notification.timestamp = Date.now();
    notification.read = false;
    notifications.push(notification);
    memoryState.notifications = notifications;
    set(NOTIFICATIONS_KEY, notifications);
    
    if (typeof window.loopOnNotificationAdded === 'function') {
      window.loopOnNotificationAdded(notification);
    }
  },
  
  markAllNotificationsRead() {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.read = true);
    memoryState.notifications = notifications;
    set(NOTIFICATIONS_KEY, notifications);
    
    if (typeof window.loopOnNotificationAdded === 'function') {
      window.loopOnNotificationAdded();
    }
  },
  
  clearNotifications() {
    memoryState.notifications = [];
    set(NOTIFICATIONS_KEY, []);
    
    if (typeof window.loopOnNotificationAdded === 'function') {
      window.loopOnNotificationAdded();
    }
  },

  // Persistent Analytics Manager
  getAnalytics() {
    return memoryState.analytics || [];
  },

  addAnalyticsSession(session) {
    const analytics = this.getAnalytics();
    // Ensure unique ID for deletion
    if (!session.id) {
      session.id = 'a-' + Math.random().toString(36).substr(2, 9);
    }
    analytics.push(session);
    memoryState.analytics = analytics;
    set(ANALYTICS_KEY, analytics);
  },

  deleteAnalyticsSession(id) {
    memoryState.analytics = this.getAnalytics().filter(s => s.id !== id);
    set(ANALYTICS_KEY, memoryState.analytics);
  },

  // Pomodoro & Habits Data
  async getPomodoroData() {
    return await get('intellinote_pomodoro_data') || {
      timerConfig: { focusDuration: 1500, shortBreakDuration: 300, longBreakDuration: 900, cyclesTarget: 4, autoTransitions: false },
      dailyTarget: 6,
      completedTodayCount: 4,
      lastSessionDate: new Date().toDateString(),
      sessions: [], // start raw
      tasks: [
        {
          id: 't-1',
          name: 'Foundation Tokens',
          status: 'in_progress',
          parentId: null,
          tags: ['Design System', 'Urgent'],
          timeSpent: 15300
        },
        {
          id: 't-1a',
          name: 'Define Color Palette (Light/Dark)',
          status: 'completed',
          parentId: 't-1',
          tags: [],
          timeSpent: 9000
        },
        {
          id: 't-1b',
          name: 'Typography Hierarchy',
          status: 'in_progress',
          parentId: 't-1',
          tags: [],
          timeSpent: 0,
          description: 'Map out base sizes, line heights, and weights for desktop and mobile.'
        },
        {
          id: 't-2',
          name: 'Component Library Audit',
          status: 'pending',
          parentId: null,
          tags: ['Design System'],
          timeSpent: 0,
          dueDate: 'Oct 15'
        },
        {
          id: 't-next-1',
          name: 'Define Typography Tokens',
          status: 'pending',
          parentId: null,
          tags: ['Design System'],
          timeSpent: 0,
          description: 'Map out font families and sizes for headers and body text.'
        },
        {
          id: 't-next-2',
          name: 'Create Color Palette',
          status: 'pending',
          parentId: null,
          tags: ['Design System'],
          timeSpent: 0,
          description: 'Establish primary, secondary, and neutral scales.'
        },
        {
          id: 't-next-3',
          name: 'Draft Component States',
          status: 'pending',
          parentId: null,
          tags: ['Design System'],
          timeSpent: 0,
          description: 'Hover, active, and disabled states for buttons.'
        }
      ],
      habits: [
        {
          id: 'h-1',
          name: 'Hydration',
          type: 'positive',
          frequency: 'daily',
          logs: {
            [new Date().toDateString()]: true,
            [new Date(Date.now() - 86400000).toDateString()]: true,
            [new Date(Date.now() - 172800000).toDateString()]: true,
            [new Date(Date.now() - 259200000).toDateString()]: true
          },
          streak: 4,
          bestStreak: 24
        },
        {
          id: 'h-2',
          name: 'Read 20 pages',
          type: 'positive',
          frequency: 'daily',
          logs: {},
          streak: 0,
          bestStreak: 12
        },
        {
          id: 'h-3',
          name: 'Stretching',
          type: 'positive',
          frequency: 'daily',
          logs: {},
          streak: 0,
          bestStreak: 3
        }
      ],
      distractionLogs: []
    };
  },
  async savePomodoroData(data) {
    await set('intellinote_pomodoro_data', data);
  }
};
