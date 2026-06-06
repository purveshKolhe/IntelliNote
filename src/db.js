// Local Database Manager using localStorage

const WORKSPACES_KEY = 'intellinote_workspaces';
const CHAPTERS_KEY = 'intellinote_chapters';
const TRASH_KEY = 'intellinote_trash';

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
  }
};
