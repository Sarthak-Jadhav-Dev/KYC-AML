"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X, LogOut, User, Workflow, PlayCircle, Users } from 'lucide-react';

interface UserData {
    id: string;
    email: string;
    name: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState<UserData | null>(null);

    useEffect(() => {
        // Check authentication
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Not authenticated');
            })
            .then(data => setUser(data.user))
            .catch(() => {
                // Not authenticated, redirect to login
                router.push('/login');
            });
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const tabs = [
        { name: 'Workflows', href: '/dashboard/workflows', icon: Workflow },
        { name: 'Executions', href: '/dashboard/executions', icon: PlayCircle },
        { name: 'Team', href: '/dashboard/team', icon: Users },
    ];

    const isActiveTab = (href: string) => pathname?.startsWith(href);

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Top Navigation Bar with Chrome-style Tabs */}
            <div className="border-b bg-muted/30">
                <div className="flex items-center h-12 px-2">
                    {/* Sidebar Toggle Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="mr-2 h-8 w-8"
                    >
                        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </Button>

                    {/* Chrome-style Tabs */}
                    <div className="flex items-end gap-0.5 h-full">
                        {tabs.map((tab) => {
                            const isActive = isActiveTab(tab.href);
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 text-sm font-medium
                                        rounded-t-lg transition-all duration-200
                                        ${isActive
                                            ? 'bg-background text-foreground border-t border-l border-r border-border shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                        }
                                    `}
                                    style={isActive ? { marginBottom: '-1px' } : {}}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* User Info */}
                    {user && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">{user.name}</span>
                        </div>
                    )}

                    {/* Logout Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Collapsible Sidebar */}
                <div
                    className={`
                        border-r bg-muted/20 flex flex-col transition-all duration-300 ease-in-out
                        ${sidebarOpen ? 'w-64' : 'w-0'}
                        overflow-hidden
                    `}
                >
                    {/* Sidebar Header */}
                    <div className="p-4 border-b font-bold text-lg flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 to-blue-600 text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">
                            C
                        </div>
                        <span className="whitespace-nowrap">Compliance</span>
                    </div>

                    {/* Scrollable Content */}
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-4">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Quick Links
                            </div>
                            <nav className="space-y-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = isActiveTab(tab.href);
                                    return (
                                        <Link key={tab.href} href={tab.href}>
                                            <Button
                                                variant={isActive ? 'secondary' : 'ghost'}
                                                className="w-full justify-start font-normal gap-2"
                                            >
                                                <Icon className="h-4 w-4" />
                                                {tab.name}
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="border-t pt-4">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Help & Resources
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p className="mb-2">Build KYC/AML compliance workflows with our visual editor.</p>
                                    <p>Drag and drop nodes to create your workflow logic.</p>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t text-xs text-muted-foreground shrink-0">
                        {user ? (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="font-medium text-foreground truncate">{user.name}</div>
                                    <div className="truncate">{user.email}</div>
                                </div>
                            </div>
                        ) : (
                            'Loading...'
                        )}
                    </div>
                </div>

                {/* Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
