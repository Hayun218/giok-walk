import type { Metadata } from "next";
import { Nearby } from "./Nearby";

export const metadata: Metadata = { title: "근처의 기억 장소" };

export default function NearbyPage() {
  return <Nearby />;
}
