// Local Database Manager using localStorage

const WORKSPACES_KEY = 'intellinote_workspaces';
const CHAPTERS_KEY = 'intellinote_chapters';
const TRASH_KEY = 'intellinote_trash';

// Default Seed Data matching Microsoft Loop's screen captures
const DEFAULT_WORKSPACES = [
  {
    id: 'w-dsa',
    name: 'DSA',
    emoji: '📘',
    cover: 'linear-gradient(135deg, #a78bfa, #818cf8)',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  },
  {
    id: 'w-cli',
    name: 'cli',
    emoji: '💻',
    cover: 'linear-gradient(135deg, #34d399, #059669)',
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'w-webdev',
    name: 'Web dev',
    emoji: '🌐',
    cover: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'w-csharp',
    name: 'C#',
    emoji: '🎯',
    cover: 'linear-gradient(135deg, #f472b6, #ec4899)',
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  }
];

const DEFAULT_CHAPTERS = [
  // C# Chapters
  {
    id: 'c-convert',
    workspaceId: 'w-csharp',
    title: 'Convert Function',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Convert Function in C#' },
      { id: 'b2', type: 'text', data: 'The Convert class in C# provides methods to convert a base data type to another base data type.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-tinyspec',
    workspaceId: 'w-csharp',
    title: 'TinySpec0',
    emoji: '⛔',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'TinySpec0' },
      { id: 'b2', type: 'text', data: 'Workspace specifications configuration details.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-switch',
    workspaceId: 'w-csharp',
    title: 'Switch statements',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Switch Statements' },
      { id: 'b2', type: 'text', data: 'A switch statement allows a variable to be tested for equality against a list of values.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-dowhile',
    workspaceId: 'w-csharp',
    title: 'do-while loop',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'do-while Loop' },
      { id: 'b2', type: 'text', data: 'Unlike for and while loops, which test the loop condition at the top of the loop, the do...while loop checks its condition at the bottom of the loop.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-conditional',
    workspaceId: 'w-csharp',
    title: 'Conditional Operator',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Conditional Operator' },
      { id: 'b2', type: 'text', data: 'The conditional operator <code>?:</code>, also known as the ternary conditional operator, evaluates a Boolean expression and returns the result of one of the two expressions.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-format',
    workspaceId: 'w-csharp',
    title: 'Format Function',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Format Function' },
      { id: 'b2', type: 'text', data: 'Formats values using string formatting techniques.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-random',
    workspaceId: 'w-csharp',
    title: 'Random numbers',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Random Numbers' },
      { id: 'b2', type: 'text', data: 'Generate pseudorandom numbers using the <code>System.Random</code> class.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-arrays',
    workspaceId: 'w-csharp',
    title: 'Arrays',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Arrays' },
      { id: 'b2', type: 'text', data: 'An array stores a fixed-size sequential collection of elements of the same type.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-foreach',
    workspaceId: 'w-csharp',
    title: 'foreach loop',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'foreach Loop' },
      { id: 'b2', type: 'text', data: 'The C# foreach loop provides a clean, readable way to iterate through elements of a collection.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-methods',
    workspaceId: 'w-csharp',
    title: 'Methods',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Methods' },
      { id: 'b2', type: 'text', data: 'A method is a code block containing a series of statements.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-overloading',
    workspaceId: 'w-csharp',
    title: 'Method Overloading',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'Method Overloading' },
      { id: 'b2', type: 'text', data: 'Method Overloading allows a class to have multiple methods with the same name, if their parameter lists are different.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-params',
    workspaceId: 'w-csharp',
    title: 'params Keyword',
    emoji: '➕',
    blocks: [
      { id: 'b1', type: 'heading-1', data: 'params Keyword' },
      { id: 'b2', type: 'text', data: 'By using the params keyword, you can specify a method parameter that takes a variable number of arguments.' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c-polymorphism',
    workspaceId: 'w-csharp',
    title: 'Polymorphism',
    emoji: '➕',
    blocks: [
      { id: 'bp-title', type: 'heading-1', data: 'Polymorphism' },
      { id: 'bp-desc', type: 'text', data: 'Greek word that means "Having many forms".' },
      { id: 'bp-example', type: 'text', data: 'Example:' },
      { 
        id: 'bp-code', 
        type: 'code', 
        data: {
          code: `using System;\n\npublic class Program\n{\n    public static void Main(string[] args)\n    {\n        Allen allenKota = new Allen();\n        PW pathshala = new PW();\n        Coaching[] coachings = {allenKota, pathshala};\n        foreach (Coaching coaching in coachings) {\n            coaching.Event();\n        }\n    }\n}\n\npublic class Coaching\n{\n    public virtual void Event() {\n        Console.WriteLine("Generic coaching event");\n    }\n}\n\npublic class Allen : Coaching\n{\n    public override void Event() {\n        Console.WriteLine("Allen Kota physics class");\n    }\n}\n\npublic class PW : Coaching\n{\n    public override void Event() {\n        Console.WriteLine("PW Pathshala offline class");\n    }\n}`,
          language: 'C#',
          lineNumbers: true
        }
      }
    ],
    updatedAt: new Date().toISOString()
  },

  // DSA Chapters
  {
    id: 'c-dsa-1',
    workspaceId: 'w-dsa',
    title: 'Binary Trees',
    emoji: '🌳',
    blocks: [
      { id: 'bd1', type: 'heading-1', data: 'Binary Trees' },
      { id: 'bd2', type: 'text', data: 'A binary tree is a hierarchical data structure in which each node has at most two children.' }
    ],
    updatedAt: new Date().toISOString()
  },

  // cli Chapters
  {
    id: 'c-cli-1',
    workspaceId: 'w-cli',
    title: 'Git Basics',
    emoji: '🐙',
    blocks: [
      { id: 'bc1', type: 'heading-1', data: 'Git Basics' },
      { id: 'bc2', type: 'text', data: 'Basic command line Git tools.' }
    ],
    updatedAt: new Date().toISOString()
  },

  // Web dev Chapters
  {
    id: 'c-web-1',
    workspaceId: 'w-webdev',
    title: 'HTML Semantics',
    emoji: '🏷️',
    blocks: [
      { id: 'bw1', type: 'heading-1', data: 'HTML Semantics' },
      { id: 'bw2', type: 'text', data: 'Semantic HTML elements add meaning to your web pages.' }
    ],
    updatedAt: new Date().toISOString()
  }
];

export const db = {
  init() {
    if (!localStorage.getItem(WORKSPACES_KEY)) {
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(DEFAULT_WORKSPACES));
    }
    if (!localStorage.getItem(CHAPTERS_KEY)) {
      localStorage.setItem(CHAPTERS_KEY, JSON.stringify(DEFAULT_CHAPTERS));
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
    if (index >= 0) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
    return workspace;
  },

  deleteWorkspace(workspaceId) {
    // Also deletes all chapters of this workspace by moving them to trash
    const workspaces = this.getWorkspaces().filter(w => w.id !== workspaceId);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));

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
