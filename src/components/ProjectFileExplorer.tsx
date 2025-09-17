import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Download,
  Upload
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

interface ProjectFileExplorerProps {
  questionId: string;
  technology: string;
  onFilesChange?: (files: ProjectFile[]) => void;
}

const ProjectFileExplorer: React.FC<ProjectFileExplorerProps> = ({
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
  const [newFileLanguage, setNewFileLanguage] = useState('javascript');
  const [newFolderName, setNewFolderName] = useState('');

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript', extension: 'js' },
    { value: 'typescript', label: 'TypeScript', extension: 'ts' },
    { value: 'python', label: 'Python', extension: 'py' },
    { value: 'java', label: 'Java', extension: 'java' },
    { value: 'cpp', label: 'C++', extension: 'cpp' },
    { value: 'csharp', label: 'C#', extension: 'cs' },
    { value: 'html', label: 'HTML', extension: 'html' },
    { value: 'css', label: 'CSS', extension: 'css' },
    { value: 'json', label: 'JSON', extension: 'json' },
    { value: 'markdown', label: 'Markdown', extension: 'md' },
    { value: 'yaml', label: 'YAML', extension: 'yml' },
    { value: 'xml', label: 'XML', extension: 'xml' }
  ];

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

      // Auto-expand root folders
      const rootFolders = projectFiles
        .filter(f => f.isFolder && !f.parentFolderId)
        .map(f => f.id);
      setExpandedFolders(new Set(rootFolders));

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

  const createFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "File name required",
        description: "Please enter a file name",
        variant: "destructive"
      });
      return;
    }

    const extension = languageOptions.find(l => l.value === newFileLanguage)?.extension || 'txt';
    const fileName = newFileName.includes('.') ? newFileName : `${newFileName}.${extension}`;
    
    try {
      const { data, error } = await supabase
        .from('project_files')
        .insert({
          question_id: questionId,
          file_name: fileName,
          file_path: fileName,
          file_content: '',
          file_language: newFileLanguage,
          is_folder: false,
          is_main_file: false,
          order_index: files.length
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
        orderIndex: data.order_index
      };

      setFiles([...files, newFile]);
      setNewFileName('');
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

    try {
      const { data, error } = await supabase
        .from('project_files')
        .insert({
          question_id: questionId,
          file_name: newFolderName,
          file_path: newFolderName,
          file_content: '',
          file_language: '',
          is_folder: true,
          is_main_file: false,
          order_index: files.length
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
        orderIndex: data.order_index
      };

      setFiles([...files, newFolder]);
      setNewFolderName('');
      setShowNewFolderDialog(false);
      
      toast({
        title: "Folder created",
        description: `Created ${newFolderName}`,
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

  const updateFileContent = async (fileId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ file_content: content })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(files.map(f => 
        f.id === fileId ? { ...f, fileContent: content } : f
      ));

      if (selectedFile?.id === fileId) {
        setSelectedFile({ ...selectedFile, fileContent: content });
      }

    } catch (error) {
      console.error('Error updating file:', error);
      toast({
        title: "Failed to save file",
        description: "Could not save file content",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setFiles(files.filter(f => f.id !== fileId));
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

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.isFolder) {
      return expandedFolders.has(file.id) ? 
        <FolderOpen className="w-4 h-4 text-blue-500" /> : 
        <Folder className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const renderFileTree = (parentId?: string, level = 0) => {
    const items = files
      .filter(f => f.parentFolderId === parentId)
      .sort((a, b) => {
        // Folders first, then files
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.orderIndex - b.orderIndex;
      });

    return items.map(file => (
      <div key={file.id} style={{ marginLeft: `${level * 20}px` }}>
        <div 
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent ${
            selectedFile?.id === file.id ? 'bg-accent' : ''
          }`}
          onClick={() => {
            if (file.isFolder) {
              toggleFolder(file.id);
            } else {
              setSelectedFile(file);
            }
          }}
        >
          {file.isFolder && (
            expandedFolders.has(file.id) ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
          )}
          {getFileIcon(file)}
          <span className="flex-1 text-sm">{file.fileName}</span>
          {file.isMainFile && <Badge variant="secondary" className="text-xs">Main</Badge>}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              deleteFile(file.id);
            }}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
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
      {/* File Explorer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Project Files
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Folder
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
                    <Plus className="w-4 h-4 mr-1" />
                    File
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New File</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fileName">File Name</Label>
                      <Input
                        id="fileName"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="Enter file name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fileLanguage">Language</Label>
                      <Select value={newFileLanguage} onValueChange={setNewFileLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languageOptions.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
          <div className="space-y-1">
            {files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No files yet. Create your first file or folder.</p>
              </div>
            ) : (
              renderFileTree()
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            {selectedFile ? selectedFile.fileName : 'Select a file'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFile ? (
            <div className="h-96">
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
                  readOnly: false
                }}
              />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a file to edit</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectFileExplorer;