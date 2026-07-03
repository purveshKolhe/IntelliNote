// IntelliNote Security Helpers
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const cleanNode = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      // Block executable, remote metadata, and form tags
      if (['script', 'iframe', 'object', 'embed', 'link', 'style', 'meta', 'form', 'button', 'input', 'select', 'textarea', 'option'].includes(tagName)) {
        node.remove();
        return;
      }
      
      const attrs = Array.from(node.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        const val = attr.value.toLowerCase().trim();
        
        // Remove style attribute to prevent fixed-position phishing overlays
        if (name === 'style') {
          node.removeAttribute(attr.name);
        }
        // Remove formaction
        else if (name === 'formaction') {
          node.removeAttribute(attr.name);
        }
        // Remove on* event handlers
        else if (name.startsWith('on')) {
          node.removeAttribute(attr.name);
        } 
        // Remove protocol handler bypasses
        else if (['href', 'src', 'action'].includes(name) && 
                   (val.includes('javascript:') || val.includes('vbscript:') || val.startsWith('data:text/html'))) {
          node.removeAttribute(attr.name);
        }
      }
    }
    
    const children = Array.from(node.childNodes);
    for (let i = children.length - 1; i >= 0; i--) {
      cleanNode(children[i]);
    }
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
}
