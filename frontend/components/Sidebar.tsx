'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    FaHome,
    FaMagic,
    FaClipboardCheck,
    FaImage,
    FaCog,
    FaBuilding,
    FaUsers,
} from 'react-icons/fa';
import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NavigationItem {
    href: string;
    name: string;
    icon: React.ElementType;
}

const navigation: NavigationItem[] = [
    { href: '/', name: 'Dashboard', icon: FaHome },
    { href: '/generate', name: 'Generate Content', icon: FaMagic },
    { href: '/approve', name: 'Approval Queue', icon: FaClipboardCheck },
    { href: '/media', name: 'Media Upload', icon: FaImage },
    { href: '/brand', name: 'Brand Settings', icon: FaBuilding },
    { href: '/control', name: 'System Control', icon: FaCog },
    { href: '/admin/users', name: 'Team', icon: FaUsers },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const { logout } = useAuth();

    return (
        <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
            <div className="p-6">
                <Link href="/" onClick={onNavigate}>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                        AI Content Agent
                    </h1>
                </Link>

            </div>

            <div className="flex-1 px-4 overflow-y-auto">
                <nav className="space-y-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Button
                                key={item.href}
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-3",
                                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                                )}
                                asChild
                                onClick={onNavigate}
                            >
                                <Link href={item.href}>
                                    <Icon className="text-lg" />
                                    <span>{item.name}</span>
                                </Link>
                            </Button>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-sidebar-border mt-auto space-y-4">
                <Button
                    variant="outline"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => logout()}
                >
                    Log Out
                </Button>

                <div className="text-xs text-muted-foreground">
                    <p className="font-semibold mb-1 text-sidebar-foreground">System Info</p>
                    <p>Version 1.0.0</p>
                    <p className="mt-1">Native AI Engineer</p>
                </div>
            </div>
        </div>
    );
}
