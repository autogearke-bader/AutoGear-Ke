import React, { useEffect, useRef, useState, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { uploadToCloudinary } from '../src/lib/api';
import { articleInline } from '../src/lib/cloudinary';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Handle image insertion with Cloudinary upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Uploading image...');

    try {
      // Upload to Cloudinary with articles folder
      const cloudinaryUrl = await uploadToCloudinary(file, 'articles');
      
      // Get optimized URL for article inline images
      const optimizedUrl = articleInline(cloudinaryUrl);
      
      // Insert image at current cursor position
      const quill = quillRef.current;
      if (quill) {
        const range = quill.getSelection(true);
        
        // Create image wrapper with remove button
        const img = `
          <div class="quill-image-container" style="position: relative; display: block; text-align: center; margin: 8px 0; max-width: 100%;">
            <img src="${optimizedUrl}" alt="Article image" style="max-width: 100%; height: auto; border-radius: 0.5rem; display: block;" />
          </div>
        `;
        
        // Insert at cursor position
        quill.clipboard.dangerouslyPasteHTML(range.index, img);
        
        // Move cursor after the inserted image
        quill.setSelection(range.index + 1);
      }
      
      setUploadProgress('Image inserted!');
      
      // Clear progress message after a short delay
      setTimeout(() => {
        setUploadProgress('');
      }, 1500);
      
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadProgress('Upload failed. Please try again.');
      
      // Clear error message after delay
      setTimeout(() => {
        setUploadProgress('');
      }, 3000);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Open file picker when image button is clicked
  const handleImageButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle file selection from file input
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImageUpload]);

  // Handle click on editor to remove images
  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Check if clicked on remove button
    if (target.classList.contains('quill-image-remove')) {
      const container = target.closest('.quill-image-container');
      if (container && quillRef.current) {
        // Get the container's index in the editor
        const editorContent = quillRef.current.root;
        const allContainers = editorContent.querySelectorAll('.quill-image-container');
        const containerIndex = Array.from(allContainers).indexOf(container as Element);
        
        if (containerIndex >= 0) {
          // Delete the image container
          quillRef.current.deleteText(containerIndex, 1);
          onChange(quillRef.current.root.innerHTML);
        }
      }
    }
  }, [onChange]);

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link'],
            ['image'],
            ['clean']
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

      // Register custom image handler
      (quillRef.current.getModule('toolbar') as { addHandler: (name: string, handler: () => void) => void }).addHandler('image', handleImageButtonClick);
      
      quillRef.current.on('text-change', () => {
        onChange(quillRef.current?.root.innerHTML || '');
      });
    }
  }, [onChange, handleImageButtonClick]);

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
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        title="Select an image to upload"
        aria-label="Select an image to upload"
      />
      
      {/* Upload progress indicator */}
      {isUploading && (
        <div 
          style={{
            padding: '8px 12px',
            marginBottom: '8px',
            borderRadius: '0.5rem',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#3b82f6',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          {uploadProgress}
        </div>
      )}
      
      {/* Error message display */}
      {uploadProgress.includes('failed') && (
        <div 
          style={{
            padding: '8px 12px',
            marginBottom: '8px',
            borderRadius: '0.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '14px'
          }}
        >
          {uploadProgress}
        </div>
      )}
      
      <div 
        ref={editorRef} 
        className="ql-container ql-snow"
        onClick={handleEditorClick}
        style={{ minHeight: '200px', background: '#ffff', borderRadius: '0 0 1rem 1rem' }}
      />
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        /* Image container hover - show remove button */
        .quill-image-container:hover .quill-image-remove {
          opacity: 1 !important;
        }
        .quill-image-remove:hover {
          background: rgba(239, 68, 68, 0.9) !important;
        }
        .ql-snow .ql-picker-label {
          color: #94a3b8;
        }
        .ql-snow .ql-picker-label:hover {
          color: #e2e8f0;
        }
        .ql-toolbar.ql-snow {
          border-radius: 1rem 1rem 0 0;
        }
        .ql-container.ql-snow {
          border-radius: 0 0 1rem 1rem;
        }
        .ql-snow.ql-toolbar button:hover,
        .ql-snow .ql-toolbar button:hover,
        .ql-snow.ql-toolbar button.ql-active,
        .ql-snow .ql-toolbar button.ql-active {
          color: #3b82f6;
        }
        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow .ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke {
          stroke: #3b82f6;
        }
      `}</style>
    </div>
  );
};

export default QuillEditor;
