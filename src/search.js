// Global Search Dialog Module
import { db } from './db.js';
import { escapeHTML } from './security.js';

let currentSearchDialog = null;

export const search = {
  /**
   * Shows the search dialog
   * @param {Function} onNavigate Callback function when a result is clicked (passes workspaceId and chapterId)
   */
  show(onNavigate) {
    this.close();

    const dialog = document.createElement('div');
    dialog.className = 'loop-search-modal-overlay';
    dialog.innerHTML = `
      <div class="loop-search-dialog">
        <div class="search-dialog-header">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-dialog-input" placeholder="Search workspaces, pages, code..." autofocus>
          <button class="search-dialog-close-btn" title="Close Search">×</button>
        </div>
        <div class="search-dialog-results-container">
          <div class="search-dialog-empty-state">Type something to search...</div>
        </div>
        <div class="search-dialog-footer">
          <span>Use <kbd>↑</kbd><kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close</span>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    currentSearchDialog = dialog;

    const input = dialog.querySelector('.search-dialog-input');
    const resultsContainer = dialog.querySelector('.search-dialog-results-container');
    const closeBtn = dialog.querySelector('.search-dialog-close-btn');

    input.focus();

    // Close on click outside or close button
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target === closeBtn) {
        this.close();
      }
    });

    // Handle typing and search
    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        resultsContainer.innerHTML = `<div class="search-dialog-empty-state">Type something to search...</div>`;
        return;
      }

      const results = this.performSearch(query);
      this.renderResults(results, resultsContainer, onNavigate);
    });

    // Keyboard navigation
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else {
        this.handleKeyboardNavigation(e, onNavigate);
      }
    });
  },

  close() {
    if (currentSearchDialog) {
      currentSearchDialog.remove();
      currentSearchDialog = null;
    }
  },

  performSearch(query) {
    const workspaces = db.getWorkspaces();
    const chapters = db.getChapters(); // Retrieves all chapters

    const results = [];

    // Search Workspaces
    workspaces.forEach(w => {
      if (w.name.toLowerCase().includes(query)) {
        results.push({
          type: 'workspace',
          id: w.id,
          title: w.name,
          emoji: w.emoji,
          subtitle: 'Workspace',
          workspaceId: w.id,
          chapterId: null
        });
      }
    });

    // Search Chapters
    chapters.forEach(c => {
      const workspace = workspaces.find(w => w.id === c.workspaceId);
      const wsName = workspace ? workspace.name : 'Unknown';

      // 1. Check title
      const isTitleMatch = c.title.toLowerCase().includes(query);
      
      // 2. Check blocks content
      let contentMatchSnippet = '';
      if (c.blocks && c.blocks.length > 0) {
        for (const block of c.blocks) {
          if (block.type === 'code') {
            const codeText = (block.data && block.data.code) || '';
            const matchIndex = codeText.toLowerCase().indexOf(query);
            if (matchIndex >= 0) {
              const start = Math.max(0, matchIndex - 20);
              const end = Math.min(codeText.length, matchIndex + query.length + 20);
              contentMatchSnippet = `...${codeText.substring(start, end).replace(/\n/g, ' ')}...`;
              break;
            }
          } else if (block.type === 'table') {
            const tableText = (block.data && block.data.rows && JSON.stringify(block.data.rows)) || '';
            if (tableText.toLowerCase().includes(query)) {
              contentMatchSnippet = 'Matched table data';
              break;
            }
          } else {
            const text = block.data || '';
            const matchIndex = text.toLowerCase().indexOf(query);
            if (matchIndex >= 0) {
              const start = Math.max(0, matchIndex - 20);
              const end = Math.min(text.length, matchIndex + query.length + 20);
              contentMatchSnippet = `...${text.substring(start, end).replace(/<\/?[^>]+(>|$)/g, '')}...`;
              break;
            }
          }
        }
      }

      if (isTitleMatch || contentMatchSnippet) {
        results.push({
          type: 'chapter',
          id: c.id,
          title: c.title,
          emoji: c.emoji || '📄',
          subtitle: `In ${wsName} workspace` + (contentMatchSnippet ? ` • "${contentMatchSnippet}"` : ''),
          workspaceId: c.workspaceId,
          chapterId: c.id
        });
      }
    });

    return results;
  },

  renderResults(results, container, onNavigate) {
    if (results.length === 0) {
      container.innerHTML = `<div class="search-dialog-empty-state">No results found</div>`;
      return;
    }

    container.innerHTML = `
      <div class="search-results-list">
        ${results.map((r, idx) => `
          <div class="search-result-item ${idx === 0 ? 'active' : ''}" 
               data-workspace-id="${r.workspaceId}" 
               data-chapter-id="${r.chapterId || ''}">
            <span class="result-emoji">${escapeHTML(r.emoji)}</span>
            <div class="result-details">
              <div class="result-title">${escapeHTML(r.title)}</div>
              <div class="result-subtitle">${escapeHTML(r.subtitle)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Click navigation
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const wId = item.getAttribute('data-workspace-id');
        const cId = item.getAttribute('data-chapter-id') || null;
        onNavigate(wId, cId);
        this.close();
      });
    });
  },

  handleKeyboardNavigation(e, onNavigate) {
    if (!currentSearchDialog) return;

    const list = currentSearchDialog.querySelector('.search-results-list');
    if (!list) return;

    const items = list.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    let activeIdx = Array.from(items).findIndex(item => item.classList.contains('active'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[activeIdx].classList.remove('active');
      activeIdx = (activeIdx + 1) % items.length;
      items[activeIdx].classList.add('active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[activeIdx].classList.remove('active');
      activeIdx = (activeIdx - 1 + items.length) % items.length;
      items[activeIdx].classList.add('active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeItem = items[activeIdx];
      const wId = activeItem.getAttribute('data-workspace-id');
      const cId = activeItem.getAttribute('data-chapter-id') || null;
      onNavigate(wId, cId);
      this.close();
    }
  }
};
