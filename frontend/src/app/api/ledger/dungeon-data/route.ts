import { NextResponse } from 'next/server'

// 초월 데이터
const TRANSCEND_DATA = {
  contentType: 'transcend',
  maxTickets: 14,
  chargeInterval: 3 * 60 * 60, // 3시간 (초 단위)
  bosses: [
    {
      id: 'transcend_deus',
      name: '데우스의 연구기지',
      imageUrl: '/메달/초월/데우스 연구기지.png',
      tiers: [
        { tier: 1, kina: 300000 },
        { tier: 2, kina: 330000 },
        { tier: 3, kina: 360000 },
        { tier: 4, kina: 390000 },
        { tier: 5, kina: 420000 },
        { tier: 6, kina: 450000 },
        { tier: 7, kina: 480000 },
        { tier: 8, kina: 520000 },
        { tier: 9, kina: 560000 },
        { tier: 10, kina: 600000 },
      ]
    },
    {
      id: 'transcend_arcanus',
      name: '조각난 아르카나스',
      imageUrl: '/메달/초월/조각난 아르카니스.png',
      tiers: [
        { tier: 1, kina: 300000 },
        { tier: 2, kina: 330000 },
        { tier: 3, kina: 360000 },
        { tier: 4, kina: 390000 },
        { tier: 5, kina: 420000 },
        { tier: 6, kina: 450000 },
        { tier: 7, kina: 480000 },
        { tier: 8, kina: 520000 },
        { tier: 9, kina: 560000 },
        { tier: 10, kina: 600000 },
      ]
    }
  ]
}

// 원정 데이터
const EXPEDITION_DATA = {
  contentType: 'expedition',
  maxTickets: 21,
  chargeInterval: 3 * 60 * 60, // 3시간 (초 단위)
  categories: [
    {
      id: 'exploration',
      name: '탐험',
      bosses: [
        { id: 'exp_kraom', name: '크라오 동굴', kina: 100000, imageUrl: '/메달/원정/크라오동굴.png' },
        { id: 'exp_urugugu', name: '우루구구 협곡', kina: 120000, imageUrl: '/메달/원정/우루구구 협곡.png' },
        { id: 'exp_fire', name: '불의 신전', kina: 150000, imageUrl: '/메달/원정/불의신전.png' },
        { id: 'exp_draupnir', name: '드라웁니르', kina: 180000, imageUrl: '/메달/원정/드라웁니르.png' },
        { id: 'exp_barkron', name: '바크론의 공중섬', kina: 200000, imageUrl: '/메달/원정/바크론의 공중섬.png' },
        { id: 'exp_horn', name: '사나운 뿔 암굴', kina: 250000, imageUrl: '/메달/원정/사나운 뿔암굴.png' },
      ]
    },
    {
      id: 'conquest_normal',
      name: '정복 (보통)',
      bosses: [
        { id: 'con_n_kraom', name: '크라오 동굴', kina: 300000, imageUrl: '/메달/원정/크라오동굴.png' },
        { id: 'con_n_draupnir', name: '드라웁니르', kina: 300000, imageUrl: '/메달/원정/드라웁니르.png' },
        { id: 'con_n_urugugu', name: '우루구구 협곡', kina: 400000, imageUrl: '/메달/원정/우루구구 협곡.png' },
        { id: 'con_n_barkron', name: '바크론의 공중섬', kina: 400000, imageUrl: '/메달/원정/바크론의 공중섬.png' },
        { id: 'con_n_fire', name: '불의 신전', kina: 500000, imageUrl: '/메달/원정/불의신전.png' },
        { id: 'con_n_horn', name: '사나운 뿔 암굴', kina: 500000, imageUrl: '/메달/원정/사나운 뿔암굴.png' },
      ]
    },
    {
      id: 'conquest_hard',
      name: '정복 (어려움)',
      bosses: [
        { id: 'con_h_kraom', name: '크라오 동굴', kina: 500000, imageUrl: '/메달/원정/크라오동굴.png' },
        { id: 'con_h_draupnir', name: '드라웁니르', kina: 500000, imageUrl: '/메달/원정/드라웁니르.png' },
        { id: 'con_h_urugugu', name: '우루구구 협곡', kina: 500000, imageUrl: '/메달/원정/우루구구 협곡.png' },
        { id: 'con_h_barkron', name: '바크론의 공중섬', kina: 500000, imageUrl: '/메달/원정/바크론의 공중섬.png' },
        { id: 'con_h_fire', name: '불의 신전', kina: 500000, imageUrl: '/메달/원정/불의신전.png' },
        { id: 'con_h_horn', name: '사나운 뿔 암굴', kina: 500000, imageUrl: '/메달/원정/사나운 뿔암굴.png' },
      ]
    }
  ]
}

export async function GET() {
  return NextResponse.json({
    transcend: TRANSCEND_DATA,
    expedition: EXPEDITION_DATA
  })
}
