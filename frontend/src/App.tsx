import { Route, Routes } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { RequireAdmin, RequireAuth } from "@/components/auth/RequireAuth";
import { LoginPage, RegisterPage } from "@/pages/Auth";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Videocasts from "@/pages/Videocasts";
import VideoDetail from "@/pages/VideoDetail";
import Podcasts from "@/pages/Podcasts";
import PodcastDetail from "@/pages/PodcastDetail";
import Relatos from "@/pages/Relatos";
import Debates from "@/pages/Debates";
import Studio from "@/pages/Studio";
import Library from "@/pages/Library";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      {/* auth pages live outside the app shell */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explorar" element={<Explore />} />
        <Route path="/videocasts" element={<Videocasts />} />
        <Route path="/video/:id" element={<VideoDetail />} />
        <Route path="/podcasts" element={<Podcasts />} />
        <Route path="/podcast/:id" element={<PodcastDetail />} />
        <Route path="/relatos" element={<Relatos />} />
        <Route path="/debates" element={<Debates />} />
        <Route path="/perfil/:id" element={<Profile />} />
        <Route
          path="/estudio"
          element={
            <RequireAuth>
              <Studio />
            </RequireAuth>
          }
        />
        <Route
          path="/biblioteca"
          element={
            <RequireAuth>
              <Library />
            </RequireAuth>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
