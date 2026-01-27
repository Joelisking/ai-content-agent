import React, { useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaImage, FaVideo, FaFile } from 'react-icons/fa';
import { apiClient, MediaUpload as MediaType } from '../lib/api/client';
import Image from 'next/image';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

export const MediaUpload: React.FC = () => {
  const [media, setMedia] = useState<MediaType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const response = await apiClient.getMedia();
      setMedia(response.data);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error("Failed to fetch media");
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
    setUploadProgress(0);
    // Simulate progress since axios adapter might not be setup for progress events in client yet effortlessly
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('uploadedBy', 'client');

      await apiClient.uploadMedia(formData);
      clearInterval(interval);
      setUploadProgress(100);

      setSelectedFile(null);
      await fetchMedia();
      toast.success('Media uploaded successfully!');
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
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
    return <FaFile className="text-gray-500" />;
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('https')) return path;
    // Handle paths that might already be absolute but local? Unlikely.
    // Ensure we don't double slash if path starts with /
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    return `http://localhost:4000/${cleanPath}`;
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <Card className="border-dashed border-2">
        <CardHeader className="text-center">
          <CardTitle>Upload Media</CardTitle>
          <CardDescription>Drag and drop or click to upload assets to your library</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-primary/10 p-6">
            <FaCloudUploadAlt className="text-5xl text-primary" />
          </div>

          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="cursor-pointer"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Images and videos up to 10MB
          </p>

          {uploading && (
            <div className="w-full max-w-sm space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">Uploading...</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          {selectedFile && !uploading && (
            <div className="flex items-center gap-4 w-full p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                {selectedFile.type.startsWith('image/') ? <FaImage /> : <FaVideo />}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedFile(null)}>Cancel</Button>
                <Button onClick={handleUpload}>Upload</Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Media Library */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Media Library</h2>
          <span className="text-sm text-muted-foreground">{media.length} files</span>
        </div>

        {media.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FaImage className="text-4xl mb-4 opacity-20" />
              <p>No media uploaded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item) => (
              <Card key={item._id} className="overflow-hidden group hover:shadow-lg transition-all">
                <div className="relative h-40 bg-muted">
                  {item.mimetype.startsWith('image/') ? (
                    <Image
                      src={getImageUrl(item.path)}
                      alt={item.originalName}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaVideo className="text-4xl text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/50 p-2 rounded-full text-white">
                      {getMediaIcon(item.mimetype)}
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate" title={item.originalName}>{item.originalName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(item.size)} • {new Date(item.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
