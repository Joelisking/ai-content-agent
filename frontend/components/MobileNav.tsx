'use client';

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FaBars } from 'react-icons/fa';
import { Sidebar } from './Sidebar';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

export function MobileNav() {
    return (
        <div className="lg:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
            <h1 className="font-bold text-lg bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                AI Agent
            </h1>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <FaBars className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 border-r-sidebar-border bg-sidebar text-sidebar-foreground">
                    <VisuallyHidden.Root>
                        <SheetTitle>Navigation Menu</SheetTitle>
                    </VisuallyHidden.Root>
                    <Sidebar />
                </SheetContent>
            </Sheet>
        </div>
    );
}
