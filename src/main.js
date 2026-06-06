// IntelliNote App Main Entry Point & Controller
import './style.css';
import { db } from './db.js';
import { emoji } from './emoji.js';
import { Editor } from './editor.js';
import { search } from './search.js';

// App Core State
let activeWorkspaceId = null;
let activeChapterId = null;
let activeEditorInstance = null;

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
  
  // Close any stray popovers on navigation
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
      
      // If workspace page has no specified chapter, auto-redirect to first chapter
      if (!activeChapterId) {
        const chapters = db.getChapters(activeWorkspaceId);
        if (chapters.length > 0) {
          window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${chapters[0].id}`;
          return;
        }
      }
      
      renderWorkspaceView();
    } else {
      // Fallback
      window.location.hash = '#dashboard';
    }
  }
  
  // Sync primary sidebar workspaces list active states
  renderPrimarySidebarWorkspaces();
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  setupPrimarySidebarEvents();
});

// --- Primary Sidebar Setup ---
function setupPrimarySidebarEvents() {
  // Create Workspace Button
  const createWsBtn = document.getElementById('btn-create-workspace');
  createWsBtn.addEventListener('click', () => {
    showCreateWorkspaceModal();
  });

  // Search Button
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

  // Notifications Button
  const notifyBtn = document.getElementById('btn-nav-notifications');
  notifyBtn.addEventListener('click', () => {
    showNotificationsDrawer();
  });
  
  // Logo area clicks go to dashboard
  const logo = document.querySelector('.loop-logo-area');
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', () => {
    window.location.hash = '#dashboard';
  });

  // Shortcut Ctrl+K for Search
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchBtn.click();
    }
  });
}

function renderPrimarySidebarWorkspaces() {
  const container = document.getElementById('sidebar-workspaces-container');
  const workspaces = db.getWorkspaces();
  
  container.innerHTML = workspaces.map(w => `
    <div class="sidebar-ws-item ${activeWorkspaceId === w.id ? 'active' : ''}" data-id="${w.id}">
      <div class="ws-item-left">
        <span class="ws-item-emoji">${w.emoji || '📁'}</span>
        <span class="ws-item-name">${w.name}</span>
      </div>
    </div>
  `).join('');

  // Bind clicks
  container.querySelectorAll('.sidebar-ws-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      window.location.hash = `#workspace/${id}`;
    });
  });
}

// --- Dashboard View Renderer ---
function renderDashboard() {
  // Hide secondary sidebar
  const secSidebar = document.getElementById('sidebar-secondary');
  secSidebar.style.display = 'none';

  // Render main greeting & cards
  const mainPane = document.getElementById('main-pane');
  
  // Greeting based on hour
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
      <p class="dashboard-subgreeting">Welcome back to your workspace. Everything is saved locally and securely on your computer.</p>
      
      <div class="sidebar-section-title" style="padding-left:0; margin-bottom: 20px;">Recent Workspaces</div>
      
      <div class="dashboard-workspaces-grid">
        ${workspaces.map(w => {
          const date = new Date(w.updatedAt);
          const relativeDate = formatRelativeTime(date);
          return `
            <div class="workspace-card" data-id="${w.id}">
              <div class="workspace-card-cover" style="background: ${w.cover || 'var(--loop-purple-gradient)'}">
                <div class="workspace-card-emoji-container">${w.emoji || '📁'}</div>
              </div>
              <div class="workspace-card-content">
                <div class="workspace-card-name">${w.name}</div>
                <div class="workspace-card-date">Updated ${relativeDate}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Bind card clicks
  mainPane.querySelectorAll('.workspace-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      window.location.hash = `#workspace/${id}`;
    });
  });
}

