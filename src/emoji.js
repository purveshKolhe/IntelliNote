// Offline Emoji Keyboard Picker Module

const EMOJI_CATEGORIES = {
  smileys: {
    icon: '😀',
    label: 'Smileys & Emotion',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
      '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
      '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
      '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤'
    ],
    keywords: [
      'happy', 'smile', 'laugh', 'grin', 'joy', 'cry', 'sad', 'angry', 'love', 'wink', 'cool', 'blush', 'think', 'sleep'
    ]
  },
  people: {
    icon: '👋',
    label: 'People & Body',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '🫵',
      '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🧠', '🫀', '👀', '👅'
    ],
    keywords: [
      'hand', 'wave', 'clap', 'pray', 'point', 'finger', 'ok', 'heart', 'brain', 'muscle', 'agree', 'disagree'
    ]
  },
  animals: {
    icon: '🐶',
    label: 'Animals & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤',
      '🦆', '🦅', '🦉', '🐝', '🐛', '🦋', '🐞', '🐜', '🕷️', '🐢', '🐍', '🐙', '🦑', '🐠', '🐬', '🐳', '🦈', '🐊', '🦓', '🐘',
      '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '🍀', '🍁', '🍂', '🍃', '🌸', '🌹', '🌻', '🌞', '🌙', '⭐', '🌈', '⚡', '❄️'
    ],
    keywords: [
      'dog', 'cat', 'rabbit', 'bear', 'panda', 'tiger', 'lion', 'bird', 'fish', 'bug', 'tree', 'flower', 'sun', 'moon', 'star'
    ]
  },
  food: {
    icon: '🍎',
    label: 'Food & Drink',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🌽', '🥕',
      '🍞', '🥐', '🥯', '🥞', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🥚', '🍳', '🍿', '🍣', '🍦',
      '🍩', '🍪', '🎂', '🍰', '🍫', '🍬', '🍭', '🍯', '☕', '🍵', '🍶', '🍷', '🍸', '🍹', '🍺', '🍻', '🥤', '🧋', '🍽️', '🍴'
    ],
    keywords: [
      'apple', 'fruit', 'banana', 'burger', 'pizza', 'fries', 'meat', 'egg', 'sweet', 'cake', 'coffee', 'tea', 'drink', 'beer'
    ]
  },
  travel: {
    icon: '🚗',
    label: 'Travel & Places',
    emojis: [
      '🚗', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚕', '🚚', '🚜', '🛵', '🚲', '🛺', '🚆', '🚇', '✈️', '🚀', '🛸', '⛵', '🛳️',
      '⚓', '🗺️', '🗿', '🗽', '🗼', '🏰', 'Stadium', '🏟️', '🎡', '🎢', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏢', '🏠', '🏦', '⛪', '⛩️'
    ],
    keywords: [
      'car', 'bus', 'train', 'plane', 'rocket', 'boat', 'map', 'castle', 'building', 'home', 'house', 'mountain', 'beach'
    ]
  },
  activities: {
    icon: '⚽',
    label: 'Activities',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', ' badminton', '🏸', '🏒', '⛳', '🎯', '🎣', '🥋', '🛹', '⛷️', '🏂',
      '🏋️', '🤸', '🏄', '🏊', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎫', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸', '🎮'
    ],
    keywords: [
      'sport', 'soccer', 'basketball', 'game', 'play', 'music', 'art', 'movie', 'guitar', 'trophy', 'winner'
    ]
  },
  objects: {
    icon: '💡',
    label: 'Objects',
    emojis: [
      '💻', '⌨️', '🖱️', '📷', '📸', '📹', '🎥', '☎️', '📻', '🎙️', '⏱️', '⏰', '⌛', '💡', '🔦', '💵', '🪙', '💰', '💳', '💎',
      '🔧', '🔨', '🛠️', '🛡️', '⚔️', '📦', '✉️', '📥', '📮', '📝', '📅', '📋', '📌', '📎', '🔒', '🔓', '🔑', '🗝️', '🧴', '🧹', '🚬'
    ],
    keywords: [
      'computer', 'phone', 'camera', 'time', 'light', 'money', 'key', 'lock', 'book', 'pen', 'box', 'tool'
    ]
  },
  symbols: {
    icon: '❤️',
    label: 'Symbols & Flags',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '☮️', '✝️', '☪️', '🕉️',
      '☯️', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '❌', '⭕', '🛑', '⛔', '⚠️', '➕', '➖', '🏁', '🚩'
    ],
    keywords: [
      'heart', 'love', 'cross', 'zodiac', 'symbol', 'stop', 'warning', 'flag', 'yes', 'no', 'math'
    ]
  }
};

let currentPicker = null;

