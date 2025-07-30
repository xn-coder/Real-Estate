
import { LoginForm } from '@/components/login-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-muted/40">
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
