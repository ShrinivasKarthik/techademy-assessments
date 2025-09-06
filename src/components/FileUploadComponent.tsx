import React, { useCallback, useState } from 'react';
import { Upload, X, File, Image, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';

interface FileUploadComponentProps {
  onFileUploaded?: (file: UploadedFile) => void;
  assessmentId?: string;
  questionId?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  publicUrl?: string;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  onFileUploaded,
  assessmentId,
  questionId,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', 'video/*'],
  className
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const { uploadFile, deleteFile, uploading, uploadProgress } = useFileUpload({
    bucket: 'assessment-files',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: acceptedTypes
  });

  const handleFile = useCallback(async (file: File) => {
    if (files.length >= maxFiles) {
      return;
    }

    const uploadedFile = await uploadFile(file, assessmentId, questionId);
    if (uploadedFile) {
      setFiles(prev => [...prev, uploadedFile]);
      onFileUploaded?.(uploadedFile);
    }
  }, [uploadFile, files.length, maxFiles, assessmentId, questionId, onFileUploaded]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(handleFile);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(handleFile);
    e.target.value = ''; // Reset input
  }, [handleFile]);

  const removeFile = useCallback(async (fileId: string) => {
    const success = await deleteFile(fileId);
    if (success) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  }, [deleteFile]);

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (contentType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (contentType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Upload className={cn("h-8 w-8 mb-4", dragActive ? "text-primary" : "text-muted-foreground")} />
          <p className="text-sm text-muted-foreground text-center">
            {dragActive ? (
              "Drop files here"
            ) : (
              <>
                <span className="font-medium text-primary">Click to upload</span> or drag and drop
                <br />
                {acceptedTypes.join(', ')} (max {formatFileSize(10 * 1024 * 1024)})
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {files.length}/{maxFiles} files uploaded
          </p>
        </CardContent>
      </Card>

      <input
        id="file-upload"
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
        disabled={uploading || files.length >= maxFiles}
      />

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files</h4>
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.contentType)}
                  <div>
                    <p className="text-sm font-medium">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;