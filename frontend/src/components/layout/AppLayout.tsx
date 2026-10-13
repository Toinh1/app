import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";

// App shell: fixed sidebar (desktop), sticky top navbar, bottom nav (mobile).
// The persistent audio dock is rendered by AudioPlayerProvider above this tree.
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-64">
        <Navbar />
        <main data-testid="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-36 pt-6 md:px-8 md:pb-28">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
