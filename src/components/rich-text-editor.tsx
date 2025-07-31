
'use client'

import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

// Dynamically import ReactQuill to ensure it's only loaded on the client side
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  // This state ensures the component only renders on the client, preventing SSR issues.
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className={cn("bg-background rounded-md border border-input", className)}>
      {isClient ? (
        <ReactQuill 
          theme="snow" 
          value={value} 
          onChange={onChange}
          className="[&_.ql-container]:min-h-[200px] [&_.ql-container]:border-0 [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input"
        />
      ) : (
        <div className="min-h-[260px] p-3">Loading Editor...</div>
      )}
    </div>
  );
}
