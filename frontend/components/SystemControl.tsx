import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FaPause, FaPlay, FaExclamationTriangle, FaHandPaper, FaCheckCircle, FaCog, FaLinkedin, FaUnlink, FaInstagram } from 'react-icons/fa';
import { apiClient, SystemControl as SystemControlType } from '../lib/api/client';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const SystemControl: React.FC = () => {
  const { user, login } = useAuth(); // We might need to refresh user, usually getMe or just refresh page.
  const [control, setControl] = useState<SystemControlType | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [crisisModalOpen, setCrisisModalOpen] = useState(false);
  const [crisisReason, setCrisisReason] = useState('');
  const [disconnectLinkedInModal, setDisconnectLinkedInModal] = useState(false);
  const [disconnectInstagramModal, setDisconnectInstagramModal] = useState(false);

  useEffect(() => {
    fetchControl();
  }, []);

  const fetchControl = async () => {
    try {
      const response = await apiClient.getSystemControl();
      setControl(response.data);
    } catch (error) {
      console.error('Error fetching system control:', error);
      toast.error("Failed to load system control");
    }
  };

  const updateMode = async (mode: string, reason?: string) => {
    setLoading(true);
    try {
      const response = await apiClient.updateSystemControl({
        mode,
        changedBy: 'admin',
        reason,
        settings: control?.settings, // Preserve settings
      });
      setControl(response.data);
      toast.success(`System mode changed to: ${mode.toUpperCase()}`);
    } catch (error) {
      console.error('Error updating system mode:', error);
      toast.error('Failed to to update system mode');
    } finally {
      setLoading(false);
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'manual-only': return 'bg-blue-500';
      case 'crisis': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!control) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center">
          <FaCog className="animate-spin text-4xl text-primary mb-4" />
          <p className="text-muted-foreground">Loading system control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Control</h2>
          <p className="text-muted-foreground">Manage system operation modes and safeguards</p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground">Current Status:</span>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getModeColor(control.mode)} animate-pulse`}></div>
            <Badge variant={
              control.mode === 'active' ? 'default' :
                control.mode === 'crisis' ? 'destructive' :
                  'secondary'
            } className="text-base uppercase px-3 py-1">
              {control.mode}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Mode */}
        <Card className={`cursor-pointer transition-all hover:ring-2 hover:ring-green-500 hover:-translate-y-1 ${control.mode === 'active' ? 'border-green-500 bg-green-500/5' : ''
          }`} onClick={() => !loading && control.mode !== 'active' && updateMode('active')}>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto rounded-full bg-green-100 p-4 mb-2">
              <FaPlay className="text-2xl text-green-600" />
            </div>
            <CardTitle className="text-green-700 dark:text-green-400">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">Full automation enabled. AI generates and posts content per schedule.</p>
          </CardContent>
        </Card>

        {/* Paused Mode */}
        <Card className={`cursor-pointer transition-all hover:ring-2 hover:ring-yellow-500 hover:-translate-y-1 ${control.mode === 'paused' ? 'border-yellow-500 bg-yellow-500/5' : ''
          }`} onClick={() => {
            if (loading || control.mode === 'paused') return;
            setPauseReason('');
            setPauseModalOpen(true);
          }}>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto rounded-full bg-yellow-100 p-4 mb-2">
              <FaPause className="text-2xl text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-700 dark:text-yellow-400">Paused</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">All automation halted. No content generation or posting.</p>
          </CardContent>
        </Card>

        {/* Manual-Only Mode */}
        <Card className={`cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 hover:-translate-y-1 ${control.mode === 'manual-only' ? 'border-blue-500 bg-blue-500/5' : ''
          }`} onClick={() => !loading && control.mode !== 'manual-only' && updateMode('manual-only')}>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto rounded-full bg-blue-100 p-4 mb-2">
              <FaHandPaper className="text-2xl text-blue-600" />
            </div>
            <CardTitle className="text-blue-700 dark:text-blue-400">Manual-Only</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">AI generates drafts but requires manual approval for all actions.</p>
          </CardContent>
        </Card>

        {/* Crisis Mode */}
        <Card className={`cursor-pointer transition-all hover:ring-2 hover:ring-destructive hover:-translate-y-1 ${control.mode === 'crisis' ? 'border-destructive bg-destructive/5' : ''
          }`} onClick={() => {
            if (loading || control.mode === 'crisis') return;
            setCrisisReason('');
            setCrisisModalOpen(true);
          }}>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto rounded-full bg-destructive/10 p-4 mb-2">
              <FaExclamationTriangle className="text-2xl text-destructive" />
            </div>
            <CardTitle className="text-destructive">Crisis</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">Emergency shutdown. All operations blocked immediately.</p>
          </CardContent>
        </Card>
      </div>

      {/* Social Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaLinkedin className="text-blue-700" /> Social Connections
          </CardTitle>
          <CardDescription>Manage authorized social media accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-full border shadow-sm">
                <FaLinkedin className="text-2xl text-[#0077b5]" />
              </div>
              <div>
                <h4 className="font-semibold">LinkedIn</h4>
                {user?.linkedinName ? (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <FaCheckCircle className="w-3 h-3" /> Connected as {user.linkedinName}
                  </p>
                ) : control?.systemConnections?.linkedin ? (
                  <p className="text-sm text-blue-600 flex items-center gap-1">
                    <FaCheckCircle className="w-3 h-3" /> Connected via System (.env)
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            <div>
              {user?.linkedinName ? (
                <button
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors flex items-center gap-2"
                  onClick={() => setDisconnectLinkedInModal(true)}
                >
                  <FaUnlink /> Disconnect
                </button>
              ) : (
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0077b5] rounded-md hover:bg-[#006097] transition-colors shadow-sm"
                  onClick={async () => {
                    try {
                      const { data } = await apiClient.getLinkedInAuthUrl();
                      window.location.href = data.url;
                    } catch (e) {
                      toast.error('Failed to start connection flow');
                    }
                  }}
                >
                  Connect LinkedIn
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 mt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-full border shadow-sm">
                <FaInstagram className="text-2xl text-[#E1306C]" />
              </div>
              <div>
                <h4 className="font-semibold">Instagram Business</h4>
                {user?.instagramUsername ? (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <FaCheckCircle className="w-3 h-3" /> Connected as @{user.instagramUsername}
                  </p>
                ) : control?.systemConnections?.instagram ? (
                  <p className="text-sm text-blue-600 flex items-center gap-1">
                    <FaCheckCircle className="w-3 h-3" /> Connected via System (.env)
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            <div>
              {user?.instagramUsername ? (
                <button
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors flex items-center gap-2"
                  onClick={() => setDisconnectInstagramModal(true)}
                >
                  <FaUnlink /> Disconnect
                </button>
              ) : (
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-[#E1306C] rounded-md hover:bg-[#C13584] transition-colors shadow-sm"
                  onClick={async () => {
                    try {
                      const { data } = await apiClient.getInstagramAuthUrl();
                      window.location.href = data.url;
                    } catch (e) {
                      toast.error('Failed to start connection flow');
                    }
                  }}
                >
                  Connect Instagram
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaCog /> System Settings
          </CardTitle>
          <CardDescription>Configuration parameters for the automation engine</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="text-sm text-muted-foreground mb-1">Auto-Posting</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                {control.settings.autoPostingEnabled ? (
                  <>
                    <FaCheckCircle className="text-green-500" /> Enabled
                  </>
                ) : (
                  <>
                    <FaPause className="text-red-500" /> Disabled
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="text-sm text-muted-foreground mb-1">Approval Required</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                <FaHandPaper className={control.settings.requireApprovalForAll ? "text-blue-500" : "text-muted-foreground"} />
                {control.settings.requireApprovalForAll ? 'Yes' : 'No'}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="text-sm text-muted-foreground mb-1">Daily Post Limit</div>
              <div className="text-xl font-semibold">
                {control.settings.maxDailyPosts} <span className="text-sm text-muted-foreground font-normal">posts/day</span>
              </div>
            </div>
          </div>

          {control.reason && (
            <Alert className="mt-6 border-muted bg-muted/20">
              <FaExclamationTriangle className="h-4 w-4 opacity-50" />
              <AlertTitle>Last Change Reason</AlertTitle>
              <AlertDescription>
                {control.reason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Pause Mode Modal */}
      <Dialog open={pauseModalOpen} onOpenChange={setPauseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaPause className="text-yellow-600" /> Pause System
            </DialogTitle>
            <DialogDescription>
              All automation will be halted. No content generation or posting will occur.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="pause-reason">Reason (optional)</Label>
            <Input
              id="pause-reason"
              placeholder="Enter reason for pausing..."
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={() => {
                updateMode('paused', pauseReason || undefined);
                setPauseModalOpen(false);
              }}
              disabled={loading}
            >
              <FaPause className="mr-2 h-4 w-4" /> Pause System
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crisis Mode Modal */}
      <Dialog open={crisisModalOpen} onOpenChange={setCrisisModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <FaExclamationTriangle /> Crisis Mode
            </DialogTitle>
            <DialogDescription>
              <strong className="text-destructive">Warning:</strong> This will immediately stop all content generation and posting. All operations will be blocked.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="crisis-reason">Reason (required)</Label>
            <Input
              id="crisis-reason"
              placeholder="Enter reason for activating crisis mode..."
              value={crisisReason}
              onChange={(e) => setCrisisReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCrisisModalOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (crisisReason.trim()) {
                  updateMode('crisis', crisisReason);
                  setCrisisModalOpen(false);
                }
              }}
              disabled={loading || !crisisReason.trim()}
            >
              <FaExclamationTriangle className="mr-2 h-4 w-4" /> Activate Crisis Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect LinkedIn Modal */}
      <Dialog open={disconnectLinkedInModal} onOpenChange={setDisconnectLinkedInModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaLinkedin className="text-[#0077b5]" /> Disconnect LinkedIn
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your LinkedIn account? You will need to reconnect to post to LinkedIn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectLinkedInModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await apiClient.disconnectLinkedIn();
                  setDisconnectLinkedInModal(false);
                  window.location.reload();
                } catch (e) {
                  toast.error('Failed to disconnect');
                }
              }}
            >
              <FaUnlink className="mr-2 h-4 w-4" /> Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Instagram Modal */}
      <Dialog open={disconnectInstagramModal} onOpenChange={setDisconnectInstagramModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaInstagram className="text-[#E1306C]" /> Disconnect Instagram
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your Instagram account? You will need to reconnect to post to Instagram.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectInstagramModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await apiClient.disconnectInstagram();
                  setDisconnectInstagramModal(false);
                  window.location.reload();
                } catch (e) {
                  toast.error('Failed to disconnect');
                }
              }}
            >
              <FaUnlink className="mr-2 h-4 w-4" /> Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};
