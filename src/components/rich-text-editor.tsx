
'use client'

import * as React from 'react';
import { Bold, Italic, Underline, Strikethrough, Highlighter, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    onChange(event.currentTarget.innerHTML);
  };
  
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };
  
  const commands = [
    { command: 'bold', icon: Bold },
    { command: 'italic', icon: Italic },
    { command: 'underline', icon: Underline },
    { command: 'strikeThrough', icon: Strikethrough },
    { command: 'insertUnorderedList', icon: List },
    { command: 'insertOrderedList', icon: ListOrdered },
  ];

  return (
    <div className="rounded-md border border-input">
      <div className="p-2 border-b">
        <div className="flex flex-wrap items-center gap-1">
          {commands.map(({ command, icon: Icon }) => (
            <Button
              key={command}
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand(command);
              }}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
           <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
               onMouseDown={(e) => {
                e.preventDefault();
                execCommand('hiliteColor', 'yellow');
              }}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={cn(
            "min-h-[200px] w-full rounded-b-md bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !value && 'text-muted-foreground'
        )}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            ...( !value && {
              '--placeholder-text': `'${placeholder}'`
            } as React.CSSProperties),
        }}
      />
       <style jsx>{`
        [contentEditable][data-placeholder]:empty:before {
          content: var(--placeholder-text);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
