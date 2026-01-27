import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSync, FaLinkedin, FaInstagram, FaTwitter, FaFacebook, FaRocket } from 'react-icons/fa';
import { apiClient, Content } from '../api/client';
import { formatDistanceToNow } from 'date-fns';

export const ApprovalQueue: React.FC = () => {
  const [content, setContent] = useState<Content[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [repurposeModalOpen, setRepurposeModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<string>('twitter');
  const [repurposeMode, setRepurposeMode] = useState<'create' | 'replace'>('create');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();
  }, [filter]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await apiClient.getContent(params);
      setContent(response.data);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const scheduledFor = prompt('Schedule for later? (leave empty for immediate posting)\nFormat: YYYY-MM-DD HH:mm');

    try {
      if (!scheduledFor) {
        setApprovingId(id);
      }
      await apiClient.approveContent(id, 'admin', scheduledFor || undefined);
      alert('Content approved!');
      await fetchContent();
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Failed to approve content');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await apiClient.rejectContent(id, 'admin', reason);
      alert('Content rejected');
      await fetchContent();
    } catch (error) {
      console.error('Error rejecting content:', error);
      alert('Failed to reject content');
    }
  };

  const handleRegenerate = async (id: string, originalText: string) => {
    const feedback = prompt('What would you like to change?');
    if (!feedback) return;

    try {
      await apiClient.regenerateContent(id, feedback, 'admin');
      alert('Content regenerated!');
      await fetchContent();
    } catch (error) {
      console.error('Error regenerating content:', error);
      alert('Failed to regenerate content');
    }
  };

  const handlePostNow = async (id: string) => {
    const confirmed = window.confirm('Post this content immediately?');
    if (!confirmed) return;

    setLoading(true);
    try {
      await apiClient.postContent(id, 'admin');
      alert('Content posted successfully!');
      await fetchContent();
    } catch (error: any) {
      console.error('Error posting content:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to post content: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };


  const handleRepurposeClick = (content: Content) => {
    setSelectedContent(content);
    setRepurposeModalOpen(true);
  };

  const handleRepurposeSubmit = async () => {
    if (!selectedContent) return;

    try {
      setLoading(true);
      await apiClient.generateContent({
        brandConfigId: selectedContent.brandConfigId,
        platform: targetPlatform,
        userPrompt: `Repurpose this ${selectedContent.platform} post for ${targetPlatform}. Maintain the core message but adapt it to the new platform's style and constraints.\n\nOriginal Content:\n${selectedContent.content.text}`,
      });
      alert('Content repurposed! Check the queue.');
      setRepurposeModalOpen(false);
      await fetchContent();
    } catch (error) {
      console.error('Error repurposing content:', error);
      alert('Failed to repurpose content');
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      posted: 'badge-posted',
      scheduled: 'badge-approved',
    };
    return badges[status as keyof typeof badges] || 'badge';
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Approval Queue</h2>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage AI-generated content
            </p>
          </div>
          <button
            onClick={fetchContent}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {['all', 'pending', 'approved', 'posted', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-2 text-xs">
                  ({content.filter((c) => c.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Cards */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : content.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No content found for this filter
          </div>
        ) : (
          <div className="space-y-4">
            {content.map((item) => (
              <div
                key={item._id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getPlatformIcon(item.platform)}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold capitalize">{item.platform}</span>
                        <span className={`badge ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {item.metadata.version > 1 && (
                    <span className="badge bg-purple-100 text-purple-800">
                      v{item.metadata.version}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-900 whitespace-pre-wrap mb-3">
                    {item.content.text}
                  </p>

                  {item.content.mediaIds && item.content.mediaIds.length > 0 && (
                    <div className="flex overflow-x-auto gap-4 mb-3 pb-2">
                      {item.content.mediaIds.map((media: any, index) => (
                        typeof media === 'object' && media.path ? (
                          <div key={index} className="relative flex-none w-48 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={media.path.startsWith('http') ? media.path : `http://localhost:4000/${media.path.replace(/^\.\//, '')}`}
                              alt={media.originalName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : null
                      ))}
                    </div>
                  )}

                  {item.content.hashtags && item.content.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.content.hashtags.map((tag, index) => (
                        <span key={index} className="text-sm text-primary-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-4">
                    {item.approvedBy && (
                      <span>✓ Approved by {item.approvedBy}</span>
                    )}
                    {item.rejectedBy && (
                      <span>✗ Rejected by {item.rejectedBy}</span>
                    )}
                    {item.scheduledFor && (
                      <span>📅 Scheduled for {new Date(item.scheduledFor).toLocaleString()}</span>
                    )}
                    {item.postedAt && (
                      <span>🚀 Posted {formatDistanceToNow(new Date(item.postedAt), { addSuffix: true })}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    Generated by {item.generatedBy}
                  </span>
                </div>

                {item.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-red-900">Rejection Reason:</p>
                    <p className="text-sm text-red-800">{item.rejectionReason}</p>
                  </div>
                )}

                {item.postUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-green-900">Post URL:</p>
                    <a
                      href={item.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:underline"
                    >
                      {item.postUrl}
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {item.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(item._id)}
                        disabled={approvingId === item._id}
                        className={approvingId === item._id
                          ? "btn-secondary flex items-center space-x-2 cursor-wait opacity-75"
                          : "btn-success flex items-center space-x-2"}
                      >
                        {approvingId === item._id ? <FaSync className="animate-spin" /> : <FaCheck />}
                        <span>{approvingId === item._id ? 'Posting...' : 'Approve'}</span>
                      </button>
                      <button
                        onClick={() => handleReject(item._id)}
                        className="btn-danger flex items-center space-x-2"
                      >
                        <FaTimes />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleRegenerate(item._id, item.content.text)}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <FaSync />
                        <span>Regenerate</span>
                      </button>
                      <button
                        onClick={() => handleRepurposeClick(item)}
                        className="btn-secondary flex items-center space-x-2"
                        title="Repurpose for another platform"
                      >
                        <FaSync className="transform rotate-90" />
                        <span>Repurpose</span>
                      </button>
                    </>
                  )}

                  {item.status === 'approved' && (
                    <button
                      onClick={() => handlePostNow(item._id)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <FaRocket />
                      <span>Post Now</span>
                    </button>
                  )}

                  {item.status === 'rejected' && (
                    <button
                      onClick={() => handleRegenerate(item._id, item.content.text)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <FaSync />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {repurposeModalOpen && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Repurpose Content</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a new post for a different platform based on this content.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Platform</label>
              <select
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
                className="input-field w-full p-2 border rounded"
              >
                {['linkedin', 'instagram', 'twitter', 'facebook']
                  .filter(p => p !== selectedContent.platform)
                  .map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))
                }
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={repurposeMode === 'create'}
                    onChange={() => setRepurposeMode('create')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Create new post</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={repurposeMode === 'replace'}
                    onChange={() => setRepurposeMode('replace')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Replace current post</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRepurposeModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRepurposeSubmit}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Repurpose'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
