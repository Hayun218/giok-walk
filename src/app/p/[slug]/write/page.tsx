import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlaceBySlug } from "@/lib/places.server";
import { WriteFlow } from "./WriteFlow";

export const metadata: Metadata = { title: "마음 남기기" };

export default async function WritePage(props: PageProps<"/p/[slug]/write">) {
  const { slug } = await props.params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();
  return <WriteFlow place={place} />;
}
