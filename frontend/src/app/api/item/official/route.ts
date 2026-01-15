import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 공식 API 기본 URL
const OFFICIAL_API_BASE = 'https://api-goats.plaync.com/aion2/v2.0'

// 공통 헤더
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://aion2.plaync.com/ko-kr/info/item',
    'Accept': '*/*'
}

// 카테고리 목록 가져오기
async function getCategories() {
    const res = await fetch(`${OFFICIAL_API_BASE}/game/item/category`, {
        headers: HEADERS,
        next: { revalidate: 3600 } // 1시간 캐시
    })
    if (!res.ok) throw new Error('Failed to fetch categories')
    return res.json()
}

// 등급 목록 가져오기
async function getGrades() {
    const res = await fetch(`${OFFICIAL_API_BASE}/game/item/grade`, {
        headers: HEADERS,
        next: { revalidate: 3600 } // 1시간 캐시
    })
    if (!res.ok) throw new Error('Failed to fetch grades')
    return res.json()
}

// 카테고리 매핑 (소분류 -> 대분류)
const CATEGORY_MAP: Record<string, string> = {
    // 무기
    'Sword': 'Equip_Weapon', 'Greatsword': 'Equip_Weapon', 'Dagger': 'Equip_Weapon',
    'Bow': 'Equip_Weapon', 'Magicbook': 'Equip_Weapon', 'Orb': 'Equip_Weapon',
    'Mace': 'Equip_Weapon', 'Staff': 'Equip_Weapon', 'Guarder': 'Equip_Weapon',
    // 방어구
    'Helmet': 'Equip_Armor', 'Shoulder': 'Equip_Armor', 'Torso': 'Equip_Armor',
    'Pants': 'Equip_Armor', 'Gloves': 'Equip_Armor', 'Boots': 'Equip_Armor', 'Cape': 'Equip_Armor',
    // 장신구
    'Necklace': 'Equip_Accessory', 'Earring': 'Equip_Accessory', 'Ring': 'Equip_Accessory', 'Bracelet': 'Equip_Accessory',
    // 소모품
    'Potion': 'Usable_001', 'Food': 'Usable_001', 'Scroll': 'Usable_001', 'Polymorph': 'Usable_001',
    'MagicStone': 'Usable_001', 'GodStone': 'Usable_001', 'Wing': 'Usable_001',
    'Deco': 'Usable_001', 'Ticket': 'Usable_001', 'Etc': 'Usable_001',
    // 외형
    'SkinArmor': 'Usable_Skin', 'SkinOrnament': 'Usable_Skin',
    // 기타
    'GatherResource': 'Misc_001', 'CraftResource': 'Misc_001',
    'ConversionResource': 'Misc_001', 'Material': 'Misc_001', 'Other': 'Misc_001'
}

// 아이템 검색
async function searchItems(params: URLSearchParams) {
    const url = new URL(`${OFFICIAL_API_BASE}/dict/search/item`)

    // 파라미터 전달
    const keyword = params.get('keyword') || params.get('q')
    const category = params.get('category')  // 소분류 카테고리
    const grade = params.get('grade')
    const page = params.get('page') || '1'
    const size = params.get('size') || '20'

    if (keyword) url.searchParams.set('searchKeyword', keyword)

    // 카테고리 처리: category2 (소분류) -> category1 (대분류) 자동 매핑
    if (category) {
        const category1 = CATEGORY_MAP[category]
        if (category1) {
            url.searchParams.set('category1', category1)
        }
        url.searchParams.set('category2', category)
    }

    if (grade) url.searchParams.set('grade', grade)
    url.searchParams.set('page', page)
    url.searchParams.set('size', size)

    const res = await fetch(url.toString(), { headers: HEADERS })
    if (!res.ok) throw new Error('Failed to search items')
    return res.json()
}

// 아이템 상세 정보
async function getItemDetail(id: string, enchantLevel: string = '0') {
    const url = new URL(`${OFFICIAL_API_BASE}/api/gameconst/item`)
    url.searchParams.set('id', id)
    url.searchParams.set('enchantLevel', enchantLevel)

    const res = await fetch(url.toString(), { headers: HEADERS })
    if (!res.ok) throw new Error('Failed to fetch item detail')
    return res.json()
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    try {
        let data: any

        switch (action) {
            case 'categories':
                data = await getCategories()
                break
            case 'grades':
                data = await getGrades()
                break
            case 'detail':
                const itemId = searchParams.get('id')
                if (!itemId) {
                    return NextResponse.json({ error: 'Missing item id' }, { status: 400 })
                }
                data = await getItemDetail(itemId, searchParams.get('enchantLevel') || '0')
                break
            case 'search':
            default:
                data = await searchItems(searchParams)
                break
        }

        return NextResponse.json(data)
    } catch (err: any) {
        console.error('[Item Official API Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
