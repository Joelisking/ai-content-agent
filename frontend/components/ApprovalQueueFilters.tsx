import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaSearch, FaFilter } from 'react-icons/fa';

interface ApprovalQueueFiltersProps {
    platformFilter: string;
    setPlatformFilter: (value: string) => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    sortBy: string;
    setSortBy: (value: string) => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: (value: 'asc' | 'desc') => void;
    userFilter: string;
    setUserFilter: (value: string) => void;
    activeTab: string;
}

export const ApprovalQueueFilters: React.FC<ApprovalQueueFiltersProps> = ({
    platformFilter,
    setPlatformFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    userFilter,
    setUserFilter,
    activeTab,
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-muted/30 p-4 rounded-lg border">
            <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder="Search content..."
                    className="pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="w-full md:w-[200px]">
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="bg-background">
                        <div className="flex items-center gap-2">
                            <FaFilter className="h-3 w-3 text-muted-foreground" />
                            <SelectValue placeholder="All Platforms" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-full md:w-[200px]">
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="createdAt">Created Date</SelectItem>
                        {(activeTab === 'approved' || activeTab === 'all') && <SelectItem value="scheduledFor">Scheduled Date</SelectItem>}
                        {(activeTab === 'approved' || activeTab === 'all') && <SelectItem value="approvedAt">Approved Date</SelectItem>}
                        {(activeTab === 'posted' || activeTab === 'all') && <SelectItem value="postedAt">Posted Date</SelectItem>}
                        <SelectItem value="updatedAt">Last Updated</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-[100px]">
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                    <SelectTrigger className="bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Newest</SelectItem>
                        <SelectItem value="asc">Oldest</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(activeTab === 'approved' || activeTab === 'rejected' || activeTab === 'posted') && (
                <div className="w-full md:w-[200px]">
                    <Input
                        placeholder={
                            activeTab === 'approved' || activeTab === 'posted'
                                ? "Approved by..."
                                : "Rejected by..."
                        }
                        className="bg-background"
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                    />
                </div>
            )}
        </div>
    );
};