// --- Workspace Secondary Sidebar & Chapter Renderer ---
function renderWorkspaceView() {
  const workspace = db.getWorkspace(activeWorkspaceId);
  if (!workspace) {
    window.location.hash = '#dashboard';
    return;
  }

  // Render & Show Secondary Sidebar
  const secSidebar = document.getElementById('sidebar-secondary');
  secSidebar.style.display = 'flex';

  const chapters = db.getChapters(activeWorkspaceId);

  secSidebar.innerHTML = `
    <div class="sec-sidebar-header">
      <div class="sec-ws-title-container">
        <div class="sec-ws-details">
          <button id="sec-ws-emoji-btn" class="sec-ws-emoji" title="Change Workspace Emoji">${workspace.emoji || '📁'}</button>
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

  // Bind secondary sidebar controls
  document.getElementById('sec-ws-close-btn').addEventListener('click', () => {
    window.location.hash = '#dashboard';
  });

  const wsEmojiBtn = document.getElementById('sec-ws-emoji-btn');
  wsEmojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emoji.showPicker(wsEmojiBtn, (newEmoji) => {
      workspace.emoji = newEmoji;
      db.saveWorkspace(workspace);
      wsEmojiBtn.textContent = newEmoji;
      renderPrimarySidebarWorkspaces();
    });
  });

  document.getElementById('sec-add-chapter-btn').addEventListener('click', () => {
    createNewChapter();
  });

  document.getElementById('btn-recycle-bin').addEventListener('click', () => {
    showRecycleBinModal();
  });

  // Render chapters list inside sidebar
  renderSecondarySidebarChapters(chapters);

  // Render Editor Main pane
  renderEditorPane();
}

function renderSecondarySidebarChapters(chapters) {
  const container = document.getElementById('chapters-nav-container');
  if (!container) return;

  container.innerHTML = chapters.map(c => `
    <div class="chapter-nav-item ${activeChapterId === c.id ? 'active' : ''}" data-id="${c.id}">
      <div class="chapter-nav-left">
        <span class="chapter-nav-emoji">${c.emoji || '📄'}</span>
        <span class="chapter-nav-title">${c.title || 'Untitled Page'}</span>
      </div>
      <button class="chapter-nav-delete-btn" data-id="${c.id}" title="Delete Page">×</button>
    </div>
  `).join('');

  // Bind chapter item clicks
  container.querySelectorAll('.chapter-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // If delete cross is clicked, handle it separately
      if (e.target.closest('.chapter-nav-delete-btn')) return;
      const cid = item.getAttribute('data-id');
      window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${cid}`;
    });
  });

  // Bind deletion
  container.querySelectorAll('.chapter-nav-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      deleteChapter(id);
    });
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
        <button class="share-btn" id="btn-share-page">Share</button>
      </div>
    </header>

    <!-- Editor Scroll Canvas -->
    <div class="editor-scroller">
      <div class="editor-document-paper">
        <div class="editor-page-metadata">
          
          <!-- Banner Cover (Dynamic CSS Gradient backgrounds) -->
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
          <h2 class="page-editable-title" id="page-editable-title" contenteditable="true">${chapter.title || ''}</h2>
        </div>

        <!-- Block Editor Mount -->
        <div id="editor-container"></div>
      </div>
    </div>
  `;

  // Bind Share button (copies component link to clipboard)
  document.getElementById('btn-share-page').addEventListener('click', (e) => {
    const btn = e.target;
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    btn.textContent = 'Link Copied!';
    setTimeout(() => { btn.textContent = 'Share'; }, 2000);
  });

  // Page Emoji Actions
  const emojiHead = document.getElementById('page-large-emoji');
  const addEmojiMeta = document.getElementById('btn-add-emoji-meta');

  const triggerEmojiPicker = (element) => {
    emoji.showPicker(element, (selectedEmoji) => {
      chapter.emoji = selectedEmoji;
      db.saveChapter(chapter);
      
      // Update UI
      emojiHead.textContent = selectedEmoji;
      emojiHead.style.display = '';
      document.getElementById('page-decorations-row').style.display = (chapter.emoji || chapter.cover) ? 'none' : '';
      
      // Sync active sidebar
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

  // Cover image actions
  const coverBanner = document.getElementById('page-cover-banner');
  const addCoverMeta = document.getElementById('btn-add-cover-meta');

  const addCover = () => {
    // Select a default preset
    const preset = COVER_PRESETS[Math.floor(Math.random() * COVER_PRESETS.length)];
    chapter.cover = preset;
    db.saveChapter(chapter);
    
    coverBanner.style.background = preset;
    coverBanner.style.display = '';
    document.getElementById('page-decorations-row').style.display = (chapter.emoji || chapter.cover) ? 'none' : '';
  };

  addCoverMeta.addEventListener('click', addCover);
  
  // Change / Remove cover buttons
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

  // Title Editable binding
  const titleInput = document.getElementById('page-editable-title');
  const crumbTitle = document.getElementById('editor-crumb-title');

  titleInput.addEventListener('input', () => {
    const titleVal = titleInput.textContent;
    chapter.title = titleVal;
    db.saveChapter(chapter);

    // Sync titles in real-time
    crumbTitle.textContent = titleVal || 'Untitled Page';
    const activeSidebarTitle = document.querySelector(`.chapter-nav-item[data-id="${chapter.id}"] .chapter-nav-title`);
    if (activeSidebarTitle) activeSidebarTitle.textContent = titleVal || 'Untitled Page';
  });

  // Title keys (Enter goes to first editor block)
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeEditorInstance) {
        activeEditorInstance.focusBlock(0);
      }
    }
  });

  // Mount editor block canvas
  const editorMount = document.getElementById('editor-container');
  activeEditorInstance = new Editor(editorMount, chapter, () => {
    // Callback on saving editor changes - optionally sync metadata
  });
}

// --- Cover Gradient Preset Dropdown Menu ---
function showCoverPresetDropdown(anchorElement, onSelect) {
  const existing = document.getElementById('cover-preset-dropdown-menu');
  if (existing) existing.remove();

  const dropdown = document.createElement('div');
  dropdown.id = 'cover-preset-dropdown-menu';
  dropdown.className = 'loop-slash-menu-popup'; // Use menu styles
  dropdown.style.width = '240px';
  dropdown.innerHTML = `
    <div style="font-size: 11px; font-weight:600; text-transform: uppercase; color: var(--text-light); padding: 8px 12px;">Gradient Covers</div>
    <div class="presets-container-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 6px 12px 12px 12px;">
      ${COVER_PRESETS.map((preset, index) => `
        <button class="preset-color-block" data-preset="${preset}" style="height: 38px; border-radius: 6px; border: 1px solid var(--border-color); cursor:pointer; background: ${preset};"></button>
      `).join('')}
    </div>
  `;

  document.body.appendChild(dropdown);

  const rect = anchorElement.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
  dropdown.style.left = `${rect.left + window.scrollX - 120}px`; // Centered slightly

  dropdown.addEventListener('click', (e) => {
    const block = e.target.closest('.preset-color-block');
    if (block) {
      const preset = block.getAttribute('data-preset');
      onSelect(preset);
      dropdown.remove();
    }
  });

  // Dismiss on document click
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
  
  // If we deleted the active chapter, re-route to workspace or dashboard
  if (activeChapterId === id) {
    const chapters = db.getChapters(activeWorkspaceId);
    if (chapters.length > 0) {
      window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${chapters[0].id}`;
    } else {
      window.location.hash = `#workspace/${activeWorkspaceId}`;
    }
  } else {
    // Simply redraw sidebar
    const chapters = db.getChapters(activeWorkspaceId);
    renderSecondarySidebarChapters(chapters);
  }
}

