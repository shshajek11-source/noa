# GitHub 저장소 생성 및 푸시 가이드

## 1단계: GitHub 저장소 생성 (웹 브라우저에서)

1. https://github.com 접속
2. 로그인
3. 오른쪽 상단 "+" 버튼 클릭 → "New repository" 선택
4. 다음 정보 입력:
   - **Repository name**: `noa`
   - **Description**: "AION2 Tool Beta - 캐릭터 검색, 랭킹, 티어, 통계 서비스"
   - **Public** 또는 **Private** 선택 (원하는 대로)
   - ⚠️ **"Add a README file" 체크 안 함**
   - ⚠️ **".gitignore" 선택 안 함**
   - ⚠️ **"license" 선택 안 함**
5. "Create repository" 버튼 클릭

## 2단계: 생성된 저장소 URL 확인

GitHub에서 저장소를 만들면 다음과 같은 URL이 나타납니다:
```
https://github.com/사용자명/noa.git
```

이 URL을 복사하세요!

## 3단계: 로컬 Git 저장소 연결 및 푸시

아래 명령어를 터미널에서 실행하세요 (URL은 자신의 것으로 교체):

```bash
# 원격 저장소 연결
git remote add origin https://github.com/사용자명/noa.git

# 코드 푸시
git push -u origin main
```

## 완료! ✅

Git 저장소가 성공적으로 업로드되었습니다.

---

## 배포 옵션

### 옵션 1: Docker Compose로 서버 배포

서버에서 다음 명령어 실행:
```bash
git clone https://github.com/사용자명/noa.git
cd noa
docker-compose up -d
```

### 옵션 2: Vercel (프론트엔드만)

1. https://vercel.com 접속
2. GitHub 저장소 연결
3. Root Directory: `frontend`
4. Framework Preset: Next.js
5. Environment Variable 설정:
   - `NEXT_PUBLIC_API_BASE_URL`: 백엔드 API URL

### 옵션 3: Railway (풀스택)

1. https://railway.app 접속
2. "New Project" → "Deploy from GitHub"  
3. `noa` 저장소 선택
4. 자동 배포 시작

---

## 현재 Git 상태

✅ Git 저장소 초기화 완료
✅ 모든 파일 커밋 완료
✅ 브랜치: main
✅ .gitignore 설정 완료

**대기 중:** GitHub 원격 저장소 연결
