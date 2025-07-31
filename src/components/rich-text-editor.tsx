
'use client'

import * as React from 'react';
import ReactQuill from 'react-quill';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
    ['link'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link'
];

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  return (
    <div className={cn("bg-background rounded-md border border-input", className)}>
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        className="[&_.ql-container]:border-0 [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0"
      />
    </div>
  );
}
