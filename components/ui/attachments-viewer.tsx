"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { File, Download, Paperclip, X } from 'lucide-react';
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
      
      toast.success(`Downloading ${fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
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

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showTitle && (
        <div className="flex items-center gap-1 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
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
            <div className="flex items-center overflow-hidden">
              <File className={cn("flex-shrink-0 mr-2", compact ? "h-3 w-3" : "h-4 w-4")} />
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
            <div className="flex items-center">
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