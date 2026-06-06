// IntelliNote Block-Based Editor Engine
import { db } from './db.js';
import { emoji } from './emoji.js';

// --- Syntax Highlighter ---
export function highlightCode(code, lang) {
  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let escaped = escapeHTML(code);
  if (!lang) return escaped;

  const lowerLang = lang.toLowerCase();

  if (['c#', 'csharp', 'java', 'c++', 'cpp'].includes(lowerLang)) {
    // Comments
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
    // Strings
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    // Keywords
    const keywords = /\b(using|namespace|public|private|protected|internal|class|interface|struct|enum|void|static|virtual|override|new|foreach|in|if|else|switch|case|break|return|string|int|double|float|bool|var|new|this|object|try|catch|finally|throw)\b/g;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    // Builtins
    escaped = escaped.replace(/\b(Console|WriteLine|ReadLine|String|Int32|Double|Boolean|List|Array|Math|Allen|PW|Coaching)\b/g, '<span class="token builtin">$1</span>');
    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="token number">$1</span>');
    return escaped;
  }

  if (['javascript', 'js', 'typescript', 'ts'].includes(lowerLang)) {
    // Comments
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
    // Strings
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(`[\s\S]*?`)/g, '<span class="token string">$1</span>');
    // Keywords
    const keywords = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|export|import|default|from|new|this|typeof|instanceof|async|await|try|catch|finally|throw|yield)\b/g;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    // Builtins
    escaped = escaped.replace(/\b(console|log|error|warn|info|window|document|Math|JSON|Promise|Set|Map|Array|Object|String|Number)\b/g, '<span class="token builtin">$1</span>');
    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="token number">$1</span>');
    return escaped;
  }

  if (['python', 'py'].includes(lowerLang)) {
    // Comments
    escaped = escaped.replace(/(#.*)/g, '<span class="token comment">$1</span>');
    // Strings
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    // Keywords
    const keywords = /\b(def|class|return|if|elif|else|for|while|break|continue|in|is|not|and|or|import|from|as|try|except|finally|raise|assert|global|nonlocal|lambda|pass|yield|with)\b/g;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    // Builtins
    escaped = escaped.replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|enumerate|zip|sum|min|max|open|abs|type)\b/g, '<span class="token builtin">$1</span>');
    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="token number">$1</span>');
    return escaped;
  }

  if (['html', 'xml'].includes(lowerLang)) {
    // Comments
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token comment">$1</span>');
    // Tags
    escaped = escaped.replace(/(&lt;\/?[a-zA-Z0-9:-]+)/g, '<span class="token keyword">$1</span>');
    escaped = escaped.replace(/(\/?&gt;)/g, '<span class="token keyword">$1</span>');
    // Attributes
    escaped = escaped.replace(/\s([a-zA-Z0-9:-]+)=/g, ' <span class="token builtin">$1</span>=');
    // Strings
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    return escaped;
  }

  if (lowerLang === 'css') {
    // Comments
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
    // Selectors
    escaped = escaped.replace(/([a-zA-Z0-9:-]+)\s*\{/g, '<span class="token keyword">$1</span> {');
    // Properties
    escaped = escaped.replace(/([a-zA-Z0-9:-]+)\s*:/g, '<span class="token builtin">$1</span>:');
    // Strings
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    return escaped;
  }

  if (lowerLang === 'sql') {
    // Comments
    escaped = escaped.replace(/(--.*)/g, '<span class="token comment">$1</span>');
    // Keywords
    const keywords = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|CREATE|TABLE|ALTER|DROP|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|AND|OR|NOT|IN|LIKE|IS|NULL)\b/gi;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    // Strings
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    return escaped;
  }

  return escaped;
}

