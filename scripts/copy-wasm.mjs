#!/usr/bin/env node
// QR 읽기 엔진(wasm)을 public/ 에 복사한다. 외부 CDN 에서 받지 않고 우리 주소에서 내려준다.
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/wasm", { recursive: true });
copyFileSync("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm", "public/wasm/zxing_reader.wasm");
console.log("public/wasm/zxing_reader.wasm 준비됨");
