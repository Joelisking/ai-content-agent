
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ApprovalQueueLoading: React.FC = () => {
    // Render 3 skeleton items
    return (
        <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border-l-4 border-l-transparent">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 bg-muted/30">
                        <div className="flex items-center gap-3 w-full">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-16" />
                    </CardHeader>

                    <CardContent className="pt-6">
                        {/* Text content area */}
                        <div className="space-y-2 mb-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>

                        {/* Media area */}
                        <div className="flex gap-4 mb-4">
                            <Skeleton className="h-32 w-48 rounded-lg" />
                        </div>

                        {/* Footer info line */}
                        <div className="flex justify-between mt-4 pt-4 border-t">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </CardContent>

                    <CardFooter className="bg-muted/30 p-4 flex flex-wrap gap-2 justify-end">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};
