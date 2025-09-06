import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Save, 
  Maximize2, 
  Minimize2,
  Menu,
  FileText
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface MobileMonacoEditorProps {
  files: CodeFile[];
  activeFileId: string;
  onFileChange: (fileId: string) => void;
  onContentChange: (content: string) => void;
  onRun?: () => void;
  onSave?: () => void;
  language: string;
  readOnly?: boolean;
}

const MobileMonacoEditor: React.FC<MobileMonacoEditorProps> = ({
  files,
  activeFileId,
  onFileChange,
  onContentChange,
  onRun,
  onSave,
  language,
  readOnly = false
}) => {
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKeyboardHelper, setShowKeyboardHelper] = useState(false);
  const editorRef = useRef<any>(null);
  
  const activeFile = files.find(f => f.id === activeFileId);
  
  useEffect(() => {
    // Mobile-specific Monaco options
    if (editorRef.current && isMobile) {
      editorRef.current.updateOptions({
        fontSize: 14,
        lineHeight: 20,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        folding: false,
        lineNumbers: 'off',
        glyphMargin: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        wordWrap: 'on',
        accessibilitySupport: 'off'
      });
    }
  }, [isMobile]);

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    
    if (isMobile) {
      // Add mobile-specific keyboard shortcuts  
      editor.addCommand(2048 | 3, () => { // Ctrl+S
        onSave?.();
      });
      
      editor.addCommand(2048 | 3, () => { // Ctrl+Enter  
        onRun?.();
      });
      
      // Optimize for touch
      editor.onDidFocusEditorText(() => {
        setShowKeyboardHelper(true);
      });
      
      editor.onDidBlurEditorText(() => {
        setShowKeyboardHelper(false);
      });
    }
  };

  const KeyboardHelper = () => (
    <div className="fixed bottom-4 left-4 right-4 bg-card border border-border rounded-lg p-2 shadow-lg z-50">
      <div className="flex gap-2 justify-center">
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.trigger('keyboard', 'type', { text: '(' });
              editor.trigger('keyboard', 'type', { text: ')' });
              editor.setPosition({ lineNumber: editor.getPosition().lineNumber, column: editor.getPosition().column - 1 });
            }
          }}
        >
          ()
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.trigger('keyboard', 'type', { text: '{' });
              editor.trigger('keyboard', 'type', { text: '}' });
              editor.setPosition({ lineNumber: editor.getPosition().lineNumber, column: editor.getPosition().column - 1 });
            }
          }}
        >
          {}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => {
            const editor = editorRef.current;
            if (editor) {
              editor.trigger('keyboard', 'type', { text: '[' });
              editor.trigger('keyboard', 'type', { text: ']' });
              editor.setPosition({ lineNumber: editor.getPosition().lineNumber, column: editor.getPosition().column - 1 });
            }
          }}
        >
          []
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => editorRef.current?.trigger('keyboard', 'type', { text: ';' })}
        >
          ;
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => editorRef.current?.trigger('keyboard', 'type', { text: '"' })}
        >
          "
        </Button>
      </div>
    </div>
  );

  const FileNavigator = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Menu className="h-4 w-4 mr-2" />
          Files
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Project Files</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {files.map((file) => (
            <Button
              key={file.id}
              variant={file.id === activeFileId ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => onFileChange(file.id)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {file.name}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  if (!isMobile) {
    // Return regular Monaco editor for desktop
    return (
      <div className="h-full">
        <Editor
          height="100%"
          language={language}
          value={activeFile?.content || ''}
          onChange={(value) => onContentChange(value || '')}
          onMount={handleEditorMount}
          options={{
            readOnly,
            theme: 'vs-dark',
            fontSize: 14,
            wordWrap: 'on',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full'}`}>
      {/* Mobile toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileNavigator />
          <span className="text-sm font-medium truncate max-w-32">
            {activeFile?.name}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {onSave && (
            <Button variant="ghost" size="sm" onClick={onSave}>
              <Save className="h-4 w-4" />
            </Button>
          )}
          {onRun && (
            <Button variant="ghost" size="sm" onClick={onRun}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Editor container */}
      <div className="h-full">
        <Editor
          height={isFullscreen ? "calc(100vh - 60px)" : "100%"}
          language={language}
          value={activeFile?.content || ''}
          onChange={(value) => onContentChange(value || '')}
          onMount={handleEditorMount}
          options={{
            readOnly,
            theme: 'vs-dark',
            fontSize: 14,
            lineHeight: 20,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            folding: false,
            lineNumbers: 'off',
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            wordWrap: 'on',
            accessibilitySupport: 'off',
            padding: { top: 8, bottom: 8 }
          }}
        />
      </div>

      {/* Mobile keyboard helper */}
      {showKeyboardHelper && <KeyboardHelper />}
      
      {/* File navigation arrows for mobile */}
      {files.length > 1 && (
        <div className="absolute top-14 left-4 right-4 flex justify-between pointer-events-none">
          <Button
            size="sm"
            variant="secondary"
            className="pointer-events-auto"
            onClick={() => {
              const currentIndex = files.findIndex(f => f.id === activeFileId);
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
              onFileChange(files[prevIndex].id);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="pointer-events-auto"
            onClick={() => {
              const currentIndex = files.findIndex(f => f.id === activeFileId);
              const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
              onFileChange(files[nextIndex].id);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MobileMonacoEditor;