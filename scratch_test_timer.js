// Mock localStorage
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Mock IndexedDB for idb-keyval
const mockGetRequest = {
  onerror: null,
  onsuccess: null,
  result: undefined
};
let mockStore;
const mockTx = {
  objectStore: () => mockStore,
  oncomplete: null,
  onerror: null
};
mockStore = {
  get: () => {
    const req = { ...mockGetRequest };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  },
  put: () => {
    const req = { ...mockGetRequest };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
      if (mockTx.oncomplete) mockTx.oncomplete();
    }, 0);
    return req;
  },
  transaction: mockTx
};
const mockDB = {
  transaction: () => mockTx,
  close: () => {}
};
const mockOpenRequest = {
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null,
  result: mockDB
};

globalThis.indexedDB = {
  open: () => {
    const req = { ...mockOpenRequest };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }
};

// Mock document and window
globalThis.window = {};

const domElements = [];
globalThis.document = {
  getElementById: (id) => {
    return domElements.find(el => el.id === id) || null;
  },
  createElement: (tag) => {
    const el = {
      id: '',
      className: '',
      style: {},
      dataset: {},
      innerHTML: '',
      appendChild: (child) => {
        el.children = el.children || [];
        el.children.push(child);
      },
      addEventListener: (evt, cb) => {},
      querySelector: (selector) => {
        return { appendChild: () => {}, addEventListener: () => {} };
      },
      classList: {
        add: (c) => {},
        remove: (c) => {},
        contains: (c) => false
      }
    };
    return el;
  },
  body: {
    appendChild: (child) => {
      domElements.push(child);
    }
  },
  head: {
    appendChild: () => {}
  }
};

// Now dynamically import db
const { db } = await import('./src/db.js');

console.log("Database initialized successfully!");

// Run init
await db.init();

const plugins = db.getPlugins();
const timerPlugin = plugins.find(p => p.id === 'timer-widget');
console.log("Timer widget plugin found:", !!timerPlugin);

// Compile the renderCode
try {
  const renderFn = new Function('block', 'index', 'container', 'editor', 'save', 'db', timerPlugin.renderCode);
  console.log("Successfully compiled timer-widget renderCode!");
  
  // Let's run it with a mock block and container
  const mockBlock = {
    id: 'b-timer',
    type: 'timer-widget',
    data: {
      tasks: [
        {
          id: 't-1',
          name: 'Writing Session',
          completed: false,
          secondsLeft: 1000,
          totalSeconds: 1500,
          isRunning: false,
          history: [
            {
              sessionStart: Date.now() - 3600000,
              sessionEnd: Date.now() - 1800000,
              pauses: []
            }
          ],
          currentSession: null
        }
      ]
    }
  };
  
  const mockContainer = {
    appendChild: () => {},
    innerHTML: '',
    dataset: {}
  };
  
  const mockEditor = {
    chapter: { id: 'ch-1' }
  };
  
  // Mock workspace and chapter in db
  db.saveWorkspace({ id: 'ws-1', name: 'Test Workspace' });
  db.saveChapter({
    id: 'ch-1',
    workspaceId: 'ws-1',
    title: 'Test Chapter',
    blocks: [mockBlock]
  });
  
  renderFn(mockBlock, 0, mockContainer, mockEditor, () => {}, db);
  console.log("Successfully executed timer-widget renderFn!");
  
  // Now call loopShowAnalyticsDashboard
  console.log("window properties after renderFn:", Object.keys(window));
  if (typeof window.loopShowAnalyticsDashboard === 'function') {
    window.loopShowAnalyticsDashboard();
    console.log("Successfully ran window.loopShowAnalyticsDashboard()!");
  } else {
    console.error("window.loopShowAnalyticsDashboard is not a function!");
  }
} catch (e) {
  console.error("Error running test:", e.stack || e);
}
