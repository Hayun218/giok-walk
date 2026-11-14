import type { Metadata } from "next";
import { MemoryDetail } from "./MemoryDetail";

export const metadata: Metadata = { title: "내가 남긴 마음" };

export default async function MemoryPage(props: PageProps<"/m/[id]">) {
  const { id } = await props.params;
  return <MemoryDetail id={id} />;
}
