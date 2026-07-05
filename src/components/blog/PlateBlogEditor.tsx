'use client';

import { useMemo } from 'react';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Quote,
  Redo2,
  Table,
  Trash2,
  Undo2,
} from 'lucide-react';
import { BlockquotePlugin, BoldPlugin, H2Plugin, H3Plugin, ItalicPlugin } from '@platejs/basic-nodes/react';
import { IndentPlugin } from '@platejs/indent/react';
import { BulletedListRules, OrderedListRules, toggleList } from '@platejs/list';
import { ListPlugin } from '@platejs/list/react';
import { LinkPlugin } from '@platejs/link/react';
import { TableCellHeaderPlugin, TableCellPlugin, TablePlugin, TableRowPlugin } from '@platejs/table/react';
import { KEYS, type Value } from 'platejs';
import { ParagraphPlugin, Plate, PlateContent, PlateElement, PlateLeaf, usePlateEditor } from 'platejs/react';
import type { BlogContent } from '@/lib/blog';
import { emptyBlogContent } from '@/lib/blog';
import { cn } from '@/lib/utils';

type PlateBlogEditorProps = {
  value: BlogContent;
  onChange: (value: BlogContent) => void;
};

function Element(props: any) {
  const type = props.element?.type;
  const listStyleType = props.element?.listStyleType;

  if (type === 'h2') {
    return <PlateElement {...props} as="h2" className="my-4 text-2xl font-bold text-slate-950" />;
  }
  if (type === 'h3') {
    return <PlateElement {...props} as="h3" className="my-3 text-xl font-bold text-slate-900" />;
  }
  if (type === 'blockquote') {
    return <PlateElement {...props} as="blockquote" className="my-4 border-l-4 border-cyan-500 bg-cyan-50 px-4 py-3 text-slate-700" />;
  }
  if (type === 'table') {
    return (
      <div className="my-4 overflow-x-auto">
        <PlateElement {...props} as="table" className="w-full min-w-[520px] border-collapse text-sm" />
      </div>
    );
  }
  if (type === 'tr') return <PlateElement {...props} as="tr" />;
  if (type === 'th') return <PlateElement {...props} as="th" className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold" />;
  if (type === 'td') return <PlateElement {...props} as="td" className="border border-slate-300 px-3 py-2 align-top" />;
  if (type === 'a') {
    return <PlateElement {...props} as="a" className="font-semibold text-cyan-700 underline underline-offset-4" href={props.element?.url} />;
  }

  if (listStyleType) {
    return <PlateElement {...props} as="div" className="my-3 leading-7 text-slate-700" />;
  }

  return <PlateElement {...props} as="p" className="my-3 leading-7 text-slate-700" />;
}

function Leaf(props: any) {
  let children = props.children;
  if (props.leaf?.italic) children = <em>{children}</em>;
  if (props.leaf?.bold) children = <strong>{children}</strong>;
  return <PlateLeaf {...props}>{children}</PlateLeaf>;
}

function ToolbarButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      title={label}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
    >
      {children}
    </button>
  );
}

export default function PlateBlogEditor({ value, onChange }: PlateBlogEditorProps) {
  const initialValue = useMemo<Value>(() => (value.length ? value : emptyBlogContent) as Value, [value]);
  const editor = usePlateEditor({
    plugins: [
      ParagraphPlugin.withComponent(Element),
      H2Plugin.withComponent(Element),
      H3Plugin.withComponent(Element),
      BlockquotePlugin.withComponent(Element),
      BoldPlugin,
      ItalicPlugin,
      LinkPlugin.withComponent(Element),
      IndentPlugin.configure({
        inject: { targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote] },
      }),
      ListPlugin.configure({
        inputRules: [
          BulletedListRules.markdown({ variant: '-' }),
          BulletedListRules.markdown({ variant: '*' }),
          OrderedListRules.markdown({ variant: '.' }),
          OrderedListRules.markdown({ variant: ')' }),
        ],
        inject: { targetPlugins: [...KEYS.heading, KEYS.p, KEYS.blockquote] },
      }),
      TablePlugin.configure({
        node: { component: Element },
        options: { initialTableWidth: 680, minColumnWidth: 80 },
      }),
      TableRowPlugin.withComponent(Element),
      TableCellPlugin.withComponent(Element),
      TableCellHeaderPlugin.withComponent(Element),
    ],
    value: initialValue,
  });

  const editorAny = editor as any;

  function addLink() {
    const url = window.prompt('Bağlantı adresi');
    if (!url) return;
    editorAny.tf.insertNodes({ type: 'a', url, children: [{ text: url }] });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <ToolbarButton label="Kalın" onClick={() => editorAny.tf.bold.toggle()}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="İtalik" onClick={() => editorAny.tf.italic.toggle()}><Italic className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <ToolbarButton label="H2 başlık" onClick={() => editorAny.tf.h2.toggle()}><Heading2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="H3 başlık" onClick={() => editorAny.tf.h3.toggle()}><Heading3 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Alıntı" onClick={() => editorAny.tf.blockquote.toggle()}><Quote className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <ToolbarButton label="Madde listesi" onClick={() => toggleList(editorAny, { listStyleType: 'disc' })}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Numaralı liste" onClick={() => toggleList(editorAny, { listStyleType: 'decimal' })}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Link ekle" onClick={addLink}><Link2 className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <ToolbarButton label="Tablo ekle" onClick={() => editorAny.tf.insert.table({ rowCount: 3, colCount: 3, header: true })}><Table className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Satır ekle" onClick={() => editorAny.tf.insert.tableRow()}><Plus className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="Sütun ekle" onClick={() => editorAny.tf.insert.tableColumn()}><Plus className="h-4 w-4 rotate-90" /></ToolbarButton>
        <ToolbarButton label="Tabloyu sil" onClick={() => editorAny.tf.remove.table()}><Trash2 className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <ToolbarButton label="Geri al" onClick={() => editorAny.tf.undo()}><Undo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton label="İleri al" onClick={() => editorAny.tf.redo()}><Redo2 className="h-4 w-4" /></ToolbarButton>
      </div>

      <Plate
        editor={editor}
        renderLeaf={Leaf}
        onChange={({ value: nextValue }) => onChange(nextValue as BlogContent)}
      >
        <PlateContent
          className={cn(
            'min-h-[360px] max-h-[62vh] overflow-y-auto px-5 py-4 text-base outline-none sm:max-h-[680px]',
            '[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
          )}
          placeholder="Blog içeriğini yazın..."
        />
      </Plate>
    </div>
  );
}
