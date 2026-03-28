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

export function defaultTiptapDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

export function normalizeContentJson(input: unknown): JSONContent {
  if (!input || typeof input !== 'object') return defaultTiptapDoc();
  const obj = input as JSONContent;
  if (obj.type !== 'doc') return defaultTiptapDoc();
  return obj;
}

export function jsonToSanitizedHtml(doc: JSONContent): string {
  let raw: string;
  try {
    raw = generateHTML(doc, extensions);
  } catch {
    throw new BlogContentRenderError();
  }
  try {
    return sanitizeHtml(raw, SANITIZE);
  } catch {
    throw new BlogContentRenderError('Content could not be sanitized');
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
