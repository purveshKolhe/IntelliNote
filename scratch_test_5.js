const renderCode = `if (!block.data || typeof block.data !== 'object') {
  block.data = { url: '', fileName: '', fileSize: '' };
}
container.innerHTML = '';
const wrapper = document.createElement('div');
wrapper.style.padding = '12px';
wrapper.style.background = '#f8fafc';
wrapper.style.border = '1px solid var(--border-color)';
wrapper.style.borderRadius = '10px';
wrapper.style.margin = '10px 0';
wrapper.style.display = 'flex';
wrapper.style.flexDirection = 'column';
wrapper.style.gap = '10px';
wrapper.style.width = '100%';

const formatBytes = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

if (!block.data.url) {
  const dropzone = document.createElement('div');
  dropzone.style.border = '2px dashed var(--border-color)';
  dropzone.style.borderRadius = '8px';
  dropzone.style.padding = '30px';
  dropzone.style.display = 'flex';
  dropzone.style.flexDirection = 'column';
  dropzone.style.alignItems = 'center';
  dropzone.style.justifyContent = 'center';
  dropzone.style.gap = '10px';
  dropzone.style.cursor = 'pointer';
  dropzone.style.background = '#ffffff';
  dropzone.style.transition = 'all 0.15s ease';
  
  dropzone.innerHTML = \`
    <svg viewBox="0 0 24 24" width="36" height="36" stroke="var(--primary)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
    <div style="font-size: 13.6px; font-weight: 500; color: var(--text-main);">Drag & drop an image here, or <span style="color: var(--primary); font-weight: 600;">browse</span></div>
    <div style="font-size: 11px; color: var(--text-muted);">Supports PNG, JPG, JPEG, GIF, SVG, WebP</div>
    <input type="file" accept="image/*" style="display: none;" />
  \`;
  
  const fileInput = dropzone.querySelector('input[type="file"]');
  
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      block.data.url = e.target.result;
      block.data.fileName = file.name;
      block.data.fileSize = formatBytes(file.size);
      save();
      const renderFn = new Function('block', 'index', 'container', 'editor', 'save', 'db', db.getPlugins().find(p => p.id === 'image-widget').renderCode);
      renderFn(block, index, container, editor, save, db);
    };
    reader.readAsDataURL(file);
  };
  
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    dropzone.style.background = 'var(--primary-light)';
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.background = '#ffffff';
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.background = '#ffffff';
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  wrapper.appendChild(dropzone);
} else {
  const imgEl = document.createElement('img');
  imgEl.src = block.data.url;
  imgEl.style.maxWidth = '100%';
  imgEl.style.borderRadius = '8px';
  imgEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
  imgEl.style.display = 'block';
  
  const metaBar = document.createElement('div');
  metaBar.style.display = 'flex';
  metaBar.style.alignItems = 'center';
  metaBar.style.gap = '10px';
  metaBar.style.padding = '8.4px 12px';
  metaBar.style.background = '#ffffff';
  metaBar.style.border = '1px solid var(--border-color)';
  metaBar.style.borderRadius = '6px';
  metaBar.style.boxSizing = 'border-box';
  
  const thumb = document.createElement('div');
  thumb.style.width = '36px';
  thumb.style.height = '36px';
  thumb.style.borderRadius = '4px';
  thumb.style.background = \`url('\${block.data.url}') center/cover no-repeat\`;
  thumb.style.border = '1px solid var(--border-color)';
  thumb.style.flexShrink = '0';
  thumb.style.cursor = 'pointer';
  
  thumb.addEventListener('click', () => {
    const lightbox = document.createElement('div');
    lightbox.style.position = 'fixed';
    lightbox.style.top = '0';
    lightbox.style.left = '0';
    lightbox.style.width = '100vw';
    lightbox.style.height = '100vh';
    lightbox.style.background = 'rgba(0,0,0,0.85)';
    lightbox.style.display = 'flex';
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
    lightbox.style.zIndex = '999999';
    lightbox.style.cursor = 'zoom-out';
    lightbox.innerHTML = \`<img src="\${block.data.url}" style="max-width:90%; max-height:90%; border-radius:8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" />\`;
    lightbox.addEventListener('click', () => document.body.removeChild(lightbox));
    document.body.appendChild(lightbox);
  });
  
  const info = document.createElement('div');
  info.style.display = 'flex';
  info.style.flexDirection = 'column';
  info.style.overflow = 'hidden';
  info.style.flexGrow = '1';
  
  const nameEl = document.createElement('div');
  nameEl.textContent = block.data.fileName || 'embedded_image.png';
  nameEl.style.fontSize = '12.6px';
  nameEl.style.fontWeight = '500';
  nameEl.style.color = 'var(--text-main)';
  nameEl.style.whiteSpace = 'nowrap';
  nameEl.style.overflow = 'hidden';
  nameEl.style.textOverflow = 'ellipsis';
  
  const sizeEl = document.createElement('div');
  sizeEl.textContent = block.data.fileSize || '0 Bytes';
  sizeEl.style.fontSize = '11px';
  sizeEl.style.color = 'var(--text-muted)';
  
  info.appendChild(nameEl);
  info.appendChild(sizeEl);
  
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.alignItems = 'center';
  actions.style.gap = '6px';
  actions.style.flexShrink = '0';
  
  const dlLink = document.createElement('a');
  dlLink.href = block.data.url;
  dlLink.download = block.data.fileName || 'download.png';
  dlLink.style.display = 'flex';
  dlLink.style.alignItems = 'center';
  dlLink.style.justifyContent = 'center';
  dlLink.style.width = '28px';
  dlLink.style.height = '28px';
  dlLink.style.borderRadius = '4px';
  dlLink.style.border = '1px solid var(--border-color)';
  dlLink.style.background = '#ffffff';
  dlLink.style.color = 'var(--text-muted)';
  dlLink.style.cursor = 'pointer';
  dlLink.style.transition = 'all 0.15s ease';
  dlLink.title = 'Download image';
  dlLink.innerHTML = \`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>\`;
  
  dlLink.addEventListener('mouseenter', () => {
    dlLink.style.background = 'var(--primary-light)';
    dlLink.style.color = 'var(--primary)';
    dlLink.style.borderColor = 'var(--primary)';
  });
  dlLink.addEventListener('mouseleave', () => {
    dlLink.style.background = '#ffffff';
    dlLink.style.color = 'var(--text-muted)';
    dlLink.style.borderColor = 'var(--border-color)';
  });
  
  const delBtn = document.createElement('button');
  delBtn.style.display = 'flex';
  delBtn.style.alignItems = 'center';
  delBtn.style.justifyContent = 'center';
  delBtn.style.width = '28px';
  delBtn.style.height = '28px';
  delBtn.style.borderRadius = '4px';
  delBtn.style.border = '1px solid var(--border-color)';
  delBtn.style.background = '#ffffff';
  delBtn.style.color = 'var(--text-muted)';
  delBtn.style.cursor = 'pointer';
  delBtn.style.transition = 'all 0.15s ease';
  delBtn.title = 'Delete image';
  delBtn.innerHTML = \`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>\`;
  
  delBtn.addEventListener('mouseenter', () => {
    delBtn.style.background = '#fef2f2';
    delBtn.style.color = '#ef4444';
    delBtn.style.borderColor = 'rgba(239,68,68,0.2)';
  });
  delBtn.addEventListener('mouseleave', () => {
    delBtn.style.background = '#ffffff';
    delBtn.style.color = 'var(--text-muted)';
    delBtn.style.borderColor = 'var(--border-color)';
  });
  
  delBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this image?')) {
      block.data.url = '';
      block.data.fileName = '';
      block.data.fileSize = '';
      save();
      const renderFn = new Function('block', 'index', 'container', 'editor', 'save', 'db', db.getPlugins().find(p => p.id === 'image-widget').renderCode);
      renderFn(block, index, container, editor, save, db);
    }
  });
  
  actions.appendChild(dlLink);
  actions.appendChild(delBtn);
  
  metaBar.appendChild(thumb);
  metaBar.appendChild(info);
  metaBar.appendChild(actions);
  
  wrapper.appendChild(imgEl);
  wrapper.appendChild(metaBar);
}

container.appendChild(wrapper);`;

try {
  new Function('block', 'index', 'container', 'editor', 'save', 'db', renderCode);
  console.log("Successfully compiled Image Uploader code!");
} catch (e) {
  console.error("Compile Error:", e);
}
