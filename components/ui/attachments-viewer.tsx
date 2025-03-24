"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { File, Download, Paperclip, X, Eye, FileText, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Attachment {
  id?: string;
  file_name: string;
  file_key: string;
  file_size: number;
  content_type: string;
  created_at?: string;
  event_id?: string;
}

interface AttachmentsViewerProps {
  attachments: Attachment[];
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
  onRemove?: (fileKey: string) => void;
}

export function AttachmentsViewer({
  attachments,
  showTitle = true,
  compact = false,
  className,
  onRemove,
}: AttachmentsViewerProps) {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  const handleDownload = async (fileKey: string, fileName: string) => {
    try {
      setIsLoading((prev) => ({ ...prev, [fileKey]: true }));
      
      // Get the download URL from our API
      const response = await fetch(`/api/attachments/download-url?fileKey=${encodeURIComponent(fileKey)}`);
      const data = await response.json();
      
      if (!data.downloadUrl) {
        throw new Error('Failed to get download URL');
      }
      
      // Create a fetch request to get the file as a blob
      const fileResponse = await fetch(data.downloadUrl);
      const blob = await fileResponse.blob();
      
      // Create a blob URL and use it for downloading
      const blobUrl = URL.createObjectURL(blob);
      
      // Create an invisible link and click it
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName; // This attribute is key - forces download instead of navigation
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 100);
      
      toast.success(`Downloading ${fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    } finally {
      setIsLoading((prev) => ({ ...prev, [fileKey]: false }));
    }
  };

  const handleView = async (fileKey: string, fileName: string) => {
    try {
      setIsLoading((prev) => ({ ...prev, [fileKey]: true }));
      
      // Get the download URL from our API
      const response = await fetch(`/api/attachments/download-url?fileKey=${encodeURIComponent(fileKey)}`);
      const data = await response.json();
      
      if (!data.downloadUrl) {
        throw new Error('Failed to get download URL');
      }
      
      // Open the file in a new tab
      window.open(data.downloadUrl, '_blank');
      
      toast.success(`Viewing ${fileName}`);
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to view file');
    } finally {
      setIsLoading((prev) => ({ ...prev, [fileKey]: false }));
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

  // Function to check if a file is viewable (image or PDF)
  const isViewable = (contentType: string): boolean => {
    return contentType.startsWith('image/') || contentType === 'application/pdf';
  };

  // Function to get the appropriate file icon based on content type
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <Image className={cn("flex-shrink-0 mr-2", compact ? "h-3 w-3" : "h-4 w-4")} aria-label="Image file" />;
    } else if (contentType === 'application/pdf') {
      return <FileText className={cn("flex-shrink-0 mr-2", compact ? "h-3 w-3" : "h-4 w-4")} aria-label="PDF file" />;
    }
    return <File className={cn("flex-shrink-0 mr-2", compact ? "h-3 w-3" : "h-4 w-4")} aria-label="File" />;
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showTitle && (
        <div className="flex items-center gap-1 text-sm font-medium">
          <Paperclip className="h-4 w-4 mr-3" />
          <span>Attachments ({attachments.length})</span>
        </div>
      )}
      
      <div className={cn(
        "space-y-2",
        compact && "flex flex-wrap gap-2 space-y-0"
      )}>
        {attachments.map((attachment) => (
          <div 
            key={attachment.file_key} 
            className={cn(
              "flex items-center justify-between border bg-background rounded-md",
              compact 
                ? "text-xs p-1 px-2" 
                : "p-2"
            )}
          >
            <div className="flex items-center overflow-hidden mr-2">
              {getFileIcon(attachment.content_type)}
              <span 
                className={cn("truncate", compact ? "text-xs" : "text-sm")}
                title={attachment.file_name}
              >
                {attachment.file_name}
              </span>
              {!compact && (
                <span className="text-xs text-muted-foreground ml-2">
                  {formatFileSize(attachment.file_size)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isViewable(attachment.content_type) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(attachment.file_key, attachment.file_name)}
                  disabled={isLoading[attachment.file_key]}
                  className={cn(
                    "p-0",
                    compact ? "h-6 w-6" : "h-7 w-7"
                  )}
                  title="View file"
                >
                  <Eye className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(attachment.file_key, attachment.file_name)}
                disabled={isLoading[attachment.file_key]}
                className={cn(
                  "p-0",
                  compact ? "h-6 w-6" : "h-7 w-7"
                )}
                title="Download file"
              >
                <Download className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
              </Button>
              
              {onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(attachment.file_key)}
                  className={cn(
                    "p-0 text-destructive",
                    compact ? "h-6 w-6" : "h-7 w-7"
                  )}
                  title="Remove attachment"
                >
                  <X className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 