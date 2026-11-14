import type { Metadata } from "next";
import { PlaceAdmin } from "./PlaceAdmin";

export const metadata: Metadata = { title: "장소 관리" };

export default async function PlaceAdminPage(props: PageProps<"/admin/places/[id]">) {
  const { id } = await props.params;
  return <PlaceAdmin id={id} />;
}
