import { SWRConfiguration } from 'swr'

// SWR 전역 설정
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,     // 탭 포커스 시 재검증 비활성화 (모바일에서 자주 발생)
  dedupingInterval: 2000,       // 2초 내 중복 요청 방지
  errorRetryCount: 2,           // 에러 시 2번까지 재시도
  shouldRetryOnError: true,     // 에러 시 재시도 활성화
}

// 공통 fetcher 함수
export const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options)
  if (!res.ok) {
    const error = new Error('API 요청 실패')
    throw error
  }
  return res.json()
}

// 인증 헤더 포함 fetcher
export const createAuthFetcher = (getAuthHeader: () => Record<string, string>) => {
  return async (url: string) => {
    const res = await fetch(url, {
      headers: getAuthHeader()
    })
    if (!res.ok) {
      const error = new Error('API 요청 실패')
      throw error
    }
    return res.json()
  }
}
