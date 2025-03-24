"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Upload, File, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileAttachment {
  id?: string;
  file_name: string;
  file_key: string;
  file_size: number;
  content_type: string;
  created_at?: string;
}

interface FileUploadProps {
  attachments: FileAttachment[];
  onAttachmentAdded: (attachment: FileAttachment) => void;
  onAttachmentRemoved: (fileKey: string) => void;
  maxSize?: number; // in MB
  maxFiles?: number;
  className?: string;
}

export function FileUpload({
  attachments,
  onAttachmentAdded,
  onAttachmentRemoved,
  maxSize = 10, // Default max file size: 10MB
  maxFiles = 5, // Default max files: 5
  className,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDownload = async (fileKey: string, fileName: string) => {
    try {
      const response = await fetch(`/api/attachments/download-url?fileKey=${encodeURIComponent(fileKey)}`);
      const data = await response.json();
      
      if (!data.downloadUrl) {
        throw new Error('Failed to get download URL');
      }
      
      // Create an invisible link and click it to start the download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleRemoveAttachment = async (fileKey: string) => {
    try {
      // First call the API to delete the file from R2
      await fetch('/api/attachments/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey }),
      });
      
      // Then call the parent component callback to update the local state/database
      onAttachmentRemoved(fileKey);
    } catch (error) {
      console.error('Error removing attachment:', error);
      toast.error('Failed to remove attachment');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Check if we would exceed the maximum number of files
    if (attachments.length + files.length > maxFiles) {
      toast.error(`You can only upload a maximum of ${maxFiles} files`);
      return;
    }
    
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSize) {
          toast.error(`File ${file.name} is too large (max size: ${maxSize}MB)`);
          continue;
        }
        
        // Get pre-signed URL for upload
        const response = await fetch('/api/attachments/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
          }),
        });
        
        const { uploadUrl, fileKey } = await response.json();
        
        if (!uploadUrl || !fileKey) {
          throw new Error('Failed to get upload URL');
        }
        
        // Upload the file to R2 using the pre-signed URL
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        
        // Create the attachment object
        const newAttachment: FileAttachment = {
          file_name: file.name,
          file_key: fileKey,
          file_size: file.size,
          content_type: file.type,
        };
        
        // Add the attachment via callback
        onAttachmentAdded(newAttachment);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const kilobytes = bytes / 1024;
    if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
    const megabytes = kilobytes / 1024;
    return `${megabytes.toFixed(1)} MB`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Attachments</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading || attachments.length >= maxFiles}
          className="h-8"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Add File
            </>
          )}
        </Button>
      </div>
      
      {/* Display existing attachments */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div 
              key={attachment.file_key} 
              className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/10 transition-colors"
            >
              <div className="flex items-center overflow-hidden">
                <File className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm truncate" title={attachment.file_name}>
                  {attachment.file_name}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatFileSize(attachment.file_size)}
                </span>
              </div>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment.file_key, attachment.file_name)}
                  className="h-7 w-7 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAttachment(attachment.file_key)}
                  className="h-7 w-7 p-0 text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-md py-6 px-4 bg-muted/30">
          <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No attachments yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drag files here or click the Add File button
          </p>
        </div>
      )}
      
      {/* Hidden file input */}
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading}
        multiple
      />
      
      {/* Display max file info */}
      <p className="text-xs text-muted-foreground">
        Max file size: {maxSize}MB • {attachments.length}/{maxFiles} files used
      </p>
    </div>
  );
} 