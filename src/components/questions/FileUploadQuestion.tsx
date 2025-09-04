import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, Download, AlertCircle } from 'lucide-react';

interface FileUploadQuestionProps {
  question: {
    id: string;
    title: string;
    question_text: string;
    config: {
      allowedTypes?: string[];
      maxSizeBytes?: number;
      maxFiles?: number;
      instructions?: string;
    };
  };
  answer?: {
    files: Array<{
      name: string;
      size: number;
      type: string;
      url?: string;
      uploadedAt: string;
    }>;
  };
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
}

const FileUploadQuestion: React.FC<FileUploadQuestionProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const files = answer?.files || [];
  const maxFiles = question.config.maxFiles || 5;
  const maxSizeBytes = question.config.maxSizeBytes || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = question.config.allowedTypes || ['*'];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isFileTypeAllowed = (fileType: string) => {
    if (allowedTypes.includes('*')) return true;
    return allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileType.endsWith(type);
      }
      return fileType.includes(type);
    });
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    if (disabled) return;

    const validFiles = [];
    const errors = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Check file count limit
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push(`${file.name} is too large (max: ${formatFileSize(maxSizeBytes)})`);
        continue;
      }

      // Check file type
      if (!isFileTypeAllowed(file.type) && !isFileTypeAllowed(file.name)) {
        errors.push(`${file.name} has an unsupported file type`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setUploading(true);
      
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newFiles = validFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file), // In real implementation, this would be the uploaded URL
        uploadedAt: new Date().toISOString()
      }));

      onAnswerChange({
        files: [...files, ...newFiles]
      });
      
      setUploading(false);
    }

    if (errors.length > 0) {
      // In real implementation, show these errors in a toast or alert
      console.warn('File upload errors:', errors);
    }
  };

  const removeFile = (index: number) => {
    if (disabled) return;
    
    const newFiles = files.filter((_, i) => i !== index);
    onAnswerChange({
      files: newFiles
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      {question.config.instructions && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{question.config.instructions}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      {files.length < maxFiles && !disabled && (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-8 text-center">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {uploading ? 'Uploading files...' : 'Click to upload or drag files here'}
              </p>
              <p className="text-xs text-muted-foreground">
                Max {maxFiles} files, up to {formatFileSize(maxSizeBytes)} each
              </p>
              {allowedTypes.length > 0 && !allowedTypes.includes('*') && (
                <p className="text-xs text-muted-foreground">
                  Allowed types: {allowedTypes.join(', ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        accept={allowedTypes.includes('*') ? undefined : allowedTypes.join(',')}
        disabled={disabled || uploading}
      />

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Uploaded Files ({files.length}/{maxFiles})</h4>
          {files.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <Badge variant="outline" className="text-xs">
                          {file.type || 'Unknown type'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    {!disabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {files.length >= maxFiles && (
        <p className="text-sm text-muted-foreground">
          Maximum number of files reached ({maxFiles}/{maxFiles})
        </p>
      )}
    </div>
  );
};

export default FileUploadQuestion;