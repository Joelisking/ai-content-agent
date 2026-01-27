import React, { useState } from 'react';
import {
  FaHome,
  FaMagic,
  FaClipboardCheck,
  FaImage,
  FaCog,
  FaBars,
  FaTimes,
  FaBuilding
} from 'react-icons/fa';
import { Dashboard } from './components/Dashboard';
import { ContentGeneration } from './components/ContentGeneration';
import { ApprovalQueue } from './components/ApprovalQueue';
import { MediaUpload } from './components/MediaUpload';
import { SystemControl } from './components/SystemControl';
import { BrandSettings } from './components/BrandSettings';

type Tab = 'dashboard' | 'generate' | 'approve' | 'media' | 'brand' | 'control';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: 'dashboard' as Tab, name: 'Dashboard', icon: FaHome },
    { id: 'generate' as Tab, name: 'Generate Content', icon: FaMagic },
    { id: 'approve' as Tab, name: 'Approval Queue', icon: FaClipboardCheck },
    { id: 'media' as Tab, name: 'Media Upload', icon: FaImage },
    { id: 'brand' as Tab, name: 'Brand Settings', icon: FaBuilding },
    { id: 'control' as Tab, name: 'System Control', icon: FaCog },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'generate':
        return <ContentGeneration />;
      case 'approve':
        return <ApprovalQueue />;
      case 'media':
        return <MediaUpload />;
      case 'brand':
        return <BrandSettings />;
      case 'control':
        return <SystemControl />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <FaTimes /> : <FaBars />}
              </button>
              <h1 className="ml-2 text-xl font-bold text-gray-900">
                AI Content Agent
              </h1>
            </div>

          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200
            transform transition-transform duration-300 ease-in-out z-40
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                    ${activeTab === item.id
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="text-xl" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* System Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p className="font-semibold mb-1">System Info</p>
              <p>Version 1.0.0</p>
              <p className="mt-1">Native AI Engineer</p>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
