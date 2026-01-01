
import re
from bs4 import BeautifulSoup

def parse_detail_page(html_content):
    soup = BeautifulSoup(html_content, "html.parser")

    # 1. Profile Image
    profile_img_url = ""
    # Try multiple generic selectors for profile image
    img_el = soup.select_one(".character-frame img, .profile_img img, .character_img img")
    if img_el and img_el.has_attr('src'):
        profile_img_url = img_el['src']

    # 2. Stats
    stats_map = {}
    status_list = soup.select(".status_list li")
    for li in status_list:
        tit = li.select_one(".tit")
        val = li.select_one(".val")
        if tit and val:
            key = tit.get_text(strip=True)
            value = val.get_text(strip=True).replace(",", "")
            if "공격력" in key: stats_map["ap"] = int(value) if value.isdigit() else 0
            elif "마법 증폭력" in key: stats_map["magic_boost"] = int(value) if value.isdigit() else 0
            elif "치명타" in key: stats_map["crit_spell"] = int(value) if value.isdigit() else 0
            elif "마법 적중" in key: stats_map["magic_acc"] = int(value) if value.isdigit() else 0
            elif "명중" in key: stats_map["accuracy"] = int(value) if value.isdigit() else 0

    # 3. Equipment
    equipment_list = []
    # Heuristic: Find all standard item slots
    equip_slots = soup.select(".equip_slot, .item_slot, .slot_item")
    
    # Fallback A: Find by header "장비"
    if not equip_slots:
            headers = soup.find_all(["h3", "h4", "strong"], string=re.compile("장비"))
            for h in headers:
                container = h.find_parent("div")
                if container:
                    equip_slots = container.select("li, div[class*='slot']")
                    if equip_slots: break

    # Fallback B: Look for 'equip-list' class
    if not equip_slots:
        equip_list_container = soup.select_one(".equip-list, .equip_list")
        if equip_list_container:
                equip_slots = equip_list_container.select("li, div")

    for slot in equip_slots:
        item_name_el = slot.select_one(".name, .item_name")
        if item_name_el:
            full_name = item_name_el.get_text(strip=True)
            enchant = 0
            enchant_match = re.search(r"^\+(\d+)", full_name)
            if enchant_match:
                enchant = int(enchant_match.group(1))
                
            equipment_list.append({
                "name": full_name,
                "slot": "Unknown",
                "rarity": "Unknown",
                "author": "Unknown",
                "enhancement_level": enchant
            })

    return {
        "profile_img_url": profile_img_url,
        "stats": stats_map,
        "equipment": equipment_list
    }

if __name__ == "__main__":
    with open("manual_test.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    result = parse_detail_page(html)
    print(result)
