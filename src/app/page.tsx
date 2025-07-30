
import { LoginForm } from '@/components/login-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo-name.png" alt="DealFlow" width={240} height={53} />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
