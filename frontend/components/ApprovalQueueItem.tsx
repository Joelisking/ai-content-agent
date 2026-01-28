
import React from 'react';
import { Content, MediaUpload } from '../lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { FaCheck, FaTimes, FaSync, FaLinkedin, FaInstagram, FaTwitter, FaFacebook, FaRocket, FaClock, FaImage } from 'react-icons/fa';

interface ApprovalQueueItemProps {
    item: Content;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onRegenerate: (id: string) => void;
    onRepurpose: (content: Content) => void;
    onAddMedia: (content: Content) => void;
    onPostNow: (id: string) => void;
}

export const ApprovalQueueItem: React.FC<ApprovalQueueItemProps> = ({
    item,
    onApprove,
    onReject,
    onRegenerate,
    onRepurpose,
    onAddMedia,
    onPostNow
}) => {

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'linkedin': return <FaLinkedin className="text-blue-700" />;
            case 'instagram': return <FaInstagram className="text-pink-600" />;
            case 'twitter': return <FaTwitter className="text-blue-400" />;
            case 'facebook': return <FaFacebook className="text-blue-600" />;
            default: return null;
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'pending': return 'secondary';
            case 'approved': return 'default';
            case 'posted': return 'outline';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card className="overflow-hidden transition-all hover:shadow-md border-l-4" style={{
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
                            <Badge variant={getStatusBadgeVariant(item.status) as any} className="capitalize">{item.status}</Badge>
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
                            typeof media === 'object' && (media as any).path ? (
                                <div key={index} className="relative flex-none w-48 h-32 bg-muted rounded-lg overflow-hidden border">
                                    <Image
                                        src={(media as any).path.startsWith('http') ? (media as any).path : `/uploads/${(media as any).path.replace(/^\.\//, '').replace(/^uploads\//, '')}`}
                                        alt={(media as any).originalName || 'Media'}
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
                        <Button onClick={() => onAddMedia(item)} variant="outline" size="sm">
                            <FaImage className="mr-2 h-4 w-4" /> Add Media
                        </Button>
                        <Button onClick={() => onApprove(item._id)} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <FaCheck className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button onClick={() => onReject(item._id)} variant="destructive" size="sm">
                            <FaTimes className="mr-2 h-4 w-4" /> Reject
                        </Button>
                        <Button onClick={() => onRegenerate(item._id)} variant="outline" size="sm">
                            <FaSync className="mr-2 h-4 w-4" /> Regenerate
                        </Button>
                        <Button onClick={() => onRepurpose(item)} variant="outline" size="sm">
                            <FaSync className="mr-2 h-4 w-4 rotate-90" /> Repurpose
                        </Button>
                    </>
                )}

                {item.status === 'approved' && (
                    <>
                        <Button onClick={() => onAddMedia(item)} variant="outline" size="sm">
                            <FaImage className="mr-2 h-4 w-4" /> Add Media
                        </Button>
                        <Button onClick={() => onPostNow(item._id)} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <FaRocket className="mr-2 h-4 w-4" /> Post Now
                        </Button>
                    </>
                )}

                {item.status === 'rejected' && (
                    <Button onClick={() => onRegenerate(item._id)} variant="outline" size="sm">
                        <FaSync className="mr-2 h-4 w-4" /> Regenerate
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};
