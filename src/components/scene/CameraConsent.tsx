"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/** 카메라를 켜기 전에 이유를 먼저 말한다 */
export function CameraConsent({
  open,
  purpose,
  onCamera,
  onPicture,
}: {
  open: boolean;
  purpose: "place" | "view";
  onCamera: () => void;
  onPicture: () => void;
}) {
  return (
    <Sheet open={open} onClose={onPicture} title={purpose === "place" ? "이 자리를 비춰 볼까요?" : "카메라로 둘러볼까요?"}>
      <div className="flex flex-col gap-4">
        <p className="text-text-muted">
          {purpose === "place"
            ? "카메라로 지금 서 있는 곳을 비추고, 그 위에 마음을 놓아요."
            : "카메라로 주변을 비추면 이곳에 남겨진 마음들이 떠올라요."}{" "}
          화면은 저장하거나 보내지 않아요. 휴대폰 방향도 함께 써요.
        </p>
        <Button onClick={onCamera}>카메라 켜기</Button>
        <Button variant="secondary" onClick={onPicture}>
          카메라 없이 할게요
        </Button>
      </div>
    </Sheet>
  );
}
