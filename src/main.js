// IntelliNote App Main Entry Point & Controller
import './style.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { db } from './db.js';
import { emoji } from './emoji.js';
import { Editor } from './editor.js';
import { search } from './search.js';
import { escapeHTML, sanitizeHTML } from './security.js';

// Expose KaTeX & security helpers globally
window.katex = katex;
window.escapeHTML = escapeHTML;
window.sanitizeHTML = sanitizeHTML;

// Register Service Worker for offline PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('PWA Service Worker registered:', reg.scope);
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

  if (!hash || hash === '#' || hash === '#dashboard') {
    activeWorkspaceId = null;
    activeChapterId = null;
    renderDashboard();
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
  });
} else {
  handleRouting();
  setupPrimarySidebarEvents();
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
    onConfirm: () => {
      db.deleteWorkspace(ws.id);
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

    const wsId = 'w-' + Math.random().toString(36).substr(2, 9);
    
    const newWorkspace = {
      id: wsId,
      name: wsName,
      cover: selectedCover,
      starred: false,
      updatedAt: new Date().toISOString()
    };
    db.saveWorkspace(newWorkspace);

    // Initial page set
    const chapterId = 'c-' + Math.random().toString(36).substr(2, 9);
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
  const chapterId = 'c-' + Math.random().toString(36).substr(2, 9);
  const newChapter = {
    id: chapterId,
    workspaceId: activeWorkspaceId,
    title: '', // Start empty to let user write title
    emoji: null,
    blocks: [
      { id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 }
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
          <div class="notification-item ${n.read ? '' : 'unread'}">
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

function exportPage(chapterId) {
  const chapter = db.getChapter(chapterId);
  if (!chapter) return;
  const exportData = {
    type: 'intellinote-page',
    version: 1,
    title: chapter.title,
    emoji: chapter.emoji,
    cover: chapter.cover,
    blocks: chapter.blocks
  };
  downloadJSON(exportData, `${chapter.title || 'Untitled Page'}.json`);
}

function exportWorkspace(workspaceId) {
  const workspace = db.getWorkspace(workspaceId);
  if (!workspace) return;
  const chapters = db.getChapters(workspaceId);
  const exportData = {
    type: 'intellinote-workspace',
    version: 1,
    name: workspace.name,
    cover: workspace.cover,
    starred: workspace.starred,
    chapters: chapters.map(c => ({
      title: c.title,
      emoji: c.emoji,
      cover: c.cover,
      blocks: c.blocks
    }))
  };
  downloadJSON(exportData, `${workspace.name || 'Untitled Workspace'}.json`);
}

function importPageToWorkspace(workspaceId) {
  triggerJSONUpload((data) => {
    if (!data || typeof data !== 'object' || data.type !== 'intellinote-page') {
      alert('Invalid file format. Please select an IntelliNote Page JSON file.');
      return;
    }
    
    const rawBlocks = Array.isArray(data.blocks) ? data.blocks : [{ id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 }];
    const cleanBlocks = rawBlocks.map(b => {
      if (!b || typeof b !== 'object') {
        return { id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 };
      }
      return sanitizeBlock(b);
    });

    const newChapter = {
      id: 'c-' + Math.random().toString(36).substr(2, 9),
      workspaceId: workspaceId,
      title: escapeHTML(String(data.title || 'Imported Page')),
      emoji: data.emoji ? escapeHTML(String(data.emoji)) : null,
      cover: data.cover ? String(data.cover).replace(/[;{}]/g, '') : null,
      blocks: cleanBlocks,
      updatedAt: new Date().toISOString()
    };
    db.saveChapter(newChapter);
    
    // Refresh UI
    renderWorkspaceView();
    window.location.hash = `#workspace/${workspaceId}/chapter/${newChapter.id}`;
  });
}

function importWorkspaceGlobal() {
  triggerJSONUpload((data) => {
    if (!data || typeof data !== 'object' || data.type !== 'intellinote-workspace') {
      alert('Invalid file format. Please select an IntelliNote Workspace JSON file.');
      return;
    }
    
    const wsId = 'w-' + Math.random().toString(36).substr(2, 9);
    const newWorkspace = {
      id: wsId,
      name: escapeHTML(String(data.name || 'Imported Workspace')),
      cover: data.cover ? String(data.cover).replace(/[;{}]/g, '') : null,
      starred: !!data.starred,
      updatedAt: new Date().toISOString()
    };
    db.saveWorkspace(newWorkspace);

    // Import its chapters/pages
    let firstChapterId = null;
    if (Array.isArray(data.chapters) && data.chapters.length > 0) {
      data.chapters.forEach((c, idx) => {
        if (!c || typeof c !== 'object') return;
        const chapterId = 'c-' + Math.random().toString(36).substr(2, 9);
        if (idx === 0) firstChapterId = chapterId;
        
        const rawBlocks = Array.isArray(c.blocks) ? c.blocks : [{ id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 }];
        // Sanitize and normalize blocks
        const cleanBlocks = rawBlocks.map(b => {
          if (!b || typeof b !== 'object') {
            return { id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 };
          }
          return sanitizeBlock(b);
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
        db.saveChapter(newChapter);
      });
    } else {
      // Create at least one page if the workspace is empty
      const chapterId = 'c-' + Math.random().toString(36).substr(2, 9);
      firstChapterId = chapterId;
      const firstChapter = {
        id: chapterId,
        workspaceId: wsId,
        title: '',
        emoji: null,
        blocks: [{ id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 }],
        updatedAt: new Date().toISOString()
      };
      db.saveChapter(firstChapter);
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
        result[key] = sanitizeHTML(val);
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
  const id = block.id || ('b-' + Math.random().toString(36).substr(2, 9));
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
    let chatId = 'chat-' + Math.random().toString(36).substr(2, 9);
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
          const newId = 'b-' + Math.random().toString(36).substr(2, 9);
          const newBlock = {
            id: newId,
            type: 'chat-block',
            data: {
              chatId: 'chat-' + Math.random().toString(36).substr(2, 9),
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

    fetch('https://api.groq.com/openai/v1/chat/completions', {
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

