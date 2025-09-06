import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, Download, AlertCircle } from 'lucide-react';
import FileUploadComponent from '@/components/FileUploadComponent';
import { useFileUpload } from '@/hooks/useFileUpload';

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
  const files = answer?.files || [];
  const maxFiles = question.config.maxFiles || 5;
  const maxSizeBytes = question.config.maxSizeBytes || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = question.config.allowedTypes || ['*'];

  const handleFileUploaded = (uploadedFile: any) => {
    const newFile = {
      name: uploadedFile.fileName,
      size: uploadedFile.fileSize,
      type: uploadedFile.contentType,
      url: uploadedFile.publicUrl,
      uploadedAt: new Date().toISOString()
    };

    onAnswerChange({
      files: [...files, newFile]
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (index: number) => {
    if (disabled) return;
    
    const newFiles = files.filter((_, i) => i !== index);
    onAnswerChange({
      files: newFiles
    });
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
        <FileUploadComponent
          onFileUploaded={handleFileUploaded}
          questionId={question.id}
          maxFiles={maxFiles - files.length}
          acceptedTypes={allowedTypes.includes('*') ? undefined : allowedTypes}
          className="mb-4"
        />
      )}

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