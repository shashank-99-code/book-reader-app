import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          {/* Logo and App Name - Horizontal Layout */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image
              src="/logo.svg"
              alt="The Quick Reader Logo"
              width={60}
              height={60}
            />
            <h1 className="font-serif text-3xl font-bold text-gray-900 tracking-tight">
              The Quick Reader
            </h1>
          </div>
          <p className="mt-2 text-sm text-gray-700">
            Your personal digital library
          </p>
        </div>
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
} 