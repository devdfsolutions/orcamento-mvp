// app/(auth)/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f7f8",
          margin: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
