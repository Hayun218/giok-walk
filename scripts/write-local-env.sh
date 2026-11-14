#!/usr/bin/env bash
# 로컬 Supabase(`supabase start`)의 주소와 키로 .env.local 을 만든다.
# 로컬 키는 Supabase CLI 공용 기본값이라 비밀이 아니지만, 그래도 .env.local 은 git 에 올리지 않는다.
set -euo pipefail
eval "$(supabase status -o env)"
CODE="$(openssl rand -hex 6)"
cat > .env.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}
SUPABASE_SECRET_KEY=${SECRET_KEY}
OPERATOR_INVITE_CODE=${CODE}
ENV
echo ".env.local 을 만들었어요 (${API_URL})"
echo "운영자 코드: ${CODE}"