// --- Intellisense Dictionary ---
const AUTOCOMPLETE_DICT = {
  'c#': [
    { label: 'Console.WriteLine("...")', text: 'Console.WriteLine("");', desc: 'Writes string line output to console.' },
    { label: 'Console.ReadLine()', text: 'Console.ReadLine();', desc: 'Reads next line of user input.' },
    { label: 'Console.Clear()', text: 'Console.Clear();', desc: 'Clears the console window buffer.' },
    { label: 'Convert.ToInt32(...)', text: 'Convert.ToInt32();', desc: 'Converts base types to 32-bit signed integer.' },
    { label: 'Convert.ToString(...)', text: 'Convert.ToString();', desc: 'Converts target value to string representation.' },
    { label: 'foreach (var item in col)', text: 'foreach (var item in collection) {\n    \n}', desc: 'Iterates through array or collection.' },
    { label: 'public override void Event()', text: 'public override void Event() {\n    \n}', desc: 'Overriding parent coaching class event.' },
    { label: 'Math.Max(a, b)', text: 'Math.Max();', desc: 'Returns the larger of two numbers.' },
    { label: 'List<type> name = new List<type>()', text: 'List<string> list = new List<string>();', desc: 'Creates dynamic generic list collection.' }
  ],
  'javascript': [
    { label: 'console.log(...)', text: 'console.log();', desc: 'Outputs general logging information.' },
    { label: 'console.error(...)', text: 'console.error();', desc: 'Outputs error tracing information.' },
    { label: 'console.warn(...)', text: 'console.warn();', desc: 'Outputs warnings warning messages.' },
    { label: 'document.getElementById("...")', text: 'document.getElementById("");', desc: 'Returns elements by element ID.' },
    { label: 'document.querySelector("...")', text: 'document.querySelector("");', desc: 'Returns first matching CSS selector.' },
    { label: 'JSON.stringify(...)', text: 'JSON.stringify();', desc: 'Serializes object to JSON string representation.' },
    { label: 'JSON.parse(...)', text: 'JSON.parse();', desc: 'Deserializes JSON string back to Javascript Object.' },
    { label: 'new Promise((res, rej) => ...)', text: 'new Promise((resolve, reject) => {\n    \n});', desc: 'Creates a new asynchronous Promise.' },
    { label: 'setTimeout(() => ..., delay)', text: 'setTimeout(() => {\n    \n}, 1000);', desc: 'Runs function block after a delay.' }
  ],
  'python': [
    { label: 'print(...)', text: 'print()', desc: 'Prints text or object values to stdout.' },
    { label: 'len(...)', text: 'len()', desc: 'Returns item count in string, list, dictionary.' },
    { label: 'range(start, stop)', text: 'range(0, 10)', desc: 'Generates arithmetic sequence of values.' },
    { label: 'enumerate(iterable)', text: 'enumerate()', desc: 'Returns indexed enumerate object tuples.' },
    { label: 'def name():', text: 'def my_function():\n    pass', desc: 'Declares standard function block.' },
    { label: 'import json', text: 'import json', desc: 'Imports core Python JSON support module.' }
  ]
};

// --- Caret Position Helper for Textarea Autocomplete ---
// Returns pixel coordinates relative to the top-left of the textarea
function getCaretCoordinates(textarea, position) {
  const properties = [
    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
    'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign',
    'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
    'tabSize', 'MozTabSize'
  ];

  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(textarea);

  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';

  properties.forEach(prop => {
    style[prop] = computed[prop];
  });

  div.textContent = textarea.value.substring(0, position);

  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth),
    height: parseInt(computed.lineHeight) || parseInt(computed.fontSize)
  };

  document.body.removeChild(div);
  return coordinates;
}

// --- Block-Based Editor Class ---
export class Editor {
  constructor(container, chapter, onSave) {
    this.container = container;
    this.chapter = chapter;
    this.onSave = onSave;
    this.blocks = chapter.blocks && chapter.blocks.length > 0 ? JSON.parse(JSON.stringify(chapter.blocks)) : [
      { id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '' }
    ];

    this.activeBlockIndex = 0;
    this.slashMenu = null;
    this.autocompleteMenu = null;

    this.render();
  }

  // Save changes back to DB
  save() {
    this.chapter.blocks = this.blocks;
    db.saveChapter(this.chapter);
    if (this.onSave) {
      this.onSave(this.chapter);
    }
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'loop-editor-canvas';

    const blocksWrapper = document.createElement('div');
    blocksWrapper.className = 'loop-editor-blocks-wrapper';
    this.container.appendChild(blocksWrapper);

    this.blocks.forEach((block, index) => {
      const blockEl = this.renderBlock(block, index);
      blocksWrapper.appendChild(blockEl);
    });

    // Handle global click to dismiss floating menus
    document.addEventListener('click', (e) => {
      if (this.slashMenu && !this.slashMenu.contains(e.target)) {
        this.closeSlashMenu();
      }
      if (this.autocompleteMenu && !this.autocompleteMenu.contains(e.target)) {
        this.closeAutocompleteMenu();
      }
    });
  }

  renderBlock(block, index) {
    const wrapper = document.createElement('div');
    wrapper.className = `loop-editor-block-wrapper ${block.type}-wrapper`;
    wrapper.setAttribute('data-block-id', block.id);
    wrapper.setAttribute('data-block-index', index);

    // Hover handle/icon on left
    const dragHandle = document.createElement('div');
    dragHandle.className = 'loop-block-drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    wrapper.appendChild(dragHandle);

    // Context / Content Container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'loop-block-content-container';
    wrapper.appendChild(contentContainer);

    // Render type-specific layout
    switch (block.type) {
      case 'text':
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
      case 'quote':
        this.renderStandardEditable(block, index, contentContainer);
        break;
      case 'bullet-list':
        contentContainer.innerHTML = `<span class="list-bullet-marker">•</span>`;
        this.renderStandardEditable(block, index, contentContainer);
        break;
      case 'number-list':
        // Calculate dynamic numbers based on sequential listing
        let seq = 1;
        for (let i = index - 1; i >= 0; i--) {
          if (this.blocks[i].type === 'number-list') seq++;
          else break;
        }
        contentContainer.innerHTML = `<span class="list-number-marker">${seq}.</span>`;
        this.renderStandardEditable(block, index, contentContainer);
        break;
      case 'checklist':
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'list-checkbox';
        chk.checked = !!block.checked;
        chk.addEventListener('change', (e) => {
          block.checked = e.target.checked;
          const editorText = contentContainer.querySelector('.block-editable');
          if (block.checked) {
            editorText.classList.add('checked');
          } else {
            editorText.classList.remove('checked');
          }
          this.save();
        });
        contentContainer.appendChild(chk);
        
        this.renderStandardEditable(block, index, contentContainer, block.checked ? 'checked' : '');
        break;
      case 'callout':
        const calloutBox = document.createElement('div');
        calloutBox.className = 'callout-box-layout';
        
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'callout-emoji-btn';
        emojiBtn.textContent = block.emoji || '💡';
        emojiBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          emoji.showPicker(emojiBtn, (selectedEmoji) => {
            block.emoji = selectedEmoji;
            emojiBtn.textContent = selectedEmoji;
            this.save();
          });
        });
        calloutBox.appendChild(emojiBtn);

        const calloutTextContainer = document.createElement('div');
        calloutTextContainer.className = 'callout-text-container';
        this.renderStandardEditable(block, index, calloutTextContainer);
        calloutBox.appendChild(calloutTextContainer);
        
        contentContainer.appendChild(calloutBox);
        break;
      case 'divider':
        const hr = document.createElement('hr');
        hr.className = 'editor-divider-line';
        contentContainer.appendChild(hr);
        
        // Remove button for dividers
        const rmBtn = document.createElement('button');
        rmBtn.className = 'divider-remove-btn';
        rmBtn.textContent = '×';
        rmBtn.addEventListener('click', () => {
          this.deleteBlock(index);
        });
        contentContainer.appendChild(rmBtn);
        break;
      case 'code':
        this.renderCodeBlock(block, index, contentContainer);
        break;
      case 'table':
        this.renderTableBlock(block, index, contentContainer);
        break;
    }

    return wrapper;
  }

  // --- Render Standard ContentEditable Paragraph/Headings ---
  renderStandardEditable(block, index, container, extraClass = '') {
    const editable = document.createElement('div');
    editable.className = `block-editable ${extraClass}`;
    editable.contentEditable = 'true';
    editable.innerHTML = block.data || '';
    editable.setAttribute('placeholder', this.getPlaceholderForType(block.type));

    // Handle Focus
    editable.addEventListener('focus', () => {
      this.activeBlockIndex = index;
      const allWrappers = this.container.querySelectorAll('.loop-editor-block-wrapper');
      allWrappers.forEach(w => w.classList.remove('active'));
      editable.closest('.loop-editor-block-wrapper').classList.add('active');
    });

    // Realtime Input handler
    editable.addEventListener('input', (e) => {
      block.data = editable.innerHTML;
      this.handleMarkdownTransformations(editable, block, index);
      this.save();
    });

    // Keydown shortcuts
    editable.addEventListener('keydown', (e) => {
      if (this.slashMenu) {
        if (this.handleSlashMenuNavigation(e)) {
          e.preventDefault();
          return;
        }
      }

      if (e.key === 'Enter') {
        if (this.slashMenu) {
          this.selectActiveSlashMenuItem();
          e.preventDefault();
          return;
        }
        e.preventDefault();
        this.insertBlockAfter(index, block.type);
      } else if (e.key === 'Backspace') {
        const text = editable.textContent;
        // If block is empty, revert type or delete
        if (!text || text === '') {
          e.preventDefault();
          if (block.type !== 'text') {
            block.type = 'text';
            this.save();
            this.render();
            this.focusBlock(index);
          } else {
            this.deleteBlock(index);
          }
        }
      } else if (e.key === 'ArrowUp') {
        if (index > 0) {
          e.preventDefault();
          this.focusBlock(index - 1);
        }
      } else if (e.key === 'ArrowDown') {
        if (index < this.blocks.length - 1) {
          e.preventDefault();
          this.focusBlock(index + 1);
        }
      } else if (e.key === '/') {
        // Debounce slash menu open slightly
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const textBeforeCaret = editable.textContent.slice(0, range.startOffset);
            if (textBeforeCaret.endsWith('/')) {
              this.showSlashMenu(editable, block, index);
            }
          }
        }, 10);
      }
    });

    container.appendChild(editable);
  }

  getPlaceholderForType(type) {
    switch (type) {
      case 'heading-1': return 'Heading 1';
      case 'heading-2': return 'Heading 2';
      case 'heading-3': return 'Heading 3';
      case 'quote': return 'Empty quote';
      case 'callout': return 'Callout content...';
      default: return 'Type "/" for commands';
    }
  }

  // --- Auto-transforms like "# " -> H1, "- " -> list ---
  handleMarkdownTransformations(editable, block, index) {
    const text = editable.textContent;

    if (block.type === 'text') {
      if (text.startsWith('# ')) {
        block.type = 'heading-1';
        block.data = text.substring(2);
      } else if (text.startsWith('## ')) {
        block.type = 'heading-2';
        block.data = text.substring(3);
      } else if (text.startsWith('### ')) {
        block.type = 'heading-3';
        block.data = text.substring(4);
      } else if (text.startsWith('- ') || text.startsWith('* ')) {
        block.type = 'bullet-list';
        block.data = text.substring(2);
      } else if (text.startsWith('1. ')) {
        block.type = 'number-list';
        block.data = text.substring(3);
      } else if (text.startsWith('[] ') || text.startsWith('[ ] ')) {
        block.type = 'checklist';
        block.checked = false;
        block.data = text.startsWith('[] ') ? text.substring(3) : text.substring(4);
      } else if (text.startsWith('> ')) {
        block.type = 'quote';
        block.data = text.substring(2);
      } else if (text.startsWith('```')) {
        block.type = 'code';
        block.data = {
          code: '',
          language: 'JavaScript',
          lineNumbers: true
        };
      }

      if (block.type !== 'text') {
        this.save();
        this.render();
        this.focusBlock(index);
      }
    }
  }

  // --- Render Custom Code Block Editor ---
  renderCodeBlock(block, index, container) {
    const languages = ['C#', 'JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'SQL', 'Markdown', 'Java', 'C++', 'Go', 'Rust'];
    const currentLang = block.data.language || 'JavaScript';
    const hasLineNumbers = block.data.lineNumbers !== false;

    const codeWrapper = document.createElement('div');
    codeWrapper.className = 'loop-code-block-wrapper';

    // Toolbar Header
    const toolbar = document.createElement('div');
    toolbar.className = 'code-block-toolbar';
    toolbar.innerHTML = `
      <div class="code-block-lang-selector-container">
        <select class="code-block-lang-select">
          ${languages.map(lang => `<option value="${lang}" ${lang.toLowerCase() === currentLang.toLowerCase() ? 'selected' : ''}>${lang}</option>`).join('')}
        </select>
      </div>
      <div class="code-block-actions">
        <button class="code-action-btn toggle-lines-btn" title="Toggle Line Numbers">${hasLineNumbers ? 'Hide Lines' : 'Show Lines'}</button>
        <button class="code-action-btn copy-code-btn" title="Copy Code">Copy</button>
        <button class="code-action-btn delete-code-btn" title="Delete Block">×</button>
      </div>
    `;

    // Dropdown change listener
    const select = toolbar.querySelector('.code-block-lang-select');
    select.addEventListener('change', (e) => {
      block.data.language = e.target.value;
      this.save();
      this.render();
    });

    // Toggle Line Numbers
    const toggleLines = toolbar.querySelector('.toggle-lines-btn');
    toggleLines.addEventListener('click', () => {
      block.data.lineNumbers = !block.data.lineNumbers;
      this.save();
      this.render();
    });

    // Copy Code
    const copyBtn = toolbar.querySelector('.copy-code-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(block.data.code || '');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });

    // Delete Code Block
    const deleteBtn = toolbar.querySelector('.delete-code-btn');
    deleteBtn.addEventListener('click', () => {
      this.deleteBlock(index);
    });

    codeWrapper.appendChild(toolbar);

    // Code area layout
    const codeArea = document.createElement('div');
    codeArea.className = 'code-block-editor-area';

    // Line Numbers container
    const lineNumbersCol = document.createElement('div');
    lineNumbersCol.className = 'code-line-numbers';
    if (!hasLineNumbers) {
      lineNumbersCol.style.display = 'none';
    }
    codeArea.appendChild(lineNumbersCol);

    // Container for overlayed editing
    const editorContainer = document.createElement('div');
    editorContainer.className = 'code-textarea-overlay-container';

    const textarea = document.createElement('textarea');
    textarea.className = 'code-editor-textarea';
    textarea.value = block.data.code || '';
    textarea.placeholder = 'Write code here...';
    textarea.spellcheck = false;

    const highlightPre = document.createElement('pre');
    highlightPre.className = 'code-highlight-pre';
    const highlightCodeEl = document.createElement('code');
    highlightCodeEl.className = `language-${currentLang.toLowerCase()}`;
    highlightPre.appendChild(highlightCodeEl);

    editorContainer.appendChild(textarea);
    editorContainer.appendChild(highlightPre);
    codeArea.appendChild(editorContainer);
    codeWrapper.appendChild(codeArea);
    container.appendChild(codeWrapper);

    // Sync values & highlight
    const syncAndHighlight = () => {
      const value = textarea.value;
      block.data.code = value;

      // Update Highlight overlay
      highlightCodeEl.innerHTML = highlightCode(value, currentLang) + '\n';

      // Update Line Numbers
      const lineCount = value.split('\n').length || 1;
      lineNumbersCol.innerHTML = Array(lineCount).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');

      this.save();
    };

    // Textarea sync events
    textarea.addEventListener('input', () => {
      syncAndHighlight();
      this.handleCodeAutocompleteTrigger(textarea, currentLang);
    });

    textarea.addEventListener('scroll', () => {
      highlightPre.scrollTop = textarea.scrollTop;
      highlightPre.scrollLeft = textarea.scrollLeft;
      lineNumbersCol.scrollTop = textarea.scrollTop;
    });

    textarea.addEventListener('keydown', (e) => {
      if (this.autocompleteMenu) {
        if (this.handleAutocompleteMenuNavigation(e, textarea)) {
          e.preventDefault();
          return;
        }
      }

      // Tab handling inside textarea
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 4;
        syncAndHighlight();
      } else if (e.key === 'Backspace' && textarea.value === '') {
        // Delete block on backspace inside empty textarea
        this.deleteBlock(index);
      }
    });

    // Initial load sync
    syncAndHighlight();
  }

  // --- Autocomplete (Intellisense) engine for Code Blocks ---
  handleCodeAutocompleteTrigger(textarea, lang) {
    const currentLang = lang.toLowerCase();
    const suggestions = AUTOCOMPLETE_DICT[currentLang] || AUTOCOMPLETE_DICT['javascript']; // Fallback JavaScript dict

    const text = textarea.value;
    const pos = textarea.selectionStart;

    // Find the current line typing token
    const textBeforeCursor = text.substring(0, pos);
    const lastLine = textBeforeCursor.split('\n').pop() || '';

    // Match keywords or dot triggers (e.g. "Con", "Console.", "print")
    const match = lastLine.match(/([a-zA-Z_0-9<>]+(\.[a-zA-Z_0-9<>]*)?)$/);
    if (!match) {
      this.closeAutocompleteMenu();
      return;
    }

    const query = match[0].toLowerCase();
    
    // Filter suggestions based on query
    const filtered = suggestions.filter(item => {
      return item.label.toLowerCase().includes(query) || item.text.toLowerCase().includes(query);
    });

    if (filtered.length === 0 || query.length < 2) {
      this.closeAutocompleteMenu();
      return;
    }

    // Show suggestions popup
    this.showAutocompleteMenu(textarea, filtered, query, pos);
  }

  showAutocompleteMenu(textarea, list, query, cursorIndex) {
    this.closeAutocompleteMenu();

    const menu = document.createElement('div');
    menu.className = 'loop-autocomplete-menu';

    menu.innerHTML = list.map((item, idx) => `
      <div class="autocomplete-item ${idx === 0 ? 'active' : ''}" data-text="${item.text}">
        <span class="autocomplete-label">${item.label}</span>
        <span class="autocomplete-desc">${item.desc}</span>
      </div>
    `).join('');

    document.body.appendChild(menu);
    this.autocompleteMenu = menu;

    // Position Autocomplete menu below typing caret
    const textareaRect = textarea.getBoundingClientRect();
    const caretCoords = getCaretCoordinates(textarea, cursorIndex);

    let top = textareaRect.top + caretCoords.top + caretCoords.height + 4 + window.scrollY;
    let left = textareaRect.left + caretCoords.left + window.scrollX;

    // Keep picker inside screen boundaries
    if (top + 200 > window.innerHeight + window.scrollY) {
      top = textareaRect.top + caretCoords.top - 204 + window.scrollY;
    }
    if (left + 280 > window.innerWidth) {
      left = window.innerWidth - 296;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    // Item click listener
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item) {
        this.insertAutocompleteSelection(textarea, item.getAttribute('data-text'), query);
      }
    });
  }

  closeAutocompleteMenu() {
    if (this.autocompleteMenu) {
      this.autocompleteMenu.remove();
      this.autocompleteMenu = null;
    }
  }

  handleAutocompleteMenuNavigation(e, textarea) {
    if (!this.autocompleteMenu) return false;
    const items = this.autocompleteMenu.querySelectorAll('.autocomplete-item');
    let activeIdx = Array.from(items).findIndex(item => item.classList.contains('active'));

    if (e.key === 'ArrowDown') {
      items[activeIdx].classList.remove('active');
      activeIdx = (activeIdx + 1) % items.length;
      items[activeIdx].classList.add('active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
      return true;
    } else if (e.key === 'ArrowUp') {
      items[activeIdx].classList.remove('active');
      activeIdx = (activeIdx - 1 + items.length) % items.length;
      items[activeIdx].classList.add('active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
      return true;
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const activeText = items[activeIdx].getAttribute('data-text');
      const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
      const lastLine = textBeforeCursor.split('\n').pop() || '';
      const match = lastLine.match(/([a-zA-Z_0-9<>]+(\.[a-zA-Z_0-9<>]*)?)$/);
      const query = match ? match[0] : '';
      
      this.insertAutocompleteSelection(textarea, activeText, query);
      return true;
    } else if (e.key === 'Escape') {
      this.closeAutocompleteMenu();
      return true;
    }
    return false;
  }

  insertAutocompleteSelection(textarea, replacementText, query) {
    const text = textarea.value;
    const pos = textarea.selectionStart;
    
    // Replace the typed query letters with the auto-completed text
    const before = text.substring(0, pos - query.length);
    const after = text.substring(pos);
    
    textarea.value = before + replacementText + after;
    textarea.selectionStart = textarea.selectionEnd = before.length + replacementText.length;
    
    // Trigger input event to re-highlight and save
    textarea.dispatchEvent(new Event('input'));
    this.closeAutocompleteMenu();
    textarea.focus();
  }

  // --- Render Table Editor Block ---
  renderTableBlock(block, index, container) {
    if (!block.data || !block.data.rows) {
      block.data = {
        rows: [
          ['Header 1', 'Header 2', 'Header 3'],
          ['Cell 1', 'Cell 2', 'Cell 3'],
          ['Cell 4', 'Cell 5', 'Cell 6']
        ]
      };
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'loop-table-wrapper';

    // Toolbar Options
    const toolbar = document.createElement('div');
    toolbar.className = 'table-block-toolbar';
    toolbar.innerHTML = `
      <button class="table-opt-btn add-row-btn">+ Row</button>
      <button class="table-opt-btn add-col-btn">+ Col</button>
      <button class="table-opt-btn del-row-btn">- Row</button>
      <button class="table-opt-btn del-col-btn">- Col</button>
      <button class="table-opt-btn delete-table-btn" title="Delete Table">Delete</button>
    `;

    // Add Row
    toolbar.querySelector('.add-row-btn').addEventListener('click', () => {
      const colCount = block.data.rows[0].length;
      block.data.rows.push(Array(colCount).fill(''));
      this.save();
      this.render();
    });

    // Add Column
    toolbar.querySelector('.add-col-btn').addEventListener('click', () => {
      block.data.rows.forEach(row => row.push(''));
      this.save();
      this.render();
    });

    // Delete Row
    toolbar.querySelector('.del-row-btn').addEventListener('click', () => {
      if (block.data.rows.length > 1) {
        block.data.rows.pop();
        this.save();
        this.render();
      }
    });

    // Delete Column
    toolbar.querySelector('.del-col-btn').addEventListener('click', () => {
      if (block.data.rows[0].length > 1) {
        block.data.rows.forEach(row => row.pop());
        this.save();
        this.render();
      }
    });

    // Delete Table
    toolbar.querySelector('.delete-table-btn').addEventListener('click', () => {
      this.deleteBlock(index);
    });

    tableWrapper.appendChild(toolbar);

    // Table Content
    const table = document.createElement('table');
    table.className = 'loop-editor-table';

    block.data.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      row.forEach((cell, colIndex) => {
        const cellEl = document.createElement(rowIndex === 0 ? 'th' : 'td');
        cellEl.contentEditable = 'true';
        cellEl.innerHTML = cell;
        
        cellEl.addEventListener('input', () => {
          block.data.rows[rowIndex][colIndex] = cellEl.innerHTML;
          this.save();
        });

        tr.appendChild(cellEl);
      });
      table.appendChild(tr);
    });

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
  }

  // --- Slash Commands Popover `/` ---
  showSlashMenu(editable, block, index) {
    this.closeSlashMenu();

    const menu = document.createElement('div');
    menu.className = 'loop-slash-menu-popup';

    const menuItems = [
      { type: 'text', label: 'Text', desc: 'Plain writing text block', icon: '📝' },
      { type: 'heading-1', label: 'Heading 1', desc: 'Large title header', icon: 'H1' },
      { type: 'heading-2', label: 'Heading 2', desc: 'Medium section header', icon: 'H2' },
      { type: 'heading-3', label: 'Heading 3', desc: 'Small subsection header', icon: 'H3' },
      { type: 'bullet-list', label: 'Bulleted List', desc: 'Create bullet items list', icon: '•' },
      { type: 'number-list', label: 'Numbered List', desc: 'Create sequential numbered list', icon: '1.' },
      { type: 'checklist', label: 'To-do list', desc: 'Track task checkbox list', icon: '☑️' },
      { type: 'code', label: 'Code Block', desc: 'Write highlighted code blocks', icon: '```' },
      { type: 'table', label: 'Table', desc: 'Insert data table grids', icon: '📊' },
      { type: 'quote', label: 'Quote', desc: 'Add inline blockquotes', icon: '💬' },
      { type: 'callout', label: 'Callout', desc: 'Make text stand out box', icon: '💡' },
      { type: 'divider', label: 'Divider', desc: 'Separate sections line', icon: '―' }
    ];

    menu.innerHTML = menuItems.map((item, idx) => `
      <div class="slash-menu-item ${idx === 0 ? 'active' : ''}" data-type="${item.type}">
        <span class="slash-item-icon">${item.icon}</span>
        <div class="slash-item-info">
          <div class="slash-item-label">${item.label}</div>
          <div class="slash-item-desc">${item.desc}</div>
        </div>
      </div>
    `).join('');

    document.body.appendChild(menu);
    this.slashMenu = menu;

    // Position popover
    const rect = editable.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;

    if (top + 280 > window.innerHeight + window.scrollY) {
      top = rect.top - 286 + window.scrollY;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    // Item Selection Click
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.slash-menu-item');
      if (item) {
        const type = item.getAttribute('data-type');
        this.transformBlock(editable, block, index, type);
      }
    });
  }

  closeSlashMenu() {
    if (this.slashMenu) {
      this.slashMenu.remove();
      this.slashMenu = null;
    }
  }

  handleSlashMenuNavigation(e) {
    if (!this.slashMenu) return false;
    const items = this.slashMenu.querySelectorAll('.slash-menu-item');
    let activeIdx = Array.from(items).findIndex(item => item.classList.contains('active'));

    if (e.key === 'ArrowDown') {
      items[activeIdx].classList.remove('active');
      activeIdx = (activeIdx + 1) % items.length;
      items[activeIdx].classList.add('active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
      return true;
    } else if (e.key === 'ArrowUp') {
      items[activeIdx].classList.remove('active');
      activeIdx = (activeIdx - 1 + items.length) % items.length;
      items[activeIdx].classList.add('active');
      items[activeIdx].scrollIntoView({ block: 'nearest' });
      return true;
    } else if (e.key === 'Escape') {
      this.closeSlashMenu();
      return true;
    }
    return false;
  }

  selectActiveSlashMenuItem() {
    if (!this.slashMenu) return;
    const activeItem = this.slashMenu.querySelector('.slash-menu-item.active');
    if (activeItem) {
      const index = parseInt(activeItem.closest('div').parentElement.querySelector('.slash-menu-item').parentElement.style.top ? this.activeBlockIndex : this.activeBlockIndex);
      const block = this.blocks[this.activeBlockIndex];
      const wrappers = this.container.querySelectorAll('.block-editable');
      const editable = wrappers[this.activeBlockIndex];
      this.transformBlock(editable, block, this.activeBlockIndex, activeItem.getAttribute('data-type'));
    }
  }

  transformBlock(editable, block, index, newType) {
    // Strip the slash symbol from data
    let cleanText = editable.textContent.replace(/\/$/, '');
    
    block.type = newType;
    if (newType === 'code') {
      block.data = {
        code: '',
        language: 'JavaScript',
        lineNumbers: true
      };
    } else if (newType === 'table') {
      block.data = {
        rows: [
          ['Header 1', 'Header 2'],
          ['', '']
        ]
      };
    } else if (newType === 'callout') {
      block.emoji = '💡';
      block.data = cleanText;
    } else {
      block.data = cleanText;
    }

    this.closeSlashMenu();
    this.save();
    this.render();
    this.focusBlock(index);
  }

  // --- Insertion / Deletion Block Mechanics ---
  insertBlockAfter(index, currentType) {
    const newId = 'b-' + Math.random().toString(36).substr(2, 9);
    
    // Inherit list type when hitting Enter in lists
    const nextType = ['bullet-list', 'number-list', 'checklist'].includes(currentType) ? currentType : 'text';
    
    const newBlock = {
      id: newId,
      type: nextType,
      data: ''
    };

    if (nextType === 'checklist') {
      newBlock.checked = false;
    }

    this.blocks.splice(index + 1, 0, newBlock);
    this.save();
    this.render();
    this.focusBlock(index + 1);
  }

  deleteBlock(index) {
    // Do not delete the only block
    if (this.blocks.length === 1) {
      this.blocks[0] = { id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '' };
      this.save();
      this.render();
      this.focusBlock(0);
      return;
    }

    const blockToDelete = this.blocks[index];
    this.blocks.splice(index, 1);
    this.save();
    this.render();

    // Focus previous block or next block
    const focusIndex = index > 0 ? index - 1 : 0;
    this.focusBlock(focusIndex);
  }

  focusBlock(index) {
    setTimeout(() => {
      const wrappers = this.container.querySelectorAll('.loop-editor-block-wrapper');
      if (wrappers[index]) {
        const editable = wrappers[index].querySelector('.block-editable');
        if (editable) {
          editable.focus();
          
          // Place caret at end
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editable);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          // If code or table, focus the textarea/first cell
          const text = wrappers[index].querySelector('textarea');
          if (text) {
            text.focus();
          } else {
            const cell = wrappers[index].querySelector('th, td');
            if (cell) cell.focus();
          }
        }
      }
    }, 10);
  }
}
