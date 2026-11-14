import type { Metadata } from "next";
import { AdminHome } from "./AdminHome";

export const metadata: Metadata = { title: "운영자" };

export default function AdminPage() {
  return <AdminHome />;
}
