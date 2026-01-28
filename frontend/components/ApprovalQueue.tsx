import React, { useState, useEffect, useCallback } from 'react';
import { apiClient, Content, MediaUpload, DashboardStats } from '../lib/api/client';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
import { FaSync, FaHistory } from 'react-icons/fa';

import { ApprovalQueueItem } from './ApprovalQueueItem';
import { ApprovalQueueFilters } from './ApprovalQueueFilters';
import { ApprovalQueueLoading } from './ApprovalQueueLoading';

export const ApprovalQueue: React.FC = () => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats['content'] | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [userFilter, setUserFilter] = useState<string>('');

  // Modals & Actions
  const [repurposeModalOpen, setRepurposeModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<string>('twitter');
  const [repurposeMode, setRepurposeMode] = useState<'create' | 'replace'>('create');

  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [selectedRegenerateId, setSelectedRegenerateId] = useState<string | null>(null);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedApproveId, setSelectedApproveId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleDateTime, setScheduleDateTime] = useState<Date | undefined>(undefined);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectId, setSelectedRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [postNowModalOpen, setPostNowModalOpen] = useState(false);
  const [selectedPostNowId, setSelectedPostNowId] = useState<string | null>(null);

  const [addMediaModalOpen, setAddMediaModalOpen] = useState(false);
  const [selectedMediaContentId, setSelectedMediaContentId] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [availableMedia, setAvailableMedia] = useState<MediaUpload[]>([]);

  // Fetch Stats (Tab Counts)
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.getDashboardStats();
      setStats(response.data.content);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch Content List
  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        sortBy,
        sortOrder
      };
      if (activeTab !== 'all') params.status = activeTab;
      if (platformFilter !== 'all') params.platform = platformFilter;
      if (userFilter) params.user = userFilter;
      if (searchQuery.trim()) params.search = searchQuery;

      const response = await apiClient.getContent(params);
      setContent(response.data);

      // Also refresh stats to keep counts somewhat in sync
      fetchStats();
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error("Failed to fetch content");
    } finally {
      setLoading(false);
    }
  }, [activeTab, platformFilter, searchQuery, sortBy, sortOrder, userFilter, fetchStats]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContent();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, platformFilter, searchQuery, sortBy, sortOrder, userFilter, fetchContent]);


  // --- Action Handlers ---

  const handleApprove = (id: string) => {
    setSelectedApproveId(id);
    setScheduleDate(undefined);
    setScheduleDateTime(undefined);
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!selectedApproveId) return;
    let scheduledFor: string | undefined = undefined;
    if (scheduleDate && scheduleDateTime) {
      const combinedDate = new Date(scheduleDate);
      combinedDate.setHours(scheduleDateTime.getHours(), scheduleDateTime.getMinutes(), 0, 0);
      scheduledFor = combinedDate.toISOString();
    }

    setLoading(true);
    try {
      const response = await apiClient.approveContent(selectedApproveId, 'admin', scheduledFor);
      const data = response.data as any;

      if (data.posted === false && data.postingError) {
        // Content approved but posting failed
        toast.warning(`Content approved but posting failed: ${data.postingError}`);
      } else if (data.posted === true) {
        toast.success('Content approved and posted!');
      } else {
        toast.success(scheduledFor ? 'Content scheduled!' : 'Content approved!');
      }

      setApproveModalOpen(false);
      await fetchContent();
    } catch (error: any) {
      const responseData = error?.response?.data;

      // Handle 422 - content approved but posting failed
      if (error?.response?.status === 422 && responseData?.postingError) {
        toast.warning(`Content approved but posting failed: ${responseData.postingError}`);
        setApproveModalOpen(false);
        await fetchContent();
        return;
      }

      const msg = responseData?.error || responseData?.message || 'Failed to approve';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (id: string) => {
    setSelectedRejectId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedRejectId || !rejectReason.trim()) return;
    try {
      await apiClient.rejectContent(selectedRejectId, 'admin', rejectReason);
      toast.info('Content rejected');
      setRejectModalOpen(false);
      await fetchContent();
    } catch (error) {
      toast.error('Failed to reject content');
    }
  };

  const handleRegenerate = (id: string) => {
    setSelectedRegenerateId(id);
    setRegenerateFeedback('');
    setRegenerateModalOpen(true);
  };

  const handleRegenerateSubmit = async () => {
    if (!selectedRegenerateId) return;
    setLoading(true);
    setRegenerateModalOpen(false);

    try {
      // Start regeneration - returns immediately
      await apiClient.regenerateContent(selectedRegenerateId, regenerateFeedback, 'admin');
      toast.info('Regenerating content...');

      // Poll for completion every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await apiClient.getContentById(selectedRegenerateId);
          const updatedContent = statusResponse.data;

          if (updatedContent.generationStatus === 'completed') {
            clearInterval(pollInterval);
            setLoading(false);
            toast.success('Content regenerated successfully!');
            await fetchContent();
          } else if (updatedContent.generationStatus === 'failed') {
            clearInterval(pollInterval);
            setLoading(false);
            toast.error(updatedContent.generationError || 'Regeneration failed');
            await fetchContent();
          }
          // If still 'generating', continue polling
        } catch (pollError) {
          console.error('Error polling regeneration status:', pollError);
          clearInterval(pollInterval);
          setLoading(false);
          toast.error('Failed to check regeneration status');
        }
      }, 2000);

      // Safety timeout: stop polling after 3 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setLoading(false);
        fetchContent();
      }, 180000);

    } catch (error) {
      toast.error('Failed to start regeneration');
      setLoading(false);
    }
  };

  const handlePostNow = (id: string) => {
    setSelectedPostNowId(id);
    setPostNowModalOpen(true);
  };

  const handlePostNowSubmit = async () => {
    if (!selectedPostNowId) return;
    setLoading(true);
    try {
      await apiClient.postContent(selectedPostNowId, 'admin');
      toast.success('Content posted!');
      setPostNowModalOpen(false);
      await fetchContent();
    } catch (error: any) {
      toast.error('Failed to post: ' + (error?.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRepurpose = (content: Content) => {
    setSelectedContent(content);
    setRepurposeModalOpen(true);
  };

  const handleRepurposeSubmit = async () => {
    if (!selectedContent) return;
    setLoading(true);
    try {
      await apiClient.generateContent({
        brandConfigId: selectedContent.brandConfigId,
        platform: targetPlatform,
        userPrompt: `Repurpose this ${selectedContent.platform} post for ${targetPlatform}.\n\nOriginal:\n${selectedContent.content.text}`,
      });
      toast.success('Content repurposed!');
      setRepurposeModalOpen(false);
      await fetchContent();
    } catch (error) {
      toast.error('Failed to repurpose');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedia = async (contentItem: Content) => {
    setSelectedMediaContentId(contentItem._id);
    setSelectedMediaIds((contentItem.content.mediaIds || []).map(m => typeof m === 'object' ? m._id : m).filter(Boolean));
    try {
      const res = await apiClient.getMedia();
      setAvailableMedia(res.data);
    } catch (e) { console.error(e); }
    setAddMediaModalOpen(true);
  };

  const handleMediaUploadForContent = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Simplified: Just upload and add to selection
    if (!e.target.files?.length) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      const res = await apiClient.uploadMedia(formData);
      setAvailableMedia(prev => [res.data, ...prev]);
      setSelectedMediaIds(prev => [...prev, res.data._id]);
      toast.success('Uploaded');
    } catch (e) {
      toast.error('Upload failed');
    }
  };

  const handleSaveMedia = async () => {
    if (!selectedMediaContentId) return;
    setLoading(true);
    try {
      await apiClient.updateContent(selectedMediaContentId, { mediaIds: selectedMediaIds });
      toast.success('Media saved');
      setAddMediaModalOpen(false);
      await fetchContent();
    } catch (e) {
      toast.error('Failed to update media');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approval Queue</h2>
          <p className="text-muted-foreground">Review and manage AI-generated content</p>
        </div>
        <Button onClick={fetchContent} disabled={loading} variant="outline" className="gap-2">
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <TabsList className="w-full justify-start p-0 bg-transparent h-auto">
            {['all', 'pending', 'approved', 'posted', 'rejected'].map((status) => (
              <TabsTrigger
                key={status}
                value={status}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all capitalize"
              >
                {status}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({stats ? (status === 'all' ? stats.total : (stats as any)[status] || 0) : '-'})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Tabs>

      <ApprovalQueueFilters
        activeTab={activeTab}
        platformFilter={platformFilter}
        setPlatformFilter={setPlatformFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        userFilter={userFilter}
        setUserFilter={setUserFilter}
      />

      {loading ? (
        <ApprovalQueueLoading />
      ) : content.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FaHistory className="mx-auto text-4xl mb-4 opacity-20" />
            No content found for this filter
          </CardContent>
        </Card>
      ) : (

        <div className="grid gap-6">
          {content.map(item => (
            <ApprovalQueueItem
              key={item._id}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              onRegenerate={handleRegenerate}
              onRepurpose={handleRepurpose}
              onAddMedia={handleAddMedia}
              onPostNow={handlePostNow}
            />
          ))}
        </div>
      )}


      {/* Repurpose Modal */}
      <Dialog open={repurposeModalOpen} onOpenChange={setRepurposeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repurpose Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Platform</Label>
              <RadioGroup value={targetPlatform} onValueChange={setTargetPlatform} className="flex gap-4">
                {['linkedin', 'instagram', 'twitter', 'facebook'].map(p => (
                  <div key={p} className="flex items-center space-x-2">
                    <RadioGroupItem value={p} id={p} />
                    <Label htmlFor={p} className="capitalize">{p}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepurposeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRepurposeSubmit} disabled={loading}>Repurpose</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Content</DialogTitle>
            <DialogDescription>Approve for posting or schedule for later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-2">
              <Label>Schedule Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={scheduleDate} onSelect={(d) => { setScheduleDate(d); if (d && !scheduleDateTime) { const t = new Date(); t.setHours(9, 0, 0, 0); setScheduleDateTime(t); } }} /></PopoverContent>
              </Popover>
            </div>
            {scheduleDate && (
              <div className="flex flex-col space-y-2">
                <Label>Time</Label>
                <TimePicker date={scheduleDateTime} setDate={setScheduleDateTime} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleApproveSubmit} className="bg-green-600 hover:bg-green-700 text-white">
              {scheduleDate ? 'Schedule' : 'Approve & Post Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Content</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Modal */}
      <Dialog open={regenerateModalOpen} onOpenChange={setRegenerateModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Regenerate</DialogTitle></DialogHeader>
          <Textarea value={regenerateFeedback} onChange={e => setRegenerateFeedback(e.target.value)} placeholder="Feedback..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRegenerateSubmit} disabled={loading}>
              {loading ? (
                <>
                  <FaSync className="mr-2 h-4 w-4 animate-spin" /> Regenerating...
                </>
              ) : (
                'Regenerate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Now Modal */}
      <Dialog open={postNowModalOpen} onOpenChange={setPostNowModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Now?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostNowModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePostNowSubmit} className="bg-green-600 text-white">Post Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Media Modal */}
      <Dialog open={addMediaModalOpen} onOpenChange={setAddMediaModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Manage Media</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
            <div className="col-span-3">
              <input type="file" onChange={handleMediaUploadForContent} accept="image/*,video/*" />
            </div>
            {availableMedia.map(m => (
              <div key={m._id}
                className={cn("border rounded p-1 cursor-pointer", selectedMediaIds.includes(m._id) ? "ring-2 ring-primary" : "")}
                onClick={() => {
                  setSelectedMediaIds(prev => prev.includes(m._id) ? prev.filter(id => id !== m._id) : [...prev, m._id]);
                }}
              >
                <div className="h-24 bg-muted relative overflow-hidden group">
                  {m.mimetype.startsWith('image/') ? (
                    <img
                      src={m.path}
                      alt={m.originalName}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs p-2 text-center break-all">
                      {m.originalName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveMedia}>Save Selection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
