import React, { useState, useEffect } from 'react';
import { FaPause, FaPlay, FaExclamationTriangle, FaHandPaper } from 'react-icons/fa';
import { apiClient, SystemControl as SystemControlType } from '../api/client';

export const SystemControl: React.FC = () => {
  const [control, setControl] = useState<SystemControlType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchControl();
  }, []);

  const fetchControl = async () => {
    try {
      const response = await apiClient.getSystemControl();
      setControl(response.data);
    } catch (error) {
      console.error('Error fetching system control:', error);
    }
  };

  const updateMode = async (mode: string, reason?: string) => {
    setLoading(true);
    try {
      const response = await apiClient.updateSystemControl({
        mode,
        changedBy: 'admin',
        reason,
        settings: control?.settings,
      });
      setControl(response.data);
      alert(`System mode changed to: ${mode.toUpperCase()}`);
    } catch (error) {
      console.error('Error updating system mode:', error);
      alert('Failed to update system mode');
    } finally {
      setLoading(false);
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'manual-only':
        return 'bg-blue-500';
      case 'crisis':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'active':
        return <FaPlay />;
      case 'paused':
        return <FaPause />;
      case 'manual-only':
        return <FaHandPaper />;
      case 'crisis':
        return <FaExclamationTriangle />;
      default:
        return null;
    }
  };

  if (!control) {
    return <div className="card">Loading system control...</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Control Center</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage system operation modes and posting controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getModeColor(control.mode)} animate-pulse`}></div>
          <span className="font-semibold text-gray-700">
            {control.mode.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Active Mode */}
        <button
          onClick={() => updateMode('active')}
          disabled={loading || control.mode === 'active'}
          className={`p-6 rounded-lg border-2 transition-all ${
            control.mode === 'active'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center">
            <FaPlay className="text-3xl text-green-600 mb-2" />
            <h3 className="font-bold text-gray-900">Active</h3>
            <p className="text-sm text-gray-600 text-center mt-2">
              Full automation enabled. AI generates and posts content per schedule.
            </p>
          </div>
        </button>

        {/* Paused Mode */}
        <button
          onClick={() => {
            const reason = prompt('Reason for pausing (optional):');
            updateMode('paused', reason || undefined);
          }}
          disabled={loading || control.mode === 'paused'}
          className={`p-6 rounded-lg border-2 transition-all ${
            control.mode === 'paused'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-200 hover:border-yellow-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center">
            <FaPause className="text-3xl text-yellow-600 mb-2" />
            <h3 className="font-bold text-gray-900">Paused</h3>
            <p className="text-sm text-gray-600 text-center mt-2">
              All automation halted. No content generation or posting.
            </p>
          </div>
        </button>

        {/* Manual-Only Mode */}
        <button
          onClick={() => updateMode('manual-only')}
          disabled={loading || control.mode === 'manual-only'}
          className={`p-6 rounded-lg border-2 transition-all ${
            control.mode === 'manual-only'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center">
            <FaHandPaper className="text-3xl text-blue-600 mb-2" />
            <h3 className="font-bold text-gray-900">Manual-Only</h3>
            <p className="text-sm text-gray-600 text-center mt-2">
              AI generates drafts but requires manual approval for all actions.
            </p>
          </div>
        </button>

        {/* Crisis Mode */}
        <button
          onClick={() => {
            const confirmed = window.confirm(
              'CRISIS MODE: This will immediately stop all content generation and posting. Continue?'
            );
            if (confirmed) {
              const reason = prompt('Crisis reason (required):');
              if (reason) {
                updateMode('crisis', reason);
              }
            }
          }}
          disabled={loading || control.mode === 'crisis'}
          className={`p-6 rounded-lg border-2 transition-all ${
            control.mode === 'crisis'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 hover:border-red-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center">
            <FaExclamationTriangle className="text-3xl text-red-600 mb-2" />
            <h3 className="font-bold text-gray-900">Crisis</h3>
            <p className="text-sm text-gray-600 text-center mt-2">
              Emergency shutdown. All operations blocked immediately.
            </p>
          </div>
        </button>
      </div>

      {/* System Settings */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Current Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Auto-Posting:</span>
            <span className={`ml-2 font-semibold ${control.settings.autoPostingEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {control.settings.autoPostingEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Approval Required:</span>
            <span className={`ml-2 font-semibold ${control.settings.requireApprovalForAll ? 'text-blue-600' : 'text-gray-600'}`}>
              {control.settings.requireApprovalForAll ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Daily Post Limit:</span>
            <span className="ml-2 font-semibold text-gray-900">
              {control.settings.maxDailyPosts}
            </span>
          </div>
        </div>
        
        {control.reason && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-gray-600 text-sm">Last Change Reason:</span>
            <p className="text-gray-900 mt-1">{control.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
};
