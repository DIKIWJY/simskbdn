import { redirect } from "next/navigation";

// Padanan dari <Route path="*" element={<Navigate to="/" replace/>}/> di
// routes/AppRoutes.jsx versi lama: path apa pun yang tidak cocok akan
// dilempar kembali ke halaman utama ("/").
export default function NotFound() {
  redirect("/");
}
