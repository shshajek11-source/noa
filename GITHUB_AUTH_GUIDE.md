# GitHub Push를 위한 인증 설정 가이드

## 상황
- ✅ GitHub 저장소 생성 완료: `https://github.com/shshajek11-source/noa`
- ✅ 로컬 커밋 완료
- ❌ Push 실패: 권한 오류 (403 Forbidden)

## 해결 방법 (3가지 옵션)

### 옵션 1: GitHub Desktop 사용 (가장 쉬움) ⭐ 추천

1. GitHub Desktop 다운로드: https://desktop.github.com
2. 설치 후 GitHub 계정으로 로그인
3. File → Add Local Repository
4. 폴더 선택: `c:\Users\shsha\OneDrive\바탕 화면\아이온`
5. "Publish repository" 버튼 클릭
6. 저장소 이름 확인: `noa`
7. "Publish repository" 클릭 → 완료!

### 옵션 2: Personal Access Token 사용

1. https://github.com/settings/tokens 접속
2. "Generate new token (classic)" 클릭
3. Note: "AION2 Tool Deploy"
4. Expiration: 90 days (or No expiration)
5. Scopes: **repo** 체크
6. "Generate token" 클릭
7. 토큰 복사 (한 번만 보임!)
8. 터미널에서 실행:
```bash
git push -u origin main
# Username: shshajek11-source
# Password: [복사한 토큰 붙여넣기]
```

### 옵션 3: Git Credential Manager (Windows)

```bash
# 이미 설정 완료됨
git config --global credential.helper wincred

# 다시 push 시도 - 브라우저에서 GitHub로 로그인 창이 뜹니다
git push -u origin main
```

## 현재 저장소 정보

- **저장소 이름**: noa
- **GitHub URL**: https://github.com/shshajek11-source/noa
- **사용자**: shshajek11-source
- **상태**: Public
- **설명**: AION2 Tool - Character ranking and statistics service

## 다음 단계

1. 위의 옵션 중 하나를 선택하여 인증 설정
2. `git push -u origin main` 명령 실행
3. 성공 후 https://github.com/shshajek11-source/noa 에서 코드 확인
