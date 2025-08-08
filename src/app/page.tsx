
'use client'

import { LoginForm } from '@/components/login-form';
import Image from 'next/image';
import { useUser } from '@/hooks/use-user';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            let redirectPath = '/dashboard'; // Default for admin
            if (user.role === 'seller') redirectPath = '/dashboard';
            else if (['affiliate', 'super_affiliate', 'associate', 'channel', 'franchisee'].includes(user.role)) {
                redirectPath = '/dashboard';
            }
            else if (user.role === 'customer') redirectPath = '/listings/list';
            

            router.push(redirectPath);
        }
    }, [user, isLoading, router]);


  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="max-w-md w-full p-8 space-y-8 bg-background rounded-lg shadow-lg">
        <div className="text-center">
            <Image 
              src="/logo-name.png" 
              alt="re partner" 
              width={180} 
              height={40}
              className="mx-auto"
            />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
