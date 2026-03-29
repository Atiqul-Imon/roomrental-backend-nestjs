import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import type { JSONContent } from '@tiptap/core';
import sanitizeHtml from 'sanitize-html';

/** Thrown when TipTap HTML generation or sanitization fails — map to HTTP 400 in the service */
export class BlogContentRenderError extends Error {
  constructor(message = 'Invalid rich text content') {
    super(message);
    this.name = 'BlogContentRenderError';
  }
}

/** CJS require: default `@tiptap/html` bundle throws in Node; server build does not */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateHTML, generateJSON } = require('@tiptap/html/server') as {
  generateHTML: (doc: JSONContent, extensions: unknown[]) => string;
  generateJSON: (html: string, extensions: unknown[]) => JSONContent;
};

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
  }),
  Image.configure({ HTMLAttributes: { loading: 'lazy', decoding: 'async' } }),
];

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    ...(sanitizeHtml.defaults?.allowedTags ?? []),
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'figure',
    'figcaption',
    'hr',
    'span',
    'sup',
    'sub',
  ],
  allowedAttributes: {
    ...(sanitizeHtml.defaults?.allowedAttributes ?? {}),
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'class'],
    a: ['href', 'name', 'target', 'rel', 'class'],
    code: ['class'],
    span: ['class'],
    div: ['class'],
    p: ['class'],
    h2: ['class'],
    h3: ['class'],
    h4: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
};

const ALLOWED_MARKS = new Set(['bold', 'italic', 'strike', 'code', 'link', 'underline']);

function extractPlainTextFromNode(n: JSONContent): string {
  if (!n || typeof n !== 'object') return '';
  if (n.type === 'text') return typeof n.text === 'string' ? n.text : '';
  if (!Array.isArray(n.content)) return '';
  return n.content.map(extractPlainTextFromNode).join('');
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Plain text from a normalized TipTap doc (for fallback when server HTML render fails). */
export function extractPlainTextFromDoc(doc: JSONContent): string {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) return '';
  return doc.content.map((block) => extractPlainTextFromNode(block)).join('\n\n');
}

function sanitizeTextNode(n: JSONContent): JSONContent {
  const text = typeof n.text === 'string' ? n.text : '';
  const marks = (n.marks || [])
    .filter((m) => m && typeof m === 'object' && ALLOWED_MARKS.has(String((m as { type?: string }).type)))
    .map((m) => {
      const t = (m as { type: string; attrs?: Record<string, unknown> }).type;
      if (t === 'link') {
        const hrefRaw = (m as { attrs?: { href?: string } }).attrs?.href;
        const href = typeof hrefRaw === 'string' && hrefRaw.trim() ? hrefRaw.trim() : 'https://';
        return {
          type: 'link',
          attrs: { href, target: '_blank', rel: 'noopener noreferrer nofollow' },
        };
      }
      return { type: t };
    });
  return marks.length ? { type: 'text', text, marks } : { type: 'text', text };
}

function sanitizeInlineContent(content: JSONContent[] | undefined): JSONContent[] {
  if (!content?.length) return [];
  const out: JSONContent[] = [];
  for (const c of content) {
    if (!c || typeof c !== 'object') continue;
    if (c.type === 'text') {
      out.push(sanitizeTextNode(c));
      continue;
    }
    if (c.type === 'hardBreak') {
      out.push({ type: 'hardBreak' });
      continue;
    }
    const t = extractPlainTextFromNode(c);
    if (t) out.push(sanitizeTextNode({ type: 'text', text: t }));
  }
  return out;
}

function sanitizeBlockContent(content: JSONContent[] | undefined): JSONContent[] {
  if (!content?.length) return [{ type: 'paragraph', content: [] }];
  const out: JSONContent[] = [];
  for (const c of content) {
    const s = sanitizeBlockNode(c);
    if (s) out.push(s);
  }
  return out.length ? out : [{ type: 'paragraph', content: [] }];
}

function unknownBlockToParagraph(n: JSONContent): JSONContent {
  const text = extractPlainTextFromNode(n);
  return {
    type: 'paragraph',
    content: text ? [sanitizeTextNode({ type: 'text', text })] : [],
  };
}

