import "server-only";
import { cache } from "react";
import { supabasePublic } from "@/lib/supabase/server";
import type { Place } from "@/lib/types";

/** QR 주소의 장소 (운영 중·종료된 장소만 보인다) */
export const getPlaceBySlug = cache(async (slug: string): Promise<Place | null> => {
  const { data } = await supabasePublic().from("places").select("*").eq("slug", slug).maybeSingle();
  return data;
});
