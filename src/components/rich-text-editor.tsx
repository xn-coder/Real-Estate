
'use client'

import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  return (
    <div className={cn("bg-background rounded-md border border-input", className)}>
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange}
        className="[&_.ql-container]:min-h-[200px] [&_.ql-container]:border-0 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input"
      />
    </div>
  );
}
