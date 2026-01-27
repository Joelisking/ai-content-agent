import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaImage, FaCheckCircle, FaClock, FaRocket, FaChartLine } from 'react-icons/fa';
import { apiClient, DashboardStats } from '../api/client';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <div className="text-center py-8 text-red-500">Failed to load dashboard</div>
      </div>
    );
  }

  const getSystemModeColor = (mode: string) => {
    switch (mode) {
      case 'active':
        return 'text-green-600';
      case 'paused':
        return 'text-yellow-600';
      case 'manual-only':
        return 'text-blue-600';
      case 'crisis':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <h1 className="text-3xl font-bold mb-2">AI Content Agent Dashboard</h1>
        <p className="text-primary-100">
          Automated content creation and posting system with human-in-the-loop controls
        </p>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className={`w-4 h-4 rounded-full ${stats.system.mode === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <div>
              <p className="text-sm text-gray-600">System Mode</p>
              <p className={`font-bold ${getSystemModeColor(stats.system.mode)}`}>
                {stats.system.mode.toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className={`w-4 h-4 rounded-full ${stats.system.autoPostingEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="text-sm text-gray-600">Auto-Posting</p>
              <p className={`font-bold ${stats.system.autoPostingEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {stats.system.autoPostingEnabled ? 'ENABLED' : 'DISABLED'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Content */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaFileAlt className="text-2xl text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {stats.content.total}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Content</h3>
          <p className="text-xs text-gray-500 mt-1">All generated content</p>
        </div>

        {/* Pending Approval */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FaClock className="text-2xl text-yellow-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {stats.content.pending}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Pending Approval</h3>
          <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
        </div>

        {/* Approved */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FaCheckCircle className="text-2xl text-green-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {stats.content.approved}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Approved</h3>
          <p className="text-xs text-gray-500 mt-1">Ready to post</p>
        </div>

        {/* Posted */}
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FaRocket className="text-2xl text-purple-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {stats.content.posted}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Posted</h3>
          <p className="text-xs text-gray-500 mt-1">Live on platforms</p>
        </div>
      </div>

      {/* Media Stats */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <FaImage className="text-2xl text-primary-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Media Library</h3>
            <p className="text-sm text-gray-500">Uploaded assets</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">Total Files</span>
            <span className="text-2xl font-bold text-primary-600">{stats.media.total}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="#content-generation"
            className="p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors text-center"
          >
            <FaChartLine className="text-3xl text-primary-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Generate Content</p>
          </a>
          
          <a
            href="#approval-queue"
            className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-center"
          >
            <FaClock className="text-3xl text-yellow-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Review Queue ({stats.content.pending})</p>
          </a>
          
          <a
            href="#media-upload"
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center"
          >
            <FaImage className="text-3xl text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Upload Media</p>
          </a>
        </div>
      </div>

      {/* Workflow Status */}
      <div className="card bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Content Workflow</h3>
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              1
            </div>
            <p className="text-sm font-medium">Generate</p>
          </div>
          <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              2
            </div>
            <p className="text-sm font-medium">Review</p>
          </div>
          <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              3
            </div>
            <p className="text-sm font-medium">Approve</p>
          </div>
          <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              4
            </div>
            <p className="text-sm font-medium">Post</p>
          </div>
        </div>
      </div>
    </div>
  );
};
