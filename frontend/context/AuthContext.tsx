'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'editor';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (email: string, password: string, name: string, secretKey?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Check auth status on mount
    useEffect(() => {
        async function checkAuth() {
            try {
                const { data } = await apiClient.getMe();
                setUser(data.user);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        checkAuth();
    }, []);

    // Protect routes
    useEffect(() => {
        if (!loading) {
            const publicRoutes = ['/login', '/register'];
            if (!user && !publicRoutes.includes(pathname)) {
                router.push('/login');
            }
            if (user && publicRoutes.includes(pathname)) {
                router.push('/');
            }
        }
    }, [user, loading, pathname, router]);

    const login = async (email: string, password: string) => {
        try {
            const { data } = await apiClient.login(email, password);
            setUser(data.user);
            router.push('/');
        } catch (error) {
            throw error;
        }
    };

    const register = async (email: string, password: string, name: string, secretKey?: string) => {
        try {
            const { data } = await apiClient.register(email, password, name, secretKey);
            setUser(data.user);
            router.push('/');
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await apiClient.logout();
            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('Logout failed', error);
            setUser(null);
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
