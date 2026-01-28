import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaImage, FaCheckCircle, FaClock, FaRocket, FaChartLine } from 'react-icons/fa';
import { apiClient, DashboardStats } from '../lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-[100px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6 text-center text-destructive">
          Failed to load dashboard
        </CardContent>
      </Card>
    );
  }



  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/90 to-purple-600/90 p-8 text-primary-foreground shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">AI Content Agent Dashboard</h1>
          <p className="text-primary-foreground/80">
            Automated content creation and posting system with human-in-the-loop controls
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
      </div>

      {/* System Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Mode</CardTitle>
            <div className={`h-2 w-2 rounded-full ${stats.system.mode === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold uppercase tracking-tight">{stats.system.mode}</div>
            <p className="text-xs text-muted-foreground">Current operational state</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Posting</CardTitle>
            <div className={`h-2 w-2 rounded-full ${stats.system.mode === 'active' && stats.system.autoPostingEnabled ? 'bg-green-500' : 'bg-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.system.mode === 'active'
                ? (stats.system.autoPostingEnabled ? 'ENABLED' : 'DISABLED')
                : 'STOPPED'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.system.mode === 'active'
                ? 'Automatic content publishing'
                : `Overridden by ${stats.system.mode} mode`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <FaFileAlt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.content.total}</div>
            <p className="text-xs text-muted-foreground">All generated pieces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <FaClock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.content.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <FaCheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.content.approved}</div>
            <p className="text-xs text-muted-foreground">Ready to post</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <FaRocket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.content.posted}</div>
            <p className="text-xs text-muted-foreground">Live on platforms</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Media Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaImage className="text-primary" />
              Media Library
            </CardTitle>
            <CardDescription>Asset management statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">Total Files</span>
              <Badge variant="secondary" className="text-lg">{stats.media.total}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Placeholder - could be interactive, but keeping simple for now */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump to key tasks</CardDescription>
          </CardHeader>
          <Link href="/generate" className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all hover:-translate-y-0.5 border border-transparent hover:border-border cursor-pointer flex flex-col items-center justify-center">
            <FaChartLine className="mb-2 text-xl text-primary" />
            <span className="text-sm font-medium">Generate</span>
          </Link>
          <Link href="/approve" className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all hover:-translate-y-0.5 border border-transparent hover:border-border cursor-pointer flex flex-col items-center justify-center">
            <FaClock className="mb-2 text-xl text-yellow-500" />
            <span className="text-sm font-medium">Review</span>
          </Link>
          <Link href="/media" className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all hover:-translate-y-0.5 border border-transparent hover:border-border cursor-pointer flex flex-col items-center justify-center">
            <FaImage className="mb-2 text-xl text-blue-500" />
            <span className="text-sm font-medium">Upload</span>
          </Link>
          {/* </CardContent> */}
        </Card>
      </div>

      {/* Workflow Visualization */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Content Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between relative">

      <div className="absolute left-0 right-0 top-1/3 h-0.5 bg-border -z-10" />

      {['Generate', 'Review', 'Approve', 'Post'].map((step, idx) => (
        <div key={step} className="text-center bg-background px-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-sm shadow-sm border-2 ${idx === 0 ? 'border-blue-500 bg-blue-500 text-white' :
            idx === 1 ? 'border-yellow-500 bg-yellow-500 text-white' :
              idx === 2 ? 'border-green-500 bg-green-500 text-white' :
                'border-purple-500 bg-purple-500 text-white'
            }`}>
            {idx + 1}
          </div>
          <span className="text-xs font-medium text-muted-foreground">{step}</span>
        </div>
      ))}
    </div>
        </CardContent >
      </Card > */}
    </div >
  );
};
