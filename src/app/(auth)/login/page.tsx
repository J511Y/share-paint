import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md animate-pulse rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 space-y-2 text-center">
            <div className="mx-auto h-8 w-24 rounded bg-gray-200" />
            <div className="mx-auto h-4 w-48 rounded bg-gray-200" />
          </div>
          <div className="space-y-4">
            <div className="h-10 rounded-lg bg-gray-200" />
            <div className="h-12 rounded-lg bg-gray-200" />
            <div className="h-12 rounded-lg bg-gray-200" />
            <div className="h-12 rounded-lg bg-gray-200" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
