import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, FolderOpen } from 'lucide-react';
import { FileLoader, ImportedFile, LoadProgress } from '../utils/FileLoader';

interface FileImportProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesImported: (files: ImportedFile[]) => void;
}

interface FileImportStatus {
  file: File;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
  imported?: ImportedFile;
}

export const FileImport: React.FC<FileImportProps> = ({
  isOpen,
  onClose,
  onFilesImported
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileImportStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileLoader = FileLoader.getInstance();
  const supportedFormats = fileLoader.getSupportedFormats();

  // Drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return extension && supportedFormats.includes(extension);
    });

    if (validFiles.length > 0) {
      const fileStatuses: FileImportStatus[] = validFiles.map(file => ({
        file,
        status: 'pending'
      }));
      setFiles(fileStatuses);
    }
  }, [supportedFormats]);

  // File select (browse)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const validFiles = Array.from(selectedFiles).filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return extension && supportedFormats.includes(extension);
    });

    if (validFiles.length > 0) {
      const fileStatuses: FileImportStatus[] = validFiles.map(file => ({
        file,
        status: 'pending'
      }));
      setFiles(fileStatuses);
    }
  }, [supportedFormats]);

  // Import files
  const handleImport = useCallback(async () => {
    if (files.length === 0) return;

    setIsLoading(true);
    const fileList = new DataTransfer();
    files.forEach(({ file }) => fileList.items.add(file));

    try {
      const importedFiles = await fileLoader.loadFiles(
        fileList.files,
        (progress) => {
          setLoadProgress(progress);
          setFiles(prev => prev.map((fileStatus, index) => ({
            ...fileStatus,
            status: index < progress.loaded ? 'success' : index === progress.loaded ? 'loading' : 'pending'
          })));
        },
        (error, filename) => {
          setFiles(prev => prev.map(fileStatus => 
            fileStatus.file.name === filename 
              ? { ...fileStatus, status: 'error', error }
              : fileStatus
          ));
        }
      );

      // Mark imported files as success
      setFiles(prev => prev.map(fileStatus => {
        const imported = importedFiles.find(imp => imp.name === fileStatus.file.name);
        return imported 
          ? { ...fileStatus, status: 'success', imported }
          : fileStatus;
      }));

      if (importedFiles.length > 0) {
        onFilesImported(importedFiles);
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsLoading(false);
      setLoadProgress(null);
    }
  }, [files, fileLoader, onFilesImported]);

  // Remove single file
  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    setFiles([]);
    setLoadProgress(null);
  }, []);

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Status icon
  const getStatusIcon = (status: FileImportStatus['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Import 3D Files</h2>
            <p className="text-sm text-gray-400 mt-1">
              Import 3D models from OBJ, STL, PLY files
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close import modal"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors cursor-pointer ${
            isDragOver
              ? 'border-blue-400 bg-blue-400 bg-opacity-10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyPress={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Drop files here or click to browse
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Supported formats: {supportedFormats.map(f => f.toUpperCase()).join(', ')}
          </p>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Browse Files
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={supportedFormats.map(f => `.${f}`).join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* File List */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                Files ({files.length})
              </h3>
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-2">
              {files.map((fileStatus, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(fileStatus.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {fileStatus.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{formatFileSize(fileStatus.file.size)}</span>
                        <span>•</span>
                        <span>{fileStatus.file.name.split('.').pop()?.toUpperCase()}</span>
                      </div>
                      {fileStatus.error && (
                        <p className="text-xs text-red-400 mt-1">{fileStatus.error}</p>
                      )}
                    </div>
                  </div>
                  
                  {fileStatus.status === 'pending' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                      aria-label={`Remove ${fileStatus.file.name}`}
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {isLoading && loadProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">Importing...</span>
              <span className="text-sm text-gray-400">
                {loadProgress.loaded}/{loadProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(loadProgress.loaded / loadProgress.total) * 100}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Processing: {loadProgress.file}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {files.length > 0 && (
              <>
                {files.filter(f => f.status === 'success').length} of {files.length} imported
              </>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={files.length === 0 || isLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Importing...' : `Import ${files.length} File${files.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* Format Help */}
        <div className="mt-4 p-3 bg-gray-700 bg-opacity-50 rounded-lg">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">
            Supported Formats
          </h4>
          <div className="space-y-1">
            {supportedFormats.map(format => (
              <div key={format} className="text-xs text-gray-400">
                <span className="font-mono uppercase">{format}</span> - {fileLoader.getFormatDescription(format)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
