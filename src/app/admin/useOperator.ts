"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ensureVisitor } from "@/lib/visitor";

export function useOperator() {
  const [state, setState] = useState<"loading" | "operator" | "visitor">("loading");

  const check = useCallback(async () => {
    const user = await ensureVisitor();
    const { data } = await supabaseBrowser().from("profiles").select("role").eq("id", user.id).maybeSingle();
    setState(data?.role === "operator" ? "operator" : "visitor");
  }, []);

  useEffect(() => {
    let alive = true;
    ensureVisitor()
      .then((user) => supabaseBrowser().from("profiles").select("role").eq("id", user.id).maybeSingle())
      .then(({ data }) => alive && setState(data?.role === "operator" ? "operator" : "visitor"))
      .catch(() => alive && setState("visitor"));
    return () => {
      alive = false;
    };
  }, []);

  return { state, recheck: check };
}
