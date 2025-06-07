'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleStartOrdering = () => {
    router.push('/outlet/burger-king'); // Change 'burger-king' to your real outlet slug if needed
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-center text-center">
        <Image
          className="dark:invert"
          src="/logo.png" // Replace with your real logo image in public/logo.png
          alt="App Logo"
          width={180}
          height={38}
          priority
        />

        <h1 className="text-3xl sm:text-4xl font-bold">Welcome to BhojanGhar</h1>
        <p className="text-base text-gray-600 max-w-md">
          Scan the QR code on your table or click below to view the menu and place your order.
        </p>

        <button
          onClick={handleStartOrdering}
          className="rounded-full bg-black text-white px-6 py-3 hover:bg-gray-800 transition-all font-medium text-base mt-4"
        >
          Start Ordering
        </button>
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-500">
        <a
          className="flex items-center gap-2 hover:underline"
          href="https://nextjs.org/learn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline"
          href="https://vercel.com/templates?framework=next.js"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline"
          href="https://nextjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
