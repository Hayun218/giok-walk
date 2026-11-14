import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlaceBySlug } from "@/lib/places.server";
import { PlaceHome } from "./PlaceHome";

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const place = await getPlaceBySlug(slug);
  return { title: place?.name ?? "장소를 찾을 수 없어요" };
}

/** QR 로 들어오는 첫 화면 */
export default async function PlacePage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();
  return <PlaceHome place={place} />;
}
