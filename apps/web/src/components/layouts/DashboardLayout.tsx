import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 md:px-10 pt-20 pb-8 lg:pt-8">
        <div className="mx-auto w-full max-w-[1100px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}