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

  if (['c#', 'csharp', 'java', 'c++', 'cpp', 'c'].includes(lowerLang)) {
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    const keywords = /\b(using|namespace|public|private|protected|internal|class|interface|struct|enum|void|static|virtual|override|new|foreach|in|if|else|switch|case|break|return|string|int|double|float|bool|var|new|this|object|try|catch|finally|throw)\b/g;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    escaped = escaped.replace(/\b(Console|WriteLine|ReadLine|String|Int32|Double|Boolean|List|Array|Math|Allen|PW|Coaching)\b/g, '<span class="token builtin">$1</span>');
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="token number">$1</span>');
    return escaped;
  }

  if (['javascript', 'js', 'typescript', 'ts'].includes(lowerLang)) {
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(`[\s\S]*?`)/g, '<span class="token string">$1</span>');
    const keywords = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|export|import|default|from|new|this|typeof|instanceof|async|await|try|catch|finally|throw|yield)\b/g;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    escaped = escaped.replace(/\b(console|log|error|warn|info|window|document|Math|JSON|Promise|Set|Map|Array|Object|String|Number)\b/g, '<span class="token builtin">$1</span>');
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="token number">$1</span>');
    return escaped;
  }

  if (['python', 'py'].includes(lowerLang)) {
    escaped = escaped.replace(/(#.*)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    const keywords = /\b(def|class|return|if|elif|else|for|while|break|continue|in|is|not|and|or|import|from|as|try|except|finally|raise|assert|global|nonlocal|lambda|pass|yield|with)\b/g;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    escaped = escaped.replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|enumerate|zip|sum|min|max|open|abs|type)\b/g, '<span class="token builtin">$1</span>');
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="token number">$1</span>');
    return escaped;
  }

  if (['html', 'xml'].includes(lowerLang)) {
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/(&lt;\/?[a-zA-Z0-9:-]+)/g, '<span class="token keyword">$1</span>');
    escaped = escaped.replace(/(\/?&gt;)/g, '<span class="token keyword">$1</span>');
    escaped = escaped.replace(/\s([a-zA-Z0-9:-]+)=/g, ' <span class="token builtin">$1</span>=');
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    return escaped;
  }

  if (lowerLang === 'css') {
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
    escaped = escaped.replace(/([a-zA-Z0-9:-]+)\s*\{/g, '<span class="token keyword">$1</span> {');
    escaped = escaped.replace(/([a-zA-Z0-9:-]+)\s*:/g, '<span class="token builtin">$1</span>:');
    escaped = escaped.replace(/(&quot;.*?&quot;)/g, '<span class="token string">$1</span>');
    return escaped;
  }

  if (lowerLang === 'sql') {
    escaped = escaped.replace(/(--.*)/g, '<span class="token comment">$1</span>');
    const keywords = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|CREATE|TABLE|ALTER|DROP|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|AND|OR|NOT|IN|LIKE|IS|NULL)\b/gi;
    escaped = escaped.replace(keywords, '<span class="token keyword">$1</span>');
    escaped = escaped.replace(/(&apos;.*?&apos;)/g, '<span class="token string">$1</span>');
    return escaped;
  }

  return escaped;
}

// --- Autocomplete Dictionary ---
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
  'typescript': [
    { label: 'console.log(...)', text: 'console.log();', desc: 'Outputs general logging information.' },
    { label: 'document.getElementById("...")', text: 'document.getElementById("");', desc: 'Returns elements by element ID.' },
    { label: 'JSON.stringify(...)', text: 'JSON.stringify();', desc: 'Serializes object to JSON string representation.' }
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

// --- Autocomplete Inline Suggestion Matcher ---
function getGhostSuggestion(text, pos, lang) {
  const currentLang = lang.toLowerCase();
  const suggestions = AUTOCOMPLETE_DICT[currentLang] || AUTOCOMPLETE_DICT['javascript'];
  
  const textBeforeCursor = text.substring(0, pos);
  const lastLine = textBeforeCursor.split('\n').pop() || '';
  
  // Match word + dot triggers
  const match = lastLine.match(/([a-zA-Z_0-9<>]+(\.[a-zA-Z_0-9<>]*)?)$/);
  if (!match) return null;
  
  const query = match[0];
  if (query.length < 2) return null; // Only autocomplete on 2+ chars
  
  const found = suggestions.find(item => {
    if (item.label.toLowerCase().startsWith(query.toLowerCase())) return true;
    if (item.text.toLowerCase().startsWith(query.toLowerCase())) return true;
    return false;
  });
  
  if (found) {
    const suggestionText = found.text;
    if (suggestionText.toLowerCase().startsWith(query.toLowerCase())) {
      const ghostSuffix = suggestionText.substring(query.length);
      return {
        text: ghostSuffix,
        fullText: found.text,
        query: query
      };
    }
  }
  return null;
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
    this.blockContextMenu = null;
    this.activeLanguageMenu = null;
    
    // Autocomplete ghost tracking
    this.activeGhost = null;

    // Drag and drop tracking
    this.draggedBlockIndex = null;

    this.render();
  }

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

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container || e.target === blocksWrapper) {
        this.focusBlock(this.blocks.length - 1);
      }
    });

    const dismissAll = (e) => {
      if (this.slashMenu && !this.slashMenu.contains(e.target)) this.closeSlashMenu();
      if (this.blockContextMenu && !this.blockContextMenu.contains(e.target)) this.closeBlockContextMenu();
      if (this.activeLanguageMenu && !this.activeLanguageMenu.contains(e.target)) this.closeLanguageMenu();
    };
    document.addEventListener('click', dismissAll);
  }

  renderBlock(block, index) {
    const wrapper = document.createElement('div');
    wrapper.className = `loop-editor-block-wrapper ${block.type}-wrapper`;
    wrapper.setAttribute('data-block-id', block.id);
    wrapper.setAttribute('data-block-index', index);

    if (block.indent) {
      wrapper.style.marginLeft = `${block.indent * 24}px`;
    }

    const dragHandle = document.createElement('div');
    dragHandle.className = 'loop-block-drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    wrapper.appendChild(dragHandle);

    dragHandle.addEventListener('mousedown', () => {
      wrapper.setAttribute('draggable', 'true');
    });
    dragHandle.addEventListener('mouseup', () => {
      wrapper.removeAttribute('draggable');
    });

    dragHandle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showBlockContextMenu(dragHandle, block, index);
    });

    wrapper.addEventListener('dragstart', (e) => {
      this.draggedBlockIndex = index;
      wrapper.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    });

    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const bounding = wrapper.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      if (offset > bounding.height / 2) {
        wrapper.classList.remove('drag-over-top');
        wrapper.classList.add('drag-over-bottom');
      } else {
        wrapper.classList.remove('drag-over-bottom');
        wrapper.classList.add('drag-over-top');
      }
    });

    wrapper.addEventListener('dragleave', () => {
      wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
      
      const sourceIndex = this.draggedBlockIndex;
      if (sourceIndex === null || sourceIndex === index) return;

      const bounding = wrapper.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      let targetIndex = index;
      if (offset > bounding.height / 2) {
        targetIndex = index + 1;
      }

      const [movedBlock] = this.blocks.splice(sourceIndex, 1);
      
      let adjustedTarget = targetIndex;
      if (sourceIndex < targetIndex) {
        adjustedTarget = targetIndex - 1;
      }
      
      this.blocks.splice(adjustedTarget, 0, movedBlock);
      this.save();
      this.render();
      this.focusBlock(adjustedTarget);
    });

    wrapper.addEventListener('dragend', () => {
      wrapper.classList.remove('dragging');
      wrapper.removeAttribute('draggable');
      this.draggedBlockIndex = null;
    });

    const contentContainer = document.createElement('div');
    contentContainer.className = 'loop-block-content-container';
    wrapper.appendChild(contentContainer);

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

  renderStandardEditable(block, index, container, extraClass = '') {
    const editable = document.createElement('div');
    editable.className = `block-editable ${extraClass}`;
    editable.contentEditable = 'true';
    editable.innerHTML = block.data || '';
    editable.setAttribute('placeholder', this.getPlaceholderForType(block.type));

    editable.addEventListener('focus', () => {
      this.activeBlockIndex = index;
      const allWrappers = this.container.querySelectorAll('.loop-editor-block-wrapper');
      allWrappers.forEach(w => w.classList.remove('active'));
      const parent = editable.closest('.loop-editor-block-wrapper');
      if (parent) parent.classList.add('active');
    });

    // Save data and clear br trails to prevent placeholder issues
    const syncData = () => {
      const textTypes = ['text', 'heading-1', 'heading-2', 'heading-3', 'bullet-list', 'number-list', 'checklist', 'quote', 'callout'];
      if (!textTypes.includes(block.type)) return;

      let cleanHTML = editable.innerHTML.trim();
      if (cleanHTML === '<br>' || cleanHTML === '' || editable.textContent.trim() === '') {
        cleanHTML = '';
        editable.innerHTML = ''; // Clear DOM so :empty matches!
      }
      block.data = cleanHTML;
      this.save();
    };

    editable.addEventListener('input', () => {
      syncData();
      this.handleMarkdownTransformations(editable, block, index);
    });

    editable.addEventListener('blur', syncData);

    editable.addEventListener('keydown', (e) => {
      if (this.slashMenu) {
        if (this.handleSlashMenuNavigation(e)) {
          e.preventDefault();
          return;
        }
      }

      const listTypes = ['bullet-list', 'number-list', 'checklist'];
      if (e.key === 'Tab' && listTypes.includes(block.type)) {
        e.preventDefault();
        const currentIndent = block.indent || 0;
        if (e.shiftKey) {
          block.indent = Math.max(0, currentIndent - 1);
        } else {
          block.indent = Math.min(4, currentIndent + 1);
        }
        this.save();
        this.render();
        this.focusBlock(index);
        return;
      }

      if (e.key === 'Enter') {
        if (this.slashMenu) {
          this.selectActiveSlashMenuItem();
          e.preventDefault();
          return;
        }
        
        const rawText = editable.textContent.trim();
        if (listTypes.includes(block.type) && rawText === '') {
          e.preventDefault();
          block.type = 'text';
          block.indent = 0;
          this.save();
          this.render();
          this.focusBlock(index);
          return;
        }

        e.preventDefault();
        this.insertBlockAfter(index, block.type, block.indent);
      } else if (e.key === 'Backspace') {
        const text = editable.textContent;
        if (!text || text === '') {
          e.preventDefault();
          if (block.type !== 'text') {
            block.type = 'text';
            block.indent = 0;
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
    if (typeof block.data === 'string') {
      block.data = {
        code: block.data === '```' ? '' : block.data,
        language: 'JavaScript',
        lineNumbers: true
      };
      this.save();
    }
    const currentLang = block.data.language || 'JavaScript';
    const hasLineNumbers = block.data.lineNumbers !== false;

    const codeWrapper = document.createElement('div');
    codeWrapper.className = 'loop-code-block-wrapper';

    // Toolbar Header (VS Code styled toolbar)
    const toolbar = document.createElement('div');
    toolbar.className = 'code-block-toolbar';
    toolbar.innerHTML = `
      <div class="code-block-lang-selector-container">
        <button class="code-block-lang-btn" id="btn-lang-picker-${index}">${currentLang} <span style="font-size:8px; margin-left:4px; opacity:0.75;">▼</span></button>
      </div>
      <div class="code-block-actions">
        <button class="code-action-btn toggle-lines-btn" title="Toggle Line Numbers">${hasLineNumbers ? 'Hide Lines' : 'Show Lines'}</button>
        <button class="code-action-btn copy-code-btn" title="Copy Code">Copy</button>
        <button class="code-action-btn delete-code-btn" title="Delete Block">×</button>
      </div>
    `;

    // Dropdown custom picker trigger
    const langBtn = toolbar.querySelector(`#btn-lang-picker-${index}`);
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showLanguagePickerPopover(langBtn, block, index);
    });

    const toggleLines = toolbar.querySelector('.toggle-lines-btn');
    toggleLines.addEventListener('click', () => {
      block.data.lineNumbers = !block.data.lineNumbers;
      this.save();
      this.render();
    });

    const copyBtn = toolbar.querySelector('.copy-code-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(block.data.code || '');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });

    const deleteBtn = toolbar.querySelector('.delete-code-btn');
    deleteBtn.addEventListener('click', () => {
      this.deleteBlock(index);
    });

    codeWrapper.appendChild(toolbar);

    const codeArea = document.createElement('div');
    codeArea.className = 'code-block-editor-area';

    const lineNumbersCol = document.createElement('div');
    lineNumbersCol.className = 'code-line-numbers';
    if (!hasLineNumbers) {
      lineNumbersCol.style.display = 'none';
    }
    codeArea.appendChild(lineNumbersCol);

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

    // Sync values & highlight & inline autocompleter
    const syncAndHighlight = () => {
      const value = textarea.value;
      block.data.code = value;

      // Find autocomplete suggestion
      const ghost = getGhostSuggestion(value, textarea.selectionStart, currentLang);
      this.activeGhost = ghost;

      if (ghost) {
        // Overlay inline ghost prediction text inside pre code element at caret position
        const cursor = textarea.selectionStart;
        const part1 = value.substring(0, cursor);
        const part2 = value.substring(cursor);
        
        const html1 = highlightCode(part1, currentLang);
        const html2 = highlightCode(part2, currentLang);
        
        highlightCodeEl.innerHTML = html1 + `<span class="ghost-text">${ghost.text}</span>` + html2 + '\n';
      } else {
        highlightCodeEl.innerHTML = highlightCode(value, currentLang) + '\n';
      }

      // Sync Line Numbers
      const lineCount = value.split('\n').length || 1;
      lineNumbersCol.innerHTML = Array(lineCount).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');

      this.save();
    };

    textarea.addEventListener('input', syncAndHighlight);

    textarea.addEventListener('scroll', () => {
      highlightPre.scrollTop = textarea.scrollTop;
      highlightPre.scrollLeft = textarea.scrollLeft;
      lineNumbersCol.scrollTop = textarea.scrollTop;
    });

    textarea.addEventListener('keydown', (e) => {
      // Tab accepts ghost text autocompletion!
      if (e.key === 'Tab' && this.activeGhost) {
        e.preventDefault();
        
        const ghostText = this.activeGhost.text;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        textarea.value = textarea.value.substring(0, start) + ghostText + textarea.value.substring(end);
        
        // Custom caret position positioning (e.g. inside brackets if found)
        let newCursorPos = start + ghostText.length;
        if (ghostText.includes('("")')) {
          newCursorPos = start + ghostText.indexOf('("")') + 2;
        } else if (ghostText.includes('()') && !ghostText.includes('("')) {
          newCursorPos = start + ghostText.indexOf('()') + 1;
        } else if (ghostText.includes('("");')) {
          newCursorPos = start + ghostText.indexOf('("");') + 2;
        } else if (ghostText.includes('();')) {
          newCursorPos = start + ghostText.indexOf('();') + 1;
        }
        
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        this.activeGhost = null;
        
        syncAndHighlight();
        return;
      }

      // Standard Tab indents
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 4;
        syncAndHighlight();
      } else if (e.key === 'Backspace' && textarea.value === '') {
        this.deleteBlock(index);
      }
    });

    syncAndHighlight();
  }

  // --- Show Custom Language Picker Popover ---
  showLanguagePickerPopover(anchorElement, block, index) {
    this.closeLanguageMenu();

    const menu = document.createElement('div');
    menu.id = 'loop-language-picker-popup';
    menu.className = 'loop-slash-menu-popup';
    menu.style.width = '180px';
    menu.style.zIndex = '3000';

    const languagesList = [
      'C#', 'JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'SQL', 'Markdown',
      'Java', 'C++', 'C', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Shell', 'YAML', 'JSON'
    ];

    menu.innerHTML = `
      <div style="font-size:10px; font-weight:600; text-transform:uppercase; color:var(--text-light); padding:6px 12px 2px 12px; user-select:none;">Select Language</div>
      <div style="max-height: 240px; overflow-y: auto; padding: 4px;">
        ${languagesList.map(lang => `
          <button class="lang-picker-item" data-lang="${lang}" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; padding:6px 12px; font-size:13.5px; border-radius:4px; cursor:pointer; color:var(--text-main); display:flex; justify-content:space-between; align-items:center; ${block.data.language.toLowerCase() === lang.toLowerCase() ? 'background:var(--primary-light); color:var(--primary); font-weight:500;' : ''}">
            <span>${lang}</span>
            ${block.data.language.toLowerCase() === lang.toLowerCase() ? '<span style="font-size:10px;">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
    `;

    document.body.appendChild(menu);
    this.activeLanguageMenu = menu;

    const rect = anchorElement.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;

    if (top + 260 > window.innerHeight + window.scrollY) {
      top = rect.top - 266 + window.scrollY;
    }
    if (left + 190 > window.innerWidth) {
      left = window.innerWidth - 206;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-picker-item');
      if (btn) {
        block.data.language = btn.getAttribute('data-lang');
        this.save();
        this.render();
        this.closeLanguageMenu();
      }
    });
  }

  closeLanguageMenu() {
    if (this.activeLanguageMenu) {
      this.activeLanguageMenu.remove();
      this.activeLanguageMenu = null;
    }
  }

  // --- Render Table Editor Block ---
  renderTableBlock(block, index, container) {
    if (!block.data || !block.data.rows) {
      block.data = {
        rows: [
          ['Header 1', 'Header 2', 'Header 3'],
          ['', '', ''],
          ['', '', '']
        ]
      };
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'loop-table-wrapper';

    const toolbar = document.createElement('div');
    toolbar.className = 'table-block-toolbar';
    toolbar.innerHTML = `
      <button class="table-opt-btn add-row-btn">+ Row</button>
      <button class="table-opt-btn add-col-btn">+ Col</button>
      <button class="table-opt-btn del-row-btn">- Row</button>
      <button class="table-opt-btn del-col-btn">- Col</button>
      <button class="table-opt-btn delete-table-btn" title="Delete Table">Delete</button>
    `;

    toolbar.querySelector('.add-row-btn').addEventListener('click', () => {
      const colCount = block.data.rows[0].length;
      block.data.rows.push(Array(colCount).fill(''));
      this.save();
      this.render();
    });

    toolbar.querySelector('.add-col-btn').addEventListener('click', () => {
      block.data.rows.forEach(row => row.push(''));
      this.save();
      this.render();
    });

    toolbar.querySelector('.del-row-btn').addEventListener('click', () => {
      if (block.data.rows.length > 1) {
        block.data.rows.pop();
        this.save();
        this.render();
      }
    });

    toolbar.querySelector('.del-col-btn').addEventListener('click', () => {
      if (block.data.rows[0].length > 1) {
        block.data.rows.forEach(row => row.pop());
        this.save();
        this.render();
      }
    });

    toolbar.querySelector('.delete-table-btn').addEventListener('click', () => {
      this.deleteBlock(index);
    });

    tableWrapper.appendChild(toolbar);

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

  // --- Block Context Menu ---
  showBlockContextMenu(anchorElement, block, index) {
    this.closeBlockContextMenu();

    const menu = document.createElement('div');
    menu.id = 'editor-block-context-menu';
    menu.className = 'loop-slash-menu-popup';
    menu.style.width = '200px';

    const menuItems = [
      { action: 'copy', label: 'Copy Content', icon: '📋' },
      { action: 'duplicate', label: 'Duplicate Block', icon: '👯' },
      { action: 'delete', label: 'Delete Block', icon: '🗑️' }
    ];

    const convertTypes = [
      { type: 'text', label: 'Text', icon: '📝' },
      { type: 'heading-1', label: 'Heading 1', icon: 'H1' },
      { type: 'heading-2', label: 'Heading 2', icon: 'H2' },
      { type: 'heading-3', label: 'Heading 3', icon: 'H3' },
      { type: 'bullet-list', label: 'Bulleted List', icon: '•' },
      { type: 'number-list', label: 'Numbered List', icon: '1.' },
      { type: 'checklist', label: 'To-do List', icon: '☑️' },
      { type: 'code', label: 'Code Block', icon: '```' },
      { type: 'table', label: 'Table', icon: '📊' },
      { type: 'quote', label: 'Quote', icon: '💬' },
      { type: 'callout', label: 'Callout Box', icon: '💡' }
    ];

    menu.innerHTML = `
      <div style="padding: 4px;">
        ${menuItems.map(item => `
          <button class="block-context-item action-btn" data-action="${item.action}" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; padding: 6px 12px; font-size: 13.5px; border-radius:4px; cursor:pointer; color:var(--text-main); display:flex; gap:10px;">
            <span>${item.icon}</span> ${item.label}
          </button>
        `).join('')}
      </div>
      <hr style="border:none; border-top:1px solid var(--border-color); margin: 4px 0;">
      <div style="font-size:10px; font-weight:600; text-transform:uppercase; color:var(--text-light); padding: 4px 12px 2px 12px;">Turn into</div>
      <div style="max-height:160px; overflow-y:auto; padding: 4px;">
        ${convertTypes.map(c => `
          <button class="block-context-item convert-btn" data-type="${c.type}" style="width:100%; text-align:left; border:none; background:transparent; font-family:inherit; padding: 5px 12px; font-size: 13px; border-radius:4px; cursor:pointer; color:var(--text-main); display:flex; gap:10px; ${block.type === c.type ? 'background:var(--primary-light); color:var(--primary); font-weight:500;' : ''}">
            <span>${c.icon}</span> ${c.label}
          </button>
        `).join('')}
      </div>
    `;

    document.body.appendChild(menu);
    this.blockContextMenu = menu;

    const rect = anchorElement.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;

    if (top + 340 > window.innerHeight + window.scrollY) {
      top = rect.top - 346 + window.scrollY;
    }
    if (left + 210 > window.innerWidth) {
      left = window.innerWidth - 226;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.block-context-item');
      if (!btn) return;
      e.stopPropagation();

      const action = btn.getAttribute('data-action');
      const type = btn.getAttribute('data-type');

      if (action === 'copy') {
        const textVal = block.type === 'code' ? block.data.code : (block.type === 'table' ? JSON.stringify(block.data.rows) : block.data);
        navigator.clipboard.writeText(textVal || '');
        this.closeBlockContextMenu();
      } else if (action === 'duplicate') {
        const duplicatedBlock = JSON.parse(JSON.stringify(block));
        duplicatedBlock.id = 'b-' + Math.random().toString(36).substr(2, 9);
        this.blocks.splice(index + 1, 0, duplicatedBlock);
        this.save();
        this.render();
        this.closeBlockContextMenu();
        this.focusBlock(index + 1);
      } else if (action === 'delete') {
        this.deleteBlock(index);
        this.closeBlockContextMenu();
      } else if (type) {
        block.type = type;
        if (type === 'code') {
          block.data = { code: '', language: 'JavaScript', lineNumbers: true };
        } else if (type === 'table') {
          block.data = { rows: [['Header 1', 'Header 2'], ['', '']] };
        } else if (type === 'callout') {
          block.emoji = '💡';
          block.data = typeof block.data === 'string' ? block.data : '';
        } else {
          block.data = typeof block.data === 'string' ? block.data : '';
        }
        this.save();
        this.render();
        this.closeBlockContextMenu();
        this.focusBlock(index);
      }
    });
  }

  closeBlockContextMenu() {
    if (this.blockContextMenu) {
      this.blockContextMenu.remove();
      this.blockContextMenu = null;
    }
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

    const rect = editable.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;

    if (top + 280 > window.innerHeight + window.scrollY) {
      top = rect.top - 286 + window.scrollY;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

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
      const block = this.blocks[this.activeBlockIndex];
      const wrappers = this.container.querySelectorAll('.block-editable');
      const editable = wrappers[this.activeBlockIndex];
      this.transformBlock(editable, block, this.activeBlockIndex, activeItem.getAttribute('data-type'));
    }
  }

  transformBlock(editable, block, index, newType) {
    let cleanText = editable.textContent.replace(/\/$/, '');
    
    block.type = newType;
    if (newType === 'code') {
      block.data = { code: '', language: 'JavaScript', lineNumbers: true };
    } else if (newType === 'table') {
      block.data = { rows: [['Header 1', 'Header 2'], ['', '']] };
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

  insertBlockAfter(index, currentType, currentIndent = 0) {
    const newId = 'b-' + Math.random().toString(36).substr(2, 9);
    const nextType = ['bullet-list', 'number-list', 'checklist'].includes(currentType) ? currentType : 'text';
    
    const newBlock = {
      id: newId,
      type: nextType,
      data: '',
      indent: currentIndent
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
    if (this.blocks.length === 1) {
      this.blocks[0] = { id: 'b-' + Math.random().toString(36).substr(2, 9), type: 'text', data: '', indent: 0 };
      this.save();
      this.render();
      this.focusBlock(0);
      return;
    }

    this.blocks.splice(index, 1);
    this.save();
    this.render();

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
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editable);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
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
