import { tokens } from "@/styles/tokens.generated";

/**
 * 브랜드 정보는 여기 한 곳에서 관리한다.
 * 로고 외주가 끝나면 `logo.src` 에 파일 경로(public/ 아래)를 넣으면
 * <Logo /> 가 텍스트 대신 이미지를 보여 준다.
 */
export const brand = {
  name: "기억산책",
  tagline: "그날의 마음을 이 자리에 두고 가요",
  description: "장소에 마음을 남기고, 다시 찾아오면 그대로 만나요.",
  logo: {
    /** 예: "/brand/logo.svg". null 이면 텍스트 워드마크를 쓴다. */
    src: null as string | null,
    width: 120,
    height: 32,
  },
  /** CSS 변수를 쓸 수 없는 곳(매니페스트·브라우저 상단 색)용. tokens.css 에서 자동 생성된 값. */
  colors: { paper: tokens.paper, ink: tokens.ink, night: tokens.night },
} as const;
