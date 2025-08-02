
'use client';

import React, { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface RichTextEditorProps {
    initialData: string;
    onChange: (data: string) => void;
}

const RichTextEditor = ({ initialData, onChange }: RichTextEditorProps) => {
    const editorRef = useRef<any>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.data.get() !== initialData) {
            editorRef.current.data.set(initialData);
        }
    }, [initialData]);

    return (
        <div className="prose prose-sm max-w-none h-full [&>.ck-editor]:h-full [&>.ck-editor>.ck-editor__main>.ck-editor__editable]:min-h-[200px] [&>.ck-editor_.ck-editor__main_.ck-content]:border-input [&>.ck-editor_.ck-toolbar]:border-input">
            <CKEditor
                editor={ClassicEditor}
                data={initialData}
                onReady={editor => {
                    editorRef.current = editor;
                }}
                onChange={(event, editor) => {
                    const data = editor.getData();
                    onChange(data);
                }}
                config={{
                    toolbar: [
                        'heading',
                        '|',
                        'bold',
                        'italic',
                        'link',
                        'bulletedList',
                        'numberedList',
                        '|',
                        'outdent',
                        'indent',
                        '|',
                        'blockQuote',
                        'insertTable',
                        'undo',
                        'redo'
                    ]
                }}
            />
        </div>
    );
};

export default RichTextEditor;
