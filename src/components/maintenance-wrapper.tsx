"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { maintenanceDb } from '@/lib/maintenance-firebase';
import { ref, onValue, get, set } from 'firebase/database';
import { Wrench } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

const defaultConfig = { 
    isEnabled: false, 
    message: 'We are currently down for maintenance. Please check back later.' 
};

export function MaintenanceWrapper({ children }: { children: ReactNode }) {
    const [maintenanceConfig, setMaintenanceConfig] = useState<{ isEnabled: boolean; message: string; } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const configRef = ref(maintenanceDb, 'Real_Estate');

        const initializeAndListen = async () => {
            // Check if data exists
            const snapshot = await get(configRef);
            if (!snapshot.exists() || !snapshot.val()?.hasOwnProperty('isEnabled')) {
                // If not, set the default configuration
                await set(configRef, defaultConfig);
            }

            // Now, listen for real-time changes
            const unsubscribe = onValue(configRef, (snapshot) => {
                if (snapshot.exists()) {
                    setMaintenanceConfig(snapshot.val());
                } else {
                    // This case should be rare after the initial set
                    setMaintenanceConfig(defaultConfig);
                }
                setLoading(false);
            });

            return unsubscribe;
        };

        const unsubscribePromise = initializeAndListen();

        // Cleanup subscription on unmount
        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (unsubscribe) {
                    unsubscribe();
                }
            });
        };
    }, []);

    if (loading) {
        return (
             <div className="flex flex-col min-h-screen">
                <Skeleton className="h-16 w-full" />
                <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-10 w-1/4" />
                            <Skeleton className="h-10 w-1/6" />
                        </div>
                        <Skeleton className="h-48 w-full" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-64 w-full" />
                        ))}
                    </div>
                    </div>
                </main>
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (maintenanceConfig?.isEnabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
                <Wrench className="h-20 w-20 text-primary mb-6" />
                <h1 className="text-4xl font-bold font-headline mb-4">Under Maintenance</h1>
                <p className="text-lg text-muted-foreground max-w-lg">
                    {maintenanceConfig.message || 'We are currently performing scheduled maintenance. We should be back online shortly. Thank you for your patience!'}
                </p>
            </div>
        );
    }
    
    return <>{children}</>;
}
