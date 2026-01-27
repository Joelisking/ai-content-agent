import React, { useState, useEffect } from 'react';
import { FaMagic, FaLinkedin, FaInstagram, FaTwitter, FaFacebook } from 'react-icons/fa';
import { apiClient, Brand, MediaUpload as MediaType, Content } from '../api/client';

export const ContentGeneration: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [media, setMedia] = useState<MediaType[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('linkedin');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Content | null>(null);

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
    }
  };

  const fetchMedia = async () => {
    try {
      const response = await apiClient.getMedia();
      setMedia(response.data);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBrand) {
      alert('Please select a brand');
      return;
    }

    setGenerating(true);
    setGeneratedContent(null);

    try {
      const response = await apiClient.generateContent({
        brandConfigId: selectedBrand,
        platform: selectedPlatform,
        mediaIds: selectedMedia.length > 0 ? selectedMedia : undefined,
        userPrompt: userPrompt || undefined,
      });

      setGeneratedContent(response.data);
      alert('Content generated successfully! Check the Approval Queue.');
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Check console for details.');
    } finally {
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

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Content</h2>

        {/* Brand Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="input"
          >
            {brands.map((brand) => (
              <option key={brand._id} value={brand._id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* Platform Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platform
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['linkedin', 'instagram', 'twitter', 'facebook'].map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`p-4 rounded-lg border-2 transition-all flex items-center justify-center space-x-2 ${
                  selectedPlatform === platform
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{getPlatformIcon(platform)}</span>
                <span className="font-medium capitalize">{platform}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Media Selection */}
        {media.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Media (Optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {media.map((item) => (
                <div
                  key={item._id}
                  onClick={() => toggleMediaSelection(item._id)}
                  className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                    selectedMedia.includes(item._id)
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {item.mimetype.startsWith('image/') ? (
                    <img
                      src={item.path}
                      alt={item.originalName}
                      className="w-full h-24 object-cover"
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">🎥</span>
                    </div>
                  )}
                  <div className="p-2 bg-white">
                    <p className="text-xs truncate">{item.originalName}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedMedia.length > 0 && (
              <p className="text-sm text-primary-600 mt-2">
                {selectedMedia.length} media file(s) selected
              </p>
            )}
          </div>
        )}

        {/* User Prompt */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Instructions (Optional)
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g., Focus on innovation and developer productivity..."
            className="input min-h-[100px]"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedBrand}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          <FaMagic />
          <span>{generating ? 'Generating...' : 'Generate Content'}</span>
        </button>
      </div>

      {/* Preview Generated Content */}
      {generatedContent && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="font-bold text-green-900">Content Generated Successfully!</h3>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-2xl">{getPlatformIcon(generatedContent.platform)}</span>
              <span className="font-semibold capitalize">{generatedContent.platform}</span>
            </div>
            
            <p className="text-gray-900 whitespace-pre-wrap mb-3">
              {generatedContent.content.text}
            </p>
            
            {generatedContent.content.hashtags && generatedContent.content.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {generatedContent.content.hashtags.map((tag, index) => (
                  <span key={index} className="badge badge-pending">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {generatedContent.reasoning && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">AI Reasoning:</p>
              <p className="text-sm text-blue-800">{generatedContent.reasoning}</p>
            </div>
          )}

          <p className="text-sm text-gray-600 mt-4">
            This content has been added to the approval queue. Go to the Approval Queue tab to review and approve it.
          </p>
        </div>
      )}
    </div>
  );
};
