import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Đường dẫn tester mở trước khi đăng nhập (vd link trong mail mời test); BE luôn đưa về /tester/profile sau Google. */
const RETURN_KEY = "tester:return-to";

function Spinner() {
  return (
    <div className="brand-hero flex min-h-[70dvh] items-center justify-center pt-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
    </div>
  );
}

/** Trang cần đăng nhập: chưa đăng nhập thì về landing (hiện nhắc đăng nhập), đăng nhập xong quay lại trang đã mở. */
export function TesterAuthRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  const here = location.pathname + location.search;
  if (!user) {
    if (location.pathname !== "/tester/profile") sessionStorage.setItem(RETURN_KEY, here);
    return <Navigate to="/tester" replace state={{ needLogin: true, from: location.pathname }} />;
  }
  const back = sessionStorage.getItem(RETURN_KEY);
  if (back) {
    sessionStorage.removeItem(RETURN_KEY);
    if (back !== here && back.startsWith("/tester/")) return <Navigate to={back} replace />;
  }
  return <Outlet />;
}

/** Link cũ /tester/login (vd ?error=domain) → landing, giữ query. */
export function TesterLoginRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/tester${search}`} replace />;
}
