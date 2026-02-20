import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'hr', 'pre', 'code'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'style', 'class', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
  });
};
