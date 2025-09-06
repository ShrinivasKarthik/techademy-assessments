import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadOptions {
  bucket: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  publicUrl?: string;
}

export const useFileUpload = (options: FileUploadOptions) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // Default 10MB

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive"
      });
      return false;
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Allowed types: ${allowedTypes.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const uploadFile = async (
    file: File, 
    assessmentId?: string, 
    questionId?: string
  ): Promise<UploadedFile | null> => {
    if (!validateFile(file)) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) throw storageError;

      // Save file metadata to database
      const { data: fileRecord, error: dbError } = await supabase
        .from('assessment_files')
        .insert({
          assessment_id: assessmentId,
          question_id: questionId,
          file_name: file.name,
          file_path: storageData.path,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Get public URL if bucket is public
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(storageData.path);

      const uploadedFile: UploadedFile = {
        id: fileRecord.id,
        fileName: fileRecord.file_name,
        filePath: fileRecord.file_path,
        fileSize: fileRecord.file_size,
        contentType: fileRecord.content_type,
        publicUrl: urlData.publicUrl
      };

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded.`
      });

      return uploadedFile;

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteFile = async (fileId: string): Promise<boolean> => {
    try {
      // Get file info first
      const { data: fileRecord, error: fetchError } = await supabase
        .from('assessment_files')
        .select('file_path')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(options.bucket)
        .remove([fileRecord.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('assessment_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: "File deleted",
        description: "File has been removed successfully."
      });

      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      return false;
    }
  };

  const getFileUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data } = await supabase.storage
        .from(options.bucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  };

  return {
    uploadFile,
    deleteFile,
    getFileUrl,
    uploading,
    uploadProgress
  };
};