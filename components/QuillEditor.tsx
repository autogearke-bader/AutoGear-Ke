import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link"],
            ["clean"]
          ]
        }
      });

      // Strip colors from pasted content
      quillRef.current.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
        delta.ops.forEach((op) => {
          if (op.attributes && op.attributes.color) {
            delete op.attributes.color;
          }
        });
        return delta;
      });

      quillRef.current.on('text-change', () => {
        onChange(quillRef.current?.root.innerHTML || '');
      });
    }
  }, [onChange]);

  // Update content when value changes externally
  useEffect(() => {
    if (quillRef.current && quillRef.current.root.innerHTML !== value) {
      const selection = quillRef.current.getSelection();
      quillRef.current.root.innerHTML = value;
      if (selection) {
        quillRef.current.setSelection(selection);
      }
    }
  }, [value]);

  return (
    <div className={className}>
      <div 
        ref={editorRef} 
        className="ql-container ql-snow"
        style={{ minHeight: '200px', background: '#0f172a', borderRadius: '0 0 1rem 1rem' }}
      />
    </div>
  );
};

export default QuillEditor;
