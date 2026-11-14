import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlaceBySlug } from "@/lib/places.server";
import { PlaceView } from "./PlaceView";

export const metadata: Metadata = { title: "남겨진 마음" };

export default async function ViewPage(props: PageProps<"/p/[slug]/view">) {
  const { slug } = await props.params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();
  return <PlaceView place={place} />;
}
