import type { ReactNode } from 'react';
import React from 'react';

export type BlogText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type BlogNode = {
  type?: string;
  children?: BlogContent;
  url?: string;
  listStyleType?: string;
  indent?: number;
  [key: string]: unknown;
};

export type BlogContent = Array<BlogNode | BlogText>;

export type BlogTocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export const emptyBlogContent: BlogContent = [
  { type: 'p', children: [{ text: '' }] },
];

function isBlogText(node: BlogNode | BlogText): node is BlogText {
  return typeof (node as BlogText).text === 'string';
}

export function parseBlogContent(value?: string | null): BlogContent {
  if (!value) return emptyBlogContent;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : emptyBlogContent;
  } catch {
    return emptyBlogContent;
  }
}

export function stringifyBlogContent(value: unknown): string {
  return JSON.stringify(Array.isArray(value) ? value : emptyBlogContent);
}

export function slugify(input: string) {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function getNodeText(node: BlogNode | BlogText): string {
  if (isBlogText(node)) return node.text;
  return (node.children ?? []).map(getNodeText).join('');
}

export function buildBlogToc(content: BlogContent): BlogTocItem[] {
  const counts = new Map<string, number>();

  return content
    .filter((node): node is BlogNode => !isBlogText(node) && (node.type === 'h2' || node.type === 'h3'))
    .map((node) => {
      const text = getNodeText(node).trim();
      const base = slugify(text) || 'baslik';
      const next = (counts.get(base) ?? 0) + 1;
      counts.set(base, next);

      return {
        id: next === 1 ? base : `${base}-${next}`,
        text,
        level: (node.type === 'h3' ? 3 : 2) as 2 | 3,
      };
    })
    .filter((item) => item.text.length > 0);
}

export function safeBlogHref(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url, 'https://suaritmaservisyazilimi.com.tr');
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function renderTextNode(node: BlogText, key: string): ReactNode {
  let child: ReactNode = node.text;
  if (node.italic) child = <em>{child}</em>;
  if (node.bold) child = <strong>{child}</strong>;
  return <React.Fragment key={key}>{child}</React.Fragment>;
}

function renderChildren(children: BlogContent | undefined, keyPrefix: string): ReactNode {
  return (children ?? []).map((child, index) => renderBlogNode(child, `${keyPrefix}-${index}`));
}

function renderList(items: BlogNode[], key: string, ordered: boolean) {
  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <ListTag key={key} className={ordered ? 'list-decimal space-y-2 pl-6' : 'list-disc space-y-2 pl-6'}>
      {items.map((item, index) => (
        <li key={`${key}-${index}`}>{renderChildren(item.children, `${key}-${index}`)}</li>
      ))}
    </ListTag>
  );
}

function renderBlogNode(node: BlogNode | BlogText, key: string, headingId?: string): ReactNode {
  if (isBlogText(node)) return renderTextNode(node, key);

  switch (node.type) {
    case 'h2':
    case 'h3': {
      const text = getNodeText(node).trim();
      const Tag = node.type;
      const id = headingId || slugify(text) || undefined;
      return (
        <Tag id={id} key={key} className={node.type === 'h2' ? 'scroll-mt-24 text-2xl font-bold text-slate-950' : 'scroll-mt-24 text-xl font-bold text-slate-900'}>
          {renderChildren(node.children, key)}
        </Tag>
      );
    }
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-4 border-cyan-500 bg-cyan-50 px-5 py-4 text-slate-700">
          {renderChildren(node.children, key)}
        </blockquote>
      );
    case 'a': {
      const href = safeBlogHref(node.url);
      return href ? (
        <a key={key} href={href} className="font-semibold text-cyan-700 underline underline-offset-4" target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
          {renderChildren(node.children, key)}
        </a>
      ) : (
        <React.Fragment key={key}>{renderChildren(node.children, key)}</React.Fragment>
      );
    }
    case 'table':
      return (
        <div key={key} className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <tbody>{renderChildren(node.children, key)}</tbody>
          </table>
        </div>
      );
    case 'tr':
      return <tr key={key}>{renderChildren(node.children, key)}</tr>;
    case 'th':
      return <th key={key} className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold">{renderChildren(node.children, key)}</th>;
    case 'td':
      return <td key={key} className="border border-slate-300 px-3 py-2 align-top">{renderChildren(node.children, key)}</td>;
    default:
      return <p key={key} className="leading-8 text-slate-700">{renderChildren(node.children, key)}</p>;
  }
}

export function renderBlogContent(content: BlogContent): ReactNode {
  const rendered: ReactNode[] = [];
  let listBuffer: BlogNode[] = [];
  let ordered = false;
  const headingCounts = new Map<string, number>();

  const flushList = () => {
    if (listBuffer.length === 0) return;
    rendered.push(renderList(listBuffer, `list-${rendered.length}`, ordered));
    listBuffer = [];
  };

  content.forEach((node, index) => {
    const isElement = !isBlogText(node);
    const listStyle = isElement ? node.listStyleType : undefined;
    const isList = listStyle === 'disc' || listStyle === 'decimal';

    if (isElement && isList) {
      const nextOrdered = listStyle === 'decimal';
      if (listBuffer.length > 0 && ordered !== nextOrdered) flushList();
      ordered = nextOrdered;
      listBuffer.push(node);
      return;
    }

    flushList();
    if (!isBlogText(node) && (node.type === 'h2' || node.type === 'h3')) {
      const text = getNodeText(node).trim();
      const base = slugify(text) || 'baslik';
      const next = (headingCounts.get(base) ?? 0) + 1;
      headingCounts.set(base, next);
      rendered.push(renderBlogNode(node, `node-${index}`, next === 1 ? base : `${base}-${next}`));
      return;
    }
    rendered.push(renderBlogNode(node, `node-${index}`));
  });

  flushList();
  return rendered;
}
