// app/(app)/layout.tsx
import Topbar from "../_topbar"; // ajuste se o caminho for diferente
// import Sidebar from "../_sidebar"; // se existir

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <Topbar />
      <div className="flex">
        {/* {Sidebar ? <Sidebar /> : null} */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
