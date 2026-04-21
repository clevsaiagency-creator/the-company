import Sidebar from "@/components/sidebar/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      <Sidebar />
      <main className="md:pl-64 h-full">
        <div className="h-full pb-16 md:pb-0">{children}</div>
      </main>
    </div>
  );
}
