// Local Database Manager using localStorage

const WORKSPACES_KEY = 'intellinote_workspaces';
const CHAPTERS_KEY = 'intellinote_chapters';
const TRASH_KEY = 'intellinote_trash';
const PLUGINS_KEY = 'intellinote_plugins';

const DEFAULT_PLUGINS = [
  {
    id: 'youtube-widget',
    name: 'YouTube Embedder',
    icon: '🎥',
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
wrapper.style.margin = '10px 0';
wrapper.style.borderRadius = '10px';
wrapper.style.overflow = 'hidden';
wrapper.style.transition = 'all 0.2s ease';

const inputEl = document.createElement('input');
inputEl.type = 'text';
inputEl.placeholder = 'Paste YouTube video link...';
inputEl.value = block.data.url || '';
inputEl.style.width = '100%';
inputEl.style.padding = '10px 14px';
inputEl.style.border = '1px solid var(--border-color)';
inputEl.style.borderRadius = '8px';
inputEl.style.outline = 'none';
inputEl.style.fontSize = '14.5px';
inputEl.style.boxSizing = 'border-box';
inputEl.style.background = '#f8fafc';

const iframeContainer = document.createElement('div');
iframeContainer.style.width = '100%';
iframeContainer.style.borderRadius = '8px';
iframeContainer.style.overflow = 'hidden';
iframeContainer.style.display = 'none';

const changeBtn = document.createElement('button');
changeBtn.textContent = 'Change Video';
changeBtn.style.position = 'absolute';
changeBtn.style.top = '12px';
changeBtn.style.right = '12px';
changeBtn.style.padding = '6px 12px';
changeBtn.style.borderRadius = '20px';
changeBtn.style.background = 'rgba(15, 23, 42, 0.75)';
changeBtn.style.backdropFilter = 'blur(4px)';
changeBtn.style.color = '#ffffff';
changeBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
changeBtn.style.cursor = 'pointer';
changeBtn.style.fontSize = '12px';
changeBtn.style.fontWeight = '500';
changeBtn.style.opacity = '0';
changeBtn.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
changeBtn.style.transform = 'translateY(-5px)';
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
  changeBtn.style.transform = 'translateY(-5px)';
});

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^\"&?\\/\\s]{11})/);
  return match ? match[1] : null;
};

const renderVideo = (url) => {
  const videoId = getYoutubeId(url);
  if (videoId) {
    iframeContainer.innerHTML = \`<iframe width="100%" height="360" src="https://www.youtube.com/embed/\${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border: none; display: block; width: 100%; border-radius: 8px;"></iframe>\`;
    iframeContainer.style.display = 'block';
    inputEl.style.display = 'none';
    wrapper.style.padding = '0';
    wrapper.style.border = 'none';
    wrapper.style.background = 'transparent';
  } else {
    iframeContainer.innerHTML = '';
    iframeContainer.style.display = 'none';
    inputEl.style.display = 'block';
    wrapper.style.padding = '12px';
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
container.appendChild(wrapper);`
  },
  {
    id: 'timer-widget',
    name: 'Timer & Stopwatch',
    icon: '⏱️',
    description: 'Track sprint tasks, writing sessions, and timers inside your workspace.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `if (!block.data || typeof block.data !== 'object' || !block.data.tasks) {
  block.data = {
    tasks: [
      { id: 't-1', name: 'Task 1', completed: false, secondsLeft: 1500, totalSeconds: 1500, isRunning: false }
    ]
  };
}

container.innerHTML = '';
const blockId = block.id;
const chapterId = editor.chapter.id;

// Setup global timers manager if not exists
window.loopTimersManager = window.loopTimersManager || {
  intervals: {},
  listeners: {},
  activeContexts: {},
  pipBlockId: null,
  pipChapterId: null,
  
  registerListener(blockId, listenerId, cb) {
    this.listeners[blockId] = this.listeners[blockId] || {};
    this.listeners[blockId][listenerId] = cb;
  },
  
  unregisterListener(blockId, listenerId) {
    if (this.listeners[blockId]) {
      delete this.listeners[blockId][listenerId];
    }
  },
  
  notifyListeners(blockId) {
    if (this.listeners[blockId]) {
      Object.values(this.listeners[blockId]).forEach(cb => {
        try { cb(); } catch(e) {}
      });
    }
    if (this.pipBlockId === blockId && typeof window.loopUpdatePipUI === 'function') {
      window.loopUpdatePipUI();
    }
  },
  
  startTimer(chapterId, blockId, taskId, db) {
    const key = blockId + '_' + taskId;
    if (this.intervals[key]) return;
    
    const dbInstance = this.db || db;
    this.updateTaskState(chapterId, blockId, taskId, { isRunning: true }, dbInstance);
    
    this.intervals[key] = setInterval(() => {
      const activeCtx = this.activeContexts && this.activeContexts[blockId];
      const isContextValid = activeCtx && activeCtx.editor && document.body.contains(activeCtx.editor.container);
      let task = null;
      
      if (isContextValid && activeCtx.block && activeCtx.block.data && activeCtx.block.data.tasks) {
        task = activeCtx.block.data.tasks.find(t => t.id === taskId);
        if (task) {
          if (task.secondsLeft > 0) {
            task.secondsLeft--;
            activeCtx.save();
            this.notifyListeners(blockId);
          } else {
            this.stopTimer(chapterId, blockId, taskId, dbInstance);
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
              audio.volume = 0.5;
              audio.play();
            } catch(err) {}
            alert('Time is up for task: ' + task.name);
          }
        } else {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
        }
      } else {
        const chapter = dbInstance.getChapter(chapterId);
        if (!chapter) {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
          return;
        }
        const dbBlock = chapter.blocks.find(b => b.id === blockId);
        if (!dbBlock || !dbBlock.data || !dbBlock.data.tasks) {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
          return;
        }
        task = dbBlock.data.tasks.find(t => t.id === taskId);
        if (task) {
          if (task.secondsLeft > 0) {
            task.secondsLeft--;
            dbInstance.saveChapter(chapter);
            this.notifyListeners(blockId);
          } else {
            this.stopTimer(chapterId, blockId, taskId, dbInstance);
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
              audio.volume = 0.5;
              audio.play();
            } catch(err) {}
            alert('Time is up for task: ' + task.name);
          }
        } else {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
        }
      }
    }, 1000);
    
    this.notifyListeners(blockId);
  },
  
  stopTimer(chapterId, blockId, taskId, db) {
    const key = blockId + '_' + taskId;
    if (this.intervals[key]) {
      clearInterval(this.intervals[key]);
      delete this.intervals[key];
    }
    const dbInstance = this.db || db;
    this.updateTaskState(chapterId, blockId, taskId, { isRunning: false }, dbInstance);
    this.notifyListeners(blockId);
  },
  
  updateTaskState(chapterId, blockId, taskId, updates, db) {
    const activeCtx = this.activeContexts && this.activeContexts[blockId];
    const isContextValid = activeCtx && activeCtx.editor && document.body.contains(activeCtx.editor.container);
    
    if (isContextValid && activeCtx.block && activeCtx.block.data && activeCtx.block.data.tasks) {
      const task = activeCtx.block.data.tasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        activeCtx.save();
      }
    } else {
      const dbInstance = this.db || db;
      const chapter = dbInstance.getChapter(chapterId);
      if (!chapter) return;
      const block = chapter.blocks.find(b => b.id === blockId);
      if (!block || !block.data || !block.data.tasks) return;
      const task = block.data.tasks.find(t => t.id === taskId);
      if (!task) return;
      
      Object.assign(task, updates);
      dbInstance.saveChapter(chapter);
    }
  }
};

window.loopTimersManager.db = db;
window.loopTimersManager.activeContexts = window.loopTimersManager.activeContexts || {};
window.loopTimersManager.activeContexts[blockId] = {
  block: block,
  editor: editor,
  save: save
};

// SVG icons
const playIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="display:block;"><path d="M8 5v14l11-7z"/></svg>';
const pauseIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="display:block;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const resetIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>';
const trashIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
const pipIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: -2px; display:inline-block;"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><rect x="13" y="13" width="7" height="7" fill="currentColor"></rect></svg>';
const plusIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: -1px; display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
const minIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:block;"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
const closeIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
const timerIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6px; display:inline-block;"><circle cx="12" cy="13" r="8"></circle><polyline points="12 9 12 13 14 15"></polyline><line x1="12" y1="5" x2="12" y2="2"></line></svg>';
const timerIconLarge = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4px; display:block;"><circle cx="12" cy="13" r="8"></circle><polyline points="12 9 12 13 14 15"></polyline><line x1="12" y1="5" x2="12" y2="2"></line></svg>';

// Setup Styles once
if (!document.getElementById('loop-timer-pip-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'loop-timer-pip-styles';
  styleEl.textContent = \`
    .loop-pip-panel {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 320px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 16px;
      box-shadow: 0 12px 30px -4px rgba(124, 58, 237, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .loop-pip-header {
      padding: 12px 16px;
      background: rgba(124, 58, 237, 0.05);
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      user-select: none;
    }
    
    .loop-pip-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
    }
    
    .loop-pip-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .loop-pip-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: none;
      background: rgba(226, 232, 240, 0.6);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s;
      padding: 0;
    }
    
    .loop-pip-btn:hover {
      background: rgba(124, 58, 237, 0.1);
      color: var(--primary);
    }
    
    .loop-pip-body {
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .loop-pip-task {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px;
      border-radius: 8px;
      background: rgba(248, 250, 252, 0.6);
      border: 1px solid rgba(226, 232, 240, 0.5);
    }
    
    .loop-pip-task-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    
    .loop-pip-task-input {
      border: none;
      background: transparent;
      font-size: 13px;
      color: var(--text-main);
      width: 100%;
      outline: none;
      font-family: var(--font-sans);
    }
    
    .loop-pip-task-input:focus {
      border-bottom: 1px solid var(--primary);
    }
    
    .loop-pip-task-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .loop-pip-time {
      font-size: 13px;
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--primary);
      min-width: 42px;
      text-align: right;
    }
    
    .loop-pip-bubble-mode {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--loop-purple-gradient);
      box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.5);
      border: 2px solid #ffffff;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }
    
    .loop-pip-bubble-mode .loop-pip-header,
    .loop-pip-bubble-mode .loop-pip-body {
      display: none !important;
    }
    
    .loop-pip-bubble-content {
      display: none;
      color: #ffffff;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }
    
    .loop-pip-bubble-mode .loop-pip-bubble-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    
    .loop-pip-bubble-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: var(--primary);
      opacity: 0.4;
      animation: loop-pulse-ring 2s infinite;
      z-index: -1;
      display: none;
    }
    
    .loop-pip-bubble-mode .loop-pip-bubble-pulse.active {
      display: block;
    }
    
    @keyframes loop-pulse-ring {
      0% { transform: scale(0.95); opacity: 0.5; }
      50% { transform: scale(1.15); opacity: 0.2; }
      100% { transform: scale(1.3); opacity: 0; }
    }
    
    /* Premium Block/PIP Control Buttons styling (No Emoji) */
    .loop-timer-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(226, 232, 240, 0.8);
      background: #ffffff;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 0;
    }
    
    .loop-timer-btn:hover {
      background: rgba(124, 58, 237, 0.05);
      color: var(--primary);
      border-color: rgba(124, 58, 237, 0.3);
    }
    
    .loop-timer-btn-primary {
      background: var(--primary-light);
      color: var(--primary);
      border-color: rgba(124, 58, 237, 0.2);
    }
    
    .loop-timer-btn-primary:hover {
      background: var(--primary-light-active);
      color: var(--primary-hover);
    }
    
    .loop-timer-btn svg {
      display: block;
    }
  \`;
  document.head.appendChild(styleEl);
}

// Dragging Logic
const makeDraggable = (elm, handle) => {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    if (e.target.closest('.loop-pip-btn') || e.target.closest('input') || e.target.closest('button')) {
      return;
    }
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    let newTop = elm.offsetTop - pos2;
    let newLeft = elm.offsetLeft - pos1;
    
    const pad = 10;
    if (newTop < pad) newTop = pad;
    if (newTop > window.innerHeight - elm.offsetHeight - pad) {
      newTop = window.innerHeight - elm.offsetHeight - pad;
    }
    if (newLeft < pad) newLeft = pad;
    if (newLeft > window.innerWidth - elm.offsetWidth - pad) {
      newLeft = window.innerWidth - elm.offsetWidth - pad;
    }
    
    elm.style.top = newTop + "px";
    elm.style.left = newLeft + "px";
    elm.style.bottom = 'auto';
    elm.style.right = 'auto';
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
};

// Global PIP UI Update Function
window.loopUpdatePipUI = () => {
  let pip = document.getElementById('loop-timer-pip-panel');
  
  const currentBlockId = window.loopTimersManager.pipBlockId;
  const currentChapterId = window.loopTimersManager.pipChapterId;
  if (!currentBlockId || !currentChapterId) {
    if (pip) pip.remove();
    return;
  }
  
  const dbInstance = window.loopTimersManager.db || db;
  const chapter = dbInstance.getChapter(currentChapterId);
  if (!chapter) {
    if (pip) pip.remove();
    return;
  }
  
  // Find block in active context (live memory) first, otherwise fall back to DB
  let currentBlock = null;
  const activeCtx = window.loopTimersManager.activeContexts && window.loopTimersManager.activeContexts[currentBlockId];
  const isContextValid = activeCtx && activeCtx.editor && document.body.contains(activeCtx.editor.container);
  
  if (isContextValid && activeCtx.block) {
    currentBlock = activeCtx.block;
  } else {
    currentBlock = chapter.blocks.find(b => b.id === currentBlockId);
  }
  
  if (!currentBlock || !currentBlock.data || !currentBlock.data.tasks) {
    if (pip) pip.remove();
    return;
  }
  
  if (!pip) {
    pip = document.createElement('div');
    pip.id = 'loop-timer-pip-panel';
    pip.className = 'loop-pip-panel';
    document.body.appendChild(pip);
  }
  
  let header = pip.querySelector('.loop-pip-header');
  let body = pip.querySelector('.loop-pip-body');
  let bubble = pip.querySelector('.loop-pip-bubble-content');
  let pulse = pip.querySelector('.loop-pip-bubble-pulse');
  
  if (!header) {
    pip.innerHTML = \`
      <div class="loop-pip-header">
        <div class="loop-pip-title">\${timerIcon} Timers (\${chapter.title || 'Untitled'})</div>
        <div class="loop-pip-controls"></div>
      </div>
      <div class="loop-pip-body"></div>
      <div class="loop-pip-bubble-content"></div>
      <div class="loop-pip-bubble-pulse"></div>
    \`;
    header = pip.querySelector('.loop-pip-header');
    body = pip.querySelector('.loop-pip-body');
    bubble = pip.querySelector('.loop-pip-bubble-content');
    pulse = pip.querySelector('.loop-pip-bubble-pulse');
    
    const controls = header.querySelector('.loop-pip-controls');
    
    const minBtn = document.createElement('button');
    minBtn.className = 'loop-pip-btn';
    minBtn.title = 'Minimize';
    minBtn.innerHTML = minIcon;
    minBtn.onclick = (e) => {
      e.stopPropagation();
      pip.classList.add('loop-pip-bubble-mode');
      pip.style.width = '64px';
      pip.style.height = '64px';
      pip.style.borderRadius = '50%';
      window.loopUpdatePipUI();
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'loop-pip-btn';
    closeBtn.title = 'Close';
    closeBtn.innerHTML = closeIcon;
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      pip.remove();
      window.loopTimersManager.pipBlockId = null;
      window.loopTimersManager.pipChapterId = null;
    };
    
    controls.appendChild(minBtn);
    controls.appendChild(closeBtn);
    
    makeDraggable(pip, header);
    
    pip.onclick = (e) => {
      if (pip.classList.contains('loop-pip-bubble-mode')) {
        pip.classList.remove('loop-pip-bubble-mode');
        pip.style.width = '320px';
        pip.style.height = 'auto';
        pip.style.borderRadius = '16px';
        window.loopUpdatePipUI();
      }
    };
  }
  
  const runningTask = currentBlock.data.tasks.find(t => t.isRunning) || currentBlock.data.tasks[0];
  if (runningTask) {
    const min = Math.floor(runningTask.secondsLeft / 60).toString().padStart(2, '0');
    const sec = (runningTask.secondsLeft % 60).toString().padStart(2, '0');
    bubble.innerHTML = timerIconLarge + \`<span style="font-size:11px; font-weight:bold; display:block; line-height:1; margin-top:2px;">\${min}:\${sec}</span>\`;
    if (runningTask.isRunning) {
      pulse.className = 'loop-pip-bubble-pulse active';
    } else {
      pulse.className = 'loop-pip-bubble-pulse';
    }
  } else {
    bubble.innerHTML = timerIconLarge;
    pulse.className = 'loop-pip-bubble-pulse';
  }
  
  if (pip.classList.contains('loop-pip-bubble-mode')) {
    return;
  }
  
  const renderPipList = () => {
    body.innerHTML = '';
    currentBlock.data.tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'loop-pip-task';
      
      const left = document.createElement('div');
      left.className = 'loop-pip-task-left';
      
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = task.completed;
      cb.style.cursor = 'pointer';
      cb.addEventListener('change', () => {
        window.loopTimersManager.updateTaskState(currentChapterId, currentBlockId, task.id, { completed: cb.checked }, dbInstance);
        window.loopTimersManager.notifyListeners(currentBlockId);
      });
      
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'loop-pip-task-input';
      nameInput.value = task.name;
      nameInput.style.textDecoration = task.completed ? 'line-through' : 'none';
      nameInput.style.opacity = task.completed ? '0.6' : '1';
      
      nameInput.addEventListener('input', () => {
        window.loopTimersManager.updateTaskState(currentChapterId, currentBlockId, task.id, { name: nameInput.value }, dbInstance);
        const blockInputs = document.querySelectorAll(\`[data-task-input-id="\${currentBlockId}_\${task.id}"]\`);
        blockInputs.forEach(inp => {
          inp.value = nameInput.value;
        });
      });
      
      left.appendChild(cb);
      left.appendChild(nameInput);
      
      const right = document.createElement('div');
      right.className = 'loop-pip-task-right';
      
      const timeDisp = document.createElement('div');
      timeDisp.className = 'loop-pip-time';
      const m = Math.floor(task.secondsLeft / 60).toString().padStart(2, '0');
      const s = (task.secondsLeft % 60).toString().padStart(2, '0');
      timeDisp.textContent = \`\${m}:\${s}\`;
      
      const startBtn = document.createElement('button');
      startBtn.className = task.isRunning ? 'loop-timer-btn loop-timer-btn-primary' : 'loop-timer-btn';
      startBtn.innerHTML = task.isRunning ? pauseIcon : playIcon;
      startBtn.onclick = () => {
        if (task.isRunning) {
          window.loopTimersManager.stopTimer(currentChapterId, currentBlockId, task.id, dbInstance);
        } else {
          window.loopTimersManager.startTimer(currentChapterId, currentBlockId, task.id, dbInstance);
        }
      };
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'loop-timer-btn';
      resetBtn.innerHTML = resetIcon;
      resetBtn.onclick = () => {
        window.loopTimersManager.stopTimer(currentChapterId, currentBlockId, task.id, dbInstance);
        window.loopTimersManager.updateTaskState(currentChapterId, currentBlockId, task.id, { secondsLeft: task.totalSeconds }, dbInstance);
        window.loopTimersManager.notifyListeners(currentBlockId);
      };
      
      right.appendChild(timeDisp);
      right.appendChild(startBtn);
      right.appendChild(resetBtn);
      
      item.appendChild(left);
      item.appendChild(right);
      body.appendChild(item);
    });
    
    const addBar = document.createElement('div');
    addBar.style.display = 'flex';
    addBar.style.gap = '8px';
    addBar.style.marginTop = '8px';
    
    const addInp = document.createElement('input');
    addInp.type = 'text';
    addInp.placeholder = 'Add task in PIP...';
    addInp.style.flex = '1';
    addInp.style.padding = '6px 10px';
    addInp.style.fontSize = '12px';
    addInp.style.border = '1px solid rgba(226, 232, 240, 0.8)';
    addInp.style.borderRadius = '6px';
    addInp.style.outline = 'none';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'loop-timer-btn loop-timer-btn-primary';
    addBtn.style.width = '30px';
    addBtn.style.height = '30px';
    addBtn.innerHTML = plusIcon;
    
    const triggerAddTask = () => {
      const text = addInp.value.trim();
      if (text) {
        const activeCtx = window.loopTimersManager.activeContexts && window.loopTimersManager.activeContexts[currentBlockId];
        const newTask = {
          id: 't-' + Date.now(),
          name: text,
          completed: false,
          secondsLeft: 1500,
          totalSeconds: 1500,
          isRunning: false
        };
        
        const isContextValid = activeCtx && activeCtx.editor && document.body.contains(activeCtx.editor.container);
        if (isContextValid && activeCtx.block && activeCtx.block.data && activeCtx.block.data.tasks) {
          activeCtx.block.data.tasks.push(newTask);
          activeCtx.save();
        } else {
          const chapter = dbInstance.getChapter(currentChapterId);
          if (chapter) {
            const block = chapter.blocks.find(b => b.id === currentBlockId);
            if (block && block.data && block.data.tasks) {
              block.data.tasks.push(newTask);
              dbInstance.saveChapter(chapter);
            }
          }
        }
        window.loopTimersManager.notifyListeners(currentBlockId);
      }
    };
    
    addBtn.onclick = triggerAddTask;
    addInp.onkeydown = (e) => {
      if (e.key === 'Enter') triggerAddTask();
    };
    
    addBar.appendChild(addInp);
    addBar.appendChild(addBtn);
    body.appendChild(addBar);
  };
  
  // Targeted updates if layout matches structure
  const pipTimerSpans = body.querySelectorAll('.loop-pip-time');
  if (pipTimerSpans.length === currentBlock.data.tasks.length) {
    currentBlock.data.tasks.forEach((task, idx) => {
      const span = pipTimerSpans[idx];
      if (span) {
        const m = Math.floor(task.secondsLeft / 60).toString().padStart(2, '0');
        const s = (task.secondsLeft % 60).toString().padStart(2, '0');
        span.textContent = \`\${m}:\${s}\`;
        
        const right = span.parentElement;
        if (right) {
          const startBtn = right.children[1];
          if (startBtn) {
            startBtn.innerHTML = task.isRunning ? pauseIcon : playIcon;
            startBtn.className = task.isRunning ? 'loop-timer-btn loop-timer-btn-primary' : 'loop-timer-btn';
          }
        }
      }
    });
  } else {
    renderPipList();
  }
};

// Document Block rendering logic
const listenerId = 'block-' + blockId + '-' + Math.random().toString(36).substr(2, 9);

if (container.dataset.listenerId) {
  window.loopTimersManager.unregisterListener(blockId, container.dataset.listenerId);
}
container.dataset.listenerId = listenerId;

const renderBlockUI = () => {
  container.innerHTML = '';
  
  const wrapper = document.createElement('div');
  wrapper.style.padding = '16px 20px';
  wrapper.style.background = '#ffffff';
  wrapper.style.border = '1px solid var(--border-color)';
  wrapper.style.borderRadius = '12px';
  wrapper.style.boxShadow = 'var(--shadow-sm)';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '14px';
  wrapper.style.margin = '12px 0';
  wrapper.style.width = '100%';
  
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.borderBottom = '1px solid rgba(226, 232, 240, 0.6)';
  header.style.paddingBottom = '10px';
  
  const title = document.createElement('div');
  title.style.fontSize = '15px';
  title.style.fontWeight = '600';
  title.style.color = 'var(--text-main)';
  title.style.display = 'flex';
  title.style.alignItems = 'center';
  title.innerHTML = timerIcon + ' Tasks & Timers';
  
  const headerBtns = document.createElement('div');
  headerBtns.style.display = 'flex';
  headerBtns.style.gap = '8px';
  
  const pipBtn = document.createElement('button');
  pipBtn.innerHTML = pipIcon + 'Float (PIP)';
  pipBtn.style.padding = '6px 12px';
  pipBtn.style.borderRadius = '20px';
  pipBtn.style.border = '1px solid var(--primary)';
  pipBtn.style.background = 'var(--primary-light)';
  pipBtn.style.color = 'var(--primary)';
  pipBtn.style.cursor = 'pointer';
  pipBtn.style.fontWeight = '500';
  pipBtn.style.fontSize = '12.5px';
  pipBtn.style.transition = 'all 0.2s';
  pipBtn.style.display = 'flex';
  pipBtn.style.alignItems = 'center';
  
  pipBtn.addEventListener('mouseenter', () => {
    pipBtn.style.background = 'var(--primary-light-active)';
  });
  pipBtn.addEventListener('mouseleave', () => {
    pipBtn.style.background = 'var(--primary-light)';
  });
  
  pipBtn.addEventListener('click', () => {
    window.loopTimersManager.pipBlockId = blockId;
    window.loopTimersManager.pipChapterId = chapterId;
    window.loopUpdatePipUI();
    
    const pip = document.getElementById('loop-timer-pip-panel');
    if (pip) {
      pip.classList.remove('loop-pip-bubble-mode');
      pip.style.width = '320px';
      pip.style.height = 'auto';
      pip.style.borderRadius = '16px';
      pip.style.zIndex = '999999';
    }
  });
  
  headerBtns.appendChild(pipBtn);
  header.appendChild(title);
  header.appendChild(headerBtns);
  wrapper.appendChild(header);
  
  const listContainer = document.createElement('div');
  listContainer.style.display = 'flex';
  listContainer.style.flexDirection = 'column';
  listContainer.style.gap = '10px';
  
  block.data.tasks.forEach(task => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '8px 12px';
    row.style.background = '#f8fafc';
    row.style.border = '1px solid var(--border-color)';
    row.style.borderRadius = '8px';
    row.style.gap = '10px';
    row.style.transition = 'all 0.2s';
    
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '10px';
    left.style.flex = '1';
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = task.completed;
    cb.style.cursor = 'pointer';
    cb.style.width = '16px';
    cb.style.height = '16px';
    cb.addEventListener('change', () => {
      task.completed = cb.checked;
      save();
      window.loopTimersManager.notifyListeners(blockId);
    });
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.dataset.taskInputId = blockId + '_' + task.id;
    nameInput.value = task.name;
    nameInput.placeholder = 'Task description...';
    nameInput.style.border = 'none';
    nameInput.style.background = 'transparent';
    nameInput.style.fontSize = '14px';
    nameInput.style.color = 'var(--text-main)';
    nameInput.style.outline = 'none';
    nameInput.style.width = '100%';
    nameInput.style.textDecoration = task.completed ? 'line-through' : 'none';
    nameInput.style.opacity = task.completed ? '0.6' : '1';
    
    nameInput.addEventListener('input', () => {
      task.name = nameInput.value;
      save();
      const pipInputs = document.querySelectorAll('#loop-timer-pip-panel .loop-pip-task-input');
      pipInputs.forEach((inp, idx) => {
        const pipTask = block.data.tasks[idx];
        if (pipTask && pipTask.id === task.id) {
          inp.value = nameInput.value;
        }
      });
    });
    
    left.appendChild(cb);
    left.appendChild(nameInput);
    
    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '8px';
    
    const timeSpan = document.createElement('span');
    timeSpan.style.fontFamily = 'var(--font-mono)';
    timeSpan.style.fontSize = '14.5px';
    timeSpan.style.fontWeight = '600';
    timeSpan.style.color = 'var(--primary)';
    timeSpan.style.cursor = task.isRunning ? 'default' : 'pointer';
    timeSpan.style.padding = '2px 6px';
    timeSpan.style.borderRadius = '4px';
    timeSpan.style.minWidth = '48px';
    timeSpan.style.textAlign = 'right';
    
    const m = Math.floor(task.secondsLeft / 60).toString().padStart(2, '0');
    const s = (task.secondsLeft % 60).toString().padStart(2, '0');
    timeSpan.textContent = \`\${m}:\${s}\`;
    
    if (!task.isRunning) {
      timeSpan.title = 'Click to edit duration (min)';
      timeSpan.addEventListener('mouseenter', () => {
        timeSpan.style.background = 'rgba(124, 58, 237, 0.08)';
      });
      timeSpan.addEventListener('mouseleave', () => {
        timeSpan.style.background = 'transparent';
      });
      timeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const editInput = document.createElement('input');
        editInput.type = 'number';
        editInput.min = '1';
        editInput.max = '999';
        editInput.value = Math.round(task.totalSeconds / 60);
        editInput.style.width = '45px';
        editInput.style.fontSize = '13px';
        editInput.style.padding = '2px 4px';
        editInput.style.border = '1px solid var(--primary)';
        editInput.style.borderRadius = '4px';
        editInput.style.textAlign = 'center';
        editInput.style.outline = 'none';
        
        const saveNewDuration = () => {
          const val = parseInt(editInput.value, 10);
          if (!isNaN(val) && val > 0) {
            task.totalSeconds = val * 60;
            task.secondsLeft = val * 60;
            save();
            window.loopTimersManager.notifyListeners(blockId);
          } else {
            renderBlockUI();
          }
        };
        
        editInput.addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter') saveNewDuration();
          if (evt.key === 'Escape') renderBlockUI();
        });
        
        editInput.addEventListener('blur', saveNewDuration);
        
        right.replaceChild(editInput, timeSpan);
        editInput.focus();
        editInput.select();
      });
    }
    
    const playBtn = document.createElement('button');
    playBtn.className = task.isRunning ? 'loop-timer-btn loop-timer-btn-primary' : 'loop-timer-btn';
    playBtn.innerHTML = task.isRunning ? pauseIcon : playIcon;
    playBtn.title = task.isRunning ? 'Pause' : 'Start';
    playBtn.addEventListener('click', () => {
      if (task.isRunning) {
        window.loopTimersManager.stopTimer(chapterId, blockId, task.id, db);
      } else {
        window.loopTimersManager.startTimer(chapterId, blockId, task.id, db);
      }
    });
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'loop-timer-btn';
    resetBtn.innerHTML = resetIcon;
    resetBtn.title = 'Reset';
    resetBtn.addEventListener('click', () => {
      window.loopTimersManager.stopTimer(chapterId, blockId, task.id, db);
      window.loopTimersManager.updateTaskState(chapterId, blockId, task.id, { secondsLeft: task.totalSeconds }, db);
      window.loopTimersManager.notifyListeners(blockId);
    });
    
    const delBtn = document.createElement('button');
    delBtn.className = 'loop-timer-btn';
    delBtn.innerHTML = trashIcon;
    delBtn.title = 'Delete task';
    delBtn.addEventListener('click', () => {
      window.loopTimersManager.stopTimer(chapterId, blockId, task.id, db);
      block.data.tasks = block.data.tasks.filter(t => t.id !== task.id);
      save();
      window.loopTimersManager.notifyListeners(blockId);
    });
    
    right.appendChild(timeSpan);
    right.appendChild(playBtn);
    right.appendChild(resetBtn);
    right.appendChild(delBtn);
    
    row.appendChild(left);
    row.appendChild(right);
    listContainer.appendChild(row);
  });
  
  wrapper.appendChild(listContainer);
  
  const addBar = document.createElement('div');
  addBar.style.display = 'flex';
  addBar.style.gap = '10px';
  addBar.style.marginTop = '4px';
  
  const addInp = document.createElement('input');
  addInp.type = 'text';
  addInp.placeholder = 'Add new task...';
  addInp.style.flex = '1';
  addInp.style.padding = '8px 12px';
  addInp.style.fontSize = '13.5px';
  addInp.style.border = '1px solid var(--border-color)';
  addInp.style.borderRadius = '6px';
  addInp.style.outline = 'none';
  addInp.style.background = '#f8fafc';
  
  const addBtn = document.createElement('button');
  addBtn.innerHTML = plusIcon + ' Add Task';
  addBtn.style.padding = '8px 14px';
  addBtn.style.background = 'var(--primary)';
  addBtn.style.color = '#ffffff';
  addBtn.style.border = 'none';
  addBtn.style.borderRadius = '6px';
  addBtn.style.cursor = 'pointer';
  addBtn.style.fontSize = '13px';
  addBtn.style.fontWeight = '500';
  addBtn.style.display = 'flex';
  addBtn.style.alignItems = 'center';
  addBtn.style.gap = '4px';
  
  const triggerAddTask = () => {
    const text = addInp.value.trim();
    if (text) {
      block.data.tasks.push({
        id: 't-' + Date.now(),
        name: text,
        completed: false,
        secondsLeft: 1500,
        totalSeconds: 1500,
        isRunning: false
      });
      save();
      window.loopTimersManager.notifyListeners(blockId);
    }
  };
  
  addBtn.addEventListener('click', triggerAddTask);
  addInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerAddTask();
  });
  
  addBar.appendChild(addInp);
  addBar.appendChild(addBtn);
  wrapper.appendChild(addBar);
  
  container.appendChild(wrapper);
};

window.loopTimersManager.registerListener(blockId, listenerId, () => {
  const timerSpans = container.querySelectorAll('span');
  if (timerSpans.length === block.data.tasks.length) {
    block.data.tasks.forEach((task, idx) => {
      const span = timerSpans[idx];
      if (span && span.tagName === 'SPAN') {
        const m = Math.floor(task.secondsLeft / 60).toString().padStart(2, '0');
        const s = (task.secondsLeft % 60).toString().padStart(2, '0');
        span.textContent = \`\${m}:\${s}\`;
      }
      const row = span ? span.parentElement : null;
      if (row) {
        const playBtn = row.children[1];
        if (playBtn) {
          playBtn.className = task.isRunning ? 'loop-timer-btn loop-timer-btn-primary' : 'loop-timer-btn';
          playBtn.innerHTML = task.isRunning ? pauseIcon : playIcon;
          playBtn.title = task.isRunning ? 'Pause' : 'Start';
        }
      }
    });
  } else {
    renderBlockUI();
  }
});

renderBlockUI();

// Auto resume running timer for this block if needed
block.data.tasks.forEach(task => {
  if (task.isRunning && !window.loopTimersManager.intervals[blockId + '_' + task.id]) {
    window.loopTimersManager.startTimer(chapterId, blockId, task.id, db);
  }
});`
  },
  {
    id: 'sketch-widget',
    name: 'Drawing Canvas',
    icon: '🎨',
    description: 'Sketch notes, flowcharts, diagrams, or math formulas directly inside notes.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `if (!block.data || typeof block.data !== 'object') {\n  block.data = { image: '' };\n}\ncontainer.innerHTML = '';\nconst wrapper = document.createElement('div');\nwrapper.style.padding = '12px';\nwrapper.style.background = '#f8fafc';\nwrapper.style.border = '1px solid var(--border-color)';\nwrapper.style.borderRadius = '10px';\nwrapper.style.display = 'flex';\nwrapper.style.flexDirection = 'column';\nwrapper.style.gap = '8px';\nwrapper.style.margin = '10px 0';\nwrapper.style.width = '100%';\n\nconst canvas = document.createElement('canvas');\ncanvas.width = 600;\ncanvas.height = 250;\ncanvas.style.background = '#ffffff';\ncanvas.style.border = '1px solid var(--border-color)';\ncanvas.style.borderRadius = '6px';\ncanvas.style.cursor = 'crosshair';\ncanvas.style.touchAction = 'none';\n\nconst ctx = canvas.getContext('2d');\nctx.lineWidth = 3;\nctx.lineCap = 'round';\nctx.strokeStyle = '#7c3aed';\n\nif (block.data.image) {\n  const img = new Image();\n  img.onload = () => ctx.drawImage(img, 0, 0);\n  img.src = block.data.image;\n}\n\nlet drawing = false;\nconst getPos = (e) => {\n  const rect = canvas.getBoundingClientRect();\n  return { x: e.clientX - rect.left, y: e.clientY - rect.top };\n};\n\ncanvas.addEventListener('mousedown', (e) => {\n  drawing = true;\n  const pos = getPos(e);\n  ctx.beginPath();\n  ctx.moveTo(pos.x, pos.y);\n});\n\ncanvas.addEventListener('mousemove', (e) => {\n  if (!drawing) return;\n  const pos = getPos(e);\n  ctx.lineTo(pos.x, pos.y);\n  ctx.stroke();\n});\n\nconst stopDrawing = () => {\n  if (!drawing) return;\n  drawing = false;\n  block.data.image = canvas.toDataURL();\n  save();\n};\n\ncanvas.addEventListener('mouseup', stopDrawing);\ncanvas.addEventListener('mouseleave', stopDrawing);\n\nconst toolbar = document.createElement('div');\ntoolbar.style.display = 'flex';\ntoolbar.style.gap = '8px';\n\nconst clearBtn = document.createElement('button');\nclearBtn.textContent = 'Clear Canvas';\nclearBtn.style.padding = '5px 12px';\nclearBtn.style.borderRadius = '20px';\nclearBtn.style.border = '1px solid var(--border-color)';\nclearBtn.style.background = '#ffffff';\nclearBtn.style.cursor = 'pointer';\nclearBtn.style.fontSize = '12px';\nclearBtn.style.fontWeight = '500';\nclearBtn.style.color = 'var(--text-muted)';\n\nclearBtn.addEventListener('click', () => {\n  ctx.clearRect(0, 0, canvas.width, canvas.height);\n  block.data.image = '';\n  save();\n});\n\ntoolbar.appendChild(clearBtn);\nwrapper.appendChild(canvas);\nwrapper.appendChild(toolbar);\ncontainer.appendChild(wrapper);`
  }
];

export const db = {
  init() {
    if (!localStorage.getItem(WORKSPACES_KEY)) {
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(CHAPTERS_KEY)) {
      localStorage.setItem(CHAPTERS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(TRASH_KEY)) {
      localStorage.setItem(TRASH_KEY, JSON.stringify([]));
    }
    const existingPluginsStr = localStorage.getItem(PLUGINS_KEY);
    if (!existingPluginsStr) {
      localStorage.setItem(PLUGINS_KEY, JSON.stringify(DEFAULT_PLUGINS));
    } else {
      try {
        let existingPlugins = JSON.parse(existingPluginsStr);
        let updated = false;
        DEFAULT_PLUGINS.forEach(defaultP => {
          const idx = existingPlugins.findIndex(p => p.id === defaultP.id);
          if (idx >= 0) {
            if (existingPlugins[idx].isBuiltIn) {
              if (existingPlugins[idx].renderCode !== defaultP.renderCode) {
                existingPlugins[idx].renderCode = defaultP.renderCode;
                updated = true;
              }
              if (existingPlugins[idx].name !== defaultP.name) {
                existingPlugins[idx].name = defaultP.name;
                updated = true;
              }
              if (existingPlugins[idx].description !== defaultP.description) {
                existingPlugins[idx].description = defaultP.description;
                updated = true;
              }
              if (existingPlugins[idx].icon !== defaultP.icon) {
                existingPlugins[idx].icon = defaultP.icon;
                updated = true;
              }
            }
          } else {
            existingPlugins.push(defaultP);
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(PLUGINS_KEY, JSON.stringify(existingPlugins));
        }
      } catch (e) {
        localStorage.setItem(PLUGINS_KEY, JSON.stringify(DEFAULT_PLUGINS));
      }
    }
  },

  // Workspaces
  getWorkspaces() {
    this.init();
    return JSON.parse(localStorage.getItem(WORKSPACES_KEY)) || [];
  },

  getWorkspace(id) {
    return this.getWorkspaces().find(w => w.id === id);
  },

  saveWorkspace(workspace) {
    const workspaces = this.getWorkspaces();
    const index = workspaces.findIndex(w => w.id === workspace.id);
    workspace.updatedAt = new Date().toISOString();
    
    // Default properties if missing
    if (workspace.starred === undefined) workspace.starred = false;
    
    if (index >= 0) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
    return workspace;
  },

  saveWorkspacesOrder(workspacesList) {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspacesList));
  },

  deleteWorkspace(workspaceId) {
    // Deletes the workspace
    const workspaces = this.getWorkspaces().filter(w => w.id !== workspaceId);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));

    // Move all chapters of this workspace to trash
    const chapters = this.getChapters(workspaceId);
    chapters.forEach(c => this.deleteChapter(c.id));
  },

  // Chapters
  getChapters(workspaceId) {
    this.init();
    const chapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY)) || [];
    if (workspaceId) {
      return chapters.filter(c => c.workspaceId === workspaceId);
    }
    return chapters;
  },

  getChapter(id) {
    this.init();
    const chapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY)) || [];
    return chapters.find(c => c.id === id);
  },

  saveChapter(chapter) {
    this.init();
    const chapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY)) || [];
    const index = chapters.findIndex(c => c.id === chapter.id);
    chapter.updatedAt = new Date().toISOString();
    if (index >= 0) {
      chapters[index] = chapter;
    } else {
      chapters.push(chapter);
    }
    localStorage.setItem(CHAPTERS_KEY, JSON.stringify(chapters));
    
    // Also update workspace timestamp
    const workspace = this.getWorkspace(chapter.workspaceId);
    if (workspace) {
      this.saveWorkspace(workspace);
    }
    return chapter;
  },

  saveChaptersOrder(chaptersList, workspaceId) {
    this.init();
    const allChapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY)) || [];
    
    // Filter out chapters belonging to this workspace and replace them in order
    const otherChapters = allChapters.filter(c => c.workspaceId !== workspaceId);
    const updatedChapters = [...otherChapters, ...chaptersList];
    
    localStorage.setItem(CHAPTERS_KEY, JSON.stringify(updatedChapters));
  },

  deleteChapter(id) {
    this.init();
    const chapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY)) || [];
    const chapterToDelete = chapters.find(c => c.id === id);
    if (!chapterToDelete) return;

    // Remove from active chapters
    const updatedChapters = chapters.filter(c => c.id !== id);
    localStorage.setItem(CHAPTERS_KEY, JSON.stringify(updatedChapters));

    // Add to trash
    const trash = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    chapterToDelete.deletedAt = new Date().toISOString();
    trash.push(chapterToDelete);
    localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
  },

  // Trash (Recycle Bin)
  getTrash() {
    this.init();
    return JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
  },

  restoreChapter(id) {
    this.init();
    const trash = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    const chapterToRestore = trash.find(c => c.id === id);
    if (!chapterToRestore) return;

    // Remove from trash
    const updatedTrash = trash.filter(c => c.id !== id);
    localStorage.setItem(TRASH_KEY, JSON.stringify(updatedTrash));

    // Add back to active chapters
    delete chapterToRestore.deletedAt;
    const chapters = JSON.parse(localStorage.getItem(CHAPTERS_KEY)) || [];
    chapters.push(chapterToRestore);
    localStorage.setItem(CHAPTERS_KEY, JSON.stringify(chapters));
    return chapterToRestore;
  },

  permanentlyDeleteChapter(id) {
    this.init();
    const trash = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
    const updatedTrash = trash.filter(c => c.id !== id);
    localStorage.setItem(TRASH_KEY, JSON.stringify(updatedTrash));
  },

  clearTrash() {
    localStorage.setItem(TRASH_KEY, JSON.stringify([]));
  },

  // Plugins Manager Store
  getPlugins() {
    this.init();
    return JSON.parse(localStorage.getItem(PLUGINS_KEY)) || [];
  },

  savePlugin(plugin) {
    this.init();
    const plugins = this.getPlugins();
    const idx = plugins.findIndex(p => p.id === plugin.id);
    if (idx >= 0) {
      plugins[idx] = plugin;
    } else {
      plugins.push(plugin);
    }
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
    return plugin;
  },

  deletePlugin(id) {
    this.init();
    const plugins = this.getPlugins().filter(p => p.id !== id);
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
  },

  togglePlugin(id) {
    this.init();
    const plugins = this.getPlugins();
    const plugin = plugins.find(p => p.id === id);
    if (plugin) {
      plugin.enabled = !plugin.enabled;
      localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
    }
    return plugin;
  }
};
