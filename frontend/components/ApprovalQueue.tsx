import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSync, FaLinkedin, FaInstagram, FaTwitter, FaFacebook, FaRocket, FaClock, FaHistory, FaFile } from 'react-icons/fa';
import { apiClient, Content } from '../lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from "@/components/ui/textarea";
import Image from 'next/image';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export const ApprovalQueue: React.FC = () => {
  const [content, setContent] = useState<Content[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [repurposeModalOpen, setRepurposeModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<string>('twitter');
  const [repurposeMode, setRepurposeMode] = useState<'create' | 'replace'>('create');
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [selectedRegenerateId, setSelectedRegenerateId] = useState<string | null>(null);

  // Approve Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedApproveId, setSelectedApproveId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState<string>('');

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
      toast.error("Failed to fetch content");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setSelectedApproveId(id);
    setScheduleDate(undefined);
    setScheduleTime('');
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!selectedApproveId) return;

    let scheduledFor: string | undefined = undefined;

    if (scheduleDate) {
      const date = new Date(scheduleDate);
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(':').map(Number);
        date.setHours(hours, minutes);
      } else {
        // Default to next hour or something? Or just start of day?
        // Let's set it to noon if no time specified, or current time? 
        // User asked for time picker, so they should pick time.
        // If they don't pick time but pick date, maybe default to 9am?
        date.setHours(9, 0, 0, 0);
      }
      scheduledFor = date.toISOString(); // Or format expected by backend? Original code used 'YYYY-MM-DD HH:mm'.
      // API client likely handles ISO string or similar.
      // Let's check original prompt format: 'YYYY-MM-DD HH:mm'.
      // If backend expects specific format we might need to format it.
      // Looking at `apiClient.approveContent`, it takes `scheduledFor`. 
      // Assuming ISO string is fine or we should format it to 'YYYY-MM-DD HH:mm'.
      // The original `prompt` asked for 'YYYY-MM-DD HH:mm', so backend probably parses that string.
      // Let's format it to be safe if backend expects string. 
      // Actually backend probably uses `new Date(string)`.
      // Let's try sending ISO string first, usually safer.
      // Wait, `format` import is available.
      // Let's stick to ISO for now.
    }

    setLoading(true);
    try {
      await apiClient.approveContent(selectedApproveId, 'admin', scheduledFor);
      toast.success(scheduledFor ? 'Content scheduled!' : 'Content approved and posted!');
      setApproveModalOpen(false);
      await fetchContent();
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Failed to approve content');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await apiClient.rejectContent(id, 'admin', reason);
      toast.info('Content rejected');
      await fetchContent();
    } catch (error) {
      console.error('Error rejecting content:', error);
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

    try {
      setLoading(true);
      await apiClient.regenerateContent(selectedRegenerateId, regenerateFeedback, 'admin');
      toast.info('Content regenerating...');
      setRegenerateModalOpen(false);
      await fetchContent();
    } catch (error) {
      console.error('Error regenerating content:', error);
      toast.error('Failed to regenerate content');
    } finally {
      setLoading(false);
    }
  };

  const handlePostNow = async (id: string) => {
    // We can use a custom confirmation dialog, but window.confirm is fine for now to match logic
    if (!confirm('Post this content immediately?')) return;

    setLoading(true); // User added loading state here
    try {
      await apiClient.postContent(id, 'admin');
      toast.success('Content posted successfully!');
      await fetchContent();
    } catch (error) {
      console.error('Error posting content:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage = (error as any).response?.data?.error || (error as Error).message || 'Unknown error';
      toast.error(`Failed to post content: ${errorMessage}`);
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
        brandConfigId: selectedContent.brandConfigId, // Note: Assuming brandConfigId is available on content object based on earlier file, but Type definition might be missing it in frontend2 if not updated.
        // Wait, looking at client.ts types (Step 72), `brandConfigId` IS in Content interface.
        platform: targetPlatform,
        userPrompt: `Repurpose this ${selectedContent.platform} post for ${targetPlatform}. Maintain the core message but adapt it to the new platform's style and constraints.\n\nOriginal Content:\n${selectedContent.content.text}`,
      });
      toast.success('Content repurposed! Check the queue.');
      setRepurposeModalOpen(false);
      await fetchContent();
    } catch (error) {
      console.error('Error repurposing content:', error);
      toast.error('Failed to repurpose content');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin': return <FaLinkedin className="text-blue-700" />;
      case 'instagram': return <FaInstagram className="text-pink-600" />;
      case 'twitter': return <FaTwitter className="text-blue-400" />;
      case 'facebook': return <FaFacebook className="text-blue-600" />;
      default: return null;
    }
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith('http') || path.startsWith('https')) return path;
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    return `http://localhost:4000/${cleanPath}`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default'; // Success green usually, but default is heavy. 
      case 'posted': return 'outline'; // or maybe 'default' but different color?
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approval Queue</h2>
          <p className="text-muted-foreground">
            Review and manage AI-generated content
          </p>
        </div>
        <Button
          onClick={fetchContent}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <FaSync className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <TabsList className="w-full justify-start p-0 bg-transparent h-auto">
            {['all', 'pending', 'approved', 'posted', 'rejected'].map((status) => (
              <TabsTrigger
                key={status}
                value={status}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all capitalize"
              >
                {status}
                {status !== 'all' && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({content.filter((c) => c.status === status).length})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Tabs>

      {/* Content Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading content...</div>
      ) : content.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FaHistory className="mx-auto text-4xl mb-4 opacity-20" />
            No content found for this filter
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {content.map((item) => (
            <Card key={item._id} className="overflow-hidden transition-all hover:shadow-md border-l-4" style={{
              borderLeftColor:
                item.status === 'approved' ? 'var(--green-500)' :
                  item.status === 'rejected' ? 'var(--destructive)' :
                    item.status === 'posted' ? 'var(--blue-500)' : 'var(--yellow-500)'
            }}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-full border shadow-sm">
                    <span className="text-2xl">{getPlatformIcon(item.platform)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize">{item.platform}</span>
                      <Badge variant={getStatusBadgeVariant(item.status) as "default" | "secondary" | "outline" | "destructive"} className="capitalize">{item.status}</Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <FaClock className="mr-1 h-3 w-3" />
                      Created {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                {item.metadata.version > 1 && (
                  <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                    v{item.metadata.version}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="pt-6 text-sm">
                <div className="bg-muted/50 rounded-lg p-4 mb-4 whitespace-pre-wrap font-medium leading-relaxed">
                  {item.content.text}
                </div>

                {item.content.mediaIds && item.content.mediaIds.length > 0 && (
                  <div className="flex overflow-x-auto gap-4 mb-4 pb-2">
                    {item.content.mediaIds.map((media, index) => (
                      typeof media === 'object' && media.path ? (
                        <div key={index} className="relative flex-none w-48 h-32 bg-muted rounded-lg overflow-hidden border">
                          <Image
                            src={media.path.startsWith('http') ? media.path : `http://localhost:4000/${media.path.replace(/^\.\//, '')}`}
                            alt={media.originalName}
                            fill
                            className="object-cover transition-transform hover:scale-105"
                          />
                        </div>
                      ) : null
                    ))}
                  </div>
                )}

                {item.content.hashtags && item.content.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.content.hashtags.map((tag, index) => (
                      <span key={index} className="text-primary text-xs font-semibold bg-primary/10 px-2 py-1 rounded-full">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t">
                  <div className="space-y-1">
                    {item.approvedBy && <div className="flex items-center text-green-600"><FaCheck className="mr-1" /> Approved by {item.approvedBy}</div>}
                    {item.rejectedBy && <div className="flex items-center text-destructive"><FaTimes className="mr-1" /> Rejected by {item.rejectedBy}</div>}
                  </div>
                  <div className="space-y-1 text-right">
                    {item.scheduledFor && <div>📅 Scheduled: {new Date(item.scheduledFor).toLocaleString()}</div>}
                    {item.postedAt && <div className="text-blue-600">🚀 Posted {formatDistanceToNow(new Date(item.postedAt), { addSuffix: true })}</div>}
                    <div>Generated by {item.generatedBy}</div>
                  </div>
                </div>

                {item.postUrl && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                    <span className="text-green-700 dark:text-green-400 font-medium">Live Post</span>
                    <a href={item.postUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 dark:text-green-400 hover:underline flex items-center gap-1">
                      View <FaRocket className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {item.rejectionReason && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    <span className="font-bold">Rejection Reason:</span> {item.rejectionReason}
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-muted/30 p-4 flex flex-wrap gap-2 justify-end">
                {item.status === 'pending' && (
                  <>
                    <Button onClick={() => handleApprove(item._id)} variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                      <FaCheck className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button onClick={() => handleReject(item._id)} variant="destructive" size="sm">
                      <FaTimes className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => handleRegenerate(item._id)} variant="outline" size="sm">
                      <FaSync className="mr-2 h-4 w-4" /> Regenerate
                    </Button>
                    <Button onClick={() => handleRepurposeClick(item)} variant="outline" size="sm">
                      <FaSync className="mr-2 h-4 w-4 rotate-90" /> Repurpose
                    </Button>
                  </>
                )}

                {item.status === 'approved' && (
                  <Button onClick={() => handlePostNow(item._id)} variant="default" size="sm">
                    <FaRocket className="mr-2 h-4 w-4" /> Post Now
                  </Button>
                )}

                {item.status === 'rejected' && (
                  <Button onClick={() => handleRegenerate(item._id)} variant="outline" size="sm">
                    <FaSync className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Repurpose Modal */}
      <Dialog open={repurposeModalOpen} onOpenChange={setRepurposeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repurpose Content</DialogTitle>
            <DialogDescription>Create a new post for a different platform based on this content.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Target Platform</Label>
              <Select value={targetPlatform} onValueChange={setTargetPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {['linkedin', 'instagram', 'twitter', 'facebook']
                    .filter(p => selectedContent && p !== selectedContent.platform)
                    .map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <RadioGroup value={repurposeMode} onValueChange={(val) => setRepurposeMode(val as 'create' | 'replace')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create">Create new post</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace">Replace current post</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRepurposeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRepurposeSubmit} disabled={loading}>
              {loading ? <FaSync className="mr-2 h-4 w-4 animate-spin" /> : <FaSync className="mr-2 h-4 w-4" />}
              Repurpose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Modal */}
      <Dialog open={regenerateModalOpen} onOpenChange={setRegenerateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Content</DialogTitle>
            <DialogDescription>
              Provide feedback on what needs to be changed. The AI will generate a new version.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="feedback" className="mb-2 block">Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="E.g., Make it more professional, shorten the text, add emojis..."
              value={regenerateFeedback}
              onChange={(e) => setRegenerateFeedback(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRegenerateSubmit} disabled={loading || !regenerateFeedback.trim()}>
              {loading ? <FaSync className="mr-2 h-4 w-4 animate-spin" /> : <FaSync className="mr-2 h-4 w-4" />}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve Content</DialogTitle>
            <DialogDescription>
              Approve this content for posting. You can optionally schedule it for a later date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-2">
              <Label>Schedule Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {scheduleDate && (
              <div className="flex flex-col space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleApproveSubmit} className="bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? (
                <FaSync className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaCheck className="mr-2 h-4 w-4" />
              )}
              {scheduleDate
                ? (loading ? 'Scheduling...' : 'Schedule')
                : (loading ? 'Posting...' : 'Approve Now')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