export const emoji = {
  /**
   * Shows the emoji picker at the specified target element
   * @param {HTMLElement} triggerElement The element clicking which triggers the popover
   * @param {Function} onSelect Callback when an emoji is clicked
   */
  showPicker(triggerElement, onSelect) {
    // If a picker is already open, close it
    this.closePicker();

    // Create Picker element
    const picker = document.createElement('div');
    picker.className = 'loop-emoji-picker';
    picker.innerHTML = `
      <div class="emoji-picker-search-container">
        <input type="text" class="emoji-picker-search-input" placeholder="Search emojis..." autofocus>
      </div>
      <div class="emoji-picker-tabs">
        ${Object.entries(EMOJI_CATEGORIES).map(([key, cat], index) => `
          <button class="emoji-tab-btn ${index === 0 ? 'active' : ''}" data-category="${key}" title="${cat.label}">
            ${cat.icon}
          </button>
        `).join('')}
      </div>
      <div class="emoji-picker-grid-container">
        <div class="emoji-picker-grid-title">Smileys & Emotion</div>
        <div class="emoji-picker-grid"></div>
      </div>
    `;

    document.body.appendChild(picker);
    currentPicker = picker;

    const searchInput = picker.querySelector('.emoji-picker-search-input');
    const gridTitle = picker.querySelector('.emoji-picker-grid-title');
    const grid = picker.querySelector('.emoji-picker-grid');
    const tabButtons = picker.querySelectorAll('.emoji-tab-btn');

    // Position Picker
    this.positionPicker(triggerElement, picker);

    // Initial render of first category
    let activeCategory = 'smileys';
    const renderCategory = (categoryKey) => {
      const cat = EMOJI_CATEGORIES[categoryKey];
      gridTitle.textContent = cat.label;
      grid.innerHTML = cat.emojis.map(e => `
        <button class="emoji-item-btn">${e}</button>
      `).join('');
    };
    renderCategory(activeCategory);

    // Tab Selection Event
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category');
        searchInput.value = '';
        renderCategory(activeCategory);
      });
    });

    // Search Event
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        tabButtons.forEach(b => b.classList.remove('active'));
        const activeTab = picker.querySelector(`.emoji-tab-btn[data-category="${activeCategory}"]`);
        if (activeTab) activeTab.classList.add('active');
        renderCategory(activeCategory);
        return;
      }

      // Remove active from tabs when searching
      tabButtons.forEach(b => b.classList.remove('active'));
      gridTitle.textContent = `Search Results for "${query}"`;

      // Filter emojis across all categories based on simple keywords mapping
      let matchedEmojis = [];
      Object.entries(EMOJI_CATEGORIES).forEach(([key, cat]) => {
        // If query is inside category label or matches keywords, add all
        const isCatMatch = cat.label.toLowerCase().includes(query) || cat.keywords.some(k => k.includes(query));
        if (isCatMatch) {
          matchedEmojis.push(...cat.emojis);
        } else {
          // Check if any keyword matches to add subset, or if query is an emoji itself
          // Simple emoji search fallback: we don't have descriptions for each emoji, 
          // so we can index a small set of matches or just look for basic patterns
          cat.emojis.forEach((emojiChar) => {
            // Check if emoji matches query (if user pasted an emoji)
            if (emojiChar === query) {
              matchedEmojis.push(emojiChar);
            }
          });
        }
      });

      // Deduplicate
      matchedEmojis = [...new Set(matchedEmojis)];

      // If no keyword matches, let's just display all emojis that might match basic tags or show a generic subset
      if (matchedEmojis.length === 0) {
        // Fallback: search tags (mock search for keywords in a dictionary)
        // Let's add basic filtering: if query matches some common patterns, filter Emojis
        const mockEmojiTags = {
          'heart': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
          'smile': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇'],
          'cry': ['😢', '😭', '😿', '😿'],
          'angry': ['😤', '😠', '😡', '🤬'],
          'cat': ['🐱', '🐈', '🐈‍⬛'],
          'dog': ['🐶', '🐕', '🐩', '🦮', '🐕‍'],
          'computer': ['💻', '⌨️', '🖱️'],
          'code': ['💻', '🎯', '⚙️', '💡'],
          'car': ['🚗', '🚙', '🚕', '🚓'],
          'star': ['⭐', '🌟', '✨', '💫']
        };
        Object.entries(mockEmojiTags).forEach(([tag, list]) => {
          if (tag.includes(query)) {
            matchedEmojis.push(...list);
          }
        });
      }

      if (matchedEmojis.length === 0) {
        // Just show a few matching from all emojis
        const allEmojis = Object.values(EMOJI_CATEGORIES).flatMap(c => c.emojis);
        // Fallback simple search: no exact match, just show empty
        grid.innerHTML = `<div class="emoji-picker-no-results">No emojis found</div>`;
      } else {
        grid.innerHTML = matchedEmojis.map(e => `
          <button class="emoji-item-btn">${e}</button>
        `).join('');
      }
    });

    // Select Emoji Event
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.emoji-item-btn');
      if (btn) {
        onSelect(btn.textContent.trim());
        this.closePicker();
      }
    });

    // Click outside listener
    setTimeout(() => {
      document.addEventListener('click', this.clickOutsideListener);
    }, 10);
  },

  /**
   * Closes the emoji picker if open
   */
  closePicker() {
    if (currentPicker) {
      currentPicker.remove();
      currentPicker = null;
      document.removeEventListener('click', this.clickOutsideListener);
    }
  },

  /**
   * Helper to handle clicks outside the picker to close it
   */
  clickOutsideListener(e) {
    if (currentPicker && !currentPicker.contains(e.target)) {
      emoji.closePicker();
    }
  },

  /**
   * Positions the picker popover near the trigger element
   */
  positionPicker(trigger, picker) {
    const triggerRect = trigger.getBoundingClientRect();
    const pickerWidth = 320; // Matches CSS width
    const pickerHeight = 350; // Matches max CSS height

    let top = triggerRect.bottom + window.scrollY + 6;
    let left = triggerRect.left + window.scrollX;

    // Check bottom viewport collision
    if (top + pickerHeight > window.innerHeight + window.scrollY) {
      top = triggerRect.top + window.scrollY - pickerHeight - 6;
    }

    // Check right viewport collision
    if (left + pickerWidth > window.innerWidth) {
      left = window.innerWidth - pickerWidth - 16;
    }

    // Check left viewport collision
    if (left < 16) {
      left = 16;
    }

    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;
  }
};