// --- Create Workspace Modal ---
function showCreateWorkspaceModal() {
  const overlay = document.createElement('div');
  overlay.className = 'loop-search-modal-overlay'; // Matches blur styling
  
  let selectedEmoji = '🎯';
  let selectedCover = COVER_PRESETS[0];

  overlay.innerHTML = `
    <div class="loop-search-dialog" style="width: 450px;">
      <div class="bin-header">
        <h3 class="bin-title">Create Workspace</h3>
        <button class="bin-close-btn" id="modal-close-ws">×</button>
      </div>
      <div style="padding: 24px; display:flex; flex-direction:column; gap:18px;">
        <div style="display:flex; align-items:center; gap: 16px;">
          <button id="modal-ws-emoji-btn" style="font-size: 32px; background: #f1f5f9; border: 1px solid var(--border-color); border-radius: 12px; width: 64px; height: 64px; cursor:pointer;">${selectedEmoji}</button>
          <div style="flex-grow: 1;">
            <label style="font-size: 13px; font-weight:500; color: var(--text-muted); display:block; margin-bottom: 6px;">Workspace Name</label>
            <input type="text" id="modal-ws-name-input" placeholder="e.g. Project IntelliNote" style="width:100%; padding:10px 14px; border-radius: 8px; border: 1px solid var(--border-color); outline:none; font-family: var(--font-sans); font-size:15px;" required>
          </div>
        </div>

        <div>
          <label style="font-size: 13px; font-weight:500; color: var(--text-muted); display:block; margin-bottom: 8px;">Select Cover Style</label>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
            ${COVER_PRESETS.map((p, idx) => `
              <button class="preset-color-block modal-cover-select ${idx === 0 ? 'active' : ''}" data-preset="${p}" style="height:32px; border-radius: 6px; border: 2px solid ${idx === 0 ? 'var(--primary)' : 'transparent'}; cursor:pointer; background: ${p};"></button>
            `).join('')}
          </div>
        </div>

        <button id="modal-ws-create-btn" class="create-new-btn" style="width: 100%; margin-bottom: 0; margin-top: 10px;">Create Workspace</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus input
  const nameInput = overlay.querySelector('#modal-ws-name-input');
  nameInput.focus();

  // Close modal bindings
  const closeModal = () => overlay.remove();
  overlay.querySelector('#modal-close-ws').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Emoji selection binding
  const emojiBtn = overlay.querySelector('#modal-ws-emoji-btn');
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emoji.showPicker(emojiBtn, (emojiChar) => {
      selectedEmoji = emojiChar;
      emojiBtn.textContent = emojiChar;
    });
  });

  // Cover selection binding
  const coverBlocks = overlay.querySelectorAll('.modal-cover-select');
  coverBlocks.forEach(block => {
    block.addEventListener('click', () => {
      coverBlocks.forEach(b => b.style.borderColor = 'transparent');
      block.style.borderColor = 'var(--primary)';
      selectedCover = block.getAttribute('data-preset');
    });
  });

  // Create workspace logic
  const createBtn = overlay.querySelector('#modal-ws-create-btn');
  createBtn.addEventListener('click', () => {
    const wsName = nameInput.value.trim();
    if (!wsName) {
      nameInput.style.borderColor = '#ef4444';
      return;
    }

    const wsId = 'w-' + Math.random().toString(36).substr(2, 9);
    
    // Create new workspace record
    const newWorkspace = {
      id: wsId,
      name: wsName,
      emoji: selectedEmoji,
      cover: selectedCover,
      updatedAt: new Date().toISOString()
    };
    db.saveWorkspace(newWorkspace);

    // Create a default first page in the workspace
    const chapterId = 'c-' + Math.random().toString(36).substr(2, 9);
    const firstChapter = {
      id: chapterId,
      workspaceId: wsId,
      title: 'Welcome to ' + wsName,
      emoji: '📄',
      blocks: [
        { id: 'b1', type: 'heading-1', data: 'Getting Started' },
        { id: 'b2', type: 'text', data: 'This is your first page inside the ' + wsName + ' workspace! Try typing <code>/</code> to insert elements or style formatting.' }
      ],
      updatedAt: new Date().toISOString()
    };
    db.saveChapter(firstChapter);

    closeModal();
    
    // Render sidebars and route
    renderPrimarySidebarWorkspaces();
    window.location.hash = `#workspace/${wsId}/chapter/${chapterId}`;
  });
}

