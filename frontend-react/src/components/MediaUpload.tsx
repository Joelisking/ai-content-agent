import React, { useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaImage, FaVideo, FaTrash } from 'react-icons/fa';
import { apiClient, MediaUpload as MediaType } from '../api/client';

export const MediaUpload: React.FC = () => {
  const [media, setMedia] = useState<MediaType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const response = await apiClient.getMedia();
      setMedia(response.data);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('uploadedBy', 'client');

      await apiClient.uploadMedia(formData);
      setSelectedFile(null);
      await fetchMedia();
      alert('Media uploaded successfully!');
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getMediaIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) {
      return <FaImage className="text-blue-500" />;
    } else if (mimetype.startsWith('video/')) {
      return <FaVideo className="text-purple-500" />;
    }
    return null;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await apiClient.deleteMedia(id);
      setMedia(media.filter(m => m._id !== id));
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Media</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
          <FaCloudUploadAlt className="text-5xl text-gray-400 mx-auto mb-4" />
          
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          
          <label
            htmlFor="file-upload"
            className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium"
          >
            Click to select file
          </label>
          
          <p className="text-sm text-gray-500 mt-2">
            or drag and drop
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Images and videos up to 10MB
          </p>
        </div>

        {selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {selectedFile.type.startsWith('image/') ? <FaImage /> : <FaVideo />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="btn-secondary"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="btn-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Library */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
          <span className="text-sm text-gray-500">{media.length} files</span>
        </div>

        {media.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No media uploaded yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => (
              <div
                key={item._id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {item.mimetype.startsWith('image/') ? (
                  <img
                    src={item.path}
                    alt={item.originalName}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <FaVideo className="text-5xl text-gray-400" />
                  </div>
                )}
                
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.originalName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(item.size)} • {new Date(item.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-2 flex items-center space-x-2">
                      {getMediaIcon(item.mimetype)}
                      <button
                        onClick={() => handleDelete(item._id, item.originalName)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
