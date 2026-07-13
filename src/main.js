// IntelliNote App Main Entry Point & Controller
import './style.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { db, generateSecureId } from './db.js';
import { emoji } from './emoji.js';
import { Editor } from './editor.js';
import { search } from './search.js';
import { escapeHTML, sanitizeHTML } from './security.js';

// Expose KaTeX & security helpers globally
window.katex = katex;
window.escapeHTML = escapeHTML;
window.sanitizeHTML = sanitizeHTML;

window.loopPomodoroTimer = window.loopPomodoroTimer || {
  secondsLeft: 1500,
  totalSeconds: 1500,
  isRunning: false,
  state: 'focus', // 'focus', 'shortBreak', 'longBreak'
  cycleCount: 0,
  intervalId: null,
  activeTaskId: null,
  completedTodayCount: 0,
  startedTodayCount: 0,
  dailyTarget: 8,
  config: { focusDuration: 1500, shortBreakDuration: 300, longBreakDuration: 900, cyclesTarget: 4, autoTransitions: false },
  audioEnabled: true,
  
  // Database state cache
  dbData: null
};

// Register Service Worker for offline PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('PWA Service Worker registered:', reg.scope);
      
      // Update check
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content available, triggering service worker update.');
              db.addNotification({
                title: 'Application Update Available',
                message: 'A new version of IntelliNote has been loaded. Click here to refresh and apply updates.',
                action: 'reload_app'
              });
            }
          });
        }
      });
    }).catch(err => {
      console.log('PWA Service Worker registration failed:', err);
    });
  });
}

const PAGE_SVG_HTML = (size = 14) => `
<svg class="page-svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; display: inline-block; vertical-align: middle;">
  <path d="M6 6L14 6"></path>
  <path d="M6 10H18"></path>
  <path d="M13 14L18 14"></path>
  <path d="M13 18L18 18"></path>
  <path d="M2 21.4V2.6C2 2.26863 2.26863 2 2.6 2H18.2515C18.4106 2 18.5632 2.06321 18.6757 2.17574L21.8243 5.32426C21.9368 5.43679 22 5.5894 22 5.74853V21.4C22 21.7314 21.7314 22 21.4 22H2.6C2.26863 22 2 21.7314 2 21.4Z"></path>
  <path d="M6 18V14H9V18H6Z"></path>
  <path d="M18 2V5.4C18 5.73137 18.2686 6 18.6 6H22"></path>
</svg>
`;

// Apply dark mode theme if saved in localStorage
if (localStorage.getItem('intellinote-dark-mode') === 'true') {
  document.body.classList.add('dark-mode');
}

// App Core State
let activeWorkspaceId = null;
let activeChapterId = null;
let activeEditorInstance = null;

// Drag and drop tracking
let draggedWorkspaceId = null;
let draggedChapterId = null;

// Soothing Cover Gradient Presets
const COVER_PRESETS = [
  'linear-gradient(135deg, #b4a0f4, #8b6cf0)', // Soft Lavender
  'linear-gradient(135deg, #93b8f7, #5b8def)', // Calm Sky
  'linear-gradient(135deg, #6dd5b4, #38b089)', // Sage Mint
  'linear-gradient(135deg, #f0a0c0, #e07098)', // Blush Rose
  'linear-gradient(135deg, #f5c77e, #e5a44e)', // Warm Honey
  'linear-gradient(135deg, #2d3348, #1a1e2e)', // Soft Charcoal
  'linear-gradient(135deg, #f0a08c, #f5c8b0)', // Peach Cream
  'linear-gradient(135deg, #5a7ea0, #6e5a8e)'  // Twilight Haze
];

const PRESET_IMAGES = [
  { name: 'Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
  { name: 'Abstract', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80' },
  { name: 'Forest', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80' },
  { name: 'Office', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80' }
];

function getCoverBackgroundStyle(coverVal) {
  if (!coverVal || typeof coverVal !== 'string') return '';
  
  // Clean coverVal to prevent CSS injection by stripping semicolons, curly braces, and HTML tags
  let cleaned = coverVal.replace(/[;{}]/g, '').replace(/<\/?[^>]+(>|$)/g, '').trim();
  
  // Safe patterns:
  // 1. Check if it's a hex color or simple color name
  const hexColorRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  const colorNameRegex = /^[a-zA-Z]+$/;
  if (hexColorRegex.test(cleaned) || colorNameRegex.test(cleaned)) {
    return cleaned;
  }

  // 2. Check if it's a linear-gradient of hex colors and deg/angles
  if (cleaned.startsWith('linear-gradient') || cleaned.startsWith('gradient')) {
    if (/^[a-zA-Z0-9\s,\-#%.()]+$/.test(cleaned)) {
      return cleaned;
    }
  }

  // 3. Check if it's a url()
  let urlVal = cleaned;
  if (urlVal.startsWith('url(')) {
    const match = urlVal.match(/^url\((['"]?)(.*?)\1\)$/);
    if (match) {
      urlVal = match[2];
    } else {
      return '';
    }
  }

  // Sanitize the URL value
  urlVal = urlVal.trim();
  const lowerUrl = urlVal.toLowerCase();
  
  // Block unsafe URI schemes
  if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:text/html') || lowerUrl.includes('vbscript:') || lowerUrl.includes('file:')) {
    return '';
  }

  // Allow only valid web URLs or base64 data image URLs
  if (urlVal.startsWith('http://') || urlVal.startsWith('https://') || urlVal.startsWith('data:image/') || urlVal.startsWith('./') || urlVal.startsWith('/')) {
    return `url('${urlVal.replace(/'/g, "\\'")}')`;
  }

  // If it's a simple string like an image path without url(), treat it as a path/URL
  if (/^[a-zA-Z0-9\s_.\-\/:%?&=~+@#]+$/.test(urlVal)) {
    return `url('${urlVal}')`;
  }

  return '';
}

// Initialize DB structure
try {
  await db.init();
  updateNotificationsBadge();
} catch (e) {
  console.error("Failed to init DB:", e);
} finally {
  const loader = document.getElementById('app-loading-screen');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transform = 'scale(1.05)';
    setTimeout(() => loader.remove(), 550);
  }
}

function showNonPersistentToast(title, message, type = 'info') {
  let wrapper = document.getElementById('non-persistent-toast-container');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'non-persistent-toast-container';
    wrapper.style.position = 'fixed';
    wrapper.style.bottom = '20px';
    wrapper.style.right = '20px';
    wrapper.style.zIndex = '99999';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '10px';
    document.body.appendChild(wrapper);
  }
  
  const toast = document.createElement('div');
  toast.style.background = type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(30, 41, 59, 0.95)';
  toast.style.color = '#fff';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  toast.style.fontFamily = 'var(--font-sans)';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  toast.style.backdropFilter = 'blur(8px)';
  toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  toast.style.transition = 'all 0.3s ease';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  
  toast.innerHTML = `<strong>${title}</strong><div style="font-size:12px; margin-top:4px; font-weight:normal; opacity:0.9;">${message}</div>`;
  wrapper.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

window.addEventListener('intellinote_db_write_error', (e) => {
  const { key, error } = e.detail;
  showNonPersistentToast('Database Save Error', `Failed to write to ${key}: ${error.message}. Your local changes are temporarily cached in memory, but please verify storage permissions.`, 'error');
});

window.addEventListener('intellinote_db_sync_reload', (e) => {
  const { key } = e.detail;
  if (key === 'intellinote_workspaces') {
    renderPrimarySidebarWorkspaces();
  } else if (key === 'intellinote_chapters') {
    renderPrimarySidebarWorkspaces();
    if (activeChapterId) {
      const updatedChapter = db.getChapter(activeChapterId);
      if (updatedChapter && activeEditorInstance) {
        const isEditing = activeEditorInstance.lastEditTime && (Date.now() - activeEditorInstance.lastEditTime < 10000);
        if (!isEditing) {
          activeEditorInstance.chapter = updatedChapter;
          activeEditorInstance.blocks = JSON.parse(JSON.stringify(updatedChapter.blocks || []));
          activeEditorInstance.render();
        }
      }
    }
  } else if (key === 'intellinote_pomodoro_data') {
    const route = window.location.hash;
    if (route.startsWith('#pomodoro/')) {
      if (route === '#pomodoro/dashboard' && typeof renderPomodoroDashboard === 'function') {
        renderPomodoroDashboard();
      } else if (route === '#pomodoro/tasks' && typeof renderTasksView === 'function') {
        renderTasksView();
      } else if (route === '#pomodoro/habits' && typeof renderHabitsView === 'function') {
        renderHabitsView();
      }
    }
  } else if (key === 'intellinote_notifications') {
    updateNotificationsBadge();
  }
});

function updateNotificationsBadge() {
  const badge = document.getElementById('nav-notifications-badge');
  if (!badge) return;
  const unreadCount = db.getNotifications().filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

window.loopOnNotificationAdded = () => {
  updateNotificationsBadge();
  const dialogBody = document.getElementById('notifications-dialog-body');
  if (dialogBody) {
    drawNotificationsList(dialogBody);
  }
};

// --- Routing System ---
function handleRouting() {
  const hash = window.location.hash;
  
  emoji.closePicker();
  search.close();

  // Clear active states on primary sub-nav items
  document.querySelectorAll('.sub-nav-item').forEach(item => item.classList.remove('active'));

  if (!hash || hash === '#' || hash === '#dashboard') {
    activeWorkspaceId = null;
    activeChapterId = null;
    renderDashboard();
  } else if (hash.startsWith('#pomodoro')) {
    activeWorkspaceId = null;
    activeChapterId = null;
    const parts = hash.split('/');
    const tab = parts[1] || 'dashboard';

    // Auto-collapse primary sidebar
    const primarySidebar = document.getElementById('sidebar-primary');
    if (primarySidebar && !primarySidebar.classList.contains('collapsed')) {
      primarySidebar.classList.add('collapsed');
      localStorage.setItem('intellinote-primary-collapsed', 'true');
    }

    renderPomodoroSecondarySidebar(tab);
    renderPomodoroDashboard(tab);
    const item = document.getElementById('sub-nav-timer-widget');
    if (item) item.classList.add('active');
  } else if (hash.startsWith('#plugin-view/')) {
    activeWorkspaceId = null;
    activeChapterId = null;
    const pluginId = hash.replace('#plugin-view/', '');
    renderGenericPluginDashboard(pluginId);
    const item = document.getElementById(`sub-nav-${pluginId}`);
    if (item) item.classList.add('active');
  } else {
    const wsMatch = hash.match(/^#workspace\/([^/]+)(?:\/chapter\/([^/]+))?$/);
    if (wsMatch) {
      activeWorkspaceId = wsMatch[1];
      activeChapterId = wsMatch[2] || null;
      
      if (!activeChapterId) {
        const chapters = db.getChapters(activeWorkspaceId);
        if (chapters.length > 0) {
          window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${chapters[0].id}`;
          return;
        }
      }
      
      renderWorkspaceView();
    } else {
      window.location.hash = '#dashboard';
    }
  }
  
  renderPrimarySidebarWorkspaces();
}

window.addEventListener('hashchange', handleRouting);
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    handleRouting();
    setupPrimarySidebarEvents();
    renderPluginsSubMenu();
  });
} else {
  handleRouting();
  setupPrimarySidebarEvents();
  renderPluginsSubMenu();
}

// --- Primary Sidebar Setup ---
function setupPrimarySidebarEvents() {
  const primarySidebar = document.getElementById('sidebar-primary');
  const collapseBtn = document.getElementById('btn-collapse-sidebar');
  if (primarySidebar && collapseBtn) {
    if (localStorage.getItem('intellinote-primary-collapsed') === 'true') {
      primarySidebar.classList.add('collapsed');
    }
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = primarySidebar.classList.toggle('collapsed');
      localStorage.setItem('intellinote-primary-collapsed', isCollapsed);
    });
  }

  const createWsBtn = document.getElementById('btn-create-workspace');
  createWsBtn.addEventListener('click', () => {
    showCreateWorkspaceModal();
  });

  const searchBtn = document.getElementById('btn-nav-search');
  searchBtn.addEventListener('click', () => {
    search.show((wId, cId) => {
      if (cId) {
        window.location.hash = `#workspace/${wId}/chapter/${cId}`;
      } else {
        window.location.hash = `#workspace/${wId}`;
      }
    });
  });

  const notifyBtn = document.getElementById('btn-nav-notifications');
  notifyBtn.addEventListener('click', () => {
    showNotificationsDrawer();
  });

  const pluginsBtn = document.getElementById('btn-nav-plugins');
  if (pluginsBtn) {
    pluginsBtn.addEventListener('click', () => {
      showPluginsModal();
    });
  }

  const trashBtn = document.getElementById('btn-nav-trash');
  if (trashBtn) {
    trashBtn.addEventListener('click', () => {
      showRecycleBinModal();
    });
  }

  const importBtn = document.getElementById('btn-nav-import');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      importWorkspaceGlobal();
    });
  }
  
  const logo = document.querySelector('.loop-logo-area');
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', () => {
    window.location.hash = '#dashboard';
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchBtn.click();
    }
  });

  document.addEventListener('click', () => {
    const menu = document.getElementById('workspace-context-menu');
    if (menu) menu.remove();
  });
}

function renderPrimarySidebarWorkspaces() {
  const container = document.getElementById('sidebar-workspaces-container');
  const workspaces = db.getWorkspaces();
  
  const starredWorkspaces = workspaces.filter(w => w.starred);
  const regularWorkspaces = workspaces.filter(w => !w.starred);

  container.innerHTML = `
    <!-- Favorites Section -->
    ${starredWorkspaces.length > 0 ? `
      <div class="sidebar-section-title" style="padding-left: 14px; margin-top: 14px; margin-bottom: 6px;">Favorites</div>
      <div class="favorites-workspaces-list" id="fav-ws-drag-container">
        ${starredWorkspaces.map(w => renderWorkspaceListItemHTML(w)).join('')}
      </div>
    ` : ''}

    <!-- Workspaces Section -->
    <div class="sidebar-section-title" style="padding-left: 14px; margin-top: 14px; margin-bottom: 6px;">Workspaces</div>
    <div class="regular-workspaces-list" id="reg-ws-drag-container">
      ${regularWorkspaces.map(w => renderWorkspaceListItemHTML(w)).join('')}
    </div>
  `;

  container.querySelectorAll('.sidebar-ws-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.ws-item-more-btn')) return;
      const id = item.getAttribute('data-id');
      window.location.hash = `#workspace/${id}`;
    });

    const optBtn = item.querySelector('.ws-item-more-btn');
    optBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = item.getAttribute('data-id');
      const ws = db.getWorkspace(id);
      showWorkspaceContextMenu(optBtn, ws);
    });

    item.addEventListener('dragstart', (e) => {
      draggedWorkspaceId = item.getAttribute('data-id');
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const bounding = item.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      if (offset > bounding.height / 2) {
        item.classList.remove('drag-over-top');
        item.classList.add('drag-over-bottom');
      } else {
        item.classList.remove('drag-over-bottom');
        item.classList.add('drag-over-top');
      }
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over-top', 'drag-over-bottom');

      const sourceId = draggedWorkspaceId;
      const targetId = item.getAttribute('data-id');
      if (sourceId === targetId) return;

      const wsList = db.getWorkspaces();
      const srcIndex = wsList.findIndex(w => w.id === sourceId);
      const tgtIndex = wsList.findIndex(w => w.id === targetId);

      const bounding = item.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      let finalIndex = tgtIndex;
      if (offset > bounding.height / 2 && srcIndex > tgtIndex) {
        finalIndex = tgtIndex + 1;
      } else if (offset < bounding.height / 2 && srcIndex < tgtIndex) {
        finalIndex = tgtIndex - 1;
      }
      
      const [movedWs] = wsList.splice(srcIndex, 1);
      wsList.splice(finalIndex, 0, movedWs);

      db.saveWorkspacesOrder(wsList);
      renderPrimarySidebarWorkspaces();
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      item.removeAttribute('drag-over-top');
      item.removeAttribute('drag-over-bottom');
      draggedWorkspaceId = null;
    });
  });
}

function renderWorkspaceListItemHTML(w) {
  return `
    <div class="sidebar-ws-item ${activeWorkspaceId === w.id ? 'active' : ''}" data-id="${w.id}" draggable="true">
      <div class="ws-item-left">
        <div class="ws-icon-premium">
          ${PAGE_SVG_HTML(12)}
        </div>
        <span class="ws-item-name">${escapeHTML(w.name)}</span>
      </div>
      <div style="display:flex; align-items:center; gap: 4px;">
        ${w.starred ? '<span class="star-icon-indicator" style="font-size:11px; color:#eab308;">⭐</span>' : ''}
        <button class="ws-item-more-btn" title="Actions">•••</button>
      </div>
    </div>
  `;
}

function showWorkspaceContextMenu(anchorElement, workspace) {
  const existing = document.getElementById('workspace-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'workspace-context-menu';
  menu.className = 'loop-slash-menu-popup';
  menu.style.width = '189px';
  menu.innerHTML = `
    <div style="padding: 4.2px;">
      <button class="menu-action-btn toggle-star-btn" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; padding: 6.3px 12.6px; font-size:14.2px; border-radius:4.2px; cursor:pointer; color:var(--text-main); display:flex; gap:10.5px;">
        <span>⭐</span> ${workspace.starred ? 'Remove Star' : 'Star Workspace'}
      </button>
      <button class="menu-action-btn delete-ws-btn" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; padding: 6.3px 12.6px; font-size:14.2px; border-radius:4.2px; cursor:pointer; color:#ef4444; display:flex; gap:10.5px;">
        <span>🗑️</span> Delete Workspace
      </button>
    </div>
  `;

  document.body.appendChild(menu);

  const rect = anchorElement.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  menu.style.left = `${rect.left + window.scrollX - 140}px`;

  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  menu.querySelector('.toggle-star-btn').addEventListener('click', () => {
    workspace.starred = !workspace.starred;
    db.saveWorkspace(workspace);
    menu.remove();
    renderPrimarySidebarWorkspaces();
    if (!activeWorkspaceId) renderDashboard();
  });

  menu.querySelector('.delete-ws-btn').addEventListener('click', () => {
    menu.remove();
    confirmDeleteWorkspace(workspace);
  });
}

function confirmDeleteWorkspace(ws) {
  showConfirmationModal({
    title: 'Delete Workspace?',
    message: `Are you sure you want to permanently delete <strong>"${ws.name}"</strong>? This will delete all pages inside it. This action cannot be undone.`,
    confirmText: 'Delete Workspace',
    confirmClass: 'delete',
    onConfirm: async () => {
      await db.deleteWorkspace(ws.id);
      if (activeWorkspaceId === ws.id) {
        window.location.hash = '#dashboard';
      } else {
        renderPrimarySidebarWorkspaces();
        if (!activeWorkspaceId) renderDashboard();
      }
    }
  });
}

// --- Dashboard View Renderer ---
function renderDashboard() {
  const secSidebar = document.getElementById('sidebar-secondary');
  secSidebar.style.display = 'none';

  const mainPane = document.getElementById('main-pane');
  
  const hour = new Date().getHours();
  let greeting = 'Good Morning';
  let greetEmoji = '☀️';
  if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
    greetEmoji = '⛅';
  } else if (hour >= 17) {
    greeting = 'Good Evening';
    greetEmoji = '🌙';
  }

  const workspaces = db.getWorkspaces();

  mainPane.innerHTML = `
    <div class="loop-dashboard-view">
      <h2 class="dashboard-greeting">${greetEmoji} ${greeting}</h2>
      <p class="dashboard-subgreeting">Welcome to IntelliNote. Workspaces and chapters are saved locally and securely inside your browser.</p>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
        <div class="sidebar-section-title" style="padding-left:0; margin-bottom: 0;">Recent Workspaces</div>
        ${workspaces.length > 0 ? `<button id="btn-dashboard-import-ws-grid" class="create-new-btn" style="margin-bottom:0; padding: 6px 12px; font-size:13px; border-radius:16px; height:auto;">📥 Import Workspace</button>` : ''}
      </div>
      
      ${workspaces.length === 0 ? `
        <div class="dashboard-empty-workspaces" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 48px; border:1.5px dashed var(--border-color); border-radius: var(--radius-lg); text-align:center;">
          <div style="font-size:32px; margin-bottom: 12px;">📂</div>
          <div style="font-size: 15px; font-weight:600; margin-bottom: 4px;">No Workspaces Yet</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Create your first workspace to start writing documents.</div>
          <div style="display:flex; gap: 10px;">
            <button id="btn-dashboard-create-ws" class="create-new-btn" style="margin-bottom:0;">+ Create Workspace</button>
            <button id="btn-dashboard-import-ws" class="create-new-btn" style="margin-bottom:0; background: var(--primary-light); color: var(--primary); border-color: var(--primary);">📥 Import Workspace</button>
          </div>
        </div>
      ` : `
        <div class="dashboard-workspaces-grid">
          ${workspaces.map(w => {
            const date = new Date(w.updatedAt);
            const relativeDate = formatRelativeTime(date);
            return `
              <div class="workspace-card" data-id="${w.id}">
                <div class="workspace-card-cover" style="background: ${getCoverBackgroundStyle(w.cover) || 'var(--loop-purple-gradient)'}">
                  <div class="ws-card-icon-premium">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  <button class="ws-card-star-btn" data-id="${w.id}" title="${w.starred ? 'Starred' : 'Star'}" style="position:absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9); backdrop-filter:blur(8px); border:none; border-radius:50%; width: 28px; height: 28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; color: ${w.starred ? '#eab308' : 'var(--text-light)'}; transition:all 0.2s ease;">
                    ${w.starred ? '★' : '☆'}
                  </button>
                </div>
                <div class="workspace-card-content">
                  <div class="workspace-card-name">${escapeHTML(w.name)}</div>
                  <div class="workspace-card-date">Updated ${relativeDate}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  mainPane.querySelectorAll('.workspace-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.ws-card-star-btn')) return;
      const id = card.getAttribute('data-id');
      window.location.hash = `#workspace/${id}`;
    });

    const starBtn = card.querySelector('.ws-card-star-btn');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = starBtn.getAttribute('data-id');
        const ws = db.getWorkspace(id);
        ws.starred = !ws.starred;
        db.saveWorkspace(ws);
        renderDashboard();
        renderPrimarySidebarWorkspaces();
      });
    }
  });

  const emptyCreateBtn = document.getElementById('btn-dashboard-create-ws');
  if (emptyCreateBtn) {
    emptyCreateBtn.addEventListener('click', () => {
      showCreateWorkspaceModal();
    });
  }

  const emptyImportBtn = document.getElementById('btn-dashboard-import-ws');
  if (emptyImportBtn) {
    emptyImportBtn.addEventListener('click', () => {
      importWorkspaceGlobal();
    });
  }

  const gridImportBtn = document.getElementById('btn-dashboard-import-ws-grid');
  if (gridImportBtn) {
    gridImportBtn.addEventListener('click', () => {
      importWorkspaceGlobal();
    });
  }
}

// --- Workspace Secondary Sidebar & Chapter Renderer ---
function renderWorkspaceView() {
  const workspace = db.getWorkspace(activeWorkspaceId);
  if (!workspace) {
    window.location.hash = '#dashboard';
    return;
  }

  const secSidebar = document.getElementById('sidebar-secondary');
  secSidebar.style.display = 'flex';

  // Restore saved width from localStorage if present
  const savedWidth = localStorage.getItem('intellinote-sec-sidebar-width') || 'var(--sec-sidebar-w)';
  secSidebar.style.width = savedWidth;

  const chapters = db.getChapters(activeWorkspaceId);

  secSidebar.innerHTML = `
    <div class="sec-sidebar-header">
      <div class="sec-ws-title-container">
        <div class="sec-ws-details">
          <div class="ws-icon-premium" style="width:28px; height:28px; border-radius:8px;">
            ${PAGE_SVG_HTML(14.7)}
          </div>
          <span class="sec-ws-name">${workspace.name}</span>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <button class="sec-ws-more-btn" id="sec-ws-more-btn" title="Workspace Actions">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
          <button class="sec-ws-close-btn" id="sec-ws-close-btn" title="Close Workspace">×</button>
        </div>
      </div>
      <div class="sec-sidebar-controls">
        <span class="sort-select-label">Sorted by hierarchy</span>
        <button class="add-chapter-sidebar-btn" id="sec-add-chapter-btn" title="Add New Page">+</button>
      </div>
    </div>
    <div class="chapters-nav-list" id="chapters-nav-container">
      <!-- Dynamic list of chapters -->
    </div>
    <div class="sidebar-resize-handle" id="sec-sidebar-resize-handle"></div>
  `;

  document.getElementById('sec-ws-close-btn').addEventListener('click', () => {
    window.location.hash = '#dashboard';
  });

  document.getElementById('sec-ws-more-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    showDropdownMenu(e.currentTarget, [
      {
        icon: '📤',
        label: 'Export Workspace (JSON)',
        onClick: () => {
          exportWorkspace(activeWorkspaceId);
        }
      },
      {
        icon: '📥',
        label: 'Import Page (JSON)',
        onClick: () => {
          importPageToWorkspace(activeWorkspaceId);
        }
      }
    ]);
  });

  document.getElementById('sec-add-chapter-btn').addEventListener('click', () => {
    createNewChapter();
  });

  // Resizing mousedown logic
  const handle = document.getElementById('sec-sidebar-resize-handle');
  if (handle) {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      handle.classList.add('active');
      
      const onMouseMove = (moveEvent) => {
        const primarySidebar = document.getElementById('sidebar-primary');
        const primaryWidth = primarySidebar ? primarySidebar.getBoundingClientRect().width : 0;
        let newWidth = moveEvent.clientX - primaryWidth;
        
        const minW = 210; // Min width in pixels
        const maxW = 472.5; // Max width in pixels (1.05x scaled)
        if (newWidth < minW) newWidth = minW;
        if (newWidth > maxW) newWidth = maxW;
        
        secSidebar.style.width = `${newWidth}px`;
        localStorage.setItem('intellinote-sec-sidebar-width', `${newWidth}px`);
      };
      
      const onMouseUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        handle.classList.remove('active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  renderSecondarySidebarChapters(chapters);
  renderEditorPane();
}

function renderSecondarySidebarChapters(chapters) {
  const container = document.getElementById('chapters-nav-container');
  if (!container) return;

  if (chapters.length === 0) {
    container.innerHTML = `<div style="font-size:12px; color:var(--text-light); text-align:center; padding: 20px 0;">No pages. Click + to add.</div>`;
    return;
  }

  container.innerHTML = chapters.map(c => `
    <div class="chapter-nav-item ${activeChapterId === c.id ? 'active' : ''}" data-id="${c.id}" draggable="true">
      <div class="chapter-nav-left">
        <span class="chapter-nav-icon-container">
          ${c.emoji ? `<span class="chapter-nav-emoji">${escapeHTML(c.emoji)}</span>` : `<span class="chapter-nav-icon">${PAGE_SVG_HTML(14.7)}</span>`}
        </span>
        <span class="chapter-nav-title">${escapeHTML(c.title || 'Untitled Page')}</span>
      </div>
      <button class="chapter-nav-delete-btn" data-id="${c.id}" title="Delete Page">×</button>
    </div>
  `).join('');

  container.querySelectorAll('.chapter-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.chapter-nav-delete-btn')) return;
      const cid = item.getAttribute('data-id');
      window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${cid}`;
    });

    const delBtn = item.querySelector('.chapter-nav-delete-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = delBtn.getAttribute('data-id');
      const chap = db.getChapter(id);
      confirmDeleteChapter(chap);
    });

    item.addEventListener('dragstart', (e) => {
      draggedChapterId = item.getAttribute('data-id');
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const bounding = item.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      if (offset > bounding.height / 2) {
        item.classList.remove('drag-over-top');
        item.classList.add('drag-over-bottom');
      } else {
        item.classList.remove('drag-over-bottom');
        item.classList.add('drag-over-top');
      }
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over-top', 'drag-over-bottom');

      const sourceId = draggedChapterId;
      const targetId = item.getAttribute('data-id');
      if (sourceId === targetId) return;

      const chapList = db.getChapters(activeWorkspaceId);
      const srcIndex = chapList.findIndex(c => c.id === sourceId);
      const tgtIndex = chapList.findIndex(c => c.id === targetId);

      const bounding = item.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      let finalIndex = tgtIndex;
      if (offset > bounding.height / 2 && srcIndex > tgtIndex) {
        finalIndex = tgtIndex + 1;
      } else if (offset < bounding.height / 2 && srcIndex < tgtIndex) {
        finalIndex = tgtIndex - 1;
      }

      const [movedChap] = chapList.splice(srcIndex, 1);
      chapList.splice(finalIndex, 0, movedChap);

      db.saveChaptersOrder(chapList, activeWorkspaceId);
      renderSecondarySidebarChapters(chapList);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      item.removeAttribute('drag-over-top');
      item.removeAttribute('drag-over-bottom');
      draggedChapterId = null;
    });
  });
}

function confirmDeleteChapter(chap) {
  showConfirmationModal({
    title: 'Move Page to Recycle Bin?',
    message: `Are you sure you want to delete the page <strong>"${chap.title || 'Untitled Page'}"</strong> and move it to the recycle bin?`,
    confirmText: 'Move to Trash',
    confirmClass: 'delete',
    onConfirm: () => {
      deleteChapter(chap.id);
    }
  });
}

// --- Editor Main Pane Renderer ---
function renderEditorPane() {
  const mainPane = document.getElementById('main-pane');
  if (!activeChapterId) {
    mainPane.innerHTML = `<div class="search-dialog-empty-state">Select or create a chapter to begin editing.</div>`;
    return;
  }

  const chapter = db.getChapter(activeChapterId);
  if (!chapter) {
    mainPane.innerHTML = `<div class="search-dialog-empty-state">Chapter not found.</div>`;
    return;
  }

  const chatPlugin = (db.getPlugins() || []).find(p => p.id === 'ai-chat');
  const isChatEnabled = chatPlugin ? chatPlugin.enabled : false;

  const workspace = db.getWorkspace(activeWorkspaceId);

  mainPane.innerHTML = `
    <!-- Header Bar -->
    <header class="editor-header-bar">
      <div class="editor-breadcrumbs">
        <span>${workspace ? workspace.name : 'Workspace'}</span>
        <span class="breadcrumb-separator">></span>
        <span class="breadcrumb-active" id="editor-crumb-title">${chapter.title || 'Untitled Page'}</span>
      </div>
      <div class="editor-top-actions">
        <div class="user-avatar-badge" title="User initials: Purvesh Kolhe">PK</div>
        ${isChatEnabled ? `
        <button class="header-action-btn" id="btn-chat-ai" title="Chat with AI" style="color: var(--primary);">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        ` : ''}
        <button class="theme-toggle-btn" id="btn-theme-toggle" title="Toggle Theme">
          <svg class="theme-sun-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="m6.34 17.66-1.41 1.41"></path>
            <path d="m19.07 4.93-1.41 1.41"></path>
          </svg>
          <svg class="theme-moon-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
        </button>
        <button class="header-action-btn" id="btn-page-more" title="More Actions">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1.5"></circle>
            <circle cx="12" cy="5" r="1.5"></circle>
            <circle cx="12" cy="19" r="1.5"></circle>
          </svg>
        </button>
      </div>
    </header>

    <!-- Editor Scroll Canvas -->
    <div class="editor-scroller">
      <div class="editor-document-paper">
        <div class="editor-page-metadata">
          
          <!-- Banner Cover -->
          <div class="editor-cover-banner" id="page-cover-banner" style="${chapter.cover ? `background: ${getCoverBackgroundStyle(chapter.cover)};` : 'display: none;'}">
            <div class="cover-actions-overlay">
              <button class="cover-btn change" id="btn-change-cover">Change cover</button>
              <button class="cover-btn remove" id="btn-remove-cover">Remove cover</button>
            </div>
          </div>

          <!-- Add decorations rows -->
          <div class="page-add-decorations-row" id="page-decorations-row" style="${chapter.emoji && chapter.cover ? 'display: none;' : ''}">
            <button class="decoration-add-btn" id="btn-add-emoji-meta" style="${chapter.emoji ? 'display: none;' : ''}"><span>😀</span> Add emoji</button>
            <button class="decoration-add-btn" id="btn-add-cover-meta" style="${chapter.cover ? 'display: none;' : ''}"><span>🖼️</span> Add cover</button>
          </div>

          <!-- Large Emoji Head -->
          <div class="page-large-emoji" id="page-large-emoji" style="${chapter.emoji ? '' : 'display: none;'}">
            ${chapter.emoji || ''}
          </div>

          <!-- Title Input editable in-place -->
          <h2 class="page-editable-title" id="page-editable-title" contenteditable="true" placeholder="Untitled Page">${chapter.title || ''}</h2>
        </div>

        <!-- Block Editor Mount -->
        <div id="editor-container"></div>
        
        <!-- Bottom Spacer -->
        <div style="height: 4vh; width: 100%; flex-shrink: 0; pointer-events: none;"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('intellinote-dark-mode', isCurrentlyDark);
  });

  const chatBtn = document.getElementById('btn-chat-ai');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      toggleAiChatSidebar();
    });
  }

  // Update AI Chat sidebar context title and messages if it is currently open
  const sidebar = document.getElementById('sidebar-ai-chat');
  if (sidebar && sidebar.style.display === 'flex') {
    const titleEl = sidebar.querySelector('.chat-title');
    if (titleEl) {
      titleEl.textContent = `💬 Chat with AI (${chapter.title || 'Untitled Page'})`;
    }
    renderAiChatMessages();
  }

  document.getElementById('btn-page-more').addEventListener('click', (e) => {
    e.stopPropagation();
    showDropdownMenu(e.currentTarget, [
      {
        icon: '📤',
        label: 'Export Page (JSON)',
        onClick: () => {
          exportPage(activeChapterId);
        }
      },
      {
        icon: '🗑️',
        label: 'Delete Page',
        class: 'danger',
        onClick: () => {
          confirmDeleteChapter(chapter);
        }
      }
    ]);
  });

  const emojiHead = document.getElementById('page-large-emoji');
  const addEmojiMeta = document.getElementById('btn-add-emoji-meta');

  const updateDecorationButtonsVisibility = () => {
    const decorationsRow = document.getElementById('page-decorations-row');
    const addEmojiBtn = document.getElementById('btn-add-emoji-meta');
    const addCoverBtn = document.getElementById('btn-add-cover-meta');
    if (!decorationsRow || !addEmojiBtn || !addCoverBtn) return;
    
    if (chapter.emoji && chapter.cover) {
      decorationsRow.style.display = 'none';
    } else {
      decorationsRow.style.display = '';
      addEmojiBtn.style.display = chapter.emoji ? 'none' : '';
      addCoverBtn.style.display = chapter.cover ? 'none' : '';
    }
  };

  const triggerEmojiPicker = (element) => {
    emoji.showPicker(element, (selectedEmoji) => {
      chapter.emoji = selectedEmoji;
      db.saveChapter(chapter);
      
      emojiHead.textContent = selectedEmoji;
      emojiHead.style.display = '';
      updateDecorationButtonsVisibility();
      
      const activeSidebarItem = document.querySelector(`.chapter-nav-item[data-id="${chapter.id}"] .chapter-nav-icon-container`);
      if (activeSidebarItem) {
        activeSidebarItem.innerHTML = `<span class="chapter-nav-emoji">${escapeHTML(selectedEmoji)}</span>`;
      }
    });
  };

  emojiHead.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerEmojiPicker(emojiHead);
  });
  addEmojiMeta.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerEmojiPicker(addEmojiMeta);
  });

  const coverBanner = document.getElementById('page-cover-banner');
  const addCoverMeta = document.getElementById('btn-add-cover-meta');

  const addCover = () => {
    const preset = COVER_PRESETS[Math.floor(Math.random() * COVER_PRESETS.length)];
    chapter.cover = preset;
    db.saveChapter(chapter);
    
    coverBanner.style.background = getCoverBackgroundStyle(preset);
    coverBanner.style.display = '';
    updateDecorationButtonsVisibility();
  };

  addCoverMeta.addEventListener('click', addCover);
  
  document.getElementById('btn-remove-cover').addEventListener('click', () => {
    chapter.cover = null;
    db.saveChapter(chapter);
    coverBanner.style.display = 'none';
    updateDecorationButtonsVisibility();
  });

  document.getElementById('btn-change-cover').addEventListener('click', (e) => {
    e.stopPropagation();
    showCoverPresetDropdown(e.target, (selectedCover) => {
      chapter.cover = selectedCover;
      db.saveChapter(chapter);
      coverBanner.style.background = getCoverBackgroundStyle(selectedCover);
      updateDecorationButtonsVisibility();
    });
  });

  const titleInput = document.getElementById('page-editable-title');
  const crumbTitle = document.getElementById('editor-crumb-title');

  titleInput.addEventListener('input', () => {
    const titleVal = titleInput.textContent;
    chapter.title = titleVal;
    db.saveChapter(chapter);
    if (activeEditorInstance) {
      activeEditorInstance.lastEditTime = Date.now();
    }

    crumbTitle.textContent = titleVal || 'Untitled Page';
    const activeSidebarTitle = document.querySelector(`.chapter-nav-item[data-id="${chapter.id}"] .chapter-nav-title`);
    if (activeSidebarTitle) activeSidebarTitle.textContent = titleVal || 'Untitled Page';
  });

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeEditorInstance) {
        activeEditorInstance.focusBlock(0);
      }
    }
  });

  const editorMount = document.getElementById('editor-container');
  if (activeEditorInstance && typeof activeEditorInstance.destroy === 'function') {
    activeEditorInstance.destroy();
  }
  activeEditorInstance = new Editor(editorMount, chapter, () => {
    // Callback
  });
}

function showCoverPresetDropdown(anchorElement, onSelect) {
  const existing = document.getElementById('cover-preset-dropdown-menu');
  if (existing) existing.remove();

  const dropdown = document.createElement('div');
  dropdown.id = 'cover-preset-dropdown-menu';
  dropdown.className = 'loop-slash-menu-popup';
  dropdown.style.width = '280px';
  dropdown.innerHTML = `
    <!-- Tab Headers -->
    <div class="cover-dropdown-tabs" style="display: flex; border-bottom: 1px solid var(--border-color); padding: 4.2px 8.4px 0 8.4px; gap: 8.4px;">
      <button class="cover-tab-btn active" data-tab="colors" style="flex: 1; padding: 6.3px; font-size: 12.6px; font-weight: 600; border: none; background: transparent; border-bottom: 2px solid var(--primary); cursor: pointer; color: var(--primary); font-family: var(--font-sans);">Colors</button>
      <button class="cover-tab-btn" data-tab="images" style="flex: 1; padding: 6.3px; font-size: 12.6px; font-weight: 500; border: none; background: transparent; border-bottom: 2px solid transparent; cursor: pointer; color: var(--text-muted); font-family: var(--font-sans);">Images</button>
      <button class="cover-tab-btn" data-tab="custom" style="flex: 1; padding: 6.3px; font-size: 12.6px; font-weight: 500; border: none; background: transparent; border-bottom: 2px solid transparent; cursor: pointer; color: var(--text-muted); font-family: var(--font-sans);">Upload</button>
    </div>

    <!-- Colors Tab -->
    <div id="cover-tab-colors" class="cover-tab-content" style="padding: 12.6px;">
      <div style="font-size: 11.5px; font-weight:600; text-transform: uppercase; color: var(--text-light); margin-bottom: 8.4px;">Gradient Covers</div>
      <div class="presets-container-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6.3px;">
        ${COVER_PRESETS.map(preset => `
          <button class="preset-color-block" data-preset="${preset}" style="height: 39.9px; border-radius: 6.3px; border: 1px solid var(--border-color); cursor:pointer; background: ${preset};"></button>
        `).join('')}
      </div>
    </div>

    <!-- Images Tab -->
    <div id="cover-tab-images" class="cover-tab-content" style="padding: 12.6px; display: none;">
      <div style="font-size: 11.5px; font-weight:600; text-transform: uppercase; color: var(--text-light); margin-bottom: 8.4px;">Preset Images</div>
      <div class="presets-images-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8.4px;">
        ${PRESET_IMAGES.map(img => `
          <button class="preset-image-block" data-preset="${img.url}" style="height: 52.5px; border-radius: 6.3px; border: 1px solid var(--border-color); cursor:pointer; background: url('${img.url}') center/cover no-repeat;" title="${img.name}"></button>
        `).join('')}
      </div>
    </div>

    <!-- Custom/Upload Tab -->
    <div id="cover-tab-custom" class="cover-tab-content" style="padding: 12.6px; display: none; display: flex; flex-direction: column; gap: 10.5px;">
      <div>
        <label style="font-size: 11.5px; font-weight:600; text-transform: uppercase; color: var(--text-light); display: block; margin-bottom: 6.3px;">Image URL</label>
        <div style="display: flex; gap: 6.3px;">
          <input type="text" id="cover-custom-url-input" placeholder="Paste image link..." style="flex-grow: 1; padding: 6.3px 10.5px; border-radius: 6.3px; border: 1px solid var(--border-color); outline: none; font-size: 12.6px; font-family: var(--font-sans); background: var(--bg-secondary-sidebar); color: var(--text-main);">
          <button id="btn-apply-custom-cover" style="padding: 6.3px 10.5px; border-radius: 6.3px; border: none; background: var(--primary); color: white; font-weight: 500; font-size: 12.6px; cursor: pointer; font-family: var(--font-sans);">Apply</button>
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid var(--border-color); margin: 4.2px 0;">
      <div>
        <label style="font-size: 11.5px; font-weight:600; text-transform: uppercase; color: var(--text-light); display: block; margin-bottom: 6.3px;">Upload Local Image</label>
        <input type="file" id="cover-file-input" accept="image/*" style="display: none;">
        <button id="btn-trigger-file-upload" style="width: 100%; padding: 8.4px; border-radius: 6.3px; border: 1px dashed var(--primary); background: var(--primary-light); color: var(--primary); font-weight: 600; font-size: 12.6px; cursor: pointer; text-align: center; font-family: var(--font-sans);">Choose an image file</button>
      </div>
    </div>
  `;

  document.body.appendChild(dropdown);

  const rect = anchorElement.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
  dropdown.style.left = `${rect.left + window.scrollX - 120}px`;

  // Tab switching logic
  dropdown.querySelectorAll('.cover-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tab = btn.getAttribute('data-tab');
      
      dropdown.querySelectorAll('.cover-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--text-muted)';
        b.style.fontWeight = '500';
        b.style.borderBottomColor = 'transparent';
      });
      btn.classList.add('active');
      btn.style.color = 'var(--primary)';
      btn.style.fontWeight = '600';
      btn.style.borderBottomColor = 'var(--primary)';

      dropdown.querySelectorAll('.cover-tab-content').forEach(c => c.style.display = 'none');
      dropdown.querySelector(`#cover-tab-${tab}`).style.display = tab === 'custom' ? 'flex' : 'block';
    });
  });

  // Handle color/image preset selection
  dropdown.addEventListener('click', (e) => {
    const colorBlock = e.target.closest('.preset-color-block');
    if (colorBlock) {
      onSelect(colorBlock.getAttribute('data-preset'));
      dropdown.remove();
      return;
    }

    const imgBlock = e.target.closest('.preset-image-block');
    if (imgBlock) {
      onSelect(imgBlock.getAttribute('data-preset'));
      dropdown.remove();
      return;
    }
  });

  // Handle Custom URL Cover
  const customUrlInput = dropdown.querySelector('#cover-custom-url-input');
  const applyCustomBtn = dropdown.querySelector('#btn-apply-custom-cover');
  applyCustomBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = customUrlInput.value.trim();
    if (url) {
      onSelect(url);
      dropdown.remove();
    }
  });
  customUrlInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const url = customUrlInput.value.trim();
      if (url) {
        onSelect(url);
        dropdown.remove();
      }
    }
  });

  // Handle File Upload
  const fileInput = dropdown.querySelector('#cover-file-input');
  const triggerBtn = dropdown.querySelector('#btn-trigger-file-upload');
  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPG, PNG, GIF, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size exceeds the 5MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        onSelect(event.target.result);
        dropdown.remove();
      };
      reader.readAsDataURL(file);
    }
  });

  const dismiss = (e) => {
    if (!dropdown.contains(e.target) && e.target !== anchorElement) {
      dropdown.remove();
      document.removeEventListener('click', dismiss);
    }
  };
  setTimeout(() => document.addEventListener('click', dismiss), 10);
}

// --- Chapter Deletion Mechanic ---
function deleteChapter(id) {
  db.deleteChapter(id);
  
  if (activeChapterId === id) {
    const chapters = db.getChapters(activeWorkspaceId);
    if (chapters.length > 0) {
      window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${chapters[0].id}`;
    } else {
      window.location.hash = `#workspace/${activeWorkspaceId}`;
    }
  } else {
    const chapters = db.getChapters(activeWorkspaceId);
    renderSecondarySidebarChapters(chapters);
  }
}

// --- Create Workspace Modal ---
function showCreateWorkspaceModal() {
  const overlay = document.createElement('div');
  overlay.className = 'loop-search-modal-overlay';

  let selectedCover = COVER_PRESETS[0];

  overlay.innerHTML = `
    <div class="loop-search-dialog" style="width: 472.5px;">
      <div class="bin-header">
        <h3 class="bin-title">Create Workspace</h3>
        <button class="bin-close-btn" id="modal-close-ws">×</button>
      </div>
      <div style="padding: 25.2px; display:flex; flex-direction:column; gap:18.9px;">
        <div>
          <label style="font-size: 14.2px; font-weight:500; color: var(--text-muted); display:block; margin-bottom: 6.3px;">Workspace Name</label>
          <input type="text" id="modal-ws-name-input" placeholder="e.g. Project IntelliNote" style="width:100%; padding:10.5px 14.7px; border-radius: 8.4px; border: 1px solid var(--border-color); outline:none; font-family: var(--font-sans); font-size:16.3px;" required>
        </div>

        <div>
          <label style="font-size: 14.2px; font-weight:500; color: var(--text-muted); display:block; margin-bottom: 8.4px;">Select Cover Style</label>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6.3px;">
            ${COVER_PRESETS.map((p, idx) => `
              <button class="preset-color-block modal-cover-select ${idx === 0 ? 'active' : ''}" data-preset="${p}" style="background: ${p};"></button>
            `).join('')}
          </div>
        </div>

        <button id="modal-ws-create-btn" class="create-new-btn" style="width: 100%; margin-bottom: 0; margin-top: 10.5px;">Create Workspace</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const nameInput = overlay.querySelector('#modal-ws-name-input');
  nameInput.focus();

  const closeModal = () => overlay.remove();
  overlay.querySelector('#modal-close-ws').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  const coverBlocks = overlay.querySelectorAll('.modal-cover-select');
  coverBlocks.forEach(block => {
    block.addEventListener('click', () => {
      coverBlocks.forEach(b => b.classList.remove('active'));
      block.classList.add('active');
      selectedCover = block.getAttribute('data-preset');
    });
  });

  const createBtn = overlay.querySelector('#modal-ws-create-btn');
  createBtn.addEventListener('click', () => {
    const wsName = nameInput.value.trim();
    if (!wsName) {
      nameInput.style.borderColor = '#ef4444';
      return;
    }

    const wsId = generateSecureId('w-');
    
    const newWorkspace = {
      id: wsId,
      name: wsName,
      cover: selectedCover,
      starred: false,
      updatedAt: new Date().toISOString()
    };
    db.saveWorkspace(newWorkspace);

    // Initial page set
    const chapterId = generateSecureId('c-');
    const firstChapter = {
      id: chapterId,
      workspaceId: wsId,
      title: '', // Start empty to let user type title
      emoji: null,
      blocks: [
        { id: 'b1', type: 'text', data: '', indent: 0 }
      ],
      updatedAt: new Date().toISOString()
    };
    db.saveChapter(firstChapter);

    closeModal();
    
    renderPrimarySidebarWorkspaces();
    window.location.hash = `#workspace/${wsId}/chapter/${chapterId}`;
    
    setTimeout(() => {
      const titleInputEl = document.getElementById('page-editable-title');
      if (titleInputEl) titleInputEl.focus();
    }, 150);
  });
}

// --- Create New Chapter Helper ---
function createNewChapter() {
  const chapterId = generateSecureId('c-');
  const newChapter = {
    id: chapterId,
    workspaceId: activeWorkspaceId,
    title: '', // Start empty to let user write title
    emoji: null,
    blocks: [
      { id: generateSecureId('b-'), type: 'text', data: '', indent: 0 }
    ],
    updatedAt: new Date().toISOString()
  };
  db.saveChapter(newChapter);

  window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${chapterId}`;
  
  setTimeout(() => {
    const titleInput = document.getElementById('page-editable-title');
    if (titleInput) {
      titleInput.focus();
    }
  }, 150);
}

// --- Custom Confirmation Dialog Modal ---
function showConfirmationModal({ title, message, confirmText, confirmClass, onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'loop-search-modal-overlay';
  overlay.style.zIndex = '6000';
  
  overlay.innerHTML = `
    <div class="loop-search-dialog" style="width: 400px; padding: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text-main);">${title}</h3>
      <p style="font-size: 14.7px; line-height: 1.5; color: var(--text-muted); margin-bottom: 25.2px;">${message}</p>
      <div style="display:flex; justify-content:flex-end; gap:12.6px;">
        <button class="confirm-modal-cancel-btn" style="background:transparent; border:1px solid var(--border-color); font-family:inherit; font-size:14.2px; padding:8.4px 16.8px; border-radius:21px; cursor:pointer; color:var(--text-muted); font-weight:500;">Cancel</button>
        <button class="confirm-modal-ok-btn ${confirmClass || ''}" style="border:none; font-family:inherit; font-size:14.2px; padding:8.4px 16.8px; border-radius:21px; cursor:pointer; font-weight:500; background:${confirmClass === 'delete' ? '#ef4444' : 'var(--primary)'}; color:#fff;">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  overlay.querySelector('.confirm-modal-cancel-btn').addEventListener('click', closeModal);
  overlay.querySelector('.confirm-modal-ok-btn').addEventListener('click', () => {
    onConfirm();
    closeModal();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

// --- Recycle Bin Modal Dialog ---
function showRecycleBinModal() {
  const overlay = document.createElement('div');
  overlay.className = 'recycle-bin-modal-overlay';
  
  const drawBinContent = (dialogBody) => {
    const trash = db.getTrash();
    if (trash.length === 0) {
      dialogBody.innerHTML = `<div class="bin-empty-state">Recycle bin is empty.</div>`;
      return;
    }

    dialogBody.innerHTML = `
      <div class="bin-items-list">
        ${trash.map(c => `
          <div class="bin-item" data-id="${c.id}">
            <div class="bin-item-left">
              <span class="bin-item-icon-container">
                ${c.emoji ? `<span class="bin-item-emoji">${escapeHTML(c.emoji)}</span>` : `<span class="bin-item-icon">${PAGE_SVG_HTML(14.7)}</span>`}
              </span>
              <span class="bin-item-title">${escapeHTML(c.title || 'Untitled Page')}</span>
            </div>
            <div class="bin-actions">
              <button class="bin-action-btn restore" data-id="${c.id}">Restore</button>
              <button class="bin-action-btn delete" data-id="${c.id}">Delete forever</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    dialogBody.querySelectorAll('.bin-action-btn.restore').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        db.restoreChapter(id);
        drawBinContent(dialogBody);
        
        if (activeWorkspaceId) {
          const chapters = db.getChapters(activeWorkspaceId);
          renderSecondarySidebarChapters(chapters);
        }
      });
    });

    dialogBody.querySelectorAll('.bin-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showConfirmationModal({
          title: 'Delete Page Forever?',
          message: 'Are you sure you want to permanently delete this page? This action cannot be undone and it will be lost forever.',
          confirmText: 'Delete Forever',
          confirmClass: 'delete',
          onConfirm: () => {
            db.permanentlyDeleteChapter(id);
            drawBinContent(dialogBody);
          }
        });
      });
    });
  };

  overlay.innerHTML = `
    <div class="recycle-bin-dialog">
      <div class="bin-header">
        <h3 class="bin-title">Recycle Bin</h3>
        <button class="bin-close-btn" id="bin-close">×</button>
      </div>
      <div class="bin-content" id="bin-dialog-body"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const dialogBody = overlay.querySelector('#bin-dialog-body');
  drawBinContent(dialogBody);

  const closeModal = () => overlay.remove();
  overlay.querySelector('#bin-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

function drawNotificationsList(container) {
  const notifications = db.getNotifications();
  if (notifications.length === 0) {
    container.innerHTML = `
      <div style="padding: 42px 25.2px; text-align: center; color: var(--text-muted); font-size:14.7px;">
        <div style="font-size: 33.6px; margin-bottom: 12.6px;">🔔</div>
        <div>No notifications right now. Keep styling cozy.</div>
      </div>
    `;
    return;
  }

  // Sort by latest timestamp first
  const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; max-height: 400px; overflow-y: auto;">
      ${sorted.map(n => {
        const timeStr = new Date(n.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const icon = n.type === 'timer' ? '⏱️' : '🔔';
        return `
          <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-action="${n.action || ''}" style="cursor: pointer;">
            <span class="notification-icon">${icon}</span>
            <div class="notification-content">
              <div class="notification-title">${n.title}</div>
              <div class="notification-message">${n.message}</div>
              <div class="notification-time">${timeStr}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach click listeners to notification items
  container.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.getAttribute('data-id');
      const action = item.getAttribute('data-action');
      
      await db.markNotificationRead(id);
      
      if (action === 'reload_app') {
        window.location.reload();
      }
    });
  });
}

// --- Notifications Drawer Modal ---
function showNotificationsDrawer() {
  const overlay = document.createElement('div');
  overlay.className = 'loop-search-modal-overlay';
  overlay.innerHTML = `
    <div class="loop-search-dialog" style="width: 420px; display: flex; flex-direction: column; overflow: hidden;">
      <div class="bin-header">
        <h3 class="bin-title">Notifications</h3>
        <div class="notifications-header-actions">
          <button class="notifications-action-btn" id="notifications-mark-read">Mark all read</button>
          <button class="notifications-action-btn notifications-clear-btn" id="notifications-clear">Clear all</button>
        </div>
        <button class="bin-close-btn" id="notify-close" style="margin-left: 8px;">×</button>
      </div>
      <div id="notifications-dialog-body" style="flex-grow: 1; min-height: 200px;">
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const dialogBody = overlay.querySelector('#notifications-dialog-body');
  drawNotificationsList(dialogBody);

  overlay.querySelector('#notifications-mark-read').addEventListener('click', () => {
    db.markAllNotificationsRead();
  });

  overlay.querySelector('#notifications-clear').addEventListener('click', () => {
    db.clearNotifications();
  });

  const closeModal = () => {
    db.markAllNotificationsRead();
    overlay.remove();
  };
  overlay.querySelector('#notify-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

// --- Plugins Manager Modal ---
function showPluginsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'loop-search-modal-overlay';
  overlay.style.zIndex = '6000';

  overlay.innerHTML = `
    <div class="loop-search-dialog" style="width: 798px; height: 525px; display: flex; flex-direction: column;">
      <div class="bin-header">
        <h3 class="bin-title">🔌 Plugins Store & Manager</h3>
        <button class="bin-close-btn" id="plugins-modal-close">×</button>
      </div>
      <div style="display: flex; flex-grow: 1; overflow: hidden;">
        <!-- Left panel: list of plugins -->
        <div style="width: 294px; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background: #fafafa;">
          <div id="plugins-list-container" style="flex-grow: 1; overflow-y: auto; padding: 8.4px; display: flex; flex-direction: column; gap: 4.2px;">
            <!-- Render list of plugins here -->
          </div>
        </div>

        <!-- Right panel: plugin detail -->
        <div id="plugins-detail-pane" style="flex-grow: 1; overflow-y: auto; padding: 21px; display: flex; flex-direction: column;">
          <!-- Detail views loaded here -->
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  overlay.querySelector('#plugins-modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  const listContainer = overlay.querySelector('#plugins-list-container');
  const detailPane = overlay.querySelector('#plugins-detail-pane');

  let selectedPluginId = null;

  const renderPluginsList = () => {
    const plugins = db.getPlugins();
    listContainer.innerHTML = plugins.map(p => `
      <div class="plugin-list-item ${p.id === selectedPluginId ? 'active' : ''}" data-id="${p.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8.4px 12.6px; border-radius: 6.3px; cursor: pointer; transition: all 0.15s ease; ${p.id === selectedPluginId ? 'background: var(--primary-light-active); font-weight: 500;' : ''}">
        <div style="display: flex; align-items: center; gap: 10.5px; overflow: hidden;">
          <span style="font-size: 18.9px;">${p.icon || '🔌'}</span>
          <div style="overflow: hidden;">
            <div style="font-size: 14.2px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
            <div style="font-size: 11.1px; color: ${p.enabled ? '#059669' : 'var(--text-light)'};">${p.enabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
      </div>
    `).join('');

    listContainer.querySelectorAll('.plugin-list-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedPluginId = item.getAttribute('data-id');
        renderPluginsList();
        renderPluginDetails(selectedPluginId);
      });
    });

    if (plugins.length > 0 && !selectedPluginId) {
      selectedPluginId = plugins[0].id;
      renderPluginsList();
      renderPluginDetails(selectedPluginId);
    }
  };

  const renderPluginDetails = (id) => {
    const plugin = db.getPlugins().find(p => p.id === id);
    if (!plugin) {
      detailPane.innerHTML = '';
      return;
    }

    detailPane.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16.8px;">
        <div style="display: flex; align-items: center; gap: 12.6px;">
          <span style="font-size: 33.6px;">${plugin.icon || '🔌'}</span>
          <div>
            <h3 style="font-size: 18.9px; font-weight: 600; color: var(--text-main); margin: 0;">${plugin.name}</h3>
            <span style="font-size: 11.5px; color: var(--text-muted); background: #f1f5f9; padding: 2px 6.3px; border-radius: 4.2px;">ID: ${plugin.id}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8.4px;">
          <button id="btn-plugin-toggle" style="border: none; background: ${plugin.enabled ? '#ef4444' : 'var(--primary)'}; color: #fff; font-family: inherit; font-size: 13.2px; padding: 6.3px 12.6px; border-radius: 21px; cursor: pointer; font-weight: 500;">
            ${plugin.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
      <p style="font-size: 14.7px; color: var(--text-muted); line-height: 1.5; margin-bottom: 21px; border-bottom: 1px solid var(--border-color); padding-bottom: 12.6px;">${plugin.description}</p>
      
      ${plugin.id === 'autocomplete' ? `
        <div style="margin-bottom: 16.8px; padding: 14.7px; background: rgba(126, 108, 240, 0.05); border: 1px dashed rgba(126, 108, 240, 0.2); border-radius: 10.5px; display: flex; flex-direction: column; gap: 10.5px;">
          <div style="font-size: 13.7px; font-weight: 600; color: var(--primary);">Groq AI Integration Settings</div>
          <div style="display:flex; flex-direction:column; gap:4.2px;">
            <label style="font-size:12.1px; font-weight:500; color:var(--text-main);">Groq API Key</label>
            <input type="password" id="groq-api-key" placeholder="gsk_..." value="${db.getGroqApiKey()}" style="padding:6.3px 10.5px; font-size:13.2px; border:1px solid var(--border-color); border-radius:6.3px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4.2px;">
            <label style="font-size:12.1px; font-weight:500; color:var(--text-main);">Groq Model ID</label>
            <input type="text" id="groq-model-id" placeholder="qwen/qwen3.6-27b" value="${db.getGroqModelName()}" style="padding:6.3px 10.5px; font-size:13.2px; border:1px solid var(--border-color); border-radius:6.3px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="text-align:right;">
            <button id="btn-save-groq-config" style="padding:5.3px 12.6px; font-size:12.6px; font-weight:500; background:var(--primary); color:#ffffff; border:none; border-radius:6.3px; cursor:pointer; font-family:inherit;">Save Settings</button>
          </div>
        </div>
      ` : ''}

      ${plugin.id === 'ai-chat' ? `
        <div style="margin-bottom: 16.8px; padding: 14.7px; background: rgba(126, 108, 240, 0.05); border: 1px dashed rgba(126, 108, 240, 0.2); border-radius: 10.5px; display: flex; flex-direction: column; gap: 10.5px;">
          <div style="font-size: 13.7px; font-weight: 600; color: var(--primary);">Groq AI Chat Settings</div>
          <div style="display:flex; flex-direction:column; gap:4.2px;">
            <label style="font-size:12.1px; font-weight:500; color:var(--text-main);">Groq API Key</label>
            <input type="password" id="groq-chat-api-key" placeholder="gsk_..." value="${db.getGroqApiKey()}" style="padding:6.3px 10.5px; font-size:13.2px; border:1px solid var(--border-color); border-radius:6.3px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4.2px;">
            <label style="font-size:12.1px; font-weight:500; color:var(--text-main);">Groq Model ID</label>
            <input type="text" id="groq-chat-model-id" placeholder="meta-llama/llama-4-scout-17b-16e-instruct" value="${db.getGroqChatModelName()}" style="padding:6.3px 10.5px; font-size:13.2px; border:1px solid var(--border-color); border-radius:6.3px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="text-align:right;">
            <button id="btn-save-groq-chat-config" style="padding:5.3px 12.6px; font-size:12.6px; font-weight:500; background:var(--primary); color:#ffffff; border:none; border-radius:6.3px; cursor:pointer; font-family:inherit;">Save Settings</button>
          </div>
        </div>
      ` : ''}
    `;

    if (plugin.id === 'autocomplete') {
      detailPane.querySelector('#btn-save-groq-config').addEventListener('click', async () => {
        const keyVal = detailPane.querySelector('#groq-api-key').value.trim();
        const modelVal = detailPane.querySelector('#groq-model-id').value.trim() || 'qwen/qwen3.6-27b';
        await db.setGroqApiKey(keyVal);
        await db.setGroqModelName(modelVal);
        alert('Groq API configuration saved successfully!');
      });
    }

    if (plugin.id === 'ai-chat') {
      detailPane.querySelector('#btn-save-groq-chat-config').addEventListener('click', async () => {
        const keyVal = detailPane.querySelector('#groq-chat-api-key').value.trim();
        const modelVal = detailPane.querySelector('#groq-chat-model-id').value.trim() || 'meta-llama/llama-4-scout-17b-16e-instruct';
        await db.setGroqApiKey(keyVal);
        await db.setGroqChatModelName(modelVal);
        alert('Groq AI Chat configuration saved successfully!');
      });
    }

    detailPane.querySelector('#btn-plugin-toggle').addEventListener('click', () => {
      db.togglePlugin(id);
      renderPluginsList();
      renderPluginDetails(id);
      renderPluginsSubMenu();
      renderEditorPane();
    });
  };

  renderPluginsList();
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// --- JSON Export and Import Helpers ---

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerJSONUpload(onSuccess) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        onSuccess(data);
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

async function exportPage(chapterId) {
  const chapter = db.getChapter(chapterId);
  if (!chapter) return;

  const blocksCopy = JSON.parse(JSON.stringify(chapter.blocks || []));
  for (const block of blocksCopy) {
    if (block.data && typeof block.data === 'object' && typeof block.data.image === 'string' && block.data.image.startsWith('asset-')) {
      const assetData = await db.getAsset(block.data.image);
      if (assetData) {
        block.data.image = assetData;
      }
    }
  }

  const exportData = {
    type: 'intellinote-page',
    version: 2,
    title: chapter.title,
    emoji: chapter.emoji,
    cover: chapter.cover,
    blocks: blocksCopy
  };
  downloadJSON(exportData, `${chapter.title || 'Untitled Page'}.json`);
}

async function exportWorkspace(workspaceId) {
  const workspace = db.getWorkspace(workspaceId);
  if (!workspace) return;
  const chapters = db.getChapters(workspaceId);

  const chaptersCopy = [];
  for (const c of chapters) {
    const blocksCopy = JSON.parse(JSON.stringify(c.blocks || []));
    for (const block of blocksCopy) {
      if (block.data && typeof block.data === 'object' && typeof block.data.image === 'string' && block.data.image.startsWith('asset-')) {
        const assetData = await db.getAsset(block.data.image);
        if (assetData) {
          block.data.image = assetData;
        }
      }
    }
    chaptersCopy.push({
      title: c.title,
      emoji: c.emoji,
      cover: c.cover,
      blocks: blocksCopy
    });
  }

  const exportData = {
    type: 'intellinote-workspace',
    version: 2,
    name: workspace.name,
    cover: workspace.cover,
    starred: workspace.starred,
    chapters: chaptersCopy
  };
  downloadJSON(exportData, `${workspace.name || 'Untitled Workspace'}.json`);
}

function importPageToWorkspace(workspaceId) {
  triggerJSONUpload(async (data) => {
    if (!data || typeof data !== 'object' || data.type !== 'intellinote-page') {
      alert('Invalid file format. Please select an IntelliNote Page JSON file.');
      return;
    }
    
    const rawBlocks = Array.isArray(data.blocks) ? data.blocks : [{ id: generateSecureId('b-'), type: 'text', data: '', indent: 0 }];
    const cleanBlocks = rawBlocks.map(b => {
      if (!b || typeof b !== 'object') {
        return { id: generateSecureId('b-'), type: 'text', data: '', indent: 0 };
      }
      const clean = sanitizeBlock(b);
      clean.id = generateSecureId('b-');
      return clean;
    });

    const newChapter = {
      id: generateSecureId('c-'),
      workspaceId: workspaceId,
      title: escapeHTML(String(data.title || 'Imported Page')),
      emoji: data.emoji ? escapeHTML(String(data.emoji)) : null,
      cover: data.cover ? String(data.cover).replace(/[;{}]/g, '') : null,
      blocks: cleanBlocks,
      updatedAt: new Date().toISOString()
    };
    await db.saveChapter(newChapter);
    
    // Refresh UI
    renderWorkspaceView();
    window.location.hash = `#workspace/${workspaceId}/chapter/${newChapter.id}`;
  });
}

function importWorkspaceGlobal() {
  triggerJSONUpload(async (data) => {
    if (!data || typeof data !== 'object' || data.type !== 'intellinote-workspace') {
      alert('Invalid file format. Please select an IntelliNote Workspace JSON file.');
      return;
    }
    
    const wsId = generateSecureId('w-');
    const newWorkspace = {
      id: wsId,
      name: escapeHTML(String(data.name || 'Imported Workspace')),
      cover: data.cover ? String(data.cover).replace(/[;{}]/g, '') : null,
      starred: !!data.starred,
      updatedAt: new Date().toISOString()
    };
    await db.saveWorkspace(newWorkspace);

    // Import its chapters/pages
    let firstChapterId = null;
    if (Array.isArray(data.chapters) && data.chapters.length > 0) {
      const savePromises = [];
      data.chapters.forEach((c, idx) => {
        if (!c || typeof c !== 'object') return;
        const chapterId = generateSecureId('c-');
        if (idx === 0) firstChapterId = chapterId;
        
        const rawBlocks = Array.isArray(c.blocks) ? c.blocks : [{ id: generateSecureId('b-'), type: 'text', data: '', indent: 0 }];
        const cleanBlocks = rawBlocks.map(b => {
          if (!b || typeof b !== 'object') {
            return { id: generateSecureId('b-'), type: 'text', data: '', indent: 0 };
          }
          const clean = sanitizeBlock(b);
          clean.id = generateSecureId('b-');
          return clean;
        });

        const newChapter = {
          id: chapterId,
          workspaceId: wsId,
          title: escapeHTML(String(c.title || 'Untitled Page')),
          emoji: c.emoji ? escapeHTML(String(c.emoji)) : null,
          cover: c.cover ? String(c.cover).replace(/[;{}]/g, '') : null,
          blocks: cleanBlocks,
          updatedAt: new Date().toISOString()
        };
        savePromises.push(db.saveChapter(newChapter));
      });
      await Promise.all(savePromises);
    } else {
      // Create at least one page if the workspace is empty
      const chapterId = generateSecureId('c-');
      firstChapterId = chapterId;
      const firstChapter = {
        id: chapterId,
        workspaceId: wsId,
        title: '',
        emoji: null,
        blocks: [{ id: generateSecureId('b-'), type: 'text', data: '', indent: 0 }],
        updatedAt: new Date().toISOString()
      };
      await db.saveChapter(firstChapter);
    }

    // Refresh sidebar & route to workspace
    renderPrimarySidebarWorkspaces();
    renderDashboard();
    window.location.hash = `#workspace/${wsId}/chapter/${firstChapterId}`;
  });
}

// --- Dropdown Menu Controller ---

function showDropdownMenu(triggerBtn, items) {
  closeAllDropdowns();

  const rect = triggerBtn.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'loop-dropdown-menu';
  
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `loop-dropdown-item ${item.class || ''}`;
    btn.innerHTML = '';
    if (item.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = item.icon;
      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode(' '));
    }
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      item.onClick();
      closeAllDropdowns();
    });
    dropdown.appendChild(btn);
  });

  document.body.appendChild(dropdown);

  // Position
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;
  dropdown.style.top = `${rect.bottom + scrollY + 4}px`;
  dropdown.style.left = `${rect.right + scrollX - dropdown.offsetWidth}px`;

  // Auto-close on click outside
  const onOutsideClick = (e) => {
    if (!dropdown.contains(e.target) && e.target !== triggerBtn && !triggerBtn.contains(e.target)) {
      closeAllDropdowns();
      document.removeEventListener('click', onOutsideClick);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', onOutsideClick);
  }, 0);
}

function closeAllDropdowns() {
  document.querySelectorAll('.loop-dropdown-menu').forEach(el => el.remove());
}

// --- AI Chat Drawer Feature ---

let aiChatMessagesByChapter = {}; // chapterId -> messages array
let activeChatSession = null; // null (main page chat), or { chatId: string, blockId: string }

const formatBlockDataInline = (dataText) => {
  if (typeof dataText !== 'string') return dataText;

  let html = dataText;

  // 1. Display Math
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const decodedFormula = formula.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    if (window.katex) {
      try {
        return window.katex.renderToString(decodedFormula, { displayMode: true, throwOnError: false });
      } catch (e) {
        return `<span class="inline-math-error" title="${e.message}">$$${formula}$$</span>`;
      }
    }
    return `<span class="inline-math">$$${formula}$$</span>`;
  });

  // 2. Inline Math
  html = html.replace(/(?<![\w\\])\$([^\$\s](?:[^\$]*?[^\$\s])?)\$/g, (match, formula) => {
    const decodedFormula = formula.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    if (window.katex) {
      try {
        return window.katex.renderToString(decodedFormula, { displayMode: false, throwOnError: false });
      } catch (e) {
        return `<span class="inline-math-error" title="${e.message}">$${formula}$</span>`;
      }
    }
    return `<span class="inline-math">$${formula}$</span>`;
  });

  // 3. Inline Code: `code`
  html = html.replace(/(?<![\w\\])`([^`\s](?:[^`]*?[^`\s])?)`/g, '<code>$1</code>');

  // 4. Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 5. Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return html;
};

window.openAiChatSidebarForBlock = (chatId, blockId) => {
  activeChatSession = { chatId, blockId };
  const sidebar = document.getElementById('sidebar-ai-chat');
  if (sidebar) {
    sidebar.style.display = 'none';
    toggleAiChatSidebar();
  }
};

const renderMarkdownAndKatex = (text) => {
  if (!text) return '';

  const mathBlocks = [];
  
  // 1. Temporarily extract Display Math: \[ ... \] or $$ ... $$
  let placeholderText = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    const id = `@@MATHBLOCK_${mathBlocks.length}@@`;
    mathBlocks.push({ formula, displayMode: true });
    return id;
  });
  placeholderText = placeholderText.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const id = `@@MATHBLOCK_${mathBlocks.length}@@`;
    mathBlocks.push({ formula, displayMode: true });
    return id;
  });

  // 2. Temporarily extract Inline Math: \( ... \) or $ ... $
  placeholderText = placeholderText.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    const id = `@@MATHBLOCK_${mathBlocks.length}@@`;
    mathBlocks.push({ formula, displayMode: false });
    return id;
  });
  placeholderText = placeholderText.replace(/(?<![\w\\])\$([^\$\s](?:[^\$]*?[^\$\s])?)\$/g, (match, formula) => {
    const id = `@@MATHBLOCK_${mathBlocks.length}@@`;
    mathBlocks.push({ formula, displayMode: false });
    return id;
  });

  // 3. Escape HTML on the placeholder text
  let html = placeholderText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 4. Apply standard markdown replacements on the HTML
  // Code Blocks: ```[lang] ... ```
  html = html.replace(/```([a-zA-Z0-9-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="chat-code-block"><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline Code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Bold & Italic: **bold** & *italic*
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers: #, ##, ###
  html = html.replace(/(?:^|\n)### ([^\n]+)/g, '<h3>$1</h3>');
  html = html.replace(/(?:^|\n)## ([^\n]+)/g, '<h2>$1</h2>');
  html = html.replace(/(?:^|\n)# ([^\n]+)/g, '<h1>$1</h1>');

  // Process lines for lists, horizontal rules, and paragraphs
  const lines = html.split('\n');
  let processedLines = [];
  let inList = false;
  let listType = null; // 'ul' or 'ol'

  const closeListIfNeeded = () => {
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = null;
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeListIfNeeded();
      processedLines.push('<br>');
      return;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      closeListIfNeeded();
      processedLines.push('<hr class="chat-hr">');
      return;
    }

    // Bullet List Item
    const bulletMatch = line.match(/^(\s*)(?:-|\*|\+)\s+(.+)$/);
    if (bulletMatch) {
      if (inList && listType !== 'ul') {
        closeListIfNeeded();
      }
      if (!inList) {
        processedLines.push('<ul class="chat-ul">');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li class="chat-li">${bulletMatch[2]}</li>`);
      return;
    }

    // Numbered List Item
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numberMatch) {
      if (inList && listType !== 'ol') {
        closeListIfNeeded();
      }
      if (!inList) {
        processedLines.push('<ol class="chat-ol">');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li class="chat-li">${numberMatch[2]}</li>`);
      return;
    }

    // Paragraph
    closeListIfNeeded();
    if (trimmed.startsWith('<h1>') || trimmed.startsWith('<h2>') || trimmed.startsWith('<h3>') || trimmed.startsWith('<pre>') || trimmed.startsWith('</pre>') || trimmed.startsWith('<hr')) {
      processedLines.push(line);
    } else {
      processedLines.push(`<p class="chat-p">${line}</p>`);
    }
  });

  closeListIfNeeded();
  html = processedLines.join('\n');

  // 5. Restore Math Blocks using KaTeX
  mathBlocks.forEach((mb, index) => {
    const id = `@@MATHBLOCK_${index}@@`;
    const decodedFormula = mb.formula.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    
    let rendered = '';
    if (window.katex) {
      try {
        rendered = window.katex.renderToString(decodedFormula, { displayMode: mb.displayMode, throwOnError: false, trust: false });
      } catch (e) {
        rendered = mb.displayMode ? `<span class="math-error">$$\n${escapeHTML(mb.formula)}\n$$</span>` : `<span class="math-error">$${escapeHTML(mb.formula)}$</span>`;
      }
    } else {
      rendered = mb.displayMode ? `$$\n${escapeHTML(mb.formula)}\n$$` : `$${escapeHTML(mb.formula)}$`;
    }
    // Simple global replace
    html = html.split(id).join(rendered);
  });

  return html;
};

function getAiChatMessages() {
  if (!activeChapterId) return [];
  if (activeChatSession && activeChatSession.blockId) {
    const chapter = db.getChapter(activeChapterId);
    if (chapter && chapter.blocks) {
      const block = chapter.blocks.find(b => b.id === activeChatSession.blockId);
      if (block && block.type === 'chat-block' && block.data) {
        if (!block.data.messages) block.data.messages = [];
        return block.data.messages;
      }
    }
  }
  if (!aiChatMessagesByChapter[activeChapterId]) {
    aiChatMessagesByChapter[activeChapterId] = [];
  }
  return aiChatMessagesByChapter[activeChapterId];
}

function renderAiChatMessages() {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  const chapter = db.getChapter(activeChapterId);
  const messages = getAiChatMessages();

  messagesContainer.innerHTML = '';
  
  if (messages.length === 0) {
    const greetingDiv = document.createElement('div');
    greetingDiv.className = 'chat-message ai';
    greetingDiv.innerHTML = `Hello! I am your AI writing assistant. I can help you summarize, explain, expand, or answer questions about your current note: <strong>${escapeHTML((chapter && chapter.title) || 'Untitled Page')}</strong>.`;
    messagesContainer.appendChild(greetingDiv);
  } else {
    messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-message ${msg.role}`;
      msgDiv.innerHTML = renderMarkdownAndKatex(msg.content);
      messagesContainer.appendChild(msgDiv);
    });
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Helper to clean individual strings from base64 Data URLs and extreme lengths
const cleanStringContext = (str) => {
  if (typeof str !== 'string') return str;
  // Replace base64 Data URLs (which start with data: and are typically very long)
  let cleaned = str.replace(/data:[^;]*;base64,[^"'\s>)]+/gi, '[Base64 Data Truncated]');
  
  // Also, if the string itself is abnormally large (e.g. serialized JSON or huge lists), truncate it
  if (cleaned.length > 2000) {
    cleaned = cleaned.substring(0, 1000) + `... [Truncated block content (${str.length} chars)]`;
  }
  return cleaned;
};

// Helper to prune large base64/long strings recursively to avoid HTTP 413 Payload Too Large
const pruneLargeBase64 = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === 'string') {
        copy[key] = cleanStringContext(val);
      } else if (typeof val === 'object') {
        copy[key] = pruneLargeBase64(val);
      } else {
        copy[key] = val;
      }
    }
  }
  return copy;
};

// Helper to extract text from all blocks in the note
const getNoteTextContext = () => {
  const activeChapter = db.getChapter(activeChapterId);
  if (!activeChapter) return '';

  let text = '';
  if (activeChapter.title) {
    text += `Title: ${activeChapter.title}\n\n`;
  }
  const blocks = activeChapter.blocks || [];
  blocks.forEach(block => {
    let bText = '';
    if (typeof block.data === 'string') {
      bText = cleanStringContext(block.data);
    } else if (block.data && typeof block.data === 'object') {
      const cleanedData = pruneLargeBase64(block.data);
      if (cleanedData.code) {
        bText = `[Code Block - ${cleanedData.language || 'Plain Text'}]\n${cleanedData.code}`;
      } else if (block.type === 'table') {
        if (cleanedData.cells && Array.isArray(cleanedData.cells)) {
          bText = cleanedData.cells.map(row => row.join(' | ')).join('\n');
        }
      } else if (block.type === 'equation') {
        bText = `[Equation] ${cleanedData.latex || ''}`;
      } else if (block.type === 'youtube-widget') {
        bText = `[YouTube Video] ${cleanedData.url || ''}`;
      } else if (block.type === 'image-widget') {
        bText = `[Image Upload] ${cleanedData.name || ''}`;
      } else {
        bText = `[Widget - ${block.type}] ${JSON.stringify(cleanedData)}`;
      }
    }
    if (bText) {
      // Strip HTML tag attributes / formatting tags
      const cleanVal = bText.replace(/<\/?[^>]+(>|$)/g, "");
      text += cleanVal + '\n';
    }
  });
  return text.trim();
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') return sanitizeHTML(item);
      if (typeof item === 'object') return sanitizeObject(item);
      return item;
    });
  }
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === 'string') {
        if (val.startsWith('data:image/') || val.startsWith('asset-')) {
          result[key] = val;
        } else {
          result[key] = sanitizeHTML(val);
        }
      } else if (typeof val === 'object' && val !== null) {
        result[key] = sanitizeObject(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
};

const sanitizeBlock = (block) => {
  const id = block.id || generateSecureId('b-');
  let type = block.type || 'text';
  let data = block.data;

  // Auto-transform text blocks containing markdown prefixes if generated by AI
  if (type === 'text' && typeof data === 'string') {
    if (data.startsWith('# ')) {
      type = 'heading-1';
      data = data.substring(2);
    } else if (data.startsWith('## ')) {
      type = 'heading-2';
      data = data.substring(3);
    } else if (data.startsWith('### ')) {
      type = 'heading-3';
      data = data.substring(4);
    } else if (data.startsWith('- ') || data.startsWith('* ')) {
      type = 'bullet-list';
      data = data.substring(2);
    } else if (data.startsWith('1. ')) {
      type = 'number-list';
      data = data.substring(3);
    } else if (data.startsWith('> ')) {
      type = 'quote';
      data = data.substring(2);
    }
  }

  if (type === 'code') {
    if (typeof data === 'string') {
      data = {
        code: data,
        language: block.language || 'JavaScript',
        lineNumbers: block.lineNumbers !== false
      };
    } else if (data && typeof data === 'object') {
      data = {
        code: data.code || '',
        language: data.language || block.language || 'JavaScript',
        lineNumbers: data.lineNumbers !== false
      };
    } else {
      data = { code: '', language: 'JavaScript', lineNumbers: true };
    }
  } else if (type === 'equation') {
    if (typeof data === 'string') {
      data = { latex: data };
    } else if (data && typeof data === 'object') {
      data = { latex: data.latex || '' };
    } else {
      data = { latex: '' };
    }
  } else if (type === 'table') {
    let rows = [['Header 1', 'Header 2'], ['', '']];
    if (Array.isArray(data)) {
      rows = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.rows)) {
      rows = data.rows;
    }
    data = {
      rows: rows.map(row => 
          Array.isArray(row) ? row.map(cell => sanitizeHTML(String(cell || ''))) : []
      )
    };
  } else if (type === 'chat-block') {
    let chatId = generateSecureId('chat-');
    let title = 'AI Chat Thread';
    let messages = [];
    if (data && typeof data === 'object') {
      chatId = data.chatId || chatId;
      title = data.title || title;
      messages = Array.isArray(data.messages) ? data.messages : [];
    } else {
      chatId = block.chatId || chatId;
      title = block.title || title;
      messages = Array.isArray(block.messages) ? block.messages : [];
    }
    data = {
      chatId: String(chatId),
      title: escapeHTML(String(title)),
      messages: messages.map(msg => ({
        role: String(msg.role === 'user' ? 'user' : 'ai'),
        content: sanitizeHTML(String(msg.content || ''))
      }))
    };
  } else {
    // Standard text types or custom plugins/widgets
    if (typeof data === 'string') {
      data = sanitizeHTML(formatBlockDataInline(data));
    } else if (data && typeof data === 'object') {
      data = sanitizeObject(data);
    } else {
      data = '';
    }
  }
  const result = { id, type, data };
  if (block.indent !== undefined) result.indent = block.indent;
  if (block.checked !== undefined) result.checked = block.checked;
  if (block.emoji !== undefined) result.emoji = block.emoji;
  return result;
};

function toggleAiChatSidebar() {
  const sidebar = document.getElementById('sidebar-ai-chat');
  if (!sidebar) return;

  if (sidebar.style.display === 'flex') {
    sidebar.style.display = 'none';
    return;
  }

  // If activeChapterId is missing, do nothing
  if (!activeChapterId) return;
  const chapter = db.getChapter(activeChapterId);
  if (!chapter) return;

  let titleText = `💬 Chat with AI (${chapter.title || 'Untitled Page'})`;
  let showBackButton = false;

  if (activeChatSession && activeChatSession.blockId) {
    const block = chapter.blocks.find(b => b.id === activeChatSession.blockId);
    if (block && block.type === 'chat-block') {
      titleText = `💬 ${block.data.title || 'AI Chat Thread'}`;
      showBackButton = true;
    }
  }

  sidebar.innerHTML = `
    <div class="sidebar-resize-handle" id="chat-sidebar-resize-handle" style="left: -4px; right: auto; width: 8px; z-index: 1000;"></div>
    <div class="chat-header" style="display:flex; align-items:center; gap:8.4px;">
      ${showBackButton ? `
        <button class="chat-back-btn" id="chat-back-to-main" title="Back to Page Chat" style="border:none; background:transparent; font-size:16px; cursor:pointer; padding:0; margin:0; display:flex; align-items:center; justify-content:center; color:var(--text-muted); width:24px; height:24px; border-radius:50%;">←</button>
      ` : ''}
      <h3 class="chat-title" style="flex-grow:1; margin:0; font-size:14.7px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${titleText}</h3>
      ${!showBackButton ? `
        <button class="chat-save-to-page-btn" id="chat-save-to-page" title="Save Chat to Page" style="border:none; background:transparent; font-size:15px; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; color:var(--primary); width:24px; height:24px;">📥</button>
      ` : ''}
      <button class="chat-close-btn" id="chat-close">&times;</button>
    </div>
    <div class="chat-messages-container" id="chat-messages">
      <!-- Messages render here -->
    </div>
    <div class="chat-input-area">
      <textarea class="chat-textarea" id="chat-input" placeholder="Ask about this note..." rows="1"></textarea>
      <button class="chat-send-btn" id="chat-send" title="Send Message">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  `;

  // Restore saved width from localStorage if present
  const savedWidth = localStorage.getItem('intellinote-chat-sidebar-width') || '350px';
  sidebar.style.width = savedWidth;

  sidebar.style.display = 'flex';

  const closeBtn = sidebar.querySelector('#chat-close');
  const messagesContainer = sidebar.querySelector('#chat-messages');
  const inputEl = sidebar.querySelector('#chat-input');
  const sendBtn = sidebar.querySelector('#chat-send');

  closeBtn.addEventListener('click', () => {
    sidebar.style.display = 'none';
  });

  // Chat sidebar resizing mousedown logic
  const resizeHandle = sidebar.querySelector('#chat-sidebar-resize-handle');
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      resizeHandle.classList.add('active');

      const startWidth = sidebar.getBoundingClientRect().width;
      const startX = e.clientX;

      const onMouseMove = (moveEvent) => {
        let newWidth = startWidth + (startX - moveEvent.clientX);
        const minW = 250;
        const maxW = 600;
        if (newWidth < minW) newWidth = minW;
        if (newWidth > maxW) newWidth = maxW;

        sidebar.style.width = `${newWidth}px`;
        localStorage.setItem('intellinote-chat-sidebar-width', `${newWidth}px`);
      };

      const onMouseUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        resizeHandle.classList.remove('active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  if (showBackButton) {
    const backBtn = sidebar.querySelector('#chat-back-to-main');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        activeChatSession = null;
        sidebar.style.display = 'none';
        toggleAiChatSidebar();
      });
    }
  } else {
    const saveToPageBtn = sidebar.querySelector('#chat-save-to-page');
    if (saveToPageBtn) {
      saveToPageBtn.addEventListener('click', () => {
        const msgs = aiChatMessagesByChapter[activeChapterId] || [];
        if (msgs.length === 0) {
          alert('Cannot save empty chat. Send a message first!');
          return;
        }
        const chapter = db.getChapter(activeChapterId);
        if (chapter) {
          const newId = generateSecureId('b-');
          const newBlock = {
            id: newId,
            type: 'chat-block',
            data: {
              chatId: generateSecureId('chat-'),
              title: `Saved Chat: ${chapter.title || 'Untitled Page'}`,
              messages: JSON.parse(JSON.stringify(msgs))
            }
          };
          if (!chapter.blocks) chapter.blocks = [];
          chapter.blocks.push(newBlock);
          db.saveChapter(chapter);
          renderEditorPane();
          alert('Chat saved as a block at the bottom of the page!');
        }
      });
    }
  }

  // Auto-resize textarea heights
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
  });

  renderAiChatMessages();

  const handleSendMessage = () => {
    const text = inputEl.value.trim();
    if (!text) return;

    // Add user message to memory
    const messages = getAiChatMessages();
    messages.push({ role: 'user', content: text });
    if (activeChatSession && activeChatSession.blockId) {
      const chapter = db.getChapter(activeChapterId);
      db.saveChapter(chapter);
      renderEditorPane();
    }
    renderAiChatMessages();

    // Reset input
    inputEl.value = '';
    inputEl.style.height = 'auto';

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-typing-indicator';
    typingIndicator.id = 'chat-typing-loader';
    typingIndicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const apiKey = db.getGroqApiKey();
    if (!apiKey) {
      typingIndicator.remove();
      const errDiv = document.createElement('div');
      errDiv.className = 'chat-message error';
      errDiv.textContent = '⚠️ Groq API Key is not configured. Please configure it in the settings panel (under Plugins > Chat with AI or AI Autocomplete settings).';
      messagesContainer.appendChild(errDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      return;
    }

    // Build the request body with note context
    const noteContext = getNoteTextContext();
    
    // Prepare API call payload
    const systemPrompt = `You are a helpful AI assistant integrated into a note-taking application. You have access to the user's current note content below. Answer the user's questions about the note or general questions in a helpful, friendly, and concise manner. Do not include reasoning <think> blocks in your final response. Keep your answers concise, complete, and strictly under 1000 tokens.

IMPORTANT: If the user asks you to edit, format, delete, or restructure their current note (e.g., "delete everything and add...", "rename the page to...", "add a bullet list about...", "insert a javascript code block..."), you must output a special JSON payload at the very end of your response to perform the action.
The payload must be prefixed by the exact marker: [NOTE_EDIT_ACTION]
The payload structure must be a single JSON object:
{
  "title": "Updated Title" (optional, specify only if renaming/changing the title),
  "blocks": [
    {
      "type": "text" | "heading-1" | "heading-2" | "heading-3" | "bullet-list" | "number-list" | "checklist" | "code" | "table" | "equation" | "quote" | "callout" | "divider",
      "data": string | object,
      "indent": number (optional, nesting level),
      "checked": boolean (optional, for checklists),
      "emoji": string (optional, for callouts)
    }
  ] (optional, specify only if editing/replacing the blocks)
}

For standard text, heading-1, heading-2, heading-3, bullet-list, number-list, checklist, quote, callout blocks: "data" must be a string containing the text content.
For "divider" blocks: "data" can be omitted.
For "code" blocks: "data" must be an object with {"code": "...", "language": "..."}.
For "table" blocks: "data" must be an object with {"rows": [["cell1", "cell2"], ...]} (array of arrays).
For "equation" blocks: "data" must be an object with {"latex": "..."} (LaTeX string, e.g. "\\\\sum_{i=1}^n i").

Example output if asked to delete everything and write notes about programming:
Sure! I have updated the page with programming notes.
[NOTE_EDIT_ACTION]
{
  "title": "Why Programming Matters",
  "blocks": [
    { "type": "heading-1", "data": "Why We Need to Do Programming" },
    { "type": "text", "data": "Programming is a crucial skill for modern problem solving." }
  ]
}

Always keep the conversation natural, but append the JSON payload with [NOTE_EDIT_ACTION] at the end when modifications are needed. Make sure the JSON is valid.`;

    const contextPrompt = `Here is the content of the current note:\n---\n${noteContext}\n---`;

    const requestMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: contextPrompt }
    ];

    // Add session history
    messages.forEach(msg => {
      requestMessages.push({ role: msg.role === 'ai' ? 'assistant' : msg.role, content: msg.content });
    });

    let modelName = db.getGroqChatModelName();
    if (!modelName || modelName === 'openai/gpt-oss-120b') {
      modelName = 'meta-llama/llama-4-scout-17b-16e-instruct';
    }

    const reqBody = {
      model: modelName,
      messages: requestMessages,
      temperature: 1,
      max_completion_tokens: 1000,
      top_p: (modelName === 'openai/gpt-oss-120b' || modelName === 'meta-llama/llama-4-scout-17b-16e-instruct') ? 1 : 0.95
    };
    if (modelName === 'openai/gpt-oss-120b') {
      reqBody.reasoning_effort = 'low';
    } else if (modelName.includes('qwen')) {
      reqBody.reasoning_effort = 'none';
      reqBody.temperature = 0.6;
    }

    console.log("[AI Chat] Payload length:", JSON.stringify(reqBody).length, "Messages:", JSON.parse(JSON.stringify(requestMessages)), "Body:", reqBody);

    fetch('/api/groq/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reqBody)
    })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => {
          throw new Error('API returned HTTP ' + res.status + ': ' + text);
        });
      }
      return res.json();
    })
    .then(data => {
      typingIndicator.remove();
      if (data && data.choices && data.choices[0]) {
        let responseText = data.choices[0].message?.content || '';
        
        // Strip out <think> tags if reasoning model returns them
        responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '');
        responseText = responseText.replace(/<think>[\s\S]*/gi, ''); // Handle unclosed think tags
        responseText = responseText.trim();

        if (responseText) {
          let userText = responseText;
          let actionJson = null;

          if (responseText.includes('[NOTE_EDIT_ACTION]')) {
            const parts = responseText.split('[NOTE_EDIT_ACTION]');
            userText = parts[0].trim();
            const jsonStr = parts.slice(1).join('[NOTE_EDIT_ACTION]').trim();
            try {
              actionJson = JSON.parse(jsonStr);
            } catch (e) {
              console.error('[AI Chat] Failed to parse action JSON:', e, jsonStr);
              // Try to extract JSON if there's trailing junk
              const firstBrace = jsonStr.indexOf('{');
              const lastBrace = jsonStr.lastIndexOf('}');
              if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                try {
                  actionJson = JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
                } catch (e2) {
                  console.error('[AI Chat] Fallback JSON parse failed:', e2);
                }
              }
            }
          }

          if (actionJson) {
            const chapter = db.getChapter(activeChapterId);
            if (chapter) {
              let changed = false;
              if (actionJson.title !== undefined) {
                chapter.title = actionJson.title;
                changed = true;
              }
              if (Array.isArray(actionJson.blocks)) {
                chapter.blocks = actionJson.blocks.map(sanitizeBlock);
                changed = true;
              }
              if (changed) {
                db.saveChapter(chapter);
                renderEditorPane();
                const chapters = db.getChapters(activeWorkspaceId);
                renderSecondarySidebarChapters(chapters);
              }
            }
          }

          messages.push({ role: 'ai', content: userText });
          if (activeChatSession && activeChatSession.blockId) {
            const chapter = db.getChapter(activeChapterId);
            db.saveChapter(chapter);
            renderEditorPane();
          }
          renderAiChatMessages();
        } else {
          throw new Error('Received empty response content.');
        }
      } else {
        throw new Error('Invalid response payload format.');
      }
    })
    .catch(err => {
      typingIndicator.remove();
      console.error('[AI Chat] Fetch failed:', err);
      const errDiv = document.createElement('div');
      errDiv.className = 'chat-message error';
      errDiv.textContent = `❌ Error: Failed to communicate with the Groq API (${err.message}). Please check your network connection, API Key, or model settings.`;
      messagesContainer.appendChild(errDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  };

  sendBtn.addEventListener('click', handleSendMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

// --- Plugins primary sidebar sub-navigation ---
function renderPluginsSubMenu() {
  const container = document.getElementById('plugins-sub-menu');
  if (!container) return;

  const timerPlugin = db.getPlugins().find(p => p.id === 'timer-widget');
  if (timerPlugin && timerPlugin.enabled) {
    container.innerHTML = `
      <a href="#pomodoro" class="sub-nav-item" data-id="timer-widget" id="sub-nav-timer-widget">
        <span class="sub-nav-item-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="plugin-svg-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <span class="nav-item-text">${timerPlugin.name}</span>
      </a>
    `;
  } else {
    container.innerHTML = '';
  }
}

function renderGenericPluginDashboard(pluginId) {
  const mainPane = document.getElementById('main-pane');
  const secSidebar = document.getElementById('sidebar-secondary');
  secSidebar.style.display = 'none';

  const plugin = db.getPlugins().find(p => p.id === pluginId);
  if (!plugin) {
    mainPane.innerHTML = `<div class="search-dialog-empty-state">Plugin not found.</div>`;
    return;
  }

  mainPane.innerHTML = `
    <div style="padding: 32px; max-width: 800px; margin: 0 auto; font-family: var(--font-sans), sans-serif; color: var(--text-main);">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
        <span style="font-size: 48px;">${plugin.icon || '🔌'}</span>
        <div>
          <h2 style="font-size: 24px; font-weight: 700; margin: 0;">${plugin.name}</h2>
          <span style="font-size: 12px; color: var(--text-muted); background: var(--border-color); padding: 2px 6px; border-radius: 4px; font-family: monospace;">ID: ${plugin.id}</span>
        </div>
      </div>
      <p style="font-size: 15px; line-height: 1.6; color: var(--text-muted); margin-bottom: 32px;">${plugin.description}</p>
      <div style="padding: 24px; border: 1.5px dashed var(--border-color); border-radius: 12px; text-align: center; background: rgba(0,0,0,0.01);">
        <div style="font-size: 32px; margin-bottom: 12px;">⚙️</div>
        <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600;">Active Global Plugin</h4>
        <p style="margin: 0; font-size: 13px; color: var(--text-muted);">This plugin runs globally and does not require a dedicated configuration dashboard page.</p>
      </div>
    </div>
  `;
}

// --- Background Pomodoro & Habits Engine ---


// Web Audio chime synthesizer
function playPomoChime(type) {
  if (!window.loopPomodoroTimer.audioEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioCtx) return;

    if (type === 'complete') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, audioCtx.currentTime); // E6
        gain2.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 1.5);
      }, 150);
    } else if (type === 'start') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.4); // C6
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'warning') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    }
  } catch (err) {
    console.warn("Web Audio synthesis failed:", err);
  }
}

async function initPomodoroEngine() {
  if (!window.loopPomodoroTimer.dbData) {
    window.loopPomodoroTimer.dbData = await db.getPomodoroData();
    const d = window.loopPomodoroTimer.dbData;
    // Migration: Force clear legacy demo sessions to start completely raw
    if (!d.migrationV3RawCleaned) {
      d.sessions = [];
      d.completedTodayCount = 0;
      d.migrationV3RawCleaned = true;
      await db.savePomodoroData(d);
    }

    // Reset database to completely raw clean start state
    if (!d.migrationV6RawStartCleaned) {
      d.dailyTarget = 8;
      d.completedTodayCount = 0;
      d.lastSessionDate = null;
      d.sessions = [];
      d.tasks = [
        { id: 't-q4', name: 'Q4 Product Launch', status: 'in_progress', parentId: null, tags: ['Design', 'Admin'], timeSpent: 0 },
        { id: 't-q4-1', name: 'Finalize landing page copy', status: 'in_progress', parentId: 't-q4', tags: ['Writing'], timeSpent: 0 },
        { id: 't-q4-1a', name: 'Write hero section', status: 'pending', parentId: 't-q4-1', tags: ['Writing'], timeSpent: 0 },
        { id: 't-web', name: 'Personal Website Redesign', status: 'pending', parentId: null, tags: ['Design', 'Dev'], timeSpent: 0 }
      ];
      d.habits = [
        { id: 'h-1', name: 'Hydration', type: 'positive', frequency: 'daily', logs: {}, streak: 0, bestStreak: 0 },
        { id: 'h-2', name: 'Read 20 pages', type: 'positive', frequency: 'daily', logs: {}, streak: 0, bestStreak: 0 },
        { id: 'h-3', name: 'Stretching', type: 'positive', frequency: 'daily', logs: {}, streak: 0, bestStreak: 0 }
      ];
      d.migrationV6RawStartCleaned = true;
      await db.savePomodoroData(d);
    }

    // Reset database to completely raw clean start state with Priority tags only
    if (!d.migrationV7PriorityCleaned) {
      d.dailyTarget = 8;
      d.completedTodayCount = 0;
      d.lastSessionDate = null;
      d.sessions = [];
      d.tasks = [
        { id: 't-q4', name: 'Q4 Product Launch', status: 'in_progress', parentId: null, tags: ['High Priority'], timeSpent: 0 },
        { id: 't-q4-1', name: 'Finalize landing page copy', status: 'in_progress', parentId: 't-q4', tags: ['Medium Priority'], timeSpent: 0 },
        { id: 't-q4-1a', name: 'Write hero section', status: 'pending', parentId: 't-q4-1', tags: ['Medium Priority'], timeSpent: 0 },
        { id: 't-web', name: 'Personal Website Redesign', status: 'pending', parentId: null, tags: ['Low Priority'], timeSpent: 0 }
      ];
      d.habits = [
        { id: 'h-1', name: 'Hydration', type: 'positive', frequency: 'daily', logs: {}, streak: 0, bestStreak: 0 },
        { id: 'h-2', name: 'Read 20 pages', type: 'positive', frequency: 'daily', logs: {}, streak: 0, bestStreak: 0 },
        { id: 'h-3', name: 'Stretching', type: 'positive', frequency: 'daily', logs: {}, streak: 0, bestStreak: 0 }
      ];
      d.migrationV7PriorityCleaned = true;
      await db.savePomodoroData(d);
    }

    const todayStr = new Date().toDateString();

    // Reset with predefined mock data if completely empty
    if ((!d.tasks || d.tasks.length === 0) && (!d.habits || d.habits.length === 0)) {
      d.dailyTarget = 6;
      d.completedTodayCount = 4;
      d.lastSessionDate = todayStr;
      d.tasks = [
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
      ];
      d.habits = [
        {
          id: 'h-1',
          name: 'Hydration',
          type: 'positive',
          frequency: 'daily',
          logs: {
            [todayStr]: true,
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
      ];
      await db.savePomodoroData(d);
    }
    
    // Sync configurations
    if (d.timerConfig) {
      window.loopPomodoroTimer.config = d.timerConfig;
    }
    if (d.dailyTarget) {
      window.loopPomodoroTimer.dailyTarget = d.dailyTarget;
    }
    
    // Check if day changed
    if (d.lastSessionDate !== todayStr) {
      d.completedTodayCount = 0;
      d.lastSessionDate = todayStr;
      await db.savePomodoroData(d);
    }
    window.loopPomodoroTimer.completedTodayCount = d.completedTodayCount || 0;
    
    // Calculate started sessions count
    const todaySessions = (d.sessions || []).filter(s => new Date(s.timestamp).toDateString() === todayStr);
    window.loopPomodoroTimer.startedTodayCount = todaySessions.length;
    
    window.loopPomodoroTimer.secondsLeft = window.loopPomodoroTimer.config.focusDuration;
    window.loopPomodoroTimer.totalSeconds = window.loopPomodoroTimer.config.focusDuration;
  }
}

// Background ticker loop
function startBackgroundPomoTicker() {
  if (window.loopPomodoroTimer.intervalId) return;

  window.loopPomodoroTimer.intervalId = setInterval(async () => {
    const t = window.loopPomodoroTimer;
    if (!t.isRunning) return;

    t.secondsLeft--;
    
    // Trigger tick warnings for last 3 seconds
    if (t.secondsLeft > 0 && t.secondsLeft <= 3) {
      playPomoChime('warning');
    }

    if (t.secondsLeft <= 0) {
      // Completed session!
      t.isRunning = false;
      clearInterval(t.intervalId);
      t.intervalId = null;

      playPomoChime('complete');
      
      const finishedState = t.state;
      const finishedDuration = t.totalSeconds;
      
      // Update statistics
      const d = t.dbData;
      d.sessions = d.sessions || [];
      const sessionObj = {
        id: generateSecureId('s-'),
        type: finishedState,
        duration: finishedDuration,
        timestamp: Date.now(),
        completed: true,
        taskId: t.activeTaskId
      };
      d.sessions.push(sessionObj);
      
      if (finishedState === 'focus') {
        t.completedTodayCount++;
        d.completedTodayCount = t.completedTodayCount;
        t.cycleCount++;
        
        // Track task time
        if (t.activeTaskId) {
          const task = d.tasks.find(tk => tk.id === t.activeTaskId);
          if (task) {
            task.timeSpent = (task.timeSpent || 0) + finishedDuration;
          }
        }
      }
      
      await db.savePomodoroData(d);
      
      // Display desktop notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(finishedState === 'focus' ? 'Focus Session Completed! 🍅' : 'Break Finished! ☕', {
          body: finishedState === 'focus' ? 'Time for a break.' : 'Time to get back to work!',
          icon: '/logo.webp'
        });
      }

      // Transition States
      if (finishedState === 'focus') {
        if (t.cycleCount % t.config.cyclesTarget === 0) {
          t.state = 'longBreak';
          t.secondsLeft = t.config.longBreakDuration;
          t.totalSeconds = t.config.longBreakDuration;
        } else {
          t.state = 'shortBreak';
          t.secondsLeft = t.config.shortBreakDuration;
          t.totalSeconds = t.config.shortBreakDuration;
        }
      } else {
        t.state = 'focus';
        t.secondsLeft = t.config.focusDuration;
        t.totalSeconds = t.config.focusDuration;
      }

      // Handle auto transition
      if (t.config.autoTransitions) {
        t.isRunning = true;
        playPomoChime('start');
        startBackgroundPomoTicker();
      }

      // Re-render dashboard or sidebar dynamically if in focus mode pages
      const currentHash = window.location.hash;
      if (currentHash === '#pomodoro' || currentHash === '#pomodoro/dashboard') {
        renderPomodoroSecondarySidebar('dashboard');
        renderPomodoroDashboard('dashboard');
      } else if (currentHash.startsWith('#pomodoro/')) {
        const tab = currentHash.replace('#pomodoro/', '');
        renderPomodoroSecondarySidebar(tab);
      }
    }

    // Reactively update UI if we are looking at the timer tab
    updateTimerUIProgress();
  }, 1000);
}

function updateTimerUIProgress() {
  const t = window.loopPomodoroTimer;

  // Update document title dynamically with timer if running
  if (t.isRunning) {
    const mins = Math.floor(t.secondsLeft / 60);
    const secs = t.secondsLeft % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const label = t.state === 'focus' ? '🍅' : '☕';
    document.title = `${label} ${timeStr} | IntelliNote`;
  } else {
    document.title = 'IntelliNote - Local-First Collaborative Workspace';
  }

  const timeDisplay = document.getElementById('pomo-timer-display');
  if (timeDisplay) {
    const mins = Math.floor(t.secondsLeft / 60);
    const secs = t.secondsLeft % 60;
    timeDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Update circular progress SVG
    const circle = document.getElementById('pomo-progress-circle');
    if (circle) {
      const radius = 120;
      const circumference = 2 * Math.PI * radius;
      const fraction = t.secondsLeft / t.totalSeconds;
      const offset = circumference * (1 - fraction);
      circle.style.strokeDashoffset = offset;
    }
  }
}

// --- Main Pomodoro Dashboard View Renderer ---
function renderPomodoroSecondarySidebar(activeTab) {
  const secSidebar = document.getElementById('sidebar-secondary');
  if (!secSidebar) return;
  secSidebar.style.display = 'flex';

  const d = window.loopPomodoroTimer.dbData || { habits: [], sessions: [] };
  
  let streak = 0;
  let bestStreak = 0;
  if (d.habits) {
    d.habits.forEach(hb => {
      if (hb.streak > streak) streak = hb.streak;
      if (hb.bestStreak > bestStreak) bestStreak = hb.bestStreak;
    });
  }

  const isLive = window.loopPomodoroTimer.isRunning;

  secSidebar.innerHTML = `
    <div class="sec-sidebar-header" style="border-bottom: 1px solid var(--border-color); margin-bottom: 16px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="material-symbols-outlined text-primary" style="font-size:24px; font-variation-settings: 'FILL' 1;">trip_origin</span>
        <div>
          <h2 style="font-size:15px; font-weight:700; color:var(--text-main); margin:0; line-height:1.2;">Focus & Flow</h2>
          <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Deep Work Mode</span>
        </div>
      </div>
    </div>
    
    <div class="sec-sidebar-chapters-list" style="flex:1; padding:0 12px; display:flex; flex-direction:column; gap:4px;">
      <a class="chapter-nav-item ${activeTab === 'dashboard' ? 'active' : ''}" href="#pomodoro/dashboard" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:8px; font-size:13.5px; font-weight:500; text-decoration:none; color:var(--text-muted); transition:all 0.15s;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="material-symbols-outlined" style="font-size:18px; font-variation-settings: 'FILL' ${activeTab === 'dashboard' ? '1' : '0'};">schedule</span>
          <span>Focus Timer</span>
        </div>
        ${isLive ? `<span style="background:var(--primary); color:#ffffff; font-size:9.5px; padding:1px 6px; border-radius:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Live</span>` : ''}
      </a>
      <a class="chapter-nav-item ${activeTab === 'tasks' ? 'active' : ''}" href="#pomodoro/tasks" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; font-size:13.5px; font-weight:500; text-decoration:none; color:var(--text-muted); transition:all 0.15s;">
        <span class="material-symbols-outlined" style="font-size:18px; font-variation-settings: 'FILL' ${activeTab === 'tasks' ? '1' : '0'};">checklist</span>
        <span>Tasks</span>
      </a>
      <a class="chapter-nav-item ${activeTab === 'habits' ? 'active' : ''}" href="#pomodoro/habits" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; font-size:13.5px; font-weight:500; text-decoration:none; color:var(--text-muted); transition:all 0.15s;">
        <span class="material-symbols-outlined" style="font-size:18px; font-variation-settings: 'FILL' ${activeTab === 'habits' ? '1' : '0'};">auto_awesome_motion</span>
        <span>Habits</span>
      </a>
      <a class="chapter-nav-item ${activeTab === 'analytics' ? 'active' : ''}" href="#pomodoro/analytics" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; font-size:13.5px; font-weight:500; text-decoration:none; color:var(--text-muted); transition:all 0.15s;">
        <span class="material-symbols-outlined" style="font-size:18px; font-variation-settings: 'FILL' ${activeTab === 'analytics' ? '1' : '0'};">analytics</span>
        <span>Analytics</span>
      </a>
      <a class="chapter-nav-item ${activeTab === 'settings' ? 'active' : ''}" href="#pomodoro/settings" style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; font-size:13.5px; font-weight:500; text-decoration:none; color:var(--text-muted); transition:all 0.15s;">
        <span class="material-symbols-outlined" style="font-size:18px; font-variation-settings: 'FILL' ${activeTab === 'settings' ? '1' : '0'};">settings</span>
        <span>Settings</span>
      </a>
    </div>

    <!-- Active Timer readout in sidebar bottom -->
    <div style="padding:16px; margin:12px; background:var(--primary-light-active); border-radius:12px; display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center;">
      <div style="font-size:9.5px; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Focus Streak</div>
      <div style="font-size:22px; font-weight:800; color:var(--primary); font-family:'Bricolage Grotesque', sans-serif;">${streak} days</div>
      <div style="font-size:11px; color:var(--text-muted);">Best: ${bestStreak} days — keep it going!</div>
    </div>
  `;
}

async function renderPomodoroDashboard(activeTab = 'dashboard') {
  const mainPane = document.getElementById('main-pane');
  const secSidebar = document.getElementById('sidebar-secondary');
  secSidebar.style.display = 'flex';

  // Load and cache
  await initPomodoroEngine();
  const t = window.loopPomodoroTimer;
  const d = t.dbData;

  // Reactively update sidebar bottom clock
  setTimeout(() => updateTimerUIProgress(), 10);

  if (activeTab === 'dashboard') {
    // TABS 1: MAIN BENTO DASHBOARD
    const mins = Math.floor(t.secondsLeft / 60);
    const secs = t.secondsLeft % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const fraction = t.secondsLeft / t.totalSeconds;
    const strokeDashoffset = circumference * (1 - fraction);

    let stateLabel = 'Focus Session';
    let stateBg = 'var(--primary-light-active)';
    let stateColor = 'var(--primary)';
    if (t.state === 'shortBreak') {
      stateLabel = 'Short Break';
      stateBg = 'rgba(16, 185, 129, 0.1)';
      stateColor = '#10b981';
    } else if (t.state === 'longBreak') {
      stateLabel = 'Long Break';
      stateBg = 'rgba(59, 130, 246, 0.1)';
      stateColor = '#3b82f6';
    }

    const goalCircumference = 2 * Math.PI * 72;
    const completedToday = t.completedTodayCount;
    const dailyTarget = t.dailyTarget;
    const goalFraction = Math.min(1, completedToday / dailyTarget);
    const goalStrokeOffset = goalCircumference * (1 - goalFraction);

    // Get next up tasks
    const activeTasks = d.tasks.filter(tk => tk.status !== 'completed' && tk.status !== 'archived').slice(0, 3);
    const tasksHTML = activeTasks.length > 0 ? activeTasks.map(tk => `
      <div class="todo-item" style="border: 1px solid var(--border-color); border-radius:16px; padding:16px; margin-bottom:12px; display:flex; gap:16px; align-items:center; transition: all 0.2s ease; cursor:pointer;" onclick="window.location.hash='#pomodoro/tasks'">
        <div style="width:20px; height:20px; border-radius:6px; border:2px solid var(--border-color); flex-shrink:0;"></div>
        <div style="flex:1;">
          <h4 style="font-size:14px; font-weight:700; margin:0; color:var(--text-main);">${tk.name}</h4>
          <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0; line-height:1.4;">${tk.description || 'No description provided.'}</p>
        </div>
      </div>
    `).join('') : '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">No tasks next up.</div>';

    // Get habits snapshot
    const activeHabits = d.habits.slice(0, 3);
    const habitsHTML = activeHabits.length > 0 ? activeHabits.map(hb => {
      const todayKey = new Date().toDateString();
      const checked = hb.logs && hb.logs[todayKey];
      const icon = hb.name.toLowerCase().includes('hydrat') ? 'water_drop' : hb.name.toLowerCase().includes('read') ? 'menu_book' : 'fitness_center';
      return `
        <div class="dash-habit-toggle" data-id="${hb.id}" style="border: 1px solid var(--border-color); border-radius:16px; padding:12px 16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:${checked ? 'rgba(92, 72, 204, 0.05)' : 'transparent'}; transition: all 0.2s ease; cursor:pointer;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:50%; background:${checked ? '#e5deff' : 'rgba(0,0,0,0.03)'}; display:flex; align-items:center; justify-content:center; color:${checked ? 'var(--primary)' : 'var(--text-muted)'}; opacity:0.8;">
              <span class="material-symbols-outlined">${icon}</span>
            </div>
            <span style="font-size:14px; font-weight:700; color:var(--text-main); ${checked ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${hb.name}</span>
          </div>
          <span class="material-symbols-outlined" style="color:${checked ? 'var(--primary)' : 'var(--text-muted)'}; font-variation-settings: 'FILL' ${checked ? '1' : '0'}; font-size:24px;">
            ${checked ? 'check_circle' : 'circle'}
          </span>
        </div>
      `;
    }).join('') : '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">No habits defined yet.</div>';

mainPane.innerHTML = `
      <div class="pomo-canvas">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 700; margin: 0;">Overview</h2>
          <p style="margin: 4px 0 0 0; font-size: 13.5px; color: var(--text-muted);">Stay focused and maintain your daily growth loops.</p>
        </div>

        <div class="pomo-bento-grid">
          <!-- Main Radial Timer Engine (Col 8) -->
          <div class="pomo-card pomo-card-col-8" style="min-height: 400px; align-items: center; justify-content: center;">
            <div style="position: absolute; top: 16px; left: 16px; background: ${stateBg}; color: ${stateColor}; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; display:flex; align-items:center; gap:6px;">
              <span class="animate-pulse-soft" style="width: 6px; height: 6px; border-radius:50%; background:${stateColor};"></span>
              ${stateLabel}
            </div>
            <div style="position: absolute; top: 16px; right: 16px; background: var(--border-color); opacity: 0.8; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; color: var(--text-main);">
              Cycle ${t.cycleCount % t.config.cyclesTarget + 1}/${t.config.cyclesTarget}
            </div>

            <!-- Radial Progress Clock -->
            <div class="timer-radial-wrap">
              <svg class="timer-radial-svg" viewBox="0 0 260 260">
                <circle class="timer-radial-bg" cx="130" cy="130" r="120"></circle>
                <circle class="timer-radial-progress" id="pomo-progress-circle" cx="130" cy="130" r="120"
                        style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"></circle>
              </svg>
              <div class="timer-radial-text" id="pomo-timer-display">${timeStr}</div>
            </div>

            <!-- Controls row -->
            <div style="display:flex; align-items:center; gap:16px;">
              <button class="control-btn control-btn-secondary" id="dash-pomo-tune-btn" title="Engine Settings" style="width:48px; height:48px; border-radius:50%; border:1px solid var(--border-color); background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <span class="material-symbols-outlined">tune</span>
              </button>
              <button class="control-btn control-btn-play" id="dash-pomo-play-btn" style="width:56px; height:56px; border-radius:50%; border:none; background:var(--primary); color:#ffffff; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <span id="dash-pomo-play-icon" class="material-symbols-outlined" style="font-size:24px; display:block; line-height:1; ${t.isRunning ? '' : 'margin-left:2px;'}">${t.isRunning ? 'pause' : 'play_arrow'}</span>
              </button>
              <button class="control-btn control-btn-secondary" id="dash-pomo-skip-btn" title="Skip Session" style="width:48px; height:48px; border-radius:50%; border:1px solid var(--border-color); background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <span class="material-symbols-outlined">skip_next</span>
              </button>
            </div>

            <!-- Expanding Tune drawer card -->
            <div id="dash-pomo-tune-drawer" style="display:none; width:100%; max-width:360px; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px; flex-direction:column; gap:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12.5px; font-weight:500; color:var(--text-muted);">Focus (min)</span>
                <input type="number" id="dash-cfg-focus" value="${Math.round(t.config.focusDuration / 60)}" style="width:60px; padding:4px; border:1px solid var(--border-color); border-radius:6px; text-align:center; font-family:inherit;" />
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12.5px; font-weight:500; color:var(--text-muted);">Break (min)</span>
                <input type="number" id="dash-cfg-break" value="${Math.round(t.config.shortBreakDuration / 60)}" style="width:60px; padding:4px; border:1px solid var(--border-color); border-radius:6px; text-align:center; font-family:inherit;" />
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12.5px; font-weight:500; color:var(--text-muted);">Cycles Goal</span>
                <input type="number" id="dash-cfg-cycles" value="${t.config.cyclesTarget}" style="width:60px; padding:4px; border:1px solid var(--border-color); border-radius:6px; text-align:center; font-family:inherit;" />
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12.5px; font-weight:500; color:var(--text-muted);">Audio alerts</span>
                <input type="checkbox" id="dash-cfg-audio" ${t.audioEnabled ? 'checked' : ''} style="cursor:pointer;" />
              </div>
            </div>
          </div>

          <!-- Daily Goal Progress Card (Col 4) -->
          <div class="pomo-card pomo-card-col-4" style="justify-content: space-between;">
            <div>
              <h3 style="font-size:16px; font-weight:700; margin:0; color:var(--text-main);">Daily Goal</h3>
              <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">Sessions completed today</p>
            </div>
            
            <div style="position:relative; width:150px; height:150px; margin:24px auto;">
              <svg style="transform:rotate(-90deg); width:100%; height:100%;">
                <circle cx="75" cy="75" r="66" fill="none" stroke="var(--border-color)" stroke-width="10" style="opacity:0.5;"></circle>
                <circle cx="75" cy="75" r="66" fill="none" stroke="var(--primary)" stroke-width="10" stroke-linecap="round"
                        style="stroke-dasharray: ${goalCircumference}; stroke-dashoffset: ${goalStrokeOffset}; transition: stroke-dashoffset 0.3s ease;"></circle>
              </svg>
              <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div style="font-size:26px; font-weight:700; color:var(--text-main);">${completedToday}<span style="font-size:16px; color:var(--text-muted);">/${dailyTarget}</span></div>
                <div style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Sessions</div>
              </div>
            </div>

            <div style="background:var(--primary-light-active); color:var(--primary); font-size:12.5px; font-weight:600; text-align:center; padding:8px; border-radius:24px;">
              You're doing great today!
            </div>
          </div>

          <!-- Next Up Tasks snapshot (Col 6) -->
          <div class="pomo-card pomo-card-col-6">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 style="font-size:16px; font-weight:700; margin:0;">Next Up</h3>
              <a href="#pomodoro/tasks" style="font-size:12px; color:var(--primary); text-decoration:none; font-weight:600;">View All</a>
            </div>
            <div style="flex:1;">
              ${tasksHTML}
            </div>
          </div>

          <!-- Habits snapshot (Col 6) -->
          <div class="pomo-card pomo-card-col-6">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 style="font-size:16px; font-weight:700; margin:0;">Habits Today</h3>
              <a href="#pomodoro/habits" style="font-size:12px; color:var(--primary); text-decoration:none; font-weight:600;">View All</a>
            </div>
            <div style="flex:1;">
              ${habitsHTML}
            </div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    const playBtn = document.getElementById('dash-pomo-play-btn');
    playBtn.addEventListener('click', () => {
      t.isRunning = !t.isRunning;
      if (t.isRunning) {
        playPomoChime('start');
        if (t.state === 'focus' && t.secondsLeft === t.totalSeconds) {
          t.startedTodayCount++;
        }
        startBackgroundPomoTicker();
      }
      const playIcon = playBtn.querySelector('#dash-pomo-play-icon');
      playIcon.textContent = t.isRunning ? 'pause' : 'play_arrow';
      if (t.isRunning) {
        playIcon.style.marginLeft = '0px';
      } else {
        playIcon.style.marginLeft = '2px';
      }
    });

    document.getElementById('dash-pomo-skip-btn').addEventListener('click', () => {
      t.isRunning = false;
      t.secondsLeft = 0;
      const playIcon = playBtn.querySelector('#dash-pomo-play-icon');
      playIcon.textContent = 'play_arrow';
      playIcon.style.marginLeft = '2px';
      t.isRunning = true;
      startBackgroundPomoTicker();
    });

    // Tune configuration toggle drawer
    const tuneBtn = document.getElementById('dash-pomo-tune-btn');
    const tuneDrawer = document.getElementById('dash-pomo-tune-drawer');
    tuneBtn.addEventListener('click', () => {
      const isHidden = tuneDrawer.style.display === 'none';
      tuneDrawer.style.display = isHidden ? 'flex' : 'none';
    });

    const updateConfig = async () => {
      const focusMin = Math.max(1, parseInt(document.getElementById('dash-cfg-focus').value) || 25);
      const breakMin = Math.max(1, parseInt(document.getElementById('dash-cfg-break').value) || 5);
      const cycles = Math.max(1, parseInt(document.getElementById('dash-cfg-cycles').value) || 4);
      const audio = document.getElementById('dash-cfg-audio').checked;

      t.config.focusDuration = focusMin * 60;
      t.config.shortBreakDuration = breakMin * 60;
      t.config.cyclesTarget = cycles;
      t.audioEnabled = audio;

      if (!t.isRunning) {
        t.secondsLeft = t.state === 'focus' ? t.config.focusDuration : t.config.shortBreakDuration;
        t.totalSeconds = t.state === 'focus' ? t.config.focusDuration : t.config.shortBreakDuration;
        updateTimerUIProgress();
      }

      d.timerConfig = t.config;
      await db.savePomodoroData(d);
    };

    document.getElementById('dash-cfg-focus').addEventListener('change', updateConfig);
    document.getElementById('dash-cfg-break').addEventListener('change', updateConfig);
    document.getElementById('dash-cfg-cycles').addEventListener('change', updateConfig);
    document.getElementById('dash-cfg-audio').addEventListener('change', updateConfig);

    // Task checkbox toggle
    mainPane.querySelectorAll('.dash-task-check').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const id = chk.getAttribute('data-id');
        const tk = d.tasks.find(x => x.id === id);
        if (tk) {
          tk.status = e.target.checked ? 'completed' : 'pending';
          await db.savePomodoroData(d);
          renderPomodoroDashboard('dashboard');
        }
      });
    });

    // Habit toggle checkbox today
    mainPane.querySelectorAll('.dash-habit-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const hb = d.habits.find(h => h.id === id);
        if (hb) {
          const todayKey = new Date().toDateString();
          hb.logs = hb.logs || {};
          hb.logs[todayKey] = !hb.logs[todayKey];
          await db.savePomodoroData(d);
          renderPomodoroDashboard('dashboard');
        }
      });
    });

} else if (activeTab === 'tasks') {
    // TABS 2: SPLIT INTERACTIVE TASK TREE & DETAILS BOARD
    let statusFilter = 'All';
    let currentSort = 'default'; // 'default', 'priority', 'alpha'

    window.loopCollapsedTaskIds = window.loopCollapsedTaskIds || new Set();

    if (!window.loopSelectedTaskId) {
      window.loopSelectedTaskId = 't-q4-1';
    }

    const getPriorityWeight = (tags) => {
      if (!tags || tags.length === 0) return 1; // Medium
      if (tags.includes('High Priority')) return 2;
      if (tags.includes('Low Priority')) return 0;
      return 1; // Medium Priority
    };

    const renderTreeList = () => {
      const treeContainer = document.getElementById('dash-task-tree-container');
      if (!treeContainer) return;

      let filteredTasks = [...d.tasks];

      // Apply status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Pending') filteredTasks = filteredTasks.filter(tk => tk.status === 'pending');
        else if (statusFilter === 'In Progress') filteredTasks = filteredTasks.filter(tk => tk.status === 'in_progress');
        else if (statusFilter === 'Completed') filteredTasks = filteredTasks.filter(tk => tk.status === 'completed');
        else if (statusFilter === 'Archived') filteredTasks = filteredTasks.filter(tk => tk.status === 'archived');
      }

      // Apply sorting
      if (currentSort === 'alpha') {
        filteredTasks.sort((a, b) => a.name.localeCompare(b.name));
      } else if (currentSort === 'priority') {
        filteredTasks.sort((a, b) => getPriorityWeight(b.tags) - getPriorityWeight(a.tags));
      }

      // Build hierarchical tree structure from flat list
      const parentTasks = filteredTasks.filter(tk => !tk.parentId);
      if (parentTasks.length === 0) {
        treeContainer.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted); font-size:13.5px;">No projects matching filters.</div>`;
        return;
      }

      const renderTreeItem = (tk, depth = 0) => {
        const children = d.tasks.filter(c => c.parentId === tk.id && c.status !== 'archived');
        
        // Collapsible check
        const isCollapsed = window.loopCollapsedTaskIds.has(tk.id);
        
        // Sorting subtasks
        if (currentSort === 'alpha') {
          children.sort((a, b) => a.name.localeCompare(b.name));
        } else if (currentSort === 'priority') {
          children.sort((a, b) => getPriorityWeight(b.tags) - getPriorityWeight(a.tags));
        }

        const calculateTotalTime = (task) => {
          let time = task.timeSpent || 0;
          const ch = d.tasks.filter(c => c.parentId === task.id);
          ch.forEach(c => {
            time += calculateTotalTime(c);
          });
          return time;
        };
        const totalTimeS = calculateTotalTime(tk);
        const hrs = Math.floor(totalTimeS / 3600);
        const mins = Math.round((totalTimeS % 3600) / 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : mins > 0 ? `${mins}m` : '';

        const completedChildren = children.filter(c => c.status === 'completed').length;
        const totalChildren = children.length;
        const progressBadge = totalChildren > 0 ? `<span style="font-size:10.5px; background:rgba(0,0,0,0.03); padding:1px 6px; border-radius:4px; font-weight:600; color:var(--text-muted);">${completedChildren}/${totalChildren}</span>` : '';

        const isSelected = window.loopSelectedTaskId === tk.id;
        const isCompleted = tk.status === 'completed';

        let statusBadge = '';
        if (tk.status === 'completed') {
          statusBadge = `<span style="font-size:10.5px; background:#ecfdf5; color:#10b981; padding:2px 8px; border-radius:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="width:5px; height:5px; border-radius:50%; background:#10b981;"></span> Completed</span>`;
        } else if (tk.status === 'in_progress') {
          statusBadge = `<span style="font-size:10.5px; background:#eff6ff; color:#3b82f6; padding:2px 8px; border-radius:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="width:5px; height:5px; border-radius:50%; background:#3b82f6;"></span> In Progress</span>`;
        } else if (tk.status === 'archived') {
          statusBadge = `<span style="font-size:10.5px; background:#f1f5f9; color:#64748b; padding:2px 8px; border-radius:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="width:5px; height:5px; border-radius:50%; background:#64748b;"></span> Archived</span>`;
        } else {
          statusBadge = `<span style="font-size:10.5px; background:#fff7ed; color:#f97316; padding:2px 8px; border-radius:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="width:5px; height:5px; border-radius:50%; background:#f97316;"></span> Pending</span>`;
        }

        const paddingLeft = depth * 24;

        // Render Priority Badge
        let priorityBadge = '';
        if (tk.tags && tk.tags.includes('High Priority')) {
          priorityBadge = `<span style="font-size:10px; background:#fee2e2; color:#ef4444; padding:1px 6px; border-radius:4px; font-weight:600; margin-left:4px;">High</span>`;
        } else if (tk.tags && tk.tags.includes('Low Priority')) {
          priorityBadge = `<span style="font-size:10px; background:#dbeafe; color:#3b82f6; padding:1px 6px; border-radius:4px; font-weight:600; margin-left:4px;">Low</span>`;
        } else {
          priorityBadge = `<span style="font-size:10px; background:#ffedd5; color:#f97316; padding:1px 6px; border-radius:4px; font-weight:600; margin-left:4px;">Medium</span>`;
        }

        return `
          <div class="task-tree-row-item ${isSelected ? 'active-tree-selected' : ''}" data-id="${tk.id}" 
               style="padding-left:${paddingLeft}px; display:flex; align-items:center; justify-content:space-between; padding-top:10px; padding-bottom:10px; padding-right:12px; border-radius:8px; cursor:pointer; background:${isSelected ? 'rgba(92, 72, 204, 0.05)' : 'transparent'}; border-left:${isSelected ? '4px solid var(--primary)' : '4px solid transparent'}; transition:all 0.15s; margin-bottom:4px;">
            <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
              <button class="tree-toggle-arrow" data-id="${tk.id}" style="border:none; background:transparent; cursor:pointer; padding:0; display:flex; align-items:center; color:var(--text-muted);">
                <span class="material-symbols-outlined animate-rotate" style="font-size:18px; transform:${isCollapsed ? 'rotate(-90deg)' : 'none'}; transition:transform 0.2s;">
                  keyboard_arrow_down
                </span>
              </button>
              <button class="tree-task-checkbox-bubble" data-id="${tk.id}" style="border:none; background:transparent; cursor:pointer; padding:0; display:flex; align-items:center;">
                <span class="material-symbols-outlined" style="font-size:20px; color:${isCompleted ? '#10b981' : 'var(--text-muted)'};">
                  ${isCompleted ? 'check_circle' : 'circle'}
                </span>
              </button>
              <span class="tree-task-label" data-id="${tk.id}" style="font-size:13.5px; font-weight:${depth === 0 ? '700' : '500'}; color:var(--text-main); ${isCompleted ? 'text-decoration:line-through; color:var(--text-muted);' : ''} overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
                ${tk.name}
              </span>
              ${progressBadge}
              ${priorityBadge}
            </div>
            <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
              ${timeStr ? `<span style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:13px;">schedule</span> ${timeStr}</span>` : ''}
              ${statusBadge}
              <button class="tree-task-delete-btn" data-id="${tk.id}" style="border:none; background:transparent; cursor:pointer; padding:2px; display:flex; align-items:center; color:var(--text-muted); opacity:0.5; transition:all 0.15s;" onmouseover="this.style.opacity=1; this.style.color='var(--primary)'" onmouseout="this.style.opacity=0.5; this.style.color='var(--text-muted)'">
                <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
              </button>
            </div>
          </div>
          ${children.length > 0 && !isCollapsed ? `<div style="display:flex; flex-direction:column;">
            ${children.map(c => renderTreeItem(c, depth + 1)).join('')}
          </div>` : ''}
        `;
      };

      treeContainer.innerHTML = parentTasks.map(tk => renderTreeItem(tk)).join('');

      treeContainer.querySelectorAll('.tree-task-label').forEach(label => {
        label.addEventListener('click', () => {
          const id = label.getAttribute('data-id');
          window.loopSelectedTaskId = id;
          renderTasksView();
        });
      });

      treeContainer.querySelectorAll('.tree-toggle-arrow').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          if (window.loopCollapsedTaskIds.has(id)) {
            window.loopCollapsedTaskIds.delete(id);
          } else {
            window.loopCollapsedTaskIds.add(id);
          }
          renderTreeList();
        });
      });

      treeContainer.querySelectorAll('.tree-task-checkbox-bubble').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const tk = d.tasks.find(x => x.id === id);
          if (tk) {
            tk.status = tk.status === 'completed' ? 'pending' : 'completed';
            await db.savePomodoroData(d);
            renderTasksView();
          }
        });
      });

      treeContainer.querySelectorAll('.tree-task-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          if (confirm("Delete this task and all its nested subtasks?")) {
            await deleteTaskAndChildren(id);
            if (window.loopSelectedTaskId === id) {
              window.loopSelectedTaskId = d.tasks[0] ? d.tasks[0].id : null;
            }
            renderTasksView();
          }
        });
      });
    };

    const deleteTaskAndChildren = async (taskId) => {
      const toDelete = [taskId];
      const findChildren = (id) => {
        const children = d.tasks.filter(c => c.parentId === id);
        children.forEach(c => {
          toDelete.push(c.id);
          findChildren(c.id);
        });
      };
      findChildren(taskId);
      d.tasks = d.tasks.filter(t => !toDelete.includes(t.id));
      await db.savePomodoroData(d);
    };

    const renderDetailsPanel = () => {
      const detailsContainer = document.getElementById('dash-task-details-pane');
      if (!detailsContainer) return;

      const selTask = d.tasks.find(tk => tk.id === window.loopSelectedTaskId) || d.tasks[0];
      if (!selTask) {
        detailsContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:40px;">Select a task to view details.</div>`;
        return;
      }

      let parentProj = 'WORKSPACE';
      if (selTask.parentId) {
        let parent = d.tasks.find(x => x.id === selTask.parentId);
        while (parent) {
          parentProj = parent.name.toUpperCase();
          if (parent.parentId) {
            parent = d.tasks.find(x => x.id === parent.parentId);
          } else {
            break;
          }
        }
      }

      const children = d.tasks.filter(c => c.parentId === selTask.id && c.status !== 'archived');
      const completedCount = children.filter(c => c.status === 'completed').length;
      const totalCount = children.length;
      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const calculateTotalTime = (task) => {
        let time = task.timeSpent || 0;
        const ch = d.tasks.filter(c => c.parentId === task.id);
        ch.forEach(c => {
          time += calculateTotalTime(c);
        });
        return time;
      };
      const totalTimeS = calculateTotalTime(selTask);
      const hrs = Math.floor(totalTimeS / 3600);
      const mins = Math.round((totalTimeS % 3600) / 60);
      const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : mins > 0 ? `${mins}m` : '0m';

      const checklistHTML = children.map(c => {
        const cCompleted = c.status === 'completed';
        const cTimeMins = Math.round((c.timeSpent || 0) / 60);
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:10px;">
              <button class="details-subtask-toggle" data-id="${c.id}" style="border:none; background:transparent; cursor:pointer; padding:0; display:flex;">
                <span class="material-symbols-outlined" style="font-size:20px; color:${cCompleted ? '#10b981' : 'var(--text-muted)'};">
                  ${cCompleted ? 'check_circle' : 'circle'}
                </span>
              </button>
              <span style="font-size:13px; font-weight:500; color:var(--text-main); ${cCompleted ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">
                ${c.name}
              </span>
            </div>
            ${cTimeMins > 0 ? `<span style="font-size:11.5px; color:var(--text-muted);">${cTimeMins}m</span>` : ''}
          </div>
        `;
      }).join('');

      const taskSessions = (d.sessions || []).filter(s => s.taskId === selTask.id);
      const sessionCount = taskSessions.length;

      // Real dynamic activity logs
      let activityHTML = '';
      if (taskSessions.length === 0) {
        activityHTML = `<div style="font-size:12.5px; color:var(--text-muted); text-align:center; padding:16px 0;">No activity logged yet. Complete a focus block to trigger logs.</div>`;
      } else {
        activityHTML = taskSessions.slice(-3).reverse().map(s => {
          const dateStr = new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          return `
            <div style="display:flex; gap:10px; font-size:12.5px;">
              <span style="width:6px; height:6px; border-radius:50%; background:#10b981; margin-top:6px; flex-shrink:0;"></span>
              <div>
                <span style="color:var(--text-main); font-weight:500;">Logged focus session</span>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${dateStr}</div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Check current priority
      const currentPriority = (selTask.tags && selTask.tags.includes('High Priority')) ? 'High Priority' :
                              (selTask.tags && selTask.tags.includes('Low Priority')) ? 'Low Priority' : 'Medium Priority';

      detailsContainer.innerHTML = `
        <div class="pomo-card" style="padding:24px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:10.5px; font-weight:700; color:var(--text-muted); tracking-wide:1px; text-transform:uppercase;">${parentProj}</span>
            <button class="details-delete-task-btn" data-id="${selTask.id}" style="border:none; background:transparent; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:4px;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">
              <span class="material-symbols-outlined" style="font-size:18px;">delete</span> Delete
            </button>
          </div>
          <h3 style="font-size:18px; font-weight:800; color:var(--text-main); margin:0 0 16px 0;">${selTask.name}</h3>
          
          <!-- Dropdown selectors for Status & Priority -->
          <div style="display:flex; gap:10px; margin-bottom:20px; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
              <label style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.5px;">Status</label>
              <select id="details-status-select" style="padding:6px 10px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:12.5px; background:var(--bg-secondary-sidebar); color:var(--text-main); font-weight:600; cursor:pointer; outline:none; width:100%;">
                <option value="pending" ${selTask.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in_progress" ${selTask.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${selTask.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="archived" ${selTask.status === 'archived' ? 'selected' : ''}>Archived</option>
              </select>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
              <label style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.5px;">Priority</label>
              <select id="details-priority-select" style="padding:6px 10px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:12.5px; background:var(--bg-secondary-sidebar); color:var(--text-main); font-weight:600; cursor:pointer; outline:none; width:100%;">
                <option value="High Priority" ${currentPriority === 'High Priority' ? 'selected' : ''}>High Priority</option>
                <option value="Medium Priority" ${currentPriority === 'Medium Priority' ? 'selected' : ''}>Medium Priority</option>
                <option value="Low Priority" ${currentPriority === 'Low Priority' ? 'selected' : ''}>Low Priority</option>
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
            <div style="background:rgba(0,0,0,0.02); border-radius:12px; padding:12px;">
              <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Focus Logged</span>
              <div style="font-size:18px; font-weight:800; color:var(--text-main); margin-top:4px;">${durationStr}</div>
            </div>
            <div style="background:rgba(0,0,0,0.02); border-radius:12px; padding:12px;">
              <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Sessions</span>
              <div style="font-size:18px; font-weight:800; color:var(--text-main); margin-top:4px;">${sessionCount}</div>
            </div>
          </div>

          ${totalCount > 0 ? `
            <div style="margin-bottom:20px;">
              <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; color:var(--text-main); margin-bottom:6px;">
                <span>Sub-task progress</span>
                <span>${completedCount}/${totalCount} done</span>
              </div>
              <div style="width:100%; height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden;">
                <div style="width:${progressPercent}%; height:100%; background:var(--primary); transition:width 0.3s ease;"></div>
              </div>
            </div>
          ` : ''}

          <div style="margin-bottom:12px;">
            ${checklistHTML}
          </div>

          <!-- Inline Sub-task Creator -->
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:20px; background:rgba(0,0,0,0.01); padding:8px; border-radius:8px; border:1px dashed var(--border-color);">
            <input type="text" id="details-new-subtask-input" placeholder="+ Add sub-task..." style="flex:1; padding:6px 10px; border:1px solid var(--border-color); border-radius:6px; font-family:inherit; font-size:12.5px; background:#ffffff; color:var(--text-main);" />
            <button id="details-new-subtask-add-btn" class="create-new-btn" style="margin-bottom:0; padding:6px 12px; font-size:12px;">Add</button>
          </div>

          <div style="display:flex; gap:12px;">
            <button id="details-start-focus-btn" style="flex:1; padding:10px 16px; background:var(--primary); color:#ffffff; font-weight:600; border:none; border-radius:8px; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span class="material-symbols-outlined" style="font-size:16px;">play_circle</span> Start Focus
            </button>
          </div>
        </div>

        <div class="pomo-card" style="padding:24px;">
          <h4 style="font-size:14px; font-weight:800; margin:0 0 16px 0; color:var(--text-main);">Activity</h4>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${activityHTML}
          </div>
        </div>
      `;

      // Status selector event
      document.getElementById('details-status-select').addEventListener('change', async (e) => {
        selTask.status = e.target.value;
        await db.savePomodoroData(d);
        renderTasksView();
      });

      // Priority selector event
      document.getElementById('details-priority-select').addEventListener('change', async (e) => {
        const newPriority = e.target.value;
        selTask.tags = [newPriority]; // set priority tag
        await db.savePomodoroData(d);
        renderTasksView();
      });

      document.getElementById('details-start-focus-btn').addEventListener('click', () => {
        t.activeTaskId = selTask.id;
        window.location.hash = '#pomodoro/dashboard';
        t.isRunning = true;
        playPomoChime('start');
        startBackgroundPomoTicker();
      });

      const handleAddSubtaskInline = async () => {
        const input = document.getElementById('details-new-subtask-input');
        const title = input.value.trim();
        if (title) {
          const newC = {
            id: generateSecureId('t-'),
            name: title,
            status: 'pending',
            parentId: selTask.id,
            tags: [window.loopPomodoroTimer.config.defaultTaskPriority || 'Medium Priority'],
            timeSpent: 0
          };
          d.tasks.push(newC);
          await db.savePomodoroData(d);
          renderTasksView();
        }
      };

      document.getElementById('details-new-subtask-add-btn').addEventListener('click', handleAddSubtaskInline);
      document.getElementById('details-new-subtask-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddSubtaskInline();
      });

      detailsContainer.querySelector('.details-delete-task-btn').addEventListener('click', async () => {
        if (confirm("Delete this task and all its nested subtasks?")) {
          await deleteTaskAndChildren(selTask.id);
          window.loopSelectedTaskId = d.tasks[0] ? d.tasks[0].id : null;
          renderTasksView();
        }
      });

      detailsContainer.querySelectorAll('.details-subtask-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
          const childId = btn.getAttribute('data-id');
          const child = d.tasks.find(x => x.id === childId);
          if (child) {
            child.status = child.status === 'completed' ? 'pending' : 'completed';
            await db.savePomodoroData(d);
            renderTasksView();
          }
        });
      });
    };

    const renderTasksView = () => {
      renderTreeList();
      renderDetailsPanel();
    };

    mainPane.innerHTML = `
      <div class="pomo-canvas" style="max-width:1200px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <div>
            <h2 style="font-size:22px; font-weight:800; margin:0; color:var(--text-main);">Tasks & Projects</h2>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:var(--text-muted);">Plan, nest and time-track your work</p>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <input type="text" placeholder="Search..." style="padding:6px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; width:160px;" />
            <button class="create-new-btn" id="header-add-task-btn" style="margin-bottom:0; padding:6px 12px; font-size:13px;">+ New Task</button>
          </div>
        </div>

        <!-- Inline Project Creator Form -->
        <div id="inline-project-creator" style="display:none; background:rgba(0,0,0,0.02); padding:16px; border-radius:12px; margin-bottom:20px; border:1px dashed var(--border-color);">
          <div style="font-size:13px; font-weight:700; margin-bottom:8px; color:var(--text-main);">Create New Project / Parent Task</div>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="text" id="inline-project-name" placeholder="Project name..." style="flex:1; padding:8px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:#ffffff; color:var(--text-main);" />
            <select id="inline-project-priority" style="padding:8px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:#ffffff; color:var(--text-main);">
              <option value="High Priority">High Priority</option>
              <option value="Medium Priority" selected>Medium Priority</option>
              <option value="Low Priority">Low Priority</option>
            </select>
            <button id="inline-project-save-btn" class="create-new-btn" style="margin-bottom:0; padding:8px 16px; font-size:13px;">Create</button>
            <button id="inline-project-cancel-btn" style="padding:8px 16px; border:1px solid var(--border-color); background:transparent; color:var(--text-muted); border-radius:8px; font-size:13px; cursor:pointer; font-weight:600;">Cancel</button>
          </div>
        </div>

        <div style="display:flex; gap:24px; align-items:flex-start; width:100%;">
          <div style="flex:1.3; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
              <span style="font-size:13px; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="font-size:16px;">account_tree</span> Task Tree
              </span>
              <div style="display:flex; gap:8px; align-items:center;">
                <!-- Status Filter Pills -->
                <div style="display:flex; gap:4px;">
                  ${['All', 'Pending', 'In Progress', 'Completed', 'Archived'].map(st => `
                    <button class="status-filter-pill" data-status="${st}" style="border:none; border-radius:6px; padding:4px 8px; font-size:11.5px; font-weight:600; cursor:pointer; background:${statusFilter === st ? 'var(--primary)' : 'rgba(0,0,0,0.02)'}; color:${statusFilter === st ? '#ffffff' : 'var(--text-muted)'}; transition:all 0.15s;">
                      ${st}
                    </button>
                  `).join('')}
                </div>
                
                <!-- Sort Dropdown -->
                <select id="tree-sort-select" style="border:1px solid var(--border-color); border-radius:6px; padding:4px 8px; font-size:11.5px; font-weight:600; cursor:pointer; background:transparent; color:var(--text-muted); font-family:inherit; outline:none;">
                  <option value="default" ${currentSort === 'default' ? 'selected' : ''}>Sort: Default</option>
                  <option value="priority" ${currentSort === 'priority' ? 'selected' : ''}>Sort: Priority</option>
                  <option value="alpha" ${currentSort === 'alpha' ? 'selected' : ''}>Sort: A-Z</option>
                </select>
              </div>
            </div>

            <div id="dash-task-tree-container" style="display:flex; flex-direction:column; gap:4px;"></div>

            <div style="display:flex; gap:10px; align-items:center; padding:12px 0; border-top:1px solid var(--border-color); margin-top:16px;">
              <input type="text" id="tree-new-task-name" placeholder="+ Add task under nested project..." style="flex:1; padding:8px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px;" />
              <select id="tree-new-task-parent" style="padding:8px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; max-width:180px; background:transparent; color:var(--text-main);">
                <option value="">Root Project</option>
                ${d.tasks.filter(tk => tk.parentId === null).map(tk => `<option value="${tk.id}">under ${tk.name}</option>`).join('')}
              </select>
              <button class="create-new-btn" id="tree-add-task-btn" style="margin-bottom:0; padding:8px 16px; font-size:13px;">Add</button>
            </div>
          </div>

          <div id="dash-task-details-pane" style="flex:0.7; width:100%; min-width:280px; position:sticky; top:24px;"></div>
        </div>
      </div>
    `;

    renderTasksView();

    // Toggle inline project creator
    const headerAddBtn = document.getElementById('header-add-task-btn');
    const inlineCreator = document.getElementById('inline-project-creator');
    const inlineNameInput = document.getElementById('inline-project-name');
    const inlinePrioritySelect = document.getElementById('inline-project-priority');
    const inlineSaveBtn = document.getElementById('inline-project-save-btn');
    const inlineCancelBtn = document.getElementById('inline-project-cancel-btn');

    headerAddBtn.addEventListener('click', () => {
      inlineCreator.style.display = 'block';
      inlineNameInput.focus();
    });

    inlineCancelBtn.addEventListener('click', () => {
      inlineCreator.style.display = 'none';
      inlineNameInput.value = '';
    });

    const handleCreateProjectInline = async () => {
      const name = inlineNameInput.value.trim();
      const priority = inlinePrioritySelect.value;
      if (name) {
        const newTask = {
          id: generateSecureId('t-'),
          name: name,
          status: 'pending',
          parentId: null,
          tags: [priority],
          timeSpent: 0
        };
        d.tasks.push(newTask);
        await db.savePomodoroData(d);
        inlineCreator.style.display = 'none';
        inlineNameInput.value = '';
        renderTasksView();
      }
    };

    inlineSaveBtn.addEventListener('click', handleCreateProjectInline);
    inlineNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreateProjectInline();
    });

    // Sort selector event
    document.getElementById('tree-sort-select').addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderTreeList();
    });

    const handleAddTask = async () => {
      const nameEl = document.getElementById('tree-new-task-name');
      const parentEl = document.getElementById('tree-new-task-parent');
      const name = nameEl.value.trim();
      const parentId = parentEl.value || null;

      if (name) {
        const newTask = {
          id: generateSecureId('t-'),
          name: name,
          status: 'pending',
          parentId: parentId,
          tags: ['Medium Priority'],
          timeSpent: 0
        };
        d.tasks.push(newTask);
        await db.savePomodoroData(d);
        nameEl.value = '';
        renderTasksView();
      }
    };

    document.getElementById('tree-add-task-btn').addEventListener('click', handleAddTask);

    mainPane.querySelectorAll('.status-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        statusFilter = pill.getAttribute('data-status');
        mainPane.querySelectorAll('.status-filter-pill').forEach(p => {
          p.style.background = 'rgba(0,0,0,0.02)';
          p.style.color = 'var(--text-muted)';
        });
        pill.style.background = 'var(--primary)';
        pill.style.color = '#ffffff';
        renderTreeList();
      });
    });
  } else if (activeTab === 'habits') {
    // TABS 3: HABIT FORMATION TRACKER
    const renderHabitsView = () => {
      const habitsList = document.getElementById('dash-habits-board-list');
      if (!habitsList) return;

      if (d.habits.length === 0) {
        habitsList.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted); font-size:13.5px;">No habits added yet. Track your first routine builder above.</div>`;
        return;
      }

      const getPast7Days = () => {
        const arr = [];
        for (let i = 6; i >= 0; i--) {
          const dDate = new Date();
          dDate.setDate(dDate.getDate() - i);
          arr.push(dDate);
        }
        return arr;
      };
      const pastDays = getPast7Days();

      habitsList.innerHTML = d.habits.map(hb => {
        const accentColor = hb.type === 'positive' ? '#10b981' : '#f97316';
        const labelText = hb.type === 'positive' ? 'Routine Builder' : 'Vice Breaker';

        const totalLogged = Object.keys(hb.logs || {}).filter(k => hb.logs[k]).length;
        const totalDaysTracked = Math.max(1, Object.keys(hb.logs || {}).length);
        const consistency = Math.round((totalLogged / totalDaysTracked) * 100);

        return `
          <div class="pomo-card" style="margin-bottom:16px; flex-direction:row; justify-content:space-between; align-items:center; padding:16px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="material-symbols-outlined" style="color:${accentColor};">${hb.type === 'positive' ? 'self_improvement' : 'smartphone'}</span>
                <span style="font-size:15px; font-weight:700; color:var(--text-main);">${hb.name}</span>
                <span style="font-size:9.5px; font-weight:600; padding:1px 6px; border-radius:10px; background:rgba(0,0,0,0.03); color:${accentColor};">${labelText}</span>
              </div>
              <div style="font-size:11.5px; color:var(--text-muted); display:flex; gap:12px; margin-top:2px;">
                <span>Streak: <strong>🔥 ${hb.streak || 0}d</strong></span>
                <span>Consistency: <strong>${consistency}%</strong></span>
                <span>Best: <strong>${hb.bestStreak || 0}d</strong></span>
              </div>
            </div>

            <!-- checkmarks -->
            <div style="display:flex; align-items:center; gap:16px;">
              <div class="habit-checkmark-row">
                ${pastDays.map(day => {
                  const dayKey = day.toDateString();
                  const checked = hb.logs && hb.logs[dayKey];
                  const dayLabel = day.toLocaleDateString(undefined, { weekday: 'narrow' });
                  return `
                    <div class="habit-checkmark-bubble ${checked ? 'completed' : ''}" 
                         data-id="${hb.id}" data-day-key="${dayKey}"
                         style="${checked ? `background:${accentColor}; border-color:${accentColor}; color:#ffffff;` : ''}"
                         title="${day.toLocaleDateString()}">
                      ${dayLabel}
                    </div>
                  `;
                }).join('')}
              </div>
              <button class="habit-board-delete-btn" data-id="${hb.id}" style="background:transparent; border:none; color:#ef4444; cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
            </div>
          </div>
        `;
      }).join('');

      // Checkbox event logic
      habitsList.querySelectorAll('.habit-checkmark-bubble').forEach(el => {
        el.addEventListener('click', async () => {
          const habitId = el.getAttribute('data-id');
          const dayKey = el.getAttribute('data-day-key');
          const habit = d.habits.find(h => h.id === habitId);
          if (habit) {
            habit.logs = habit.logs || {};
            const wasChecked = !!habit.logs[dayKey];
            habit.logs[dayKey] = !wasChecked;

            // Recalculate Streak
            let streak = 0;
            let bestStreak = habit.bestStreak || 0;
            const checkDate = new Date();
            while (true) {
              const checkKey = checkDate.toDateString();
              if (habit.logs[checkKey]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                const todayKey = new Date().toDateString();
                if (checkKey === todayKey) {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  if (habit.logs[yesterday.toDateString()]) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    continue;
                  }
                }
                break;
              }
            }

            habit.streak = streak;
            if (streak > bestStreak) {
              habit.bestStreak = streak;
            }

            await db.savePomodoroData(d);
            renderHabitsView();
            renderHabitGoalRadial();
          }
        });
      });

      // Delete habit
      habitsList.querySelectorAll('.habit-board-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          d.habits = d.habits.filter(h => h.id !== id);
          await db.savePomodoroData(d);
          renderHabitsView();
          renderHabitGoalRadial();
        });
      });
    };

    const renderHabitGoalRadial = () => {
      const circleEl = document.getElementById('habits-goal-radial-progress');
      const textEl = document.getElementById('habits-goal-radial-text');
      if (!circleEl || !textEl) return;

      const totalHabits = d.habits.length;
      if (totalHabits === 0) {
        textEl.textContent = '0/0';
        circleEl.style.strokeDashoffset = '251.2';
        return;
      }

      const todayStr = new Date().toDateString();
      const completedToday = d.habits.filter(hb => hb.logs && hb.logs[todayStr]).length;
      textEl.textContent = `${completedToday}/${totalHabits}`;

      const circumference = 2 * Math.PI * 40;
      const fraction = completedToday / totalHabits;
      circleEl.style.strokeDashoffset = circumference * (1 - fraction);
    };

    mainPane.innerHTML = `
      <div class="pomo-canvas">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <div>
            <h2 style="font-size:24px; font-weight:700; margin:0;">Habits Overview</h2>
            <p style="margin:4px 0 0 0; font-size:13px; color:var(--text-muted);">Build positive routines and track your daily habits.</p>
          </div>
          
          <div style="display:flex; gap:12px; align-items:center;">
            <input type="text" id="habit-new-name" placeholder="Meditation, workout..." style="padding:6px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px;" />
            <select id="habit-new-type" style="padding:6px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:transparent; color:var(--text-main);">
              <option value="positive">🟢 Build</option>
              <option value="negative">Quit</option>
            </select>
            <button class="create-new-btn" id="habit-add-btn" style="margin-bottom:0; padding:6px 16px; font-size:13px;">Add Habit</button>
          </div>
        </div>

        <div class="pomo-bento-grid">
          <!-- Left Column (Col 8) -->
          <div class="pomo-card-col-8" id="dash-habits-board-list"></div>

          <!-- Right Column Progress Ring (Col 4) -->
          <div class="pomo-card pomo-card-col-4" style="align-items:center; justify-content:center; text-align:center;">
            <h3 style="font-size:16px; font-weight:700; margin:0 0 16px 0;">Today's Focus</h3>
            <div style="position:relative; width:140px; height:140px; margin-bottom:16px;">
              <svg style="transform:rotate(-90deg); width:100%; height:100%;">
                <circle cx="70" cy="70" r="40" fill="none" stroke="var(--border-color)" stroke-width="8" style="opacity:0.5;"></circle>
                <circle id="habits-goal-radial-progress" cx="70" cy="70" r="40" fill="none" stroke="var(--primary)" stroke-width="8" stroke-linecap="round"
                        style="stroke-dasharray: 251.2; stroke-dashoffset: 251.2; transition: stroke-dashoffset 0.3s ease;"></circle>
              </svg>
              <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div id="habits-goal-radial-text" style="font-size:20px; font-weight:700; color:var(--text-main);">0/0</div>
                <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Completed</div>
              </div>
            </div>
            <p style="font-size:12.5px; color:var(--text-muted); margin:0;">Track all habits daily to maintain consistency loops.</p>
          </div>
        </div>
      </div>
    `;

    renderHabitsView();
    renderHabitGoalRadial();

    const handleAddHabit = async () => {
      const nameInput = document.getElementById('habit-new-name');
      const typeSelect = document.getElementById('habit-new-type');
      const name = nameInput.value.trim();
      const type = typeSelect.value;

      if (name) {
        const newHabit = {
          id: generateSecureId('h-'),
          name: name,
          type: type,
          frequency: 'daily',
          logs: {},
          streak: 0,
          bestStreak: 0
        };
        d.habits.push(newHabit);
        await db.savePomodoroData(d);
        nameInput.value = '';
        renderHabitsView();
        renderHabitGoalRadial();
      }
    };

    document.getElementById('habit-add-btn').addEventListener('click', handleAddHabit);
    document.getElementById('habit-new-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddHabit();
    });

  } else if (activeTab === 'analytics') {
    // TABS 4: ANALYTICS & INSIGHTS
    const totalSessions = d.sessions || [];
    const focusSessions = totalSessions.filter(s => s.type === 'focus' && s.completed);

    if (focusSessions.length === 0) {
      mainPane.innerHTML = `
        <div class="pomo-canvas" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; text-align:center;">
          <div style="background:var(--primary-light-active); width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--primary); margin-bottom:16px;">
            <span class="material-symbols-outlined" style="font-size:32px;">analytics</span>
          </div>
          <h2 style="font-size:20px; font-weight:700; margin:0; color:var(--text-main);">No Analytics Data Yet</h2>
          <p style="font-size:13.5px; color:var(--text-muted); max-width:320px; margin:8px 0 16px 0; line-height:1.5;">
            Your deep work curves, time distributions, and habit integrity scores will populate here once you complete a focus session.
          </p>
          <a href="#pomodoro/dashboard" class="create-new-btn" style="text-decoration:none; margin:0; padding:8px 16px; font-size:13px;">Start Focus Session</a>
        </div>
      `;
      return;
    }
    const totalFocusHours = ((focusSessions.length * t.config.focusDuration) / 3600).toFixed(1);

    const completedTodayCount = t.completedTodayCount;
    const startedTodayCount = Math.max(completedTodayCount, t.startedTodayCount);
    const focusIntegrity = startedTodayCount > 0 ? Math.round((completedTodayCount / startedTodayCount) * 100) : 100;

    // Time distribution donut segments mapping
    // We will render a beautifully detailed visual layout matching pom.html
    mainPane.innerHTML = `
      <div class="pomo-canvas">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:24px; font-weight:700; margin:0;">Analytics</h2>
          <p style="margin:4px 0 0 0; font-size:13px; color:var(--text-muted);">Explore your performance curves and deep work stats.</p>
        </div>

        <div class="pomo-bento-grid">
          <!-- Focus Integrity Card -->
          <div class="pomo-card pomo-card-col-4" style="justify-content:space-between;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 style="font-size:11.5px; font-weight:600; text-transform:uppercase; color:var(--text-muted); tracking-wide:1px;">Focus Integrity</h4>
              <span class="material-symbols-outlined" style="color:var(--primary);">verified</span>
            </div>
            <div style="display:flex; align-items:baseline; gap:8px; margin:16px 0;">
              <span style="font-size:48px; font-weight:500; font-family:var(--font-mono); color:var(--text-main);">${focusIntegrity}%</span>
              <span style="color:#10b981; font-size:12px; font-weight:600; background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:12px;">+4%</span>
            </div>
            <p style="font-size:12.5px; color:var(--text-muted); margin:0;">Your ability to maintain deep work states without interruption is improving.</p>
          </div>

          <!-- Time Distribution Card -->
          <div class="pomo-card pomo-card-col-8">
            <h4 style="font-size:11.5px; font-weight:600; text-transform:uppercase; color:var(--text-muted); tracking-wide:1px; margin:0 0 16px 0;">Time Distribution</h4>
            <div style="display:flex; align-items:center; justify-content:space-around; gap:16px; flex:1;">
              <!-- Donut Chart Circle -->
              <div class="pomo-chart-donut" style="border:16px solid var(--border-color); border-top-color:var(--primary); border-right-color:var(--primary-light-active);">
                <div style="font-size:20px; font-weight:700;">${totalFocusHours}h</div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; min-width:140px;">
                <div style="display:flex; justify-content:space-between; font-size:12px;">
                  <span style="color:var(--text-main); font-weight:500;">🎯 Deep Work</span>
                  <strong>65%</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:12px;">
                  <span style="color:var(--text-main); font-weight:500;">📖 Learning</span>
                  <strong>20%</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:12px;">
                  <span style="color:var(--text-main); font-weight:500;">⚙️ Admin/Other</span>
                  <strong>15%</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Productivity curve hourly curve line chart -->
          <div class="pomo-card pomo-card-col-12" style="padding-bottom:16px;">
            <h4 style="font-size:11.5px; font-weight:600; text-transform:uppercase; color:var(--text-muted); tracking-wide:1px; margin:0 0 16px 0;">Productivity Curve</h4>
            <div style="position:relative; height:180px; width:100%; display:flex; flex-direction:column;">
              <div style="flex:1; position:relative; border-bottom:1px solid var(--border-color);">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">
                  <path d="M0,90 Q15,70 30,30 T60,40 T90,20 T100,60 L100,100 L0,100 Z" fill="var(--primary-light-active)" style="opacity:0.25;"></path>
                  <path d="M0,90 Q15,70 30,30 T60,40 T90,20 T100,60" fill="none" stroke="var(--primary)" stroke-width="2.5" vector-effect="non-scaling-stroke"></path>
                </svg>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:10.5px; color:var(--text-muted); padding:6px 12px 0 12px;">
                <span>6 AM</span>
                <span>9 AM</span>
                <span>12 PM</span>
                <span>3 PM</span>
                <span>6 PM</span>
                <span>9 PM</span>
              </div>
            </div>
          </div>

          <!-- Key Insights Card -->
          <div class="pomo-card pomo-card-col-4" style="background:var(--primary-light-active); border-color:var(--primary-light-active); justify-content:center;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
              <span class="material-symbols-outlined" style="color:var(--primary);">lightbulb</span>
              <h3 style="font-size:16px; font-weight:700; color:var(--primary); margin:0;">Key Insight</h3>
            </div>
            <p style="font-size:14px; line-height:1.5; color:var(--text-main); margin:0 0 16px 0;">
              Your productivity peaks on days you complete your <span style="font-weight:700; color:var(--primary);">Morning Meditation</span> habit loop.
            </p>
            <a href="#pomodoro/habits" style="display:inline-block; align-self:flex-start; text-decoration:none; background:var(--card-bg); border:1px solid var(--border-color); color:var(--primary); font-size:12.5px; font-weight:600; padding:6px 12px; border-radius:8px;">View Habit Details</a>
          </div>

          <!-- Week-over-week Growth Bars Chart -->
          <div class="pomo-card pomo-card-col-8">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h4 style="font-size:11.5px; font-weight:600; text-transform:uppercase; color:var(--text-muted); tracking-wide:1px; margin:0;">Week over Week</h4>
              <div style="display:flex; gap:12px; font-size:10.5px; color:var(--text-muted);">
                <div style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; background:var(--border-color); border-radius:2px;"></span> Last Wk</div>
                <div style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; background:var(--primary); border-radius:2px;"></span> This Wk</div>
              </div>
            </div>

            <!-- Faux Bar charts rendering -->
            <div class="pomo-chart-bar-container">
              <div class="pomo-chart-bar-group">
                <div class="pomo-chart-bar-wrapper">
                  <div class="pomo-chart-bar bg-secondary" style="height:40%;"></div>
                  <div class="pomo-chart-bar bg-primary" style="height:60%;"></div>
                </div>
                <span style="font-size:10.5px; color:var(--text-muted);">Mon</span>
              </div>
              <div class="pomo-chart-bar-group">
                <div class="pomo-chart-bar-wrapper">
                  <div class="pomo-chart-bar bg-secondary" style="height:50%;"></div>
                  <div class="pomo-chart-bar bg-primary" style="height:80%;"></div>
                </div>
                <span style="font-size:10.5px; color:var(--text-muted);">Tue</span>
              </div>
              <div class="pomo-chart-bar-group">
                <div class="pomo-chart-bar-wrapper">
                  <div class="pomo-chart-bar bg-secondary" style="height:70%;"></div>
                  <div class="pomo-chart-bar bg-primary" style="height:65%;"></div>
                </div>
                <span style="font-size:10.5px; color:var(--text-muted);">Wed</span>
              </div>
              <div class="pomo-chart-bar-group">
                <div class="pomo-chart-bar-wrapper">
                  <div class="pomo-chart-bar bg-secondary" style="height:30%;"></div>
                  <div class="pomo-chart-bar bg-primary" style="height:90%;"></div>
                </div>
                <span style="font-size:10.5px; color:var(--text-muted);">Thu</span>
              </div>
              <div class="pomo-chart-bar-group">
                <div class="pomo-chart-bar-wrapper">
                  <div class="pomo-chart-bar bg-secondary" style="height:80%;"></div>
                  <div class="pomo-chart-bar bg-primary" style="height:50%;"></div>
                </div>
                <span style="font-size:10.5px; color:var(--text-muted);">Fri</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (activeTab === 'settings') {
    // TABS 5: DEDICATED PREFERENCES PANEL (EMOJI-FREE)
    mainPane.innerHTML = `
      <div class="pomo-canvas" style="max-width: 600px;">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:22px; font-weight:800; margin:0; color:var(--text-main);">Settings</h2>
          <p style="margin:4px 0 0 0; font-size:12.5px; color:var(--text-muted);">Configure your Focus Timer preferences</p>
        </div>

        <div class="pomo-card" style="padding:24px; display:flex; flex-direction:column; gap:20px;">
          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:13px; font-weight:700; color:var(--text-main);">Focus Duration</label>
            <select id="pref-focus-duration" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:var(--bg-secondary-sidebar); color:var(--text-main); font-weight:600; cursor:pointer;">
              <option value="1500" \${t.config.focusDuration === 1500 ? 'selected' : ''}>25 minutes</option>
              <option value="3000" \${t.config.focusDuration === 3000 ? 'selected' : ''}>50 minutes</option>
              <option value="900" \${t.config.focusDuration === 900 ? 'selected' : ''}>15 minutes</option>
              <option value="60" \${t.config.focusDuration === 60 ? 'selected' : ''}>1 minute (Demo/Test)</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:13px; font-weight:700; color:var(--text-main);">Short Break</label>
              <select id="pref-short-break" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:var(--bg-secondary-sidebar); color:var(--text-main); font-weight:600; cursor:pointer;">
                <option value="300" \${t.config.shortBreakDuration === 300 ? 'selected' : ''}>5 minutes</option>
                <option value="600" \${t.config.shortBreakDuration === 600 ? 'selected' : ''}>10 minutes</option>
                <option value="60" \${t.config.shortBreakDuration === 60 ? 'selected' : ''}>1 minute</option>
              </select>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:13px; font-weight:700; color:var(--text-main);">Long Break</label>
              <select id="pref-long-break" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:var(--bg-secondary-sidebar); color:var(--text-main); font-weight:600; cursor:pointer;">
                <option value="900" \${t.config.longBreakDuration === 900 ? 'selected' : ''}>15 minutes</option>
                <option value="1800" \${t.config.longBreakDuration === 1800 ? 'selected' : ''}>30 minutes</option>
                <option value="120" \${t.config.longBreakDuration === 120 ? 'selected' : ''}>2 minutes</option>
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:13px; font-weight:700; color:var(--text-main);">Chime Sound Profile</label>
              <select id="pref-chime-profile" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:var(--bg-secondary-sidebar); color:var(--text-main); font-weight:600; cursor:pointer;">
                <option value="classic" \${t.config.chimeProfile === 'classic' ? 'selected' : ''}>Classic Chime</option>
                <option value="zen" \${t.config.chimeProfile === 'zen' ? 'selected' : ''}>Zen Bell</option>
                <option value="digital" \${t.config.chimeProfile === 'digital' ? 'selected' : ''}>Digital Beeps</option>
                <option value="harp" \${t.config.chimeProfile === 'harp' ? 'selected' : ''}>Soft Harp</option>
              </select>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:13px; font-weight:700; color:var(--text-main);">Default Task Priority</label>
              <select id="pref-default-priority" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:var(--bg-secondary-sidebar); color:var(--text-main); font-weight:600; cursor:pointer;">
                <option value="High Priority" \${t.config.defaultTaskPriority === 'High Priority' ? 'selected' : ''}>High Priority</option>
                <option value="Medium Priority" \${t.config.defaultTaskPriority === 'Medium Priority' ? 'selected' : ''}>Medium Priority</option>
                <option value="Low Priority" \${t.config.defaultTaskPriority === 'Low Priority' ? 'selected' : ''}>Low Priority</option>
              </select>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-size:13px; font-weight:700; color:var(--text-main);">Daily Sessions Target</label>
            <input type="number" id="pref-daily-target" value="\${t.dailyTarget}" min="1" max="24" style="padding:10px 12px; border:1px solid var(--border-color); border-radius:8px; font-family:inherit; font-size:13px; background:transparent; color:var(--text-main); font-weight:600;" />
          </div>

          <div style="display:flex; flex-direction:column; gap:12px; border-top:1px solid var(--border-color); padding-top:16px;">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:var(--text-main); font-weight:600;">
              <input type="checkbox" id="pref-auto-transitions" \${t.config.autoTransitions ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--primary);" />
              Auto-transition timer blocks
            </label>
            
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:var(--text-main); font-weight:600;">
              <input type="checkbox" id="pref-audio-enabled" \${t.audioEnabled ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--primary);" />
              Enable synthesizer chime sounds
            </label>

            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:var(--text-main); font-weight:600;">
              <input type="checkbox" id="pref-metronome-enabled" \${t.config.metronomeEnabled ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--primary);" />
              Play soft metronome ticking sound during focus blocks
            </label>

            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:var(--text-main); font-weight:600;">
              <input type="checkbox" id="pref-weekend-freeze" \${t.config.weekendFreeze ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--primary);" />
              Enable weekend freeze (prevents habit streak breaks on Saturday and Sunday)
            </label>
          </div>

          <button id="pref-save-btn" class="create-new-btn" style="margin-top:10px; padding:12px; font-size:13.5px; font-weight:700;">Save Preferences</button>
        </div>
      </div>
    `;

    document.getElementById('pref-save-btn').addEventListener('click', async () => {
      const focus = parseInt(document.getElementById('pref-focus-duration').value);
      const short = parseInt(document.getElementById('pref-short-break').value);
      const long = parseInt(document.getElementById('pref-long-break').value);
      const target = parseInt(document.getElementById('pref-daily-target').value) || 8;
      const autoTrans = document.getElementById('pref-auto-transitions').checked;
      const audio = document.getElementById('pref-audio-enabled').checked;
      const chime = document.getElementById('pref-chime-profile').value;
      const priority = document.getElementById('pref-default-priority').value;
      const metronome = document.getElementById('pref-metronome-enabled').checked;
      const freeze = document.getElementById('pref-weekend-freeze').checked;

      t.config.focusDuration = focus;
      t.config.shortBreakDuration = short;
      t.config.longBreakDuration = long;
      t.config.autoTransitions = autoTrans;
      t.config.chimeProfile = chime;
      t.config.defaultTaskPriority = priority;
      t.config.metronomeEnabled = metronome;
      t.config.weekendFreeze = freeze;
      t.dailyTarget = target;
      t.audioEnabled = audio;

      if (!t.isRunning) {
        if (t.state === 'focus') {
          t.secondsLeft = focus;
          t.totalSeconds = focus;
        } else if (t.state === 'shortBreak') {
          t.secondsLeft = short;
          t.totalSeconds = short;
        } else if (t.state === 'longBreak') {
          t.secondsLeft = long;
          t.totalSeconds = long;
        }
      }

      d.timerConfig = t.config;
      d.dailyTarget = target;
      await db.savePomodoroData(d);

      alert("Settings saved successfully!");
      renderPomodoroSecondarySidebar('settings');
      renderPomodoroDashboard('settings');
    });
  }
}
