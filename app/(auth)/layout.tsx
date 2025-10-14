// app/(auth)/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[#f7f7f8]">
      {children}
    </div>
  );
}
