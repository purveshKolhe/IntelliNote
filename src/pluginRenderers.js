// Auto-generated Plugin Renderers for IntelliNote
import { escapeHTML, sanitizeHTML } from './security.js';

export const PLUGIN_RENDERERS = {
  'youtube-widget': (block, index, container, editor, save, db) => {
if (!block.data || typeof block.data !== 'object') {
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
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

const renderVideo = (url) => {
  const videoId = getYoutubeId(url);
  if (videoId) {
    iframeContainer.innerHTML = `<iframe width="100%" height="360" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border: none; display: block; width: 100%; border-radius: 8.4px;"></iframe>`;
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

  },
  'timer-widget': (block, index, container, editor, save, db) => {
    container.innerHTML = `<div style="padding:16.8px; text-align:center; background:var(--primary-light); color:var(--primary); border-radius:8.4px; font-weight:500; font-family:var(--font-sans);">🍅 The Pomodoro & Habits feature has been upgraded to a full dashboard! Access it from the primary sidebar on the left.</div>`;
  },
  'sketch-widget': (block, index, container, editor, save, db) => {
if (!block.data || typeof block.data !== 'object') {
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
toolbar.innerHTML = `
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
`;

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
container.appendChild(wrapper);
  },
  'autocomplete': (block, index, container, editor, save, db) => {
container.innerHTML = '<div style="padding:13.2px; font-size:13.7px; color:var(--text-muted); background:#fafafa; border:1px solid rgba(0,0,0,0.05); border-radius:8.4px;">🤖 AI Autocomplete is active globally on all text blocks. Configure your Groq Cloud API Key in the settings panel above. Stop typing for 2 seconds to get suggestions, and press Tab to autocomplete.</div>';
  },
  'image-widget': (block, index, container, editor, save, db) => {
if (!block.data || typeof block.data !== 'object') {
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
  if (!file.type.startsWith('image/')) {
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
container.appendChild(wrapper);
  },
  'ai-chat': (block, index, container, editor, save, db) => {
container.innerHTML = '<div style="padding:13.2px; font-size:13.7px; color:var(--text-muted); background:#fafafa; border:1px solid rgba(0,0,0,0.05); border-radius:8.4px;">💬 Chat with AI is active. Click the chat button in the top right corner to chat about your notes.</div>';
  },
};
