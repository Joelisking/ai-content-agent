'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaMagic, FaLinkedin, FaInstagram, FaTwitter, FaFacebook, FaImage, FaSave, FaEdit, FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import { apiClient, Brand, MediaUpload as MediaType, Content } from '../lib/api/client';
import Image from 'next/image';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

export const ContentGeneration: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [media, setMedia] = useState<MediaType[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('linkedin');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [generateImage, setGenerateImage] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedContent, setGeneratedContent] = useState<Content | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editedHashtags, setEditedHashtags] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBrands();
    fetchMedia();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await apiClient.getBrands();
      setBrands(response.data);
      if (response.data.length > 0) {
        setSelectedBrand(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast.error("Failed to load brands");
    }
  };

  const fetchMedia = async () => {
    try {
      const response = await apiClient.getMedia();
      setMedia(response.data);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error("Failed to load media");
    }
  };

  const handleGenerate = async () => {
    if (!selectedBrand) {
      toast.error('Please select a brand');
      return;
    }

    if (selectedPlatform === 'instagram' && selectedMedia.length === 0 && !generateImage) {
      toast.error('Instagram posts require at least one media item (or enable AI image generation)');
      return;
    }

    // Platform-specific media limits
    const mediaLimits: Record<string, number> = {
      instagram: 20,
      twitter: 4,
      linkedin: 20,
      facebook: 40,
    };
    const limit = mediaLimits[selectedPlatform];
    if (limit && selectedMedia.length > limit) {
      toast.error(`${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} posts allow a maximum of ${limit} media items`);
      return;
    }

    setGenerating(true);
    setGeneratedContent(null);
    setIsEditing(false);
    setHasUnsavedChanges(false);

    try {
      // Start generation - returns immediately with contentId
      const response = await apiClient.generateContent({
        brandConfigId: selectedBrand,
        platform: selectedPlatform,
        mediaIds: selectedMedia.length > 0 ? selectedMedia : undefined,
        userPrompt: userPrompt || undefined,
        generateImage: generateImage || undefined,
      });

      const contentId = response.data._id;

      // Poll for completion every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await apiClient.getContentById(contentId);
          const content = statusResponse.data;

          if (content.generationStatus === 'completed') {
            clearInterval(pollInterval);
            setGeneratedContent(content);
            setGenerating(false);
            // Check if image generation failed
            if ((content.metadata as any)?.imageError) {
              toast.warning('Content generated, but image generation failed: ' + (content.metadata as any).imageError);
            } else {
              toast.success('Content generated successfully!');
            }
          } else if (content.generationStatus === 'failed') {
            clearInterval(pollInterval);
            setGenerating(false);
            setGenerationStep('');
            toast.error(content.generationError || 'Content generation failed');
          } else if (content.generationStatus === 'generating') {
            // Update step while generating
            if (content.generationStep) {
              setGenerationStep(content.generationStep);
            }
          }
          // If still 'generating', continue polling
        } catch (pollError) {
          console.error('Error polling content status:', pollError);
          clearInterval(pollInterval);
          setGenerating(false);
          toast.error('Failed to check generation status');
        }
      }, 2000);

      // Safety timeout: stop polling after 3 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (generating) {
          setGenerating(false);
          toast.error('Content generation timed out. Please try again.');
        }
      }, 180000);

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      console.log('Content generation error:', errorMessage); // Log as string to avoid error overlay
      toast.error(`Failed to generate content: ${errorMessage}`);
      setGenerating(false);
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMedia((prev) =>
      prev.includes(mediaId)
        ? prev.filter((id) => id !== mediaId)
        : [...prev, mediaId]
    );
  };

  // Start editing mode
  const startEditing = () => {
    if (generatedContent) {
      setEditedText(generatedContent.content.text);
      setEditedHashtags(generatedContent.content.hashtags?.join(', ') || '');
      setIsEditing(true);
      setHasUnsavedChanges(false);
    }
  };

  // Handle text changes
  const handleTextChange = (value: string) => {
    setEditedText(value);
    setHasUnsavedChanges(true);
  };

  // Handle hashtag changes
  const handleHashtagChange = (value: string) => {
    setEditedHashtags(value);
    setHasUnsavedChanges(true);
  };

  // Save edits
  const saveEdits = async () => {
    if (!generatedContent) return;

    setSaving(true);
    try {
      const hashtags = editedHashtags
        .split(',')
        .map(tag => tag.trim().replace(/^#/, ''))
        .filter(tag => tag.length > 0);

      const response = await apiClient.updateContent(generatedContent._id, {
        text: editedText,
        hashtags,
      });

      setGeneratedContent(response.data);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      toast.success('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', 'client');

      const response = await apiClient.uploadMedia(formData);
      clearInterval(interval);
      setUploadProgress(100);

      // Refresh media list and auto-select the new upload
      await fetchMedia();
      setSelectedMedia(prev => [...prev, response.data._id]);

      toast.success('Media uploaded and selected!');
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin':
        return <FaLinkedin className="text-blue-700" />;
      case 'instagram':
        return <FaInstagram className="text-pink-600" />;
      case 'twitter':
        return <FaTwitter className="text-blue-400" />;
      case 'facebook':
        return <FaFacebook className="text-blue-600" />;
      default:
        return null;
    }
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('https')) return path;
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    return `http://localhost:4000/${cleanPath}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Configuration Column */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
            <CardDescription>Configure the parameters for AI generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Brand Selection */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand Identity</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger id="brand">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand._id} value={brand._id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>Target Platform</Label>
              <div className="grid grid-cols-2 gap-3">
                {['linkedin', 'instagram', 'twitter', 'facebook'].map((platform) => (
                  <Button
                    key={platform}
                    variant={selectedPlatform === platform ? "default" : "outline"}
                    className="h-14 justify-start space-x-2 px-4"
                    onClick={() => setSelectedPlatform(platform)}
                  >
                    <span className="text-xl">{getPlatformIcon(platform)}</span>
                    <span className="capitalize">{platform}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Media Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Media (Optional)</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <FaCloudUploadAlt className="mr-2 h-3 w-3" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>

              {uploadProgress > 0 && (
                <Progress value={uploadProgress} className="h-1" />
              )}

              {media.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2">
                  {media.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => toggleMediaSelection(item._id)}
                      className={`relative cursor-pointer rounded-md border-2 overflow-hidden transition-all aspect-square ${selectedMedia.includes(item._id)
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-muted hover:border-primary/50'
                        }`}
                    >
                      {item.mimetype.startsWith('image/') ? (
                        <Image
                          src={getImageUrl(item.path)}
                          alt={item.originalName}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-2xl">🎥</span>
                        </div>
                      )}

                      {selectedMedia.includes(item._id) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <FaMagic size={10} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <FaImage className="mx-auto text-2xl mb-2 opacity-50" />
                  <p className="text-sm">No media uploaded yet</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Upload your first image
                  </Button>
                </div>
              )}
              {selectedMedia.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{selectedMedia.length} selected</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMedia([])}
                    className="h-6 text-xs"
                  >
                    <FaTimes className="mr-1 h-2 w-2" /> Clear
                  </Button>
                </div>
              )}
            </div>

            {/* User Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Additional Instructions</Label>
              <Textarea
                id="prompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., Focus on innovation and developer productivity..."
                className="min-h-[100px]"
              />
            </div>

            {/* AI Image Generation Toggle */}
            <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-200 dark:border-purple-800">
              <Switch
                id="generateImage"
                checked={generateImage}
                onCheckedChange={(checked) => setGenerateImage(checked)}
                disabled={selectedMedia.length > 0}
              />
              <div className="flex-1">
                <Label
                  htmlFor="generateImage"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FaImage className="text-purple-500" />
                  <span>Auto-generate image with AI</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedMedia.length > 0
                    ? "Disabled when media is already selected"
                    : "Uses DALL-E 3 to create a matching image"}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedBrand}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <FaMagic className="mr-2 animate-spin" /> {generationStep || 'Generating...'}
                </>
              ) : (
                <>
                  <FaMagic className="mr-2" /> Generate Content
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Preview Column */}
      <div className="space-y-6">
        {generatedContent ? (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <CardTitle className="text-green-600 dark:text-green-400">Content Generated Successfully</CardTitle>
              </div>
              <CardDescription>
                Review the generated output below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(generatedContent.platform)}
                  <span className="font-semibold capitalize">{generatedContent.platform} Post</span>
                </div>
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={startEditing}>
                    <FaEdit className="mr-2 h-3 w-3" /> Edit
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Content Text</Label>
                    <Textarea
                      value={editedText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      rows={8}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hashtags (comma-separated)</Label>
                    <Input
                      value={editedHashtags}
                      onChange={(e) => handleHashtagChange(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdits} disabled={saving} size="sm">
                      {saving ? (
                        <>
                          <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="mr-2 h-3 w-3" /> Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-background rounded-lg border whitespace-pre-wrap text-sm leading-relaxed">
                  {generatedContent.content.text}
                </div>
              )}

              {/* AI Generated Image */}
              {(generatedContent.metadata as any)?.generatedImageUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <FaImage />
                    <span className="font-medium">AI Generated Image</span>
                  </div>
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    <Image
                      src={(generatedContent.metadata as any).generatedImageUrl}
                      alt="AI Generated"
                      fill
                      className="object-contain"
                    />
                  </div>
                  {(generatedContent.metadata as any)?.imagePrompt && (
                    <p className="text-xs text-muted-foreground italic">
                      Prompt: {(generatedContent.metadata as any).imagePrompt}
                    </p>
                  )}
                </div>
              )}

              {/* Image Generation Error */}
              {(generatedContent.metadata as any)?.imageError && (
                <Alert className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  <FaImage className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold uppercase mb-1">Image Generation Failed</AlertTitle>
                  <AlertDescription className="text-xs">
                    {(generatedContent.metadata as any).imageError}
                  </AlertDescription>
                </Alert>
              )}

              {!isEditing && generatedContent.content.hashtags && generatedContent.content.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {generatedContent.content.hashtags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      #{tag.replace(/^#/, '')}
                    </Badge>
                  ))}
                </div>
              )}

              {generatedContent.reasoning && (
                <Alert className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  <AlertTitle className="text-xs font-bold uppercase mb-1">AI Reasoning</AlertTitle>
                  <AlertDescription className="text-xs">
                    {generatedContent.reasoning}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground w-full text-center">
                Added to Approval Queue for verification.
              </p>
            </CardFooter>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center border-dashed min-h-[400px]">
            <div className="text-center text-muted-foreground">
              <FaMagic className="mx-auto text-4xl mb-4 opacity-20" />
              <p>Configure settings and click generate<br />to see AI preview here</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
