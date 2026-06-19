// Local Database Manager using IndexedDB + Memory Cache
import { get, set } from 'idb-keyval';

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
  analytics: null
};

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
    name: 'Timer & Stopwatch',
    icon: '⏱️',
    description: 'Track sprint tasks, writing sessions, and timers inside your workspace.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `if (!block.data || typeof block.data !== 'object' || !block.data.tasks) {
  block.data = {
    tasks: [
      { id: 't-1', name: 'Task 1', completed: false, secondsLeft: 1500, totalSeconds: 1500, isRunning: false, history: [], currentSession: null }
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
    if (document.getElementById('loop-timer-analytics-panel') && typeof window.loopShowAnalyticsDashboard === 'function') {
      window.loopShowAnalyticsDashboard();
    }
  },
  
  startTimer(chapterId, blockId, taskId, db) {
    const key = blockId + '_' + taskId;
    if (this.intervals[key]) return;
    
    const dbInstance = this.db || db;
    
    // Manage active context and session history start
    const activeCtx = this.activeContexts && this.activeContexts[blockId];
    const isContextValid = activeCtx && activeCtx.editor && document.body.contains(activeCtx.editor.container);
    let task = null;
    let chapter = null;
    
    if (isContextValid && activeCtx.block && activeCtx.block.data && activeCtx.block.data.tasks) {
      task = activeCtx.block.data.tasks.find(t => t.id === taskId);
    } else {
      chapter = dbInstance.getChapter(chapterId);
      if (chapter) {
        const dbBlock = chapter.blocks.find(b => b.id === blockId);
        if (dbBlock && dbBlock.data && dbBlock.data.tasks) {
          task = dbBlock.data.tasks.find(t => t.id === taskId);
        }
      }
    }
    
    if (task) {
      task.isRunning = true;
      task.history = task.history || [];
      if (!task.currentSession) {
        task.currentSession = {
          sessionStart: Date.now(),
          pauses: []
        };
      } else {
        task.currentSession.pauses = task.currentSession.pauses || [];
        const lastPause = task.currentSession.pauses[task.currentSession.pauses.length - 1];
        if (lastPause && !lastPause.resumedAt) {
          lastPause.resumedAt = Date.now();
        }
      }
      
      if (isContextValid) {
        activeCtx.save();
      } else if (chapter) {
        dbInstance.saveChapter(chapter);
      }
    }
    
    this.intervals[key] = setInterval(() => {
      const currentCtx = this.activeContexts && this.activeContexts[blockId];
      const validCtx = currentCtx && currentCtx.editor && document.body.contains(currentCtx.editor.container);
      let tTask = null;
      
      if (validCtx && currentCtx.block && currentCtx.block.data && currentCtx.block.data.tasks) {
        tTask = currentCtx.block.data.tasks.find(t => t.id === taskId);
        if (tTask) {
          const reachedZero = tTask.secondsLeft === 0;
          tTask.secondsLeft--;
          currentCtx.save();
          this.notifyListeners(blockId);
          if (reachedZero) {
            this.triggerCompletionAlert(tTask.name);
          }
        } else {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
        }
      } else {
        const dbChapter = dbInstance.getChapter(chapterId);
        if (!dbChapter) {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
          return;
        }
        const dbBlock = dbChapter.blocks.find(b => b.id === blockId);
        if (!dbBlock || !dbBlock.data || !dbBlock.data.tasks) {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
          return;
        }
        tTask = dbBlock.data.tasks.find(t => t.id === taskId);
        if (tTask) {
          const reachedZero = tTask.secondsLeft === 0;
          tTask.secondsLeft--;
          dbInstance.saveChapter(dbChapter);
          this.notifyListeners(blockId);
          if (reachedZero) {
            this.triggerCompletionAlert(tTask.name);
          }
        } else {
          this.stopTimer(chapterId, blockId, taskId, dbInstance);
        }
      }
    }, 1000);
    
    this.notifyListeners(blockId);
  },
  
  triggerCompletionAlert(taskName) {
    try {
      const audio = new Audio('/bell.mp3');
      audio.volume = 0.8;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Audio play failed, user interaction may be required:", err);
        });
      }
    } catch(err) {
      console.warn("Audio creation failed:", err);
    }
    
    const dbInstance = this.db;
    if (dbInstance && typeof dbInstance.addNotification === 'function') {
      dbInstance.addNotification({
        title: 'Timer Finished',
        message: 'Session completed for: ' + taskName,
        type: 'timer'
      });
    }
    
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        new Notification('Time Up!', { body: 'Session completed for: ' + taskName });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('Time Up!', { body: 'Session completed for: ' + taskName });
        });
      }
    }
  },
  
  stopTimer(chapterId, blockId, taskId, db) {
    const key = blockId + '_' + taskId;
    if (this.intervals[key]) {
      clearInterval(this.intervals[key]);
      delete this.intervals[key];
    }
    
    const dbInstance = this.db || db;
    const activeCtx = this.activeContexts && this.activeContexts[blockId];
    const isContextValid = activeCtx && activeCtx.editor && document.body.contains(activeCtx.editor.container);
    let task = null;
    let chapter = null;
    
    if (isContextValid && activeCtx.block && activeCtx.block.data && activeCtx.block.data.tasks) {
      task = activeCtx.block.data.tasks.find(t => t.id === taskId);
    } else {
      chapter = dbInstance.getChapter(chapterId);
      if (chapter) {
        const dbBlock = chapter.blocks.find(b => b.id === blockId);
        if (dbBlock && dbBlock.data && dbBlock.data.tasks) {
          task = dbBlock.data.tasks.find(t => t.id === taskId);
        }
      }
    }
    
    if (task) {
      task.isRunning = false;
      if (task.currentSession) {
        task.currentSession.pauses = task.currentSession.pauses || [];
        task.currentSession.pauses.push({
          pausedAt: Date.now(),
          resumedAt: null
        });
      }
      
      if (isContextValid) {
        activeCtx.save();
      } else if (chapter) {
        dbInstance.saveChapter(chapter);
      }
    }
    
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
const gearIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
const pipIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6.3px; vertical-align: -2px; display:inline-block;"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><rect x="13" y="13" width="7" height="7" fill="currentColor"></rect></svg>';
const plusIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4.2px; vertical-align: -1px; display:inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
const minIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:block;"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
const closeIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
const timerIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6.3px; display:inline-block;"><circle cx="12" cy="13" r="8"></circle><polyline points="12 9 12 13 14 15"></polyline><line x1="12" y1="5" x2="12" y2="2"></line></svg>';
const timerIconLarge = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4.2px; display:block;"><circle cx="12" cy="13" r="8"></circle><polyline points="12 9 12 13 14 15"></polyline><line x1="12" y1="5" x2="12" y2="2"></line></svg>';

const formatTimeStr = (ts) => {
  if (!ts) return '';
  const date = new Date(ts);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return hours + ':' + minutes + ' ' + ampm;
};

const formatDuration = (secs) => {
  const isOvertime = secs < 0;
  const absSecs = Math.abs(secs);
  const m = Math.floor(absSecs / 60).toString().padStart(2, '0');
  const s = (absSecs % 60).toString().padStart(2, '0');
  return (isOvertime ? '+' : '') + m + ':' + s;
};

const renderHistoryUI = (task, panel) => {
  panel.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'loop-timer-history-title';
  title.innerHTML = '<span>Analytics Logs</span><span style="font-weight:normal; opacity:0.7;">Time in AM/PM</span>';
  panel.appendChild(title);
  
  const logs = [];
  
  if (task.history && task.history.length > 0) {
    task.history.forEach((session, sIdx) => {
      let durationMins = Math.round((session.sessionEnd - session.sessionStart) / 1000 / 60);
      if (durationMins < 1) durationMins = '< 1 min';
      else durationMins = durationMins + ' mins';
      
      const text = 'Session #' + (sIdx + 1) + ': ' + formatTimeStr(session.sessionStart) + ' - ' + formatTimeStr(session.sessionEnd) + ' (' + durationMins + ')';
      let pausesText = '';
      if (session.pauses && session.pauses.length > 0) {
        const pTimes = session.pauses.map(p => {
          return formatTimeStr(p.pausedAt) + (p.resumedAt ? ' - ' + formatTimeStr(p.resumedAt) : ' (Paused)');
        }).join(', ');
        pausesText = 'Pauses: ' + pTimes;
      }
      logs.push({ text, subtext: pausesText });
    });
  }
  
  if (task.currentSession) {
    const text = 'Current Session (Running): Started at ' + formatTimeStr(task.currentSession.sessionStart);
    let pausesText = '';
    if (task.currentSession.pauses && task.currentSession.pauses.length > 0) {
      const pTimes = task.currentSession.pauses.map(p => {
        return formatTimeStr(p.pausedAt) + (p.resumedAt ? ' - ' + formatTimeStr(p.resumedAt) : ' (Paused)');
      }).join(', ');
      pausesText = 'Pauses: ' + pTimes;
    }
    logs.push({ text, subtext: pausesText });
  }
  
  if (logs.length === 0) {
    const empty = document.createElement('div');
    empty.style.opacity = '0.6';
    empty.textContent = 'No previous logs for this task.';
    panel.appendChild(empty);
  } else {
    logs.reverse().forEach(log => {
      const item = document.createElement('div');
      item.className = 'loop-timer-history-item';
      
      const main = document.createElement('div');
      main.style.fontWeight = '500';
      main.textContent = log.text;
      item.appendChild(main);
      
      if (log.subtext) {
        const sub = document.createElement('div');
        sub.style.fontSize = '10.5px';
        sub.style.opacity = '0.7';
        sub.textContent = log.subtext;
        item.appendChild(sub);
      }
      panel.appendChild(item);
    });
  }
};

// Setup Styles once
if (!document.getElementById('loop-timer-pip-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'loop-timer-pip-styles';
  styleEl.textContent = \`
    .loop-pip-panel {
      position: fixed;
      bottom: 25.2px;
      right: 25.2px;
      width: 336px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(21px);
      -webkit-backdrop-filter: blur(21px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 16.8px;
      box-shadow: 0 12.6px 31.5px -4.2px rgba(124, 58, 237, 0.12), 0 4.2px 12.6px -2px rgba(0, 0, 0, 0.05);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .loop-pip-header {
      padding: 12.6px 16.8px;
      background: rgba(124, 58, 237, 0.05);
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      user-select: none;
    }
    
    .loop-pip-title {
      font-size: 14.7px;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
    }
    
    .loop-pip-controls {
      display: flex;
      align-items: center;
      gap: 8.4px;
    }
    
    .loop-pip-btn {
      width: 25.2px;
      height: 25.2px;
      border-radius: 50%;
      border: none;
      background: rgba(226, 232, 240, 0.6);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14.7px;
      transition: all 0.2s;
      padding: 0;
    }
    
    .loop-pip-btn:hover {
      background: rgba(124, 58, 237, 0.1);
      color: var(--primary);
    }
    
    .loop-pip-body {
      padding: 16.8px;
      max-height: 315px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12.6px;
    }
    
    .loop-pip-task {
      display: flex;
      flex-direction: column;
      gap: 6.3px;
      padding: 8.4px;
      border-radius: 8.4px;
      background: rgba(248, 250, 252, 0.6);
      border: 1px solid rgba(226, 232, 240, 0.5);
    }
    
    .loop-pip-task-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8.4px;
    }
    
    .loop-pip-task-left {
      display: flex;
      align-items: center;
      gap: 8.4px;
      flex: 1;
    }
    
    .loop-pip-task-input {
      border: none;
      background: transparent;
      font-size: 13.7px;
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
      gap: 6.3px;
    }
    
    .loop-pip-time {
      font-size: 13.7px;
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--primary);
      min-width: 44.1px;
      text-align: right;
      padding: 2px 4.2px;
    }
    
    .loop-pip-bubble-mode {
      width: 67.2px;
      height: 67.2px;
      border-radius: 50%;
      background: var(--loop-purple-gradient);
      box-shadow: 0 10.5px 26.2px -5.3px rgba(124, 58, 237, 0.5);
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
      font-size: 12.6px;
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
      width: 29.4px;
      height: 29.4px;
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
    
    .loop-timer-history-panel {
      padding: 10.5px 12.6px;
      margin-top: 6.3px;
      background: rgba(241, 245, 249, 0.6);
      border-radius: 8.4px;
      border: 1px dashed rgba(226, 232, 240, 0.9);
      font-size: 11.5px;
      color: var(--text-muted);
      display: none;
      flex-direction: column;
      gap: 6.3px;
      line-height: 1.4;
      text-align: left;
    }
    .loop-timer-history-panel.active {
      display: flex;
    }
    .loop-timer-history-title {
      font-weight: 600;
      color: var(--text-main);
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      padding-bottom: 4.2px;
      margin-bottom: 4.2px;
      display: flex;
      justify-content: space-between;
    }
    .loop-timer-history-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      position: relative;
      padding-left: 10.5px;
      border-left: 1.5px solid rgba(124, 58, 237, 0.35);
    }
    
    /* Analytics Panel Styles */
    .loop-analytics-panel {
      position: fixed;
      top: 52.5px;
      left: 52.5px;
      width: 504px;
      height: 567px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(26.2px);
      -webkit-backdrop-filter: blur(26.2px);
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 16.8px;
      box-shadow: 0 21px 42px -6.3px rgba(0, 0, 0, 0.1), 0 8.4px 21px -4.2px rgba(0, 0, 0, 0.05);
      z-index: 100000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--font-sans);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    
    .loop-pip-panel.dragging, .loop-analytics-panel.dragging {
      transition: none !important;
    }
    
    .loop-analytics-header {
      padding: 14.7px 18.9px;
      background: rgba(124, 58, 237, 0.06);
      border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      user-select: none;
    }
    
    .loop-analytics-title {
      font-size: 15.7px;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8.4px;
    }
    
    .loop-analytics-body {
      padding: 16.8px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14.7px;
      overflow-y: auto;
    }
    
    .loop-analytics-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10.5px;
    }
    
    .loop-analytics-stat-card {
      background: #f8fafc;
      border: 1px solid rgba(226, 232, 240, 0.8);
      padding: 10.5px;
      border-radius: 10.5px;
      text-align: center;
    }
    
    .loop-analytics-stat-val {
      font-size: 18.9px;
      font-weight: 700;
      color: var(--primary);
    }
    
    .loop-analytics-stat-lbl {
      font-size: 10.5px;
      color: var(--text-muted);
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .loop-analytics-filters {
      display: flex;
      gap: 8.4px;
      align-items: center;
    }
    
    .loop-analytics-select {
      flex: 1;
      padding: 6.3px 8.4px;
      font-size: 12.6px;
      border-radius: 6.3px;
      border: 1px solid rgba(226, 232, 240, 0.8);
      background: #ffffff;
      outline: none;
      color: var(--text-main);
    }
    
    .loop-analytics-tabs {
      display: flex;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      padding-bottom: 2px;
      gap: 12.6px;
    }
    
    .loop-analytics-tab {
      font-size: 12.6px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4.2px 2px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    
    .loop-analytics-tab.active {
      color: var(--primary);
      border-color: var(--primary);
      font-weight: 600;
    }
    
    .loop-analytics-list {
      display: flex;
      flex-direction: column;
      gap: 8.4px;
      flex: 1;
    }
    
    .loop-analytics-log-card {
      background: #ffffff;
      border: 1px solid rgba(226, 232, 240, 0.7);
      border-radius: 10.5px;
      padding: 12.6px;
      box-shadow: 0 2px 4.2px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      gap: 6.3px;
    }
    
    .loop-analytics-log-header {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: var(--text-muted);
    }
    
    .loop-analytics-log-task {
      font-size: 14.2px;
      font-weight: 600;
      color: var(--text-main);
    }
    
    .loop-analytics-log-meta {
      font-size: 11.5px;
      color: var(--text-muted);
      display: flex;
      gap: 10.5px;
      flex-wrap: wrap;
    }
    
    .loop-analytics-log-meta span {
      background: rgba(124, 58, 237, 0.05);
      color: var(--primary);
      padding: 2px 6.3px;
      border-radius: 4.2px;
      font-size: 10.5px;
    }
    
    .loop-analytics-log-pauses {
      font-size: 11.1px;
      color: var(--text-muted);
      border-top: 1px dashed rgba(226, 232, 240, 0.8);
      padding-top: 4.2px;
      margin-top: 2px;
    }
  \`;
  document.head.appendChild(styleEl);
}

// Dragging Logic
const makeDraggable = (elm, handle) => {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let isDragging = false;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    if (!elm.classList.contains('loop-pip-bubble-mode')) {
      if (!e.target.closest('.loop-pip-header') && !e.target.closest('.loop-analytics-header')) return;
    }
    if (e.target.closest('.loop-pip-btn') || e.target.closest('input') || e.target.closest('button') || e.target.closest('svg') || e.target.closest('select') || e.target.closest('option')) {
      return;
    }
    e.preventDefault();
    isDragging = false;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    elm.classList.add('dragging');
    
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    isDragging = true;
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
    elm.classList.remove('dragging');
    if (isDragging) {
      elm.setAttribute('data-dragged', 'true');
      setTimeout(() => {
        elm.removeAttribute('data-dragged');
      }, 80);
    }
  }
};

// Helper to calculate active session duration excluding pauses
const getSessionActiveDuration = (session) => {
  if (!session.sessionStart) return 0;
  const end = session.sessionEnd || Date.now();
  let totalPause = 0;
  if (session.pauses) {
    session.pauses.forEach(p => {
      const pEnd = p.resumedAt || end;
      if (pEnd > p.pausedAt) {
        totalPause += (pEnd - p.pausedAt);
      }
    });
  }
  const net = (end - session.sessionStart) - totalPause;
  return net > 0 ? net : 0;
};

// Extend loopTimersManager with global log aggregator
window.loopTimersManager.getAllAnalyticsData = function(dbInstance) {
  const data = [];
  const seenSessions = new Set();
  
  // 1. Load persistent historical sessions
  if (typeof dbInstance.getAnalytics === 'function') {
    const persistent = dbInstance.getAnalytics();
    persistent.forEach(session => {
      const key = session.taskId + '_' + session.sessionStart;
      seenSessions.add(key);
      data.push({
        id: session.id,
        workspaceId: session.workspaceId,
        workspaceName: session.workspaceName || 'Untitled Workspace',
        chapterId: session.chapterId,
        chapterName: session.chapterName || 'Untitled Page',
        blockId: session.blockId,
        taskId: session.taskId,
        taskName: session.taskName || 'Unnamed Task',
        sessionStart: session.sessionStart,
        sessionEnd: session.sessionEnd,
        pauses: session.pauses || []
      });
    });
  }

  // 2. Load active tasks sessions (including currently running ones)
  const workspaces = dbInstance.getWorkspaces() || [];
  workspaces.forEach(ws => {
    const chapters = dbInstance.getChapters(ws.id) || [];
    chapters.forEach(ch => {
      const fullCh = dbInstance.getChapter(ch.id);
      if (fullCh && fullCh.blocks) {
        fullCh.blocks.forEach(bl => {
          if (bl.type === 'timer-widget' && bl.data && bl.data.tasks) {
            bl.data.tasks.forEach(task => {
              // Add completed history sessions from widgets
              if (task.history && task.history.length > 0) {
                task.history.forEach(session => {
                  const key = task.id + '_' + session.sessionStart;
                  if (!seenSessions.has(key)) {
                    seenSessions.add(key);
                    // Also backport this session into database analytics for persistency
                    const newSession = {
                      id: 'a-' + Math.random().toString(36).substr(2, 9),
                      workspaceId: ws.id,
                      workspaceName: ws.name,
                      chapterId: ch.id,
                      chapterName: ch.title || 'Untitled Page',
                      blockId: bl.id,
                      taskId: task.id,
                      taskName: task.name || 'Unnamed Task',
                      sessionStart: session.sessionStart,
                      sessionEnd: session.sessionEnd,
                      pauses: session.pauses || []
                    };
                    if (typeof dbInstance.addAnalyticsSession === 'function') {
                      dbInstance.addAnalyticsSession(newSession);
                    }
                    data.push(newSession);
                  }
                });
              }
              // Add active currentSession if exists (don't persist until done/reset)
              if (task.currentSession) {
                data.push({
                  workspaceId: ws.id,
                  workspaceName: ws.name,
                  chapterId: ch.id,
                  chapterName: ch.title || 'Untitled Page',
                  blockId: bl.id,
                  taskId: task.id,
                  taskName: task.name || 'Unnamed Task',
                  sessionStart: task.currentSession.sessionStart,
                  sessionEnd: task.currentSession.sessionEnd,
                  pauses: task.currentSession.pauses || []
                });
              }
            });
          }
        });
      }
    });
  });
  return data;
};

// Floating Global Analytics Dashboard
window.loopShowAnalyticsDashboard = (defaultWorkspaceId) => {
  let panel = document.getElementById('loop-timer-analytics-panel');
  const dbInstance = window.loopTimersManager.db || db;
  
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'loop-timer-analytics-panel';
    panel.className = 'loop-analytics-panel';
    document.body.appendChild(panel);
    makeDraggable(panel, panel);
  }
  
  if (!panel.style.top) {
    panel.style.top = '105px';
    panel.style.left = '105px';
  }
  
  if (!panel.dataset.tab) panel.dataset.tab = 'recent';
  if (!panel.dataset.workspaceId) panel.dataset.workspaceId = defaultWorkspaceId || 'all';
  if (!panel.dataset.sortBy) panel.dataset.sortBy = 'newest';
  
  const currentTab = panel.dataset.tab;
  const currentWorkspaceId = panel.dataset.workspaceId;
  const currentSortBy = panel.dataset.sortBy;
  
  panel.innerHTML = '';
  
  const header = document.createElement('div');
  header.className = 'loop-analytics-header';
  
  const title = document.createElement('div');
  title.className = 'loop-analytics-title';
  title.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4.2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Analytics Dashboard';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'loop-pip-btn';
  closeBtn.title = 'Close';
  closeBtn.innerHTML = closeIcon;
  closeBtn.onclick = () => panel.remove();
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'loop-analytics-body';
  panel.appendChild(body);
  
  const rawLogs = window.loopTimersManager.getAllAnalyticsData(dbInstance);
  
  let filteredLogs = rawLogs;
  if (currentWorkspaceId !== 'all') {
    filteredLogs = rawLogs.filter(log => log.workspaceId === currentWorkspaceId);
  }
  
  let totalMs = 0;
  filteredLogs.forEach(log => {
    totalMs += getSessionActiveDuration(log);
  });
  
  const formatTotalTime = (ms) => {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    if (hr > 0) {
      return hr + 'h ' + (min % 60) + 'm';
    }
    return min + 'm ' + (sec % 60) + 's';
  };
  
  const statsGrid = document.createElement('div');
  statsGrid.className = 'loop-analytics-stats-grid';
  
  const totalCard = document.createElement('div');
  totalCard.className = 'loop-analytics-stat-card';
  totalCard.innerHTML = '<div class="loop-analytics-stat-val">' + formatTotalTime(totalMs) + '</div><div class="loop-analytics-stat-lbl">Time Logged</div>';
  
  const sessionCard = document.createElement('div');
  sessionCard.className = 'loop-analytics-stat-card';
  sessionCard.innerHTML = '<div class="loop-analytics-stat-val">' + filteredLogs.length + '</div><div class="loop-analytics-stat-lbl">Sessions</div>';
  
  statsGrid.appendChild(totalCard);
  statsGrid.appendChild(sessionCard);
  body.appendChild(statsGrid);
  
  const filtersSection = document.createElement('div');
  filtersSection.className = 'loop-analytics-filters';
  
  const wsSelect = document.createElement('select');
  wsSelect.className = 'loop-analytics-select';
  wsSelect.innerHTML = '<option value="all">All Workspaces</option>';
  dbInstance.getWorkspaces().forEach(ws => {
    const selected = currentWorkspaceId === ws.id ? 'selected' : '';
    wsSelect.innerHTML += '<option value="' + ws.id + '" ' + selected + '>' + ws.name + '</option>';
  });
  wsSelect.onchange = () => {
    panel.dataset.workspaceId = wsSelect.value;
    window.loopShowAnalyticsDashboard();
  };
  
  const sortSelect = document.createElement('select');
  sortSelect.className = 'loop-analytics-select';
  sortSelect.innerHTML = 
    '<option value="newest" ' + (currentSortBy === 'newest' ? 'selected' : '') + '>Newest First</option>' +
    '<option value="oldest" ' + (currentSortBy === 'oldest' ? 'selected' : '') + '>Oldest First</option>' +
    '<option value="longest" ' + (currentSortBy === 'longest' ? 'selected' : '') + '>Longest Session</option>';
  sortSelect.onchange = () => {
    panel.dataset.sortBy = sortSelect.value;
    window.loopShowAnalyticsDashboard();
  };
  
  filtersSection.appendChild(wsSelect);
  filtersSection.appendChild(sortSelect);
  body.appendChild(filtersSection);
  
  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'loop-analytics-tabs';
  
  const tabRecent = document.createElement('div');
  tabRecent.className = 'loop-analytics-tab' + (currentTab === 'recent' ? ' active' : '');
  tabRecent.textContent = 'Recent Logs';
  tabRecent.onclick = () => {
    panel.dataset.tab = 'recent';
    window.loopShowAnalyticsDashboard();
  };
  
  const tabByDate = document.createElement('div');
  tabByDate.className = 'loop-analytics-tab' + (currentTab === 'by-date' ? ' active' : '');
  tabByDate.textContent = 'By Date';
  tabByDate.onclick = () => {
    panel.dataset.tab = 'by-date';
    window.loopShowAnalyticsDashboard();
  };
  
  const tabByWorkspace = document.createElement('div');
  tabByWorkspace.className = 'loop-analytics-tab' + (currentTab === 'by-workspace' ? ' active' : '');
  tabByWorkspace.textContent = 'By Workspace';
  tabByWorkspace.onclick = () => {
    panel.dataset.tab = 'by-workspace';
    window.loopShowAnalyticsDashboard();
  };
  
  tabsDiv.appendChild(tabRecent);
  tabsDiv.appendChild(tabByDate);
  tabsDiv.appendChild(tabByWorkspace);
  body.appendChild(tabsDiv);
  
  if (currentSortBy === 'newest') {
    filteredLogs.sort((a, b) => b.sessionStart - a.sessionStart);
  } else if (currentSortBy === 'oldest') {
    filteredLogs.sort((a, b) => a.sessionStart - b.sessionStart);
  } else if (currentSortBy === 'longest') {
    filteredLogs.sort((a, b) => getSessionActiveDuration(b) - getSessionActiveDuration(a));
  }
  
  const listContainer = document.createElement('div');
  listContainer.className = 'loop-analytics-list';
  
  if (filteredLogs.length === 0) {
    listContainer.innerHTML = '<div style="text-align:center; padding:31.5px; color:var(--text-muted); font-size:13.7px;">No session logs found. Start and complete tasks to record analytics.</div>';
  } else {
    if (currentTab === 'recent') {
      filteredLogs.forEach(log => {
        listContainer.appendChild(renderLogCard(log));
      });
    } else if (currentTab === 'by-date') {
      const groups = {};
      filteredLogs.forEach(log => {
        const dStr = new Date(log.sessionStart).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        groups[dStr] = groups[dStr] || [];
        groups[dStr].push(log);
      });
      
      Object.keys(groups).forEach(dStr => {
        const headerEl = document.createElement('div');
        headerEl.style.fontSize = '12.6px';
        headerEl.style.fontWeight = '600';
        headerEl.style.color = 'var(--primary)';
        headerEl.style.marginTop = '10.5px';
        headerEl.style.borderBottom = '1px solid rgba(124, 58, 237, 0.1)';
        headerEl.style.paddingBottom = '4.2px';
        headerEl.textContent = dStr;
        listContainer.appendChild(headerEl);
        
        groups[dStr].forEach(log => {
          listContainer.appendChild(renderLogCard(log));
        });
      });
    } else if (currentTab === 'by-workspace') {
      const groups = {};
      filteredLogs.forEach(log => {
        const wsName = log.workspaceName || 'Untitled Workspace';
        groups[wsName] = groups[wsName] || [];
        groups[wsName].push(log);
      });
      
      Object.keys(groups).forEach(wsName => {
        const headerEl = document.createElement('div');
        headerEl.style.fontSize = '12.6px';
        headerEl.style.fontWeight = '600';
        headerEl.style.color = 'var(--primary)';
        headerEl.style.marginTop = '10.5px';
        headerEl.style.borderBottom = '1px solid rgba(124, 58, 237, 0.1)';
        headerEl.style.paddingBottom = '4.2px';
        headerEl.textContent = wsName;
        listContainer.appendChild(headerEl);
        
        groups[wsName].forEach(log => {
          listContainer.appendChild(renderLogCard(log));
        });
      });
    }
  }
  
  body.appendChild(listContainer);
};

const renderLogCard = (log) => {
  const card = document.createElement('div');
  card.className = 'loop-analytics-log-card';
  card.style.position = 'relative';
  
  const dStr = new Date(log.sessionStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const endTimeStr = log.sessionEnd ? formatTimeStr(log.sessionEnd) : 'Active';
  const timeRange = formatTimeStr(log.sessionStart) + ' - ' + endTimeStr;
  const durationSecs = Math.round(getSessionActiveDuration(log) / 1000);
  const durationStr = Math.floor(durationSecs / 60) + 'm ' + (durationSecs % 60) + 's';
  
  card.innerHTML = 
    '<div class="loop-analytics-log-header" style="padding-right: 24px;">' +
      '<span>' + dStr + ' • ' + timeRange + '</span>' +
      '<span style="font-weight:700; color:var(--primary); font-family:var(--font-mono);">' + durationStr + '</span>' +
    '</div>' +
    '<div class="loop-analytics-log-task">' + log.taskName + '</div>' +
    '<div class="loop-analytics-log-meta">' +
      '<span>Workspace: ' + log.workspaceName + '</span>' +
      '<span>Page: ' + log.chapterName + '</span>' +
    '</div>';
  
  if (log.pauses && log.pauses.length > 0) {
    const pauseStrs = log.pauses.map(p => {
      const pDuration = p.resumedAt ? Math.round((p.resumedAt - p.pausedAt) / 1000) : null;
      const pDurStr = pDuration !== null ? pDuration + 's' : 'active';
      return formatTimeStr(p.pausedAt) + ' (' + pDurStr + ')';
    }).join(', ');
    
    card.innerHTML += 
      '<div class="loop-analytics-log-pauses">' +
        '<strong>Pauses:</strong> ' + pauseStrs +
      '</div>';
  }

  // Deletion logic button (only if session has completed)
  if (log.sessionEnd && log.id) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'loop-pip-btn';
    deleteBtn.title = 'Delete Log Entry';
    deleteBtn.style.position = 'absolute';
    deleteBtn.style.top = '10.5px';
    deleteBtn.style.right = '10.5px';
    deleteBtn.style.opacity = '0';
    deleteBtn.style.transition = 'opacity 0.2s';
    deleteBtn.innerHTML = trashIcon;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dbInstance = window.loopTimersManager.db || db;
      if (typeof dbInstance.deleteAnalyticsSession === 'function') {
        dbInstance.deleteAnalyticsSession(log.id);
      }
      // If the task still exists in a widget, clear its history so it doesn't get re-imported
      const workspaces = dbInstance.getWorkspaces() || [];
      workspaces.forEach(ws => {
        const chapters = dbInstance.getChapters(ws.id) || [];
        chapters.forEach(ch => {
          const fullCh = dbInstance.getChapter(ch.id);
          if (fullCh && fullCh.blocks) {
            let chUpdated = false;
            fullCh.blocks.forEach(bl => {
              if (bl.type === 'timer-widget' && bl.data && bl.data.tasks) {
                bl.data.tasks.forEach(task => {
                  if (task.id === log.taskId && task.history) {
                    const originalLength = task.history.length;
                    task.history = task.history.filter(session => session.sessionStart !== log.sessionStart);
                    if (task.history.length !== originalLength) {
                      chUpdated = true;
                    }
                  }
                });
              }
            });
            if (chUpdated) {
              dbInstance.saveChapter(fullCh);
            }
          }
        });
      });
      window.loopShowAnalyticsDashboard();
    });

    card.addEventListener('mouseenter', () => { deleteBtn.style.opacity = '1'; });
    card.addEventListener('mouseleave', () => { deleteBtn.style.opacity = '0'; });
    card.appendChild(deleteBtn);
  }
  
  return card;
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
    makeDraggable(pip, pip);
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
      pip.style.width = '67.2px';
      pip.style.height = '67.2px';
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
    
    pip.onclick = (e) => {
      if (pip.getAttribute('data-dragged') === 'true') return;
      if (pip.classList.contains('loop-pip-bubble-mode')) {
        pip.classList.remove('loop-pip-bubble-mode');
        pip.style.width = '336px';
        pip.style.height = 'auto';
        pip.style.borderRadius = '16.8px';
        window.loopUpdatePipUI();
      }
    };
  }
  
  const runningTask = currentBlock.data.tasks.find(t => t.isRunning) || currentBlock.data.tasks[0];
  if (runningTask) {
    bubble.innerHTML = timerIconLarge + \`<span style="font-size:11.5px; font-weight:bold; display:block; line-height:1; margin-top:2px;">\${formatDuration(runningTask.secondsLeft)}</span>\`;
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
      task.history = task.history || [];
      const item = document.createElement('div');
      item.className = 'loop-pip-task';
      
      const row = document.createElement('div');
      row.className = 'loop-pip-task-row';
      
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
      timeDisp.style.cursor = task.isRunning ? 'default' : 'pointer';
      timeDisp.textContent = formatDuration(task.secondsLeft);
      
      if (!task.isRunning) {
        timeDisp.title = 'Click to edit duration (min)';
        timeDisp.addEventListener('mouseenter', () => {
          timeDisp.style.background = 'rgba(124, 58, 237, 0.08)';
          timeDisp.style.borderRadius = '4.2px';
        });
        timeDisp.addEventListener('mouseleave', () => {
          timeDisp.style.background = 'transparent';
        });
        timeDisp.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const editInput = document.createElement('input');
          editInput.type = 'number';
          editInput.min = '1';
          editInput.max = '999';
          editInput.value = Math.round(task.totalSeconds / 60);
          editInput.style.width = '42px';
          editInput.style.fontSize = '11.5px';
          editInput.style.padding = '1px 2px';
          editInput.style.border = '1px solid var(--primary)';
          editInput.style.borderRadius = '4.2px';
          editInput.style.textAlign = 'center';
          editInput.style.outline = 'none';
          
          const saveNewDuration = () => {
            const val = parseInt(editInput.value, 10);
            if (!isNaN(val) && val > 0) {
              window.loopTimersManager.updateTaskState(currentChapterId, currentBlockId, task.id, { totalSeconds: val * 60, secondsLeft: val * 60 }, dbInstance);
              window.loopTimersManager.notifyListeners(currentBlockId);
            } else {
              window.loopUpdatePipUI();
            }
          };
          
          editInput.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') saveNewDuration();
            if (evt.key === 'Escape') window.loopUpdatePipUI();
          });
          
          editInput.addEventListener('blur', saveNewDuration);
          
          right.replaceChild(editInput, timeDisp);
          editInput.focus();
          editInput.select();
        });
      }
      
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
      resetBtn.title = 'Reset & Log Session';
      resetBtn.onclick = () => {
        window.loopTimersManager.stopTimer(currentChapterId, currentBlockId, task.id, dbInstance);
        
        let tTask = task;
        if (isContextValid && activeCtx.block && activeCtx.block.data && activeCtx.block.data.tasks) {
          const found = activeCtx.block.data.tasks.find(t => t.id === task.id);
          if (found) tTask = found;
        }
        
        if (tTask.currentSession) {
          tTask.currentSession.sessionEnd = Date.now();
          tTask.history = tTask.history || [];
          tTask.history.push(tTask.currentSession);
          window.loopTimersManager.getAllAnalyticsData(dbInstance);
          tTask.currentSession = null;
        }
        
        window.loopTimersManager.updateTaskState(currentChapterId, currentBlockId, task.id, { secondsLeft: tTask.totalSeconds, history: tTask.history, currentSession: null }, dbInstance);
        window.loopTimersManager.notifyListeners(currentBlockId);
      };
      
      const gearBtn = document.createElement('button');
      gearBtn.className = 'loop-timer-btn';
      gearBtn.innerHTML = gearIcon;
      gearBtn.title = 'Session Logs';
      
      gearBtn.onclick = (e) => {
        e.stopPropagation();
        window.loopShowAnalyticsDashboard(chapter.workspaceId);
      };
      
      right.appendChild(timeDisp);
      right.appendChild(startBtn);
      right.appendChild(resetBtn);
      right.appendChild(gearBtn);
      
      row.appendChild(left);
      row.appendChild(right);
      item.appendChild(row);
      body.appendChild(item);
    });
    
    const addBar = document.createElement('div');
    addBar.style.display = 'flex';
    addBar.style.gap = '8.4px';
    addBar.style.marginTop = '8.4px';
    
    const addInp = document.createElement('input');
    addInp.type = 'text';
    addInp.placeholder = 'Add task in PIP...';
    addInp.style.flex = '1';
    addInp.style.padding = '6.3px 10.5px';
    addInp.style.fontSize = '12.6px';
    addInp.style.border = '1px solid rgba(226, 232, 240, 0.8)';
    addInp.style.borderRadius = '6.3px';
    addInp.style.outline = 'none';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'loop-timer-btn loop-timer-btn-primary';
    addBtn.style.width = '31.5px';
    addBtn.style.height = '31.5px';
    addBtn.innerHTML = plusIcon;
    
    const triggerAddTask = () => {
      const text = addInp.value.trim();
      if (text) {
        const activeContext = window.loopTimersManager.activeContexts && window.loopTimersManager.activeContexts[currentBlockId];
        const newTask = {
          id: 't-' + Date.now(),
          name: text,
          completed: false,
          secondsLeft: 1500,
          totalSeconds: 1500,
          isRunning: false,
          history: [],
          currentSession: null
        };
        
        const validContext = activeContext && activeContext.editor && document.body.contains(activeContext.editor.container);
        if (validContext && activeContext.block && activeContext.block.data && activeContext.block.data.tasks) {
          activeContext.block.data.tasks.push(newTask);
          activeContext.save();
        } else {
          const ch = dbInstance.getChapter(currentChapterId);
          if (ch) {
            const bl = ch.blocks.find(b => b.id === currentBlockId);
            if (bl && bl.data && bl.data.tasks) {
              bl.data.tasks.push(newTask);
              dbInstance.saveChapter(ch);
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
        span.textContent = formatDuration(task.secondsLeft);
        
        const right = span.parentElement;
        if (right) {
          const startBtn = right.children[1];
          if (startBtn) {
            startBtn.innerHTML = task.isRunning ? pauseIcon : playIcon;
            startBtn.className = task.isRunning ? 'loop-timer-btn loop-timer-btn-primary' : 'loop-timer-btn';
          }
          
          // Render active history updates inline if history panel is currently visible
          const taskWrapper = right.parentElement.parentElement;
          if (taskWrapper) {
            const historyPanel = taskWrapper.querySelector('.loop-timer-history-panel');
            if (historyPanel && historyPanel.classList.contains('active')) {
              renderHistoryUI(task, historyPanel);
            }
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
  wrapper.style.padding = '16.8px 21px';
  wrapper.style.background = '#ffffff';
  wrapper.style.border = '1px solid var(--border-color)';
  wrapper.style.borderRadius = '12.6px';
  wrapper.style.boxShadow = 'var(--shadow-sm)';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '14.7px';
  wrapper.style.margin = '12.6px 0';
  wrapper.style.width = '100%';
  
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.borderBottom = '1px solid rgba(226, 232, 240, 0.6)';
  header.style.paddingBottom = '10.5px';
  
  const title = document.createElement('div');
  title.style.fontSize = '15.7px';
  title.style.fontWeight = '600';
  title.style.color = 'var(--text-main)';
  title.style.display = 'flex';
  title.style.alignItems = 'center';
  title.innerHTML = timerIcon + ' Tasks & Timers';
  
  const headerBtns = document.createElement('div');
  headerBtns.style.display = 'flex';
  headerBtns.style.gap = '8.4px';
  
  const pipBtn = document.createElement('button');
  pipBtn.innerHTML = pipIcon + 'Float (PIP)';
  pipBtn.style.padding = '6.3px 12.6px';
  pipBtn.style.borderRadius = '21px';
  pipBtn.style.border = '1px solid var(--primary)';
  pipBtn.style.background = 'var(--primary-light)';
  pipBtn.style.color = 'var(--primary)';
  pipBtn.style.cursor = 'pointer';
  pipBtn.style.fontWeight = '500';
  pipBtn.style.fontSize = '13.2px';
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
      pip.style.width = '336px';
      pip.style.height = 'auto';
      pip.style.borderRadius = '16.8px';
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
  listContainer.style.gap = '10.5px';
  
  block.data.tasks.forEach(task => {
    task.history = task.history || [];
    
    const itemContainer = document.createElement('div');
    itemContainer.style.display = 'flex';
    itemContainer.style.flexDirection = 'column';
    itemContainer.style.background = '#f8fafc';
    itemContainer.style.border = '1px solid var(--border-color)';
    itemContainer.style.borderRadius = '8.4px';
    itemContainer.style.padding = '8.4px 12.6px';
    
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '10.5px';
    row.style.transition = 'all 0.2s';
    
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '10.5px';
    left.style.flex = '1';
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = task.completed;
    cb.style.cursor = 'pointer';
    cb.style.width = '16.8px';
    cb.style.height = '16.8px';
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
    nameInput.style.fontSize = '14.7px';
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
    right.style.gap = '8.4px';
    
    const timeSpan = document.createElement('span');
    timeSpan.style.fontFamily = 'var(--font-mono)';
    timeSpan.style.fontSize = '15.3px';
    timeSpan.style.fontWeight = '600';
    timeSpan.style.color = 'var(--primary)';
    timeSpan.style.cursor = task.isRunning ? 'default' : 'pointer';
    timeSpan.style.padding = '2px 6.3px';
    timeSpan.style.borderRadius = '4.2px';
    timeSpan.style.minWidth = '50.4px';
    timeSpan.style.textAlign = 'right';
    
    timeSpan.textContent = formatDuration(task.secondsLeft);
    
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
        editInput.style.width = '47.2px';
        editInput.style.fontSize = '13.7px';
        editInput.style.padding = '2px 4.2px';
        editInput.style.border = '1px solid var(--primary)';
        editInput.style.borderRadius = '4.2px';
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
    resetBtn.title = 'Reset & Log Session';
    resetBtn.addEventListener('click', () => {
      window.loopTimersManager.stopTimer(chapterId, blockId, task.id, db);
      if (task.currentSession) {
        task.currentSession.sessionEnd = Date.now();
        task.history.push(task.currentSession);
        task.currentSession = null;
      }
      window.loopTimersManager.getAllAnalyticsData(db);
      task.secondsLeft = task.totalSeconds;
      save();
      window.loopTimersManager.notifyListeners(blockId);
    });
    
    const gearBtn = document.createElement('button');
    gearBtn.className = 'loop-timer-btn';
    gearBtn.innerHTML = gearIcon;
    gearBtn.title = 'Session Logs';
    
    gearBtn.addEventListener('click', () => {
      window.loopShowAnalyticsDashboard(editor.chapter.workspaceId);
    });
    
    const delBtn = document.createElement('button');
    delBtn.className = 'loop-timer-btn';
    delBtn.innerHTML = trashIcon;
    delBtn.title = 'Delete task';
    delBtn.addEventListener('click', () => {
      window.loopTimersManager.stopTimer(chapterId, blockId, task.id, db);
      if (task.currentSession) {
        task.currentSession.sessionEnd = Date.now();
        task.history.push(task.currentSession);
        task.currentSession = null;
      }
      window.loopTimersManager.getAllAnalyticsData(db);
      block.data.tasks = block.data.tasks.filter(t => t.id !== task.id);
      save();
      window.loopTimersManager.notifyListeners(blockId);
    });
    
    right.appendChild(timeSpan);
    right.appendChild(playBtn);
    right.appendChild(resetBtn);
    right.appendChild(gearBtn);
    right.appendChild(delBtn);
    
    row.appendChild(left);
    row.appendChild(right);
    
    itemContainer.appendChild(row);
    listContainer.appendChild(itemContainer);
  });
  
  wrapper.appendChild(listContainer);
  
  const addBar = document.createElement('div');
  addBar.style.display = 'flex';
  addBar.style.gap = '10.5px';
  addBar.style.marginTop = '4.2px';
  
  const addInp = document.createElement('input');
  addInp.type = 'text';
  addInp.placeholder = 'Add new task...';
  addInp.style.flex = '1';
  addInp.style.padding = '8.4px 12.6px';
  addInp.style.fontSize = '14.2px';
  addInp.style.border = '1px solid var(--border-color)';
  addInp.style.borderRadius = '6.3px';
  addInp.style.outline = 'none';
  addInp.style.background = '#f8fafc';
  
  const addBtn = document.createElement('button');
  addBtn.innerHTML = plusIcon + ' Add Task';
  addBtn.style.padding = '8.4px 14.7px';
  addBtn.style.background = 'var(--primary)';
  addBtn.style.color = '#ffffff';
  addBtn.style.border = 'none';
  addBtn.style.borderRadius = '6.3px';
  addBtn.style.cursor = 'pointer';
  addBtn.style.fontSize = '13.7px';
  addBtn.style.fontWeight = '500';
  addBtn.style.display = 'flex';
  addBtn.style.alignItems = 'center';
  addBtn.style.gap = '4.2px';
  
  const triggerAddTask = () => {
    const text = addInp.value.trim();
    if (text) {
      block.data.tasks.push({
        id: 't-' + Date.now(),
        name: text,
        completed: false,
        secondsLeft: 1500,
        totalSeconds: 1500,
        isRunning: false,
        history: [],
        currentSession: null
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
        span.textContent = formatDuration(task.secondsLeft);
      }
      const row = span ? span.parentElement : null;
      if (row) {
        const playBtn = row.children[1];
        if (playBtn) {
          playBtn.className = task.isRunning ? 'loop-timer-btn loop-timer-btn-primary' : 'loop-timer-btn';
          playBtn.innerHTML = task.isRunning ? pauseIcon : playIcon;
          playBtn.title = task.isRunning ? 'Pause' : 'Start';
        }
        
        // Render active history updates inline if history panel is currently visible
        const itemContainer = row.parentElement;
        if (itemContainer) {
          const historyPanel = itemContainer.querySelector('.loop-timer-history-panel');
          if (historyPanel && historyPanel.classList.contains('active')) {
            renderHistoryUI(task, historyPanel);
          }
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
      <span class="btn-icon" id="color-btn-circle" style="width:12px; height:12px; border-radius:50%; background:#7c3aed; margin-right:4.2px; display:inline-block; border:1px solid rgba(0,0,0,0.1);"></span>
      <span class="btn-text">Color</span>
      <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4.2px; color:var(--text-light);"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div class="dropdown-menu" id="color-dropdown-menu" style="position:absolute; top:110%; left:0; z-index:1000; display:none; grid-template-columns:repeat(5, 1fr); gap:6.3px; background:#ffffff; border:1px solid var(--border-color); border-radius:6.3px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); padding:8.4px; min-width:145px;">
      <button class="color-dot active" data-color="#7c3aed" style="width:20px; height:20px; border-radius:50%; border:2px solid var(--primary); background:#7c3aed; cursor:pointer; padding:0; box-sizing:border-box;"></button>
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
ctx.strokeStyle = '#7c3aed';

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
let currentColor = '#7c3aed';
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
    icon: '🤖',
    description: 'Provide real-time inline AI writing assistance using Groq cloud. Triggers automatically when you stop typing for 2 seconds. Press Tab to accept.',
    enabled: true,
    isBuiltIn: true,
    renderCode: `container.innerHTML = '<div style="padding:13.2px; font-size:13.7px; color:var(--text-muted); background:#fafafa; border:1px solid rgba(0,0,0,0.05); border-radius:8.4px;">🤖 AI Autocomplete is active globally on all text blocks. Configure your Groq Cloud API Key in the settings panel above. Stop typing for 2 seconds to get suggestions, and press Tab to autocomplete.</div>';`
  },
  {
    id: 'image-widget',
    name: 'Image Uploader',
    icon: '🖼️',
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
  const reader = new FileReader();
  reader.onload = (e) => {
    block.data.image = e.target.result;
    block.data.name = file.name;
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
    icon: '💬',
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
      memoryState.workspaces = JSON.parse(localStorage.getItem(WORKSPACES_KEY));
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
  }
};
