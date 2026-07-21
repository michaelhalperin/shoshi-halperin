import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import AdminAbout from "./pages/admin/AdminAbout";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminRecipes from "./pages/admin/AdminRecipes";
import AdminShopLinks from "./pages/admin/AdminShopLinks";
import AdminSlots from "./pages/admin/AdminSlots";
import Dashboard from "./pages/admin/Dashboard";
import About from "./pages/About";
import CourseDetail from "./pages/CourseDetail";
import Gallery from "./pages/Gallery";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import RecipeDetail from "./pages/RecipeDetail";
import NotFound from "./pages/NotFound";
import Shop from "./pages/Shop";
import Recipes from "./pages/Recipes";

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  if (user.mustSetPassword) return <Navigate to="/set-password" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/set-password"
            element={
              <RequireAuth>
                <SetPassword />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="recipes" element={<AdminRecipes />} />
            <Route path="gallery" element={<AdminGallery />} />
            <Route path="about" element={<AdminAbout />} />
            <Route path="slots" element={<AdminSlots />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="shop-links" element={<AdminShopLinks />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