function sanitizeBlockNode(n: JSONContent): JSONContent {
  if (!n || typeof n !== 'object' || !n.type) {
    return { type: 'paragraph', content: [] };
  }
  switch (n.type) {
    case 'paragraph':
      return { type: 'paragraph', content: sanitizeInlineContent(n.content) };
    case 'heading': {
      let level = typeof n.attrs?.level === 'number' ? n.attrs.level : 2;
      if (level < 2 || level > 4) level = 2;
      return { type: 'heading', attrs: { level }, content: sanitizeInlineContent(n.content) };
    }
    case 'bulletList': {
      const items = (n.content || [])
        .map((li) => sanitizeBlockNode(li))
        .filter((x) => x.type === 'listItem');
      if (!items.length) return unknownBlockToParagraph(n);
      return { type: 'bulletList', content: items };
    }
    case 'orderedList': {
      const items = (n.content || [])
        .map((li) => sanitizeBlockNode(li))
        .filter((x) => x.type === 'listItem');
      if (!items.length) return unknownBlockToParagraph(n);
      const attrs =
        typeof n.attrs?.start === 'number' && n.attrs.start > 1
          ? { start: n.attrs.start }
          : undefined;
      return attrs ? { type: 'orderedList', attrs, content: items } : { type: 'orderedList', content: items };
    }
    case 'listItem':
      return { type: 'listItem', content: sanitizeBlockContent(n.content) };
    case 'blockquote':
      return { type: 'blockquote', content: sanitizeBlockContent(n.content) };
    case 'codeBlock': {
      const lang = n.attrs && typeof (n.attrs as { language?: string }).language === 'string'
        ? (n.attrs as { language: string }).language
        : undefined;
      return {
        type: 'codeBlock',
        ...(lang ? { attrs: { language: lang } } : {}),
        content: sanitizeInlineContent(n.content),
      };
    }
    case 'horizontalRule':
      return { type: 'horizontalRule' };
    case 'image':
      return {
        type: 'image',
        attrs: {
          src: typeof n.attrs?.src === 'string' ? n.attrs.src : '',
          alt: typeof n.attrs?.alt === 'string' ? n.attrs.alt : undefined,
        },
      };
    default:
      return unknownBlockToParagraph(n);
  }
}

function sanitizeDocRoot(input: JSONContent): JSONContent {
  if (input.type !== 'doc') return defaultTiptapDoc();
  return { type: 'doc', content: sanitizeBlockContent(input.content) };
}

export function defaultTiptapDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/**
 * Normalizes client TipTap JSON for server rendering + Prisma storage.
 * Strips unknown node types (paste/extensions) that cause ProseMirror "Unknown node type" crashes.
 */
export function normalizeContentJson(input: unknown): JSONContent {
  if (!input || typeof input !== 'object') return defaultTiptapDoc();
  const obj = input as JSONContent;
  if (obj.type !== 'doc') return defaultTiptapDoc();
  try {
    return sanitizeDocRoot(obj);
  } catch {
    return defaultTiptapDoc();
  }
}

export function jsonToSanitizedHtml(doc: JSONContent): string {
  let raw: string;
  try {
    raw = generateHTML(doc, extensions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new BlogContentRenderError(
      /Unknown node type|Invalid|Schema/i.test(msg) ? 'Unsupported content was removed or simplified' : 'Invalid rich text content',
    );
  }
  try {
    return sanitizeHtml(raw, SANITIZE);
  } catch {
    throw new BlogContentRenderError('Content could not be sanitized');
  }
}

/**
 * Prefer TipTap server HTML; if anything throws (including non-Error throws from the DOM stack),
 * fall back to escaped plain text paragraphs so Prisma create/update never fails on render alone.
 */
export function renderBlogHtmlWithFallback(doc: JSONContent): {
  html: string;
  readingTimeMinutes: number;
  usedFallback: boolean;
} {
  try {
    const html = jsonToSanitizedHtml(doc);
    return {
      html,
      readingTimeMinutes: estimateReadingMinutesFromHtml(html),
      usedFallback: false,
    };
  } catch {
    const plain = extractPlainTextFromDoc(doc).trim();
    let rawHtml: string;
    if (!plain) {
      rawHtml = '<p></p>';
    } else {
      rawHtml = plain
        .split(/\n\n+/)
        .map((block) => `<p>${escapeHtmlText(block).replace(/\n/g, ' ')}</p>`)
        .join('');
    }
    try {
      const html = sanitizeHtml(rawHtml, SANITIZE);
      return {
        html,
        readingTimeMinutes: estimateReadingMinutesFromHtml(html),
        usedFallback: true,
      };
    } catch {
      return {
        html: '<p></p>',
        readingTimeMinutes: 1,
        usedFallback: true,
      };
    }
  }
}

export function htmlToJson(html: string): JSONContent {
  const trimmed = (html || '').trim();
  if (!trimmed) return defaultTiptapDoc();
  try {
    return generateJSON(trimmed, extensions) as JSONContent;
  } catch {
    return defaultTiptapDoc();
  }
}

export function estimateReadingMinutesFromHtml(html: string): number {
  let text = '';
  try {
    text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  } catch {
    return 1;
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