// --- Create New Chapter Helper ---
function createNewChapter() {
  const chapterId = 'c-' + Math.random().toString(36).substr(2, 9);
  const newChapter = {
    id: chapterId,
    workspaceId: activeWorkspaceId,
    title: '',
    emoji: '📄',
    blocks: [
      { id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '' }
    ],
    updatedAt: new Date().toISOString()
  };
  db.saveChapter(newChapter);

  // Navigate to new chapter
  window.location.hash = `#workspace/${activeWorkspaceId}/chapter/${chapterId}`;
  
  // Focus the title immediately
  setTimeout(() => {
    const titleInput = document.getElementById('page-editable-title');
    if (titleInput) {
      titleInput.focus();
    }
  }, 100);
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

    // Bind action events
    dialogBody.querySelectorAll('.bin-action-btn.restore').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        db.restoreChapter(id);
        drawBinContent(dialogBody);
        
        // Redraw active workspace chapters list if we restored into it
        if (activeWorkspaceId) {
          const chapters = db.getChapters(activeWorkspaceId);
          renderSecondarySidebarChapters(chapters);
        }
      });
    });

    dialogBody.querySelectorAll('.bin-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        db.permanentlyDeleteChapter(id);
        drawBinContent(dialogBody);
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

  // Close bindings
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

// --- Time formatting helper ---
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
