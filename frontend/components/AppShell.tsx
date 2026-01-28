'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

// Routes where the sidebar/layout should be hidden
const PUBLIC_ROUTES = ['/login', '/register'];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    if (isPublicRoute) {
        return (
            <main className="min-h-screen w-full bg-background">
                {children}
            </main>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 h-screen sticky top-0">
                <Sidebar />
            </aside>

            <div className="flex-1 flex flex-col min-h-screen">
                <MobileNav
                    open={mobileNavOpen}
                    onOpenChange={setMobileNavOpen}
                    onNavigate={() => setMobileNavOpen(false)}
                />

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-8 pt-4 lg:pt-8 w-full max-w-7xl mx-auto overflow-x-hidden">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
