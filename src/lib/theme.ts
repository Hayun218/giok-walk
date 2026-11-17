import { tokens } from "@/styles/tokens.generated";

/**
 * 화면 밝기 (decisions D-12)
 * 기본은 라이트. 방문객이 "어둡게"를 고르거나 "휴대폰 설정대로"를 골랐을 때 휴대폰이 다크 모드면
 * <html data-theme="dark"> 가 되고, tokens.css 의 다크 값이 쓰인다.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "giok-walk:theme";
export const THEME_EVENT = "giok-walk:theme";

export const THEME_CHOICES: { id: ThemeChoice; label: string }[] = [
  { id: "light", label: "밝게" },
  { id: "dark", label: "어둡게" },
  { id: "system", label: "휴대폰 설정" },
];

/** 첫 화면을 그리기 전에 실행하는 스크립트 (테마가 깜빡이지 않게). layout.tsx 의 <head> 에 넣는다. */
export const themeInitScript = `(function(){
  var KEY=${JSON.stringify(THEME_KEY)}, LIGHT=${JSON.stringify(tokens.paper)}, DARK=${JSON.stringify(tokens.night)};
  var root=document.documentElement, mq=window.matchMedia("(prefers-color-scheme: dark)");
  function choice(){ try { return localStorage.getItem(KEY) || "light"; } catch (e) { return "light"; } }
  function apply(){
    var c=choice(), dark=c==="dark"||(c==="system"&&mq.matches);
    root.dataset.theme=dark?"dark":"light";
    var metas=document.querySelectorAll('meta[name="theme-color"]');
    for (var i=0;i<metas.length;i++) metas[i].setAttribute("content", dark?DARK:LIGHT);
  }
  apply();
  document.addEventListener("DOMContentLoaded", apply);
  mq.addEventListener && mq.addEventListener("change", apply);
  window.addEventListener(${JSON.stringify(THEME_EVENT)}, apply);
})();`;

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

export function saveThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서는 이번 화면에만 적용
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
