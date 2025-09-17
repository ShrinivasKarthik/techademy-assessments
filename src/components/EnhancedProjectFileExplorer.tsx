import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3,
  ChevronRight,
  ChevronDown,
  Code,
  Settings,
  Move,
  Copy,
  FileIcon,
  FolderPlus,
  FilePlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Editor from '@monaco-editor/react';

interface ProjectFile {
  id: string;
  fileName: string;
  filePath: string;
  fileContent: string;
  fileLanguage: string;
  isFolder: boolean;
  isMainFile: boolean;
  orderIndex: number;
  parentFolderId?: string;
}

interface EnhancedProjectFileExplorerProps {
  questionId: string;
  technology: string;
  onFilesChange?: (files: ProjectFile[]) => void;
}

const EnhancedProjectFileExplorer: React.FC<EnhancedProjectFileExplorerProps> = ({
  questionId,
  technology,
  onFilesChange
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<ProjectFile | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [questionId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('question_id', questionId)
        .order('order_index');

      if (error) throw error;

      const projectFiles = data.map(file => ({
        id: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileContent: file.file_content,
        fileLanguage: file.file_language,
        isFolder: file.is_folder,
        isMainFile: file.is_main_file,
        orderIndex: file.order_index,
        parentFolderId: file.parent_folder_id
      }));

      setFiles(projectFiles);
      onFilesChange?.(projectFiles);

      // Auto-expand root folders and folders with main files
      const foldersToExpand = new Set<string>();
      projectFiles.forEach(file => {
        if (file.isFolder && !file.parentFolderId) {
          foldersToExpand.add(file.id);
        }
        if (file.isMainFile && file.parentFolderId) {
          foldersToExpand.add(file.parentFolderId);
        }
      });
      setExpandedFolders(foldersToExpand);

    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Failed to load files",
        description: "Could not load project files",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const detectLanguageFromExtension = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'plaintext',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'kt': 'kotlin',
      'swift': 'swift'
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const generateFilePath = (fileName: string, parentFolderId?: string): string => {
    if (!parentFolderId) return fileName;
    
    const parentFolder = files.find(f => f.id === parentFolderId);
    if (!parentFolder) return fileName;
    
    return `${parentFolder.filePath}/${fileName}`;
  };

  const createFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "File name required",
        description: "Please enter a file name",
        variant: "destructive"
      });
      return;
    }

    const fileName = newFileName.trim();
    const language = detectLanguageFromExtension(fileName);
    const filePath = generateFilePath(fileName, selectedFolderId);
    
    try {
      const { data, error } = await supabase
        .from('project_files')
        .insert({
          question_id: questionId,
          file_name: fileName,
          file_path: filePath,
          file_content: '',
          file_language: language,
          is_folder: false,
          is_main_file: false,
          order_index: files.length,
          parent_folder_id: selectedFolderId
        })
        .select()
        .single();

      if (error) throw error;

      const newFile: ProjectFile = {
        id: data.id,
        fileName: data.file_name,
        filePath: data.file_path,
        fileContent: data.file_content,
        fileLanguage: data.file_language,
        isFolder: data.is_folder,
        isMainFile: data.is_main_file,
        orderIndex: data.order_index,
        parentFolderId: data.parent_folder_id
      };

      setFiles([...files, newFile]);
      setNewFileName('');
      setSelectedFolderId(null);
      setShowNewFileDialog(false);
      
      toast({
        title: "File created",
        description: `Created ${fileName}`,
      });

    } catch (error) {
      console.error('Error creating file:', error);
      toast({
        title: "Failed to create file",
        description: "Could not create the file",
        variant: "destructive"
      });
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Folder name required",
        description: "Please enter a folder name",
        variant: "destructive"
      });
      return;
    }

    const folderName = newFolderName.trim();
    const filePath = generateFilePath(folderName, selectedFolderId);

    try {
      const { data, error } = await supabase
        .from('project_files')
        .insert({
          question_id: questionId,
          file_name: folderName,
          file_path: filePath,
          file_content: '',
          file_language: '',
          is_folder: true,
          is_main_file: false,
          order_index: files.length,
          parent_folder_id: selectedFolderId
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: ProjectFile = {
        id: data.id,
        fileName: data.file_name,
        filePath: data.file_path,
        fileContent: data.file_content,
        fileLanguage: data.file_language,
        isFolder: data.is_folder,
        isMainFile: data.is_main_file,
        orderIndex: data.order_index,
        parentFolderId: data.parent_folder_id
      };

      setFiles([...files, newFolder]);
      setNewFolderName('');
      setSelectedFolderId(null);
      setShowNewFolderDialog(false);
      
      // Auto-expand the new folder
      setExpandedFolders(prev => new Set([...prev, newFolder.id]));
      
      toast({
        title: "Folder created",
        description: `Created ${folderName}`,
      });

    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Failed to create folder",
        description: "Could not create the folder",
        variant: "destructive"
      });
    }
  };

  const updateFileContent = useCallback(async (fileId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ file_content: content })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, fileContent: content } : f
      ));

      if (selectedFile?.id === fileId) {
        setSelectedFile(prev => prev ? { ...prev, fileContent: content } : null);
      }

    } catch (error) {
      console.error('Error updating file:', error);
      toast({
        title: "Failed to save file",
        description: "Could not save file content",
        variant: "destructive"
      });
    }
  }, [selectedFile, toast]);

  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }

      toast({
        title: "File deleted",
        description: "File has been removed",
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Failed to delete file",
        description: "Could not delete the file",
        variant: "destructive"
      });
    }
  };

  const moveFile = async (fileId: string, newParentId?: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      const newFilePath = generateFilePath(file.fileName, newParentId);

      const { error } = await supabase
        .from('project_files')
        .update({ 
          parent_folder_id: newParentId,
          file_path: newFilePath
        })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, parentFolderId: newParentId, filePath: newFilePath }
          : f
      ));

      toast({
        title: "File moved",
        description: `Moved ${file.fileName}`,
      });

    } catch (error) {
      console.error('Error moving file:', error);
      toast({
        title: "Failed to move file",
        description: "Could not move the file",
        variant: "destructive"
      });
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return newExpanded;
    });
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.isFolder) {
      return expandedFolders.has(file.id) ? 
        <FolderOpen className="w-4 h-4 text-blue-500" /> : 
        <Folder className="w-4 h-4 text-blue-500" />;
    }
    
    // File type specific icons
    const extension = file.fileName.split('.').pop()?.toLowerCase();
    const iconColor = file.isMainFile ? 'text-yellow-500' : 'text-gray-500';
    
    return <FileIcon className={`w-4 h-4 ${iconColor}`} />;
  };

  const handleDragStart = (e: React.DragEvent, file: ProjectFile) => {
    setDraggedItem(file);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFolder?: ProjectFile) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newParentId = targetFolder?.isFolder ? targetFolder.id : undefined;
    if (draggedItem.parentFolderId !== newParentId) {
      moveFile(draggedItem.id, newParentId);
    }
    setDraggedItem(null);
  };

  const renderFileTree = (parentId?: string, level = 0): React.ReactNode => {
    const items = files
      .filter(f => f.parentFolderId === parentId)
      .sort((a, b) => {
        // Folders first, then files, then by name
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.fileName.localeCompare(b.fileName);
      });

    return items.map(file => (
      <div key={file.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div 
              className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent transition-colors ${
                selectedFile?.id === file.id ? 'bg-accent' : ''
              } ${draggedItem?.id === file.id ? 'opacity-50' : ''}`}
              style={{ marginLeft: `${level * 16}px` }}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              onDragOver={file.isFolder ? handleDragOver : undefined}
              onDrop={file.isFolder ? (e) => handleDrop(e, file) : undefined}
              onClick={() => {
                if (file.isFolder) {
                  toggleFolder(file.id);
                } else {
                  setSelectedFile(file);
                }
              }}
            >
              {file.isFolder && (
                <div className="w-4 flex justify-center">
                  {expandedFolders.has(file.id) ? 
                    <ChevronDown className="w-3 h-3" /> : 
                    <ChevronRight className="w-3 h-3" />
                  }
                </div>
              )}
              {getFileIcon(file)}
              <span className="flex-1 text-sm truncate">{file.fileName}</span>
              {file.isMainFile && <Badge variant="secondary" className="text-xs">Main</Badge>}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => deleteFile(file.id)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
            {file.isFolder && (
              <>
                <ContextMenuItem onClick={() => {
                  setSelectedFolderId(file.id);
                  setShowNewFileDialog(true);
                }}>
                  <FilePlus className="w-4 h-4 mr-2" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  setSelectedFolderId(file.id);
                  setShowNewFolderDialog(true);
                }}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
        
        {file.isFolder && expandedFolders.has(file.id) && renderFileTree(file.id, level + 1)}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Enhanced File Explorer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Project Explorer
              <Badge variant="outline" className="text-xs">{technology}</Badge>
            </CardTitle>
            <div className="flex gap-1">
              <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FolderPlus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="folderName">Folder Name</Label>
                      <Input
                        id="folderName"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name"
                        onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createFolder}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FilePlus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New File</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fileName">File Name (with extension)</Label>
                      <Input
                        id="fileName"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="e.g., main.js, styles.css, README.md"
                        onKeyDown={(e) => e.key === 'Enter' && createFile()}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Language will be detected from file extension
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createFile}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            className="space-y-1 min-h-96"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
          >
            {files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No files yet</p>
                <p className="text-sm">Create your first file or folder to get started</p>
              </div>
            ) : (
              renderFileTree()
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced File Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            {selectedFile ? (
              <>
                <span className="truncate">{selectedFile.fileName}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedFile.fileLanguage}
                </Badge>
              </>
            ) : (
              'Select a file to edit'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFile ? (
            <div className="h-96 border rounded-md overflow-hidden">
              <Editor
                height="100%"
                language={selectedFile.fileLanguage}
                value={selectedFile.fileContent}
                onChange={(value) => updateFileContent(selectedFile.id, value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  tabSize: 2,
                  insertSpaces: true
                }}
              />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground border rounded-md bg-muted/10">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No file selected</p>
                <p className="text-sm">Click on a file in the explorer to start editing</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedProjectFileExplorer;