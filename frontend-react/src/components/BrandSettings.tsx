import React, { useState, useEffect } from 'react';
import { FaSave, FaPlus, FaTimes, FaEdit } from 'react-icons/fa';
import { apiClient, Brand } from '../api/client';

export const BrandSettings: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [voiceTone, setVoiceTone] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [keyMessages, setKeyMessages] = useState<string[]>([]);
  const [doNotMention, setDoNotMention] = useState<string[]>([]);
  const [approverEmails, setApproverEmails] = useState<string[]>([]);

  // Input states for array fields
  const [newTone, setNewTone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newDoNotMention, setNewDoNotMention] = useState('');
  const [newApproverEmail, setNewApproverEmail] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getBrands();
      setBrands(response.data);
      if (response.data.length > 0) {
        selectBrand(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setName(brand.name);
    setIndustry(brand.industry);
    setVoiceTone([...brand.voiceTone]);
    setTargetAudience(brand.targetAudience);
    setKeyMessages([...brand.keyMessages]);
    setDoNotMention([...brand.doNotMention]);
    setApproverEmails(brand.approverEmails ? [...brand.approverEmails] : []);
  };

  const handleSave = async () => {
    if (!selectedBrand) return;

    setSaving(true);
    try {
      const response = await apiClient.updateBrand(selectedBrand._id, {
        name,
        industry,
        voiceTone,
        targetAudience,
        keyMessages,
        doNotMention,
        approverEmails,
      });

      // Update local state
      setBrands(brands.map(b => b._id === selectedBrand._id ? response.data : b));
      setSelectedBrand(response.data);
      alert('Brand updated successfully!');
    } catch (error) {
      console.error('Error updating brand:', error);
      alert('Failed to update brand');
    } finally {
      setSaving(false);
    }
  };

  const addToArray = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (value.trim()) {
      setter(prev => [...prev, value.trim()]);
      inputSetter('');
    }
  };

  const removeFromArray = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading brands...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Brand Settings</h2>
          <div className="flex items-center space-x-2">
            <FaEdit className="text-gray-400" />
            <span className="text-sm text-gray-500">Edit brand information</span>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Brand to Edit
          </label>
          <select
            value={selectedBrand?._id || ''}
            onChange={(e) => {
              const brand = brands.find(b => b._id === e.target.value);
              if (brand) selectBrand(brand);
            }}
            className="input"
          >
            {brands.map((brand) => (
              <option key={brand._id} value={brand._id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {selectedBrand && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="input min-h-[80px]"
                placeholder="Describe your target audience..."
              />
            </div>

            {/* Voice Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice & Tone
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {voiceTone.map((tone, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {tone}
                    <button
                      onClick={() => removeFromArray(index, setVoiceTone)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      <FaTimes size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTone}
                  onChange={(e) => setNewTone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addToArray(newTone, setVoiceTone, setNewTone)}
                  className="input flex-1"
                  placeholder="Add tone (e.g., professional, friendly)..."
                />
                <button
                  onClick={() => addToArray(newTone, setVoiceTone, setNewTone)}
                  className="btn-secondary px-4"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            {/* Key Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Messages
              </label>
              <div className="space-y-2 mb-2">
                {keyMessages.map((message, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <span className="text-sm text-green-800">{message}</span>
                    <button
                      onClick={() => removeFromArray(index, setKeyMessages)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addToArray(newMessage, setKeyMessages, setNewMessage)}
                  className="input flex-1"
                  placeholder="Add a key message..."
                />
                <button
                  onClick={() => addToArray(newMessage, setKeyMessages, setNewMessage)}
                  className="btn-secondary px-4"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            {/* Do Not Mention */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topics to Avoid (Do Not Mention)
              </label>
              <div className="space-y-2 mb-2">
                {doNotMention.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <span className="text-sm text-red-800">{item}</span>
                    <button
                      onClick={() => removeFromArray(index, setDoNotMention)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDoNotMention}
                  onChange={(e) => setNewDoNotMention(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addToArray(newDoNotMention, setDoNotMention, setNewDoNotMention)}
                  className="input flex-1"
                  placeholder="Add topic to avoid..."
                />
                <button
                  onClick={() => addToArray(newDoNotMention, setDoNotMention, setNewDoNotMention)}
                  className="btn-secondary px-4"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            {/* Approver Emails */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approver Emails
              </label>
              <div className="space-y-2 mb-2">
                {approverEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <span className="text-sm text-blue-800">{email}</span>
                    <button
                      onClick={() => removeFromArray(index, setApproverEmails)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newApproverEmail}
                  onChange={(e) => setNewApproverEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addToArray(newApproverEmail, setApproverEmails, setNewApproverEmail)}
                  className="input flex-1"
                  placeholder="Add approver email..."
                />
                <button
                  onClick={() => addToArray(newApproverEmail, setApproverEmails, setNewApproverEmail)}
                  className="btn-secondary px-4"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <FaSave />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
