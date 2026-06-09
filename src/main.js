// IntelliNote App Main Entry Point & Controller
import './style.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { db } from './db.js';
import { emoji } from './emoji.js';
import { Editor } from './editor.js';
import { search } from './search.js';

// Expose KaTeX globally for editor blocks
window.katex = katex;

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

// Premium Cover Gradient Presets
const COVER_PRESETS = [
  'linear-gradient(135deg, #a78bfa, #7c3aed)', // Violet Breeze
  'linear-gradient(135deg, #60a5fa, #2563eb)', // Ocean Splash
  'linear-gradient(135deg, #34d399, #059669)', // Emerald Glow
  'linear-gradient(135deg, #f472b6, #ec4899)', // Pink Sunset
  'linear-gradient(135deg, #fbbf24, #d97706)', // Golden Amber
  'linear-gradient(135deg, #1e293b, #0f172a)', // Midnight Black
  'linear-gradient(135deg, #ff7e5f, #feb47b)', // Peach Sunrise
  'linear-gradient(135deg, #2b5876, #4e4376)'  // Deep Sea
];

const PRESET_IMAGES = [
  { name: 'Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
  { name: 'Abstract', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80' },
  { name: 'Forest', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80' },
  { name: 'Office', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80' }
];

function getCoverBackgroundStyle(coverVal) {
  if (!coverVal) return '';
  if (coverVal.startsWith('linear-gradient') || coverVal.startsWith('gradient')) {
    return coverVal;
  }
  if (coverVal.startsWith('url(')) {
    return coverVal;
  }
  return `url('${coverVal}')`;
}

// Initialize DB structure
try {
  await db.init();
} catch (e) {
  console.error("Failed to init DB:", e);
}

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
      <div class="sidebar-section-title" style="padding-left: 14.7px; margin-top: 14.7px; margin-bottom: 6.3px;">Favorites</div>
      <div class="favorites-workspaces-list" id="fav-ws-drag-container">
        ${starredWorkspaces.map(w => renderWorkspaceListItemHTML(w)).join('')}
      </div>
    ` : ''}

    <!-- Workspaces Section -->
    <div class="sidebar-section-title" style="padding-left: 14.7px; margin-top: 14.7px; margin-bottom: 6.3px;">Workspaces</div>
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
        <span class="ws-item-name">${w.name}</span>
      </div>
      <div style="display:flex; align-items:center; gap: 4.2px;">
        ${w.starred ? '<span class="star-icon-indicator" style="font-size:11.5px; color:#eab308;">⭐</span>' : ''}
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
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 21px;">
        <div class="sidebar-section-title" style="padding-left:0; margin-bottom: 0;">Recent Workspaces</div>
        ${workspaces.length > 0 ? `<button id="btn-dashboard-import-ws-grid" class="create-new-btn" style="margin-bottom:0; padding: 6px 12.6px; font-size:13.7px; border-radius:15.8px; height:auto;">📥 Import Workspace</button>` : ''}
      </div>
      
      ${workspaces.length === 0 ? `
        <div class="dashboard-empty-workspaces" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 50.4px; border:2px dashed var(--border-color); border-radius: var(--radius-lg); text-align:center;">
          <div style="font-size:37.8px; margin-bottom: 12.6px;">📂</div>
          <div style="font-size: 16.8px; font-weight:600; margin-bottom: 4.2px;">No Workspaces Yet</div>
          <div style="font-size: 13.7px; color: var(--text-muted); margin-bottom: 21px;">Create your first workspace to start writing documents.</div>
          <div style="display:flex; gap: 10.5px;">
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
                <div class="workspace-card-cover" style="background: ${w.cover || 'var(--loop-purple-gradient)'}">
                  <div class="ws-card-icon-premium">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  <button class="ws-card-star-btn" data-id="${w.id}" title="${w.starred ? 'Starred' : 'Star'}" style="position:absolute; top: 10.5px; right: 10.5px; background: rgba(255,255,255,0.85); border:none; border-radius:50%; width: 29.4px; height: 29.4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12.6px; color: ${w.starred ? '#eab308' : 'var(--text-light)'};">
                    ${w.starred ? '★' : '☆'}
                  </button>
                </div>
                <div class="workspace-card-content">
                  <div class="workspace-card-name">${w.name}</div>
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
          <div class="ws-icon-premium" style="width:29.4px; height:29.4px; border-radius:7.4px;">
            ${PAGE_SVG_HTML(14.7)}
          </div>
          <span class="sec-ws-name">${workspace.name}</span>
        </div>
        <div style="display:flex; align-items:center; gap:4.2px;">
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
    container.innerHTML = `<div style="font-size:12.6px; color:var(--text-light); text-align:center; padding: 21px 0;">No pages. Click + to add.</div>`;
    return;
  }

  container.innerHTML = chapters.map(c => `
    <div class="chapter-nav-item ${activeChapterId === c.id ? 'active' : ''}" data-id="${c.id}" draggable="true">
      <div class="chapter-nav-left">
        <span class="chapter-nav-icon-container">
          ${c.emoji ? `<span class="chapter-nav-emoji">${c.emoji}</span>` : `<span class="chapter-nav-icon">${PAGE_SVG_HTML(14.7)}</span>`}
        </span>
        <span class="chapter-nav-title">${c.title || 'Untitled Page'}</span>
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
        <div style="height: 5vh; width: 100%; flex-shrink: 0; pointer-events: none;"></div>
      </div>
    </div>
  `;

  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('intellinote-dark-mode', isCurrentlyDark);
  });

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
        activeSidebarItem.innerHTML = `<span class="chapter-nav-emoji">${selectedEmoji}</span>`;
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
    <div class="loop-search-dialog" style="width: 420px; padding: 21px;">
      <h3 style="font-size: 17.8px; font-weight: 600; margin-bottom: 12.6px; color: var(--text-main);">${title}</h3>
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
                ${c.emoji ? `<span class="bin-item-emoji">${c.emoji}</span>` : `<span class="bin-item-icon">${PAGE_SVG_HTML(14.7)}</span>`}
              </span>
              <span class="bin-item-title">${c.title || 'Untitled Page'}</span>
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

// --- Notifications Drawer Modal ---
function showNotificationsDrawer() {
  const overlay = document.createElement('div');
  overlay.className = 'loop-search-modal-overlay';
  overlay.innerHTML = `
    <div class="loop-search-dialog" style="width: 420px;">
      <div class="bin-header">
        <h3 class="bin-title">Notifications</h3>
        <button class="bin-close-btn" id="notify-close">×</button>
      </div>
      <div style="padding: 42px 25.2px; text-align: center; color: var(--text-muted); font-size:14.7px;">
        <div style="font-size: 33.6px; margin-bottom: 12.6px;">🔔</div>
        <div>No notifications right now. Same chill UI. Keep styling cozy.</div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
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
          <div style="padding: 10.5px; display: flex; gap: 8.4px; border-bottom: 1px solid var(--border-color);">
            <button id="btn-plugins-list-tab" style="flex-grow: 1; padding: 6.3px; font-family: inherit; font-size: 13.7px; font-weight: 600; border: none; background: var(--primary-light-active); color: var(--primary); border-radius: 6.3px; cursor: pointer;">Installed</button>
            <button id="btn-plugins-create-tab" style="flex-grow: 1; padding: 6.3px; font-family: inherit; font-size: 13.7px; font-weight: 500; border: none; background: transparent; color: var(--text-muted); border-radius: 6.3px; cursor: pointer;">＋ Custom</button>
          </div>
          <div id="plugins-list-container" style="flex-grow: 1; overflow-y: auto; padding: 8.4px; display: flex; flex-direction: column; gap: 4.2px;">
            <!-- Render list of plugins here -->
          </div>
        </div>

        <!-- Right panel: plugin detail or create form -->
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

  const listTab = overlay.querySelector('#btn-plugins-list-tab');
  const createTab = overlay.querySelector('#btn-plugins-create-tab');
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
          ${!plugin.isBuiltIn ? `<button id="btn-plugin-delete" style="border: 1px solid rgba(239, 68, 68, 0.2); background: transparent; color: #ef4444; font-family: inherit; font-size: 13.2px; padding: 6.3px 12.6px; border-radius: 21px; cursor: pointer; font-weight: 500;">Delete</button>` : ''}
          <button id="btn-plugin-toggle" style="border: none; background: ${plugin.enabled ? '#ef4444' : 'var(--primary)'}; color: #fff; font-family: inherit; font-size: 13.2px; padding: 6.3px 12.6px; border-radius: 21px; cursor: pointer; font-weight: 500;">
            ${plugin.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
      <p style="font-size: 14.7px; color: var(--text-muted); line-height: 1.5; margin-bottom: 21px; border-bottom: 1px solid var(--border-color); padding-bottom: 12.6px;">${plugin.description}</p>
      
      ${plugin.id === 'autocomplete' ? `
        <div style="margin-bottom: 16.8px; padding: 14.7px; background: rgba(124, 58, 237, 0.05); border: 1px dashed rgba(124, 58, 237, 0.2); border-radius: 10.5px; display: flex; flex-direction: column; gap: 10.5px;">
          <div style="font-size: 13.7px; font-weight: 600; color: var(--primary);">Groq AI Integration Settings</div>
          <div style="display:flex; flex-direction:column; gap:4.2px;">
            <label style="font-size:12.1px; font-weight:500; color:var(--text-main);">Groq API Key</label>
            <input type="password" id="groq-api-key" placeholder="gsk_..." value="${localStorage.getItem('intellinote_groq_api_key') || ''}" style="padding:6.3px 10.5px; font-size:13.2px; border:1px solid var(--border-color); border-radius:6.3px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4.2px;">
            <label style="font-size:12.1px; font-weight:500; color:var(--text-main);">Groq Model ID</label>
            <input type="text" id="groq-model-id" placeholder="openai/gpt-oss-20b" value="${localStorage.getItem('intellinote_groq_model_name') || 'openai/gpt-oss-20b'}" style="padding:6.3px 10.5px; font-size:13.2px; border:1px solid var(--border-color); border-radius:6.3px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="text-align:right;">
            <button id="btn-save-groq-config" style="padding:5.3px 12.6px; font-size:12.6px; font-weight:500; background:var(--primary); color:#ffffff; border:none; border-radius:6.3px; cursor:pointer; font-family:inherit;">Save Settings</button>
          </div>
        </div>
      ` : ''}
      
      <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8.4px; overflow: hidden;">
        <div style="font-size: 12.6px; font-weight: 600; color: var(--text-light); text-transform: uppercase;">Renderer Code</div>
        <textarea id="plugin-code-textarea" readonly style="flex-grow: 1; width: 100%; font-family: var(--font-mono); font-size: 13.2px; padding: 12.6px; border: 1px solid var(--border-color); border-radius: 8.4px; background: #f8fafc; color: var(--text-muted); resize: none; outline: none; white-space: pre; overflow: auto;">${plugin.renderCode}</textarea>
        ${!plugin.isBuiltIn ? `<div style="text-align: right;"><button id="btn-plugin-edit" style="border: 1px solid var(--primary); background: transparent; color: var(--primary); font-family: inherit; font-size: 12.6px; padding: 5.3px 12.6px; border-radius: 6.3px; cursor: pointer; font-weight: 500; margin-top: 4.2px;">Edit Code</button></div>` : ''}
      </div>
    `;

    if (plugin.id === 'autocomplete') {
      detailPane.querySelector('#btn-save-groq-config').addEventListener('click', () => {
        const keyVal = detailPane.querySelector('#groq-api-key').value.trim();
        const modelVal = detailPane.querySelector('#groq-model-id').value.trim() || 'openai/gpt-oss-20b';
        localStorage.setItem('intellinote_groq_api_key', keyVal);
        localStorage.setItem('intellinote_groq_model_name', modelVal);
        alert('Groq API configuration saved successfully!');
      });
    }

    detailPane.querySelector('#btn-plugin-toggle').addEventListener('click', () => {
      db.togglePlugin(id);
      renderPluginsList();
      renderPluginDetails(id);
      if (activeEditorInstance) activeEditorInstance.render();
    });

    if (!plugin.isBuiltIn) {
      detailPane.querySelector('#btn-plugin-delete').addEventListener('click', () => {
        showConfirmationModal({
          title: 'Delete Plugin?',
          message: `Are you sure you want to permanently delete custom plugin "${plugin.name}"? This will disable all blocks associated with it.`,
          confirmText: 'Delete',
          confirmClass: 'delete',
          onConfirm: () => {
            db.deletePlugin(id);
            selectedPluginId = null;
            renderPluginsList();
            if (activeEditorInstance) activeEditorInstance.render();
          }
        });
      });

      detailPane.querySelector('#btn-plugin-edit').addEventListener('click', () => {
        showCustomPluginForm(plugin);
      });
    }
  };

  const showCustomPluginForm = (existingPlugin = null) => {
    listTab.style.fontWeight = '500';
    listTab.style.background = 'transparent';
    listTab.style.color = 'var(--text-muted)';
    createTab.style.fontWeight = '600';
    createTab.style.background = 'var(--primary-light-active)';
    createTab.style.color = 'var(--primary)';

    const defaultCode = `// Write your custom block renderer code here!\\n// Available variables:\\n// - block: the block data object (store block.data here)\\n// - index: the index of this block in the list\\n// - container: the DOM element container to render your HTML inside\\n// - editor: the Editor instance\\n// - save(): callback function to persist changes\\n// - db: the LocalStorage database manager\\n\\ncontainer.innerHTML = '';\\nconst card = document.createElement('div');\\ncard.style.padding = '16.8px';\\ncard.style.background = '#ffffff';\\ncard.style.border = '1px solid var(--border-color)';\\ncard.style.borderRadius = '10.5px';\\ncard.style.boxShadow = 'var(--shadow-sm)';\\n\\nconst title = document.createElement('h4');\\ntitle.style.margin = '0 0 8.4px 0';\\ntitle.style.fontSize = '15.7px';\\ntitle.textContent = 'Custom Widget: Click to count!';\\ncard.appendChild(title);\\n\\nconst countBtn = document.createElement('button');\\nif (!block.data || typeof block.data !== 'object') {\\n  block.data = { count: 0 };\\n}\\ncountBtn.textContent = 'Clicks: ' + block.data.count;\\ncountBtn.style.padding = '6.3px 14.7px';\\ncountBtn.style.borderRadius = '21px';\\ncountBtn.style.border = '1px solid var(--primary)';\\ncountBtn.style.background = 'transparent';\\ncountBtn.style.color = 'var(--primary)';\\ncountBtn.style.cursor = 'pointer';\\ncountBtn.style.fontWeight = '500';\\n\\ncountBtn.addEventListener('click', () => {\\n  block.data.count++;\\n  countBtn.textContent = 'Clicks: ' + block.data.count;\\n  save();\\n});\\n\\ncard.appendChild(countBtn);\\ncontainer.appendChild(card);`;

    detailPane.innerHTML = `
      <h3 style="font-size: 17.8px; font-weight: 600; color: var(--text-main); margin-bottom: 16.8px;">
        \${existingPlugin ? '📝 Edit Custom Plugin' : '🔌 Create Custom Plugin'}
      </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12.6px; margin-bottom: 12.6px;">
        <div>
          <label style="font-size: 12.6px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4.2px;">Plugin Name</label>
          <input type="text" id="plugin-form-name" placeholder="e.g. Counter Block" style="width:100%; padding:8.4px 12.6px; border-radius:6.3px; border:1px solid var(--border-color); font-size:14.7px; outline:none;" value="\${existingPlugin ? existingPlugin.name : ''}">
        </div>
        <div>
          <label style="font-size: 12.6px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4.2px;">Unique ID (lowercase, no spaces)</label>
          <input type="text" id="plugin-form-id" placeholder="e.g. click-counter" \${existingPlugin ? 'readonly' : ''} style="width:100%; padding:8.4px 12.6px; border-radius:6.3px; border:1px solid var(--border-color); font-size:14.7px; outline:none; background: \${existingPlugin ? '#f1f5f9; color:var(--text-light);' : '#fff'};" value="\${existingPlugin ? existingPlugin.id : ''}">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 84px 1fr; gap: 12.6px; margin-bottom: 12.6px;">
        <div>
          <label style="font-size: 12.6px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4.2px;">Icon Emoji</label>
          <input type="text" id="plugin-form-icon" placeholder="🔌" maxlength="4" style="width:100%; padding:8.4px 12.6px; border-radius:6.3px; border:1px solid var(--border-color); font-size:14.7px; text-align:center; outline:none;" value="\${existingPlugin ? existingPlugin.icon : '🔌'}">
        </div>
        <div>
          <label style="font-size: 12.6px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4.2px;">Short Description</label>
          <input type="text" id="plugin-form-desc" placeholder="e.g. Click count tracker box." style="width:100%; padding:8.4px 12.6px; border-radius:6.3px; border:1px solid var(--border-color); font-size:14.7px; outline:none;" value="\${existingPlugin ? existingPlugin.description : ''}">
        </div>
      </div>
      <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 4.2px; overflow: hidden; margin-bottom: 16.8px;">
        <label style="font-size: 12.6px; font-weight: 500; color: var(--text-muted);">Custom JS Renderer Code</label>
        <textarea id="plugin-form-code" style="flex-grow: 1; width: 100%; font-family: var(--font-mono); font-size: 12.6px; padding: 12.6px; border: 1px solid var(--border-color); border-radius: 8.4px; resize: none; outline: none; white-space: pre; overflow: auto;">\${existingPlugin ? existingPlugin.renderCode : defaultCode}</textarea>
      </div>
      <div style="text-align: right; display:flex; justify-content:flex-end; gap:8.4px;">
        <button id="btn-plugin-form-cancel" style="border: 1px solid var(--border-color); background:transparent; color: var(--text-muted); font-family: inherit; font-size: 13.7px; padding: 6.3px 16.8px; border-radius: 21px; cursor: pointer;">Cancel</button>
        <button id="btn-plugin-form-save" style="border: none; background: var(--primary); color: #fff; font-family: inherit; font-size: 13.7px; padding: 6.3px 16.8px; border-radius: 21px; cursor: pointer; font-weight: 500;">Save Plugin</button>
      </div>
    `;

    detailPane.querySelector('#btn-plugin-form-cancel').addEventListener('click', () => {
      listTab.click();
    });

    detailPane.querySelector('#btn-plugin-form-save').addEventListener('click', () => {
      const name = detailPane.querySelector('#plugin-form-name').value.trim();
      const id = detailPane.querySelector('#plugin-form-id').value.trim().toLowerCase().replace(/\\s+/g, '-');
      const icon = detailPane.querySelector('#plugin-form-icon').value.trim() || '🔌';
      const desc = detailPane.querySelector('#plugin-form-desc').value.trim() || 'Custom plugin block.';
      const code = detailPane.querySelector('#plugin-form-code').value;

      if (!name || !id || !code) {
        alert('Please fill in Name, ID, and Renderer Code!');
        return;
      }

      const pluginData = {
        id,
        name,
        icon,
        description: desc,
        enabled: existingPlugin ? existingPlugin.enabled : true,
        isBuiltIn: false,
        renderCode: code
      };

      db.savePlugin(pluginData);
      selectedPluginId = id;
      listTab.click();
      if (activeEditorInstance) activeEditorInstance.render();
    });
  };

  listTab.addEventListener('click', () => {
    listTab.style.fontWeight = '600';
    listTab.style.background = 'var(--primary-light-active)';
    listTab.style.color = 'var(--primary)';
    createTab.style.fontWeight = '500';
    createTab.style.background = 'transparent';
    createTab.style.color = 'var(--text-muted)';
    renderPluginsList();
  });

  createTab.addEventListener('click', () => {
    showCustomPluginForm();
  });

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
    if (data.type !== 'intellinote-page') {
      alert('Invalid file format. Please select an IntelliNote Page JSON file.');
      return;
    }
    const newChapter = {
      id: 'c-' + Math.random().toString(36).substr(2, 9),
      workspaceId: workspaceId,
      title: data.title || 'Imported Page',
      emoji: data.emoji || null,
      cover: data.cover || null,
      blocks: Array.isArray(data.blocks) ? data.blocks : [{ id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 }],
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
    if (data.type !== 'intellinote-workspace') {
      alert('Invalid file format. Please select an IntelliNote Workspace JSON file.');
      return;
    }
    
    const wsId = 'w-' + Math.random().toString(36).substr(2, 9);
    const newWorkspace = {
      id: wsId,
      name: data.name || 'Imported Workspace',
      cover: data.cover || null,
      starred: !!data.starred,
      updatedAt: new Date().toISOString()
    };
    db.saveWorkspace(newWorkspace);

    // Import its chapters/pages
    let firstChapterId = null;
    if (Array.isArray(data.chapters) && data.chapters.length > 0) {
      data.chapters.forEach((c, idx) => {
        const chapterId = 'c-' + Math.random().toString(36).substr(2, 9);
        if (idx === 0) firstChapterId = chapterId;
        const newChapter = {
          id: chapterId,
          workspaceId: wsId,
          title: c.title || 'Untitled Page',
          emoji: c.emoji || null,
          cover: c.cover || null,
          blocks: Array.isArray(c.blocks) ? c.blocks : [{ id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 }],
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
    btn.innerHTML = `${item.icon ? `<span>${item.icon}</span>` : ''} <span>${item.label}</span>`;
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

