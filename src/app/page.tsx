
import { LoginForm } from '@/components/login-form';
import { Mountain } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
         <div className="flex items-center justify-center gap-2 mb-8">
            <Mountain className="size-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline text-primary">DealFlow</h1>
          </div>
        <LoginForm />
      </div>
    </div>
  );
}
