// IntelliNote App Main Entry Point & Controller
import './style.css';
import { db } from './db.js';
import { emoji } from './emoji.js';
import { Editor } from './editor.js';
import { search } from './search.js';

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

// Initialize DB structure
db.init();

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
window.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  setupPrimarySidebarEvents();
});

// --- Primary Sidebar Setup ---
function setupPrimarySidebarEvents() {
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <span class="ws-item-name">${w.name}</span>
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
  menu.style.width = '180px';
  menu.innerHTML = `
    <div style="padding: 4px;">
      <button class="menu-action-btn toggle-star-btn" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; padding: 6px 12px; font-size:13.5px; border-radius:4px; cursor:pointer; color:var(--text-main); display:flex; gap:10px;">
        <span>⭐</span> ${workspace.starred ? 'Remove Star' : 'Star Workspace'}
      </button>
      <button class="menu-action-btn delete-ws-btn" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; padding: 6px 12px; font-size:13.5px; border-radius:4px; cursor:pointer; color:#ef4444; display:flex; gap:10px;">
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
      
      <div class="sidebar-section-title" style="padding-left:0; margin-bottom: 20px;">Recent Workspaces</div>
      
      ${workspaces.length === 0 ? `
        <div class="dashboard-empty-workspaces" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 48px; border:2px dashed var(--border-color); border-radius: var(--radius-lg); text-align:center;">
          <div style="font-size:36px; margin-bottom: 12px;">📂</div>
          <div style="font-size: 16px; font-weight:600; margin-bottom: 4px;">No Workspaces Yet</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Create your first workspace to start writing documents.</div>
          <button id="btn-dashboard-create-ws" class="create-new-btn" style="margin-bottom:0;">+ Create Workspace</button>
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
                  <button class="ws-card-star-btn" data-id="${w.id}" title="${w.starred ? 'Starred' : 'Star'}" style="position:absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.85); border:none; border-radius:50%; width: 28px; height: 28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; color: ${w.starred ? '#eab308' : 'var(--text-light)'};">
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

  const chapters = db.getChapters(activeWorkspaceId);

  secSidebar.innerHTML = `
    <div class="sec-sidebar-header">
      <div class="sec-ws-title-container">
        <div class="sec-ws-details">
          <div class="ws-icon-premium" style="width:28px; height:28px; border-radius:7px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <span class="sec-ws-name">${workspace.name}</span>
        </div>
        <button class="sec-ws-close-btn" id="sec-ws-close-btn" title="Close Workspace">×</button>
      </div>
      <div class="sec-ws-members">
        <span>👥</span>
        <span>1 member</span>
      </div>
      <div class="sec-sidebar-controls">
        <span class="sort-select-label">Sorted by hierarchy</span>
        <button class="add-chapter-sidebar-btn" id="sec-add-chapter-btn" title="Add New Page">+</button>
      </div>
    </div>
    <div class="chapters-nav-list" id="chapters-nav-container">
      <!-- Dynamic list of chapters -->
    </div>
    <div class="sec-sidebar-footer">
      <button class="recycle-bin-btn" id="btn-recycle-bin">
        <span>🗑️</span> Recycle bin
      </button>
    </div>
  `;

  document.getElementById('sec-ws-close-btn').addEventListener('click', () => {
    window.location.hash = '#dashboard';
  });

  document.getElementById('sec-add-chapter-btn').addEventListener('click', () => {
    createNewChapter();
  });

  document.getElementById('btn-recycle-bin').addEventListener('click', () => {
    showRecycleBinModal();
  });

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
        <span class="chapter-nav-emoji">${c.emoji || '📄'}</span>
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
      </div>
    </header>

    <!-- Editor Scroll Canvas -->
    <div class="editor-scroller">
      <div class="editor-document-paper">
        <div class="editor-page-metadata">
          
          <!-- Banner Cover -->
          <div class="editor-cover-banner" id="page-cover-banner" style="${chapter.cover ? `background: ${chapter.cover};` : 'display: none;'}">
            <div class="cover-actions-overlay">
              <button class="cover-btn change" id="btn-change-cover">Change cover</button>
              <button class="cover-btn remove" id="btn-remove-cover">Remove cover</button>
            </div>
          </div>

          <!-- Add decorations rows -->
          <div class="page-add-decorations-row" id="page-decorations-row" style="${chapter.emoji || chapter.cover ? 'display: none;' : ''}">
            <button class="decoration-add-btn" id="btn-add-emoji-meta"><span>😀</span> Add emoji</button>
            <button class="decoration-add-btn" id="btn-add-cover-meta"><span>🖼️</span> Add cover</button>
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
      </div>
    </div>
  `;

  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('intellinote-dark-mode', isCurrentlyDark);
  });

  const emojiHead = document.getElementById('page-large-emoji');
  const addEmojiMeta = document.getElementById('btn-add-emoji-meta');

  const triggerEmojiPicker = (element) => {
    emoji.showPicker(element, (selectedEmoji) => {
      chapter.emoji = selectedEmoji;
      db.saveChapter(chapter);
      
      emojiHead.textContent = selectedEmoji;
      emojiHead.style.display = '';
      document.getElementById('page-decorations-row').style.display = (chapter.emoji || chapter.cover) ? 'none' : '';
      
      const activeSidebarItem = document.querySelector(`.chapter-nav-item[data-id="${chapter.id}"] .chapter-nav-emoji`);
      if (activeSidebarItem) activeSidebarItem.textContent = selectedEmoji;
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
    
    coverBanner.style.background = preset;
    coverBanner.style.display = '';
    document.getElementById('page-decorations-row').style.display = (chapter.emoji || chapter.cover) ? 'none' : '';
  };

  addCoverMeta.addEventListener('click', addCover);
  
  document.getElementById('btn-remove-cover').addEventListener('click', () => {
    chapter.cover = null;
    db.saveChapter(chapter);
    coverBanner.style.display = 'none';
    document.getElementById('page-decorations-row').style.display = (chapter.emoji || chapter.cover) ? 'none' : '';
  });

  document.getElementById('btn-change-cover').addEventListener('click', (e) => {
    e.stopPropagation();
    showCoverPresetDropdown(e.target, (selectedCover) => {
      chapter.cover = selectedCover;
      db.saveChapter(chapter);
      coverBanner.style.background = selectedCover;
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
  dropdown.style.width = '240px';
  dropdown.innerHTML = `
    <div style="font-size: 11px; font-weight:600; text-transform: uppercase; color: var(--text-light); padding: 8px 12px;">Gradient Covers</div>
    <div class="presets-container-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 6px 12px 12px 12px;">
      ${COVER_PRESETS.map(preset => `
        <button class="preset-color-block" data-preset="${preset}" style="height: 38px; border-radius: 6px; border: 1px solid var(--border-color); cursor:pointer; background: ${preset};"></button>
      `).join('')}
    </div>
  `;

  document.body.appendChild(dropdown);

  const rect = anchorElement.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
  dropdown.style.left = `${rect.left + window.scrollX - 120}px`;

  dropdown.addEventListener('click', (e) => {
    const block = e.target.closest('.preset-color-block');
    if (block) {
      onSelect(block.getAttribute('data-preset'));
      dropdown.remove();
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
    <div class="loop-search-dialog" style="width: 450px;">
      <div class="bin-header">
        <h3 class="bin-title">Create Workspace</h3>
        <button class="bin-close-btn" id="modal-close-ws">×</button>
      </div>
      <div style="padding: 24px; display:flex; flex-direction:column; gap:18px;">
        <div>
          <label style="font-size: 13.5px; font-weight:500; color: var(--text-muted); display:block; margin-bottom: 6px;">Workspace Name</label>
          <input type="text" id="modal-ws-name-input" placeholder="e.g. Project IntelliNote" style="width:100%; padding:10px 14px; border-radius: 8px; border: 1px solid var(--border-color); outline:none; font-family: var(--font-sans); font-size:15.5px;" required>
        </div>

        <div>
          <label style="font-size: 13.5px; font-weight:500; color: var(--text-muted); display:block; margin-bottom: 8px;">Select Cover Style</label>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
            ${COVER_PRESETS.map((p, idx) => `
              <button class="preset-color-block modal-cover-select ${idx === 0 ? 'active' : ''}" data-preset="${p}" style="background: ${p};"></button>
            `).join('')}
          </div>
        </div>

        <button id="modal-ws-create-btn" class="create-new-btn" style="width: 100%; margin-bottom: 0; margin-top: 10px;">Create Workspace</button>
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
      emoji: '📄',
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
    emoji: '📄',
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
    <div class="loop-search-dialog" style="width: 400px; padding: 20px;">
      <h3 style="font-size: 17px; font-weight: 600; margin-bottom: 12px; color: var(--text-main);">${title}</h3>
      <p style="font-size: 14px; line-height: 1.5; color: var(--text-muted); margin-bottom: 24px;">${message}</p>
      <div style="display:flex; justify-content:flex-end; gap:12px;">
        <button class="confirm-modal-cancel-btn" style="background:transparent; border:1px solid var(--border-color); font-family:inherit; font-size:13.5px; padding:8px 16px; border-radius:20px; cursor:pointer; color:var(--text-muted); font-weight:500;">Cancel</button>
        <button class="confirm-modal-ok-btn ${confirmClass || ''}" style="border:none; font-family:inherit; font-size:13.5px; padding:8px 16px; border-radius:20px; cursor:pointer; font-weight:500; background:${confirmClass === 'delete' ? '#ef4444' : 'var(--primary)'}; color:#fff;">${confirmText}</button>
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
              <span class="bin-item-emoji">${c.emoji || '📄'}</span>
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
    <div class="loop-search-dialog" style="width: 400px;">
      <div class="bin-header">
        <h3 class="bin-title">Notifications</h3>
        <button class="bin-close-btn" id="notify-close">×</button>
      </div>
      <div style="padding: 40px 24px; text-align: center; color: var(--text-muted); font-size:14px;">
        <div style="font-size: 32px; margin-bottom: 12px;">🔔</div>
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
    <div class="loop-search-dialog" style="width: 760px; height: 500px; display: flex; flex-direction: column;">
      <div class="bin-header">
        <h3 class="bin-title">🔌 Plugins Store & Manager</h3>
        <button class="bin-close-btn" id="plugins-modal-close">×</button>
      </div>
      <div style="display: flex; flex-grow: 1; overflow: hidden;">
        <!-- Left panel: list of plugins -->
        <div style="width: 280px; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background: #fafafa;">
          <div style="padding: 10px; display: flex; gap: 8px; border-bottom: 1px solid var(--border-color);">
            <button id="btn-plugins-list-tab" style="flex-grow: 1; padding: 6px; font-family: inherit; font-size: 13px; font-weight: 600; border: none; background: var(--primary-light-active); color: var(--primary); border-radius: 6px; cursor: pointer;">Installed</button>
            <button id="btn-plugins-create-tab" style="flex-grow: 1; padding: 6px; font-family: inherit; font-size: 13px; font-weight: 500; border: none; background: transparent; color: var(--text-muted); border-radius: 6px; cursor: pointer;">＋ Custom</button>
          </div>
          <div id="plugins-list-container" style="flex-grow: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px;">
            <!-- Render list of plugins here -->
          </div>
        </div>

        <!-- Right panel: plugin detail or create form -->
        <div id="plugins-detail-pane" style="flex-grow: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column;">
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
      <div class="plugin-list-item ${p.id === selectedPluginId ? 'active' : ''}" data-id="${p.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; ${p.id === selectedPluginId ? 'background: var(--primary-light-active); font-weight: 500;' : ''}">
        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
          <span style="font-size: 18px;">${p.icon || '🔌'}</span>
          <div style="overflow: hidden;">
            <div style="font-size: 13.5px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
            <div style="font-size: 10.5px; color: ${p.enabled ? '#059669' : 'var(--text-light)'};">${p.enabled ? 'Enabled' : 'Disabled'}</div>
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
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 32px;">${plugin.icon || '🔌'}</span>
          <div>
            <h3 style="font-size: 18px; font-weight: 600; color: var(--text-main); margin: 0;">${plugin.name}</h3>
            <span style="font-size: 11px; color: var(--text-muted); background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">ID: ${plugin.id}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${!plugin.isBuiltIn ? `<button id="btn-plugin-delete" style="border: 1px solid rgba(239, 68, 68, 0.2); background: transparent; color: #ef4444; font-family: inherit; font-size: 12.5px; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-weight: 500;">Delete</button>` : ''}
          <button id="btn-plugin-toggle" style="border: none; background: ${plugin.enabled ? '#ef4444' : 'var(--primary)'}; color: #fff; font-family: inherit; font-size: 12.5px; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-weight: 500;">
            ${plugin.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
      <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">${plugin.description}</p>
      
      ${plugin.id === 'autocomplete' ? `
        <div style="margin-bottom: 16px; padding: 14px; background: rgba(124, 58, 237, 0.05); border: 1px dashed rgba(124, 58, 237, 0.2); border-radius: 10px; display: flex; flex-direction: column; gap: 10px;">
          <div style="font-size: 13px; font-weight: 600; color: var(--primary);">Groq AI Integration Settings</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:11.5px; font-weight:500; color:var(--text-main);">Groq API Key</label>
            <input type="password" id="groq-api-key" placeholder="gsk_..." value="${localStorage.getItem('intellinote_groq_api_key') || ''}" style="padding:6px 10px; font-size:12.5px; border:1px solid var(--border-color); border-radius:6px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:11.5px; font-weight:500; color:var(--text-main);">Groq Model ID</label>
            <input type="text" id="groq-model-id" placeholder="openai/gpt-oss-20b" value="${localStorage.getItem('intellinote_groq_model_name') || 'openai/gpt-oss-20b'}" style="padding:6px 10px; font-size:12.5px; border:1px solid var(--border-color); border-radius:6px; outline:none; font-family:var(--font-mono); width:100%; box-sizing:border-box;" />
          </div>
          <div style="text-align:right;">
            <button id="btn-save-groq-config" style="padding:5px 12px; font-size:12px; font-weight:500; background:var(--primary); color:#ffffff; border:none; border-radius:6px; cursor:pointer; font-family:inherit;">Save Settings</button>
          </div>
        </div>
      ` : ''}
      
      <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-light); text-transform: uppercase;">Renderer Code</div>
        <textarea id="plugin-code-textarea" readonly style="flex-grow: 1; width: 100%; font-family: var(--font-mono); font-size: 12.5px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: #f8fafc; color: var(--text-muted); resize: none; outline: none; white-space: pre; overflow: auto;">${plugin.renderCode}</textarea>
        ${!plugin.isBuiltIn ? `<div style="text-align: right;"><button id="btn-plugin-edit" style="border: 1px solid var(--primary); background: transparent; color: var(--primary); font-family: inherit; font-size: 12px; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-weight: 500; margin-top: 4px;">Edit Code</button></div>` : ''}
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

    const defaultCode = `// Write your custom block renderer code here!\\n// Available variables:\\n// - block: the block data object (store block.data here)\\n// - index: the index of this block in the list\\n// - container: the DOM element container to render your HTML inside\\n// - editor: the Editor instance\\n// - save(): callback function to persist changes\\n// - db: the LocalStorage database manager\\n\\ncontainer.innerHTML = '';\\nconst card = document.createElement('div');\\ncard.style.padding = '16px';\\ncard.style.background = '#ffffff';\\ncard.style.border = '1px solid var(--border-color)';\\ncard.style.borderRadius = '10px';\\ncard.style.boxShadow = 'var(--shadow-sm)';\\n\\nconst title = document.createElement('h4');\\ntitle.style.margin = '0 0 8px 0';\\ntitle.style.fontSize = '15px';\\ntitle.textContent = 'Custom Widget: Click to count!';\\ncard.appendChild(title);\\n\\nconst countBtn = document.createElement('button');\\nif (!block.data || typeof block.data !== 'object') {\\n  block.data = { count: 0 };\\n}\\ncountBtn.textContent = 'Clicks: ' + block.data.count;\\ncountBtn.style.padding = '6px 14px';\\ncountBtn.style.borderRadius = '20px';\\ncountBtn.style.border = '1px solid var(--primary)';\\ncountBtn.style.background = 'transparent';\\ncountBtn.style.color = 'var(--primary)';\\ncountBtn.style.cursor = 'pointer';\\ncountBtn.style.fontWeight = '500';\\n\\ncountBtn.addEventListener('click', () => {\\n  block.data.count++;\\n  countBtn.textContent = 'Clicks: ' + block.data.count;\\n  save();\\n});\\n\\ncard.appendChild(countBtn);\\ncontainer.appendChild(card);`;

    detailPane.innerHTML = `
      <h3 style="font-size: 17px; font-weight: 600; color: var(--text-main); margin-bottom: 16px;">
        \${existingPlugin ? '📝 Edit Custom Plugin' : '🔌 Create Custom Plugin'}
      </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <label style="font-size: 12px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4px;">Plugin Name</label>
          <input type="text" id="plugin-form-name" placeholder="e.g. Counter Block" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:14px; outline:none;" value="\${existingPlugin ? existingPlugin.name : ''}">
        </div>
        <div>
          <label style="font-size: 12px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4px;">Unique ID (lowercase, no spaces)</label>
          <input type="text" id="plugin-form-id" placeholder="e.g. click-counter" \${existingPlugin ? 'readonly' : ''} style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:14px; outline:none; background: \${existingPlugin ? '#f1f5f9; color:var(--text-light);' : '#fff'};" value="\${existingPlugin ? existingPlugin.id : ''}">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <label style="font-size: 12px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4px;">Icon Emoji</label>
          <input type="text" id="plugin-form-icon" placeholder="🔌" maxlength="4" style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:14px; text-align:center; outline:none;" value="\${existingPlugin ? existingPlugin.icon : '🔌'}">
        </div>
        <div>
          <label style="font-size: 12px; font-weight:500; color: var(--text-muted); display:block; margin-bottom:4px;">Short Description</label>
          <input type="text" id="plugin-form-desc" placeholder="e.g. Click count tracker box." style="width:100%; padding:8px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:14px; outline:none;" value="\${existingPlugin ? existingPlugin.description : ''}">
        </div>
      </div>
      <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 4px; overflow: hidden; margin-bottom: 16px;">
        <label style="font-size: 12px; font-weight: 500; color: var(--text-muted);">Custom JS Renderer Code</label>
        <textarea id="plugin-form-code" style="flex-grow: 1; width: 100%; font-family: var(--font-mono); font-size: 12px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; resize: none; outline: none; white-space: pre; overflow: auto;">\${existingPlugin ? existingPlugin.renderCode : defaultCode}</textarea>
      </div>
      <div style="text-align: right; display:flex; justify-content:flex-end; gap:8px;">
        <button id="btn-plugin-form-cancel" style="border: 1px solid var(--border-color); background:transparent; color: var(--text-muted); font-family: inherit; font-size: 13px; padding: 6px 16px; border-radius: 20px; cursor: pointer;">Cancel</button>
        <button id="btn-plugin-form-save" style="border: none; background: var(--primary); color: #fff; font-family: inherit; font-size: 13px; padding: 6px 16px; border-radius: 20px; cursor: pointer; font-weight: 500;">Save Plugin</button>
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
