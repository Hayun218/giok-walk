import type { Metadata } from "next";
import { MyMemories } from "./MyMemories";

export const metadata: Metadata = { title: "내 기억" };

export default function MePage() {
  return <MyMemories />;
}
