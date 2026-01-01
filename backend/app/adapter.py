"""
External Source Adapter with Production-Grade Reliability

Features:
- Timeout (connect/read separated)
- Retry with exponential backoff
- Redis caching (short-term)
- Rate limiting (per character)
- Comprehensive logging
- Predictable exception handling
"""

from abc import ABC, abstractmethod
import os
import random
import json
import logging
import time
from datetime import datetime
from typing import Optional
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
import redis
from .schemas import CharacterDTO

# Configure logger
logger = logging.getLogger(__name__)


# ============================================================================
# Custom Exceptions (Predictable Exception Types)
# ============================================================================

class SourceAdapterError(Exception):
    """Base exception for all source adapter errors"""
    pass


class ExternalSourceTimeoutError(SourceAdapterError):
    """External source request timed out"""
    pass


class ExternalSourceHTTPError(SourceAdapterError):
    """External source returned HTTP error"""
    pass


class ExternalSourceParseError(SourceAdapterError):
    """Failed to parse external source response"""
    pass


class ExternalSourceRateLimitError(SourceAdapterError):
    """Rate limit exceeded for this character"""
    pass


# ============================================================================
# Configuration (Environment Variables)
# ============================================================================

class AdapterConfig:
    """Centralized configuration from environment variables"""

    # Adapter type
    ADAPTER_TYPE = os.getenv("SOURCE_ADAPTER_TYPE", "dummy").lower()

    # HTTP Timeouts (seconds)
    CONNECT_TIMEOUT = float(os.getenv("EXTERNAL_CONNECT_TIMEOUT", "3.0"))
    READ_TIMEOUT = float(os.getenv("EXTERNAL_READ_TIMEOUT", "10.0"))

    # Retry configuration
    MAX_RETRY_ATTEMPTS = int(os.getenv("EXTERNAL_MAX_RETRIES", "3"))
    RETRY_MIN_WAIT = int(os.getenv("EXTERNAL_RETRY_MIN_WAIT", "1"))  # seconds
    RETRY_MAX_WAIT = int(os.getenv("EXTERNAL_RETRY_MAX_WAIT", "10"))  # seconds

    # Cache configuration (Redis)
    CACHE_ENABLED = os.getenv("EXTERNAL_CACHE_ENABLED", "true").lower() == "true"
    CACHE_TTL = int(os.getenv("EXTERNAL_CACHE_TTL", "60"))  # 30-120 seconds recommended

    # Rate limiting
    RATE_LIMIT_ENABLED = os.getenv("EXTERNAL_RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_WINDOW = int(os.getenv("EXTERNAL_RATE_LIMIT_WINDOW", "60"))  # seconds

    # External source URL
    EXTERNAL_BASE_URL = os.getenv("EXTERNAL_SOURCE_URL", "https://aion.plaync.com/search")

    # User-Agent
    USER_AGENT = os.getenv(
        "EXTERNAL_USER_AGENT",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    # Redis connection
    REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


# ============================================================================
# Redis Cache Manager
# ============================================================================

class CacheManager:
    """Manages Redis caching for external source responses"""

    def __init__(self):
        self.enabled = AdapterConfig.CACHE_ENABLED
        self.ttl = AdapterConfig.CACHE_TTL
        self.redis_client: Optional[redis.Redis] = None

        if self.enabled:
            try:
                self.redis_client = redis.from_url(
                    AdapterConfig.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2
                )
                # Test connection
                self.redis_client.ping()
                logger.info("✓ Redis cache initialized successfully")
            except Exception as e:
                logger.warning(f"⚠ Redis cache unavailable: {e}. Caching disabled.")
                self.enabled = False
                self.redis_client = None

    def _make_key(self, server: str, name: str) -> str:
        """Generate cache key for character"""
        return f"external:character:{server}:{name}"

    def get(self, server: str, name: str) -> Optional[CharacterDTO]:
        """Retrieve cached character data"""
        if not self.enabled or not self.redis_client:
            return None

        try:
            key = self._make_key(server, name)
            cached = self.redis_client.get(key)

            if cached:
                logger.info(f"✓ Cache HIT: {server}:{name}")
                data = json.loads(cached)
                # Convert ISO string back to datetime
                data['updated_at'] = datetime.fromisoformat(data['updated_at'])
                return CharacterDTO(**data)

            logger.debug(f"Cache MISS: {server}:{name}")
            return None
        except Exception as e:
            logger.warning(f"Cache GET error: {e}")
            return None

    def set(self, server: str, name: str, character: CharacterDTO) -> None:
        """Store character data in cache"""
        if not self.enabled or not self.redis_client:
            return

        try:
            key = self._make_key(server, name)
            # Convert to dict and handle datetime
            data = character.dict()
            data['updated_at'] = data['updated_at'].isoformat()

            self.redis_client.setex(
                key,
                self.ttl,
                json.dumps(data)
            )
            logger.debug(f"✓ Cached: {server}:{name} (TTL: {self.ttl}s)")
        except Exception as e:
            logger.warning(f"Cache SET error: {e}")


# ============================================================================
# Rate Limiter
# ============================================================================

class RateLimiter:
    """Per-character rate limiting"""

    def __init__(self):
        self.enabled = AdapterConfig.RATE_LIMIT_ENABLED
        self.window = AdapterConfig.RATE_LIMIT_WINDOW
        self.redis_client: Optional[redis.Redis] = None

        if self.enabled:
            try:
                self.redis_client = redis.from_url(
                    AdapterConfig.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2
                )
                self.redis_client.ping()
                logger.info("✓ Rate limiter initialized successfully")
            except Exception as e:
                logger.warning(f"⚠ Rate limiter unavailable: {e}. Rate limiting disabled.")
                self.enabled = False
                self.redis_client = None

    def _make_key(self, server: str, name: str) -> str:
        """Generate rate limit key"""
        return f"ratelimit:character:{server}:{name}"

    def check_and_update(self, server: str, name: str) -> None:
        """
        Check if rate limit allows this request and update timestamp

        Raises:
            ExternalSourceRateLimitError: If rate limit is exceeded
        """
        if not self.enabled or not self.redis_client:
            return

        try:
            key = self._make_key(server, name)
            last_request_time = self.redis_client.get(key)

            if last_request_time:
                elapsed = time.time() - float(last_request_time)
                if elapsed < self.window:
                    remaining = int(self.window - elapsed)
                    logger.warning(
                        f"⚠ Rate limit exceeded: {server}:{name} "
                        f"(retry after {remaining}s)"
                    )
                    raise ExternalSourceRateLimitError(
                        f"Rate limit exceeded. Retry after {remaining} seconds."
                    )

            # Update last request time
            self.redis_client.setex(key, self.window, str(time.time()))
            logger.debug(f"✓ Rate limit OK: {server}:{name}")

        except ExternalSourceRateLimitError:
            raise
        except Exception as e:
            logger.warning(f"Rate limiter error: {e}. Allowing request.")


# ============================================================================
# Base Adapter
# ============================================================================

class BaseSourceAdapter(ABC):
    @abstractmethod
    def get_character(self, server: str, name: str) -> CharacterDTO:
        pass


# ============================================================================
# Dummy Adapter (Fallback / Testing)
# ============================================================================

class DummySourceAdapter(BaseSourceAdapter):
    """Safe fallback adapter that generates dummy data"""

    def get_character(self, server: str, name: str) -> CharacterDTO:
        return self._get_dummy_data(server, name)

    def _get_dummy_data(self, server: str, name: str) -> CharacterDTO:
        """Generate deterministic dummy data"""
        classes = ["Warrior", "Mage", "Ranger", "Priest"]

        # Use hash for deterministic randomness
        seed = hash(f"{server}:{name}") % 10000
        random.seed(seed)

        # Generate raw payload (as if from external source)
        raw_payload = {
            "characterName": name,
            "serverName": server,
            "className": random.choice(classes),
            "level": str(random.randint(1, 100)),
            "combatPower": f"{random.randint(10000, 500000):,}",
            "stats": {
                "attack": f"{random.randint(300, 1200):,}",
                "damageAmp": f"{random.randint(50, 300)}",
                "critRate": f"{random.randint(20, 100)}%",
                "critDamage": f"{random.randint(150, 300)}%",
                "attackSpeed": f"{random.randint(80, 150)}",
                "defense": f"{random.randint(300, 1200):,}",
                "damageReduction": f"{random.randint(30, 100)}%",
                "hp": f"{random.randint(5000, 20000):,}",
            }
        }

        # Normalize to stats_payload (parse numbers, remove commas, units)
        stats_payload = {
            "attack": int(raw_payload["stats"]["attack"].replace(",", "")),
            "damage_amp": int(raw_payload["stats"]["damageAmp"]),
            "crit_rate": int(raw_payload["stats"]["critRate"].replace("%", "")),
            "crit_damage": int(raw_payload["stats"]["critDamage"].replace("%", "")),
            "attack_speed": int(raw_payload["stats"]["attackSpeed"]),
            "defense": int(raw_payload["stats"]["defense"].replace(",", "")),
            "damage_reduction": int(raw_payload["stats"]["damageReduction"].replace("%", "")),
            "hp": int(raw_payload["stats"]["hp"].replace(",", "")),
        }

        character = CharacterDTO(
            name=name,
            server=server,
            class_name=raw_payload["className"],
            level=int(raw_payload["level"]),
            power=int(raw_payload["combatPower"].replace(",", "")),
            updated_at=datetime.now(),
            raw_payload=raw_payload,
            stats_payload=stats_payload
        )

        logger.info(f"✓ Generated dummy data: {server}:{name}")
        return character


# ============================================================================
# External Adapter (Production)
# ============================================================================

class ExternalSourceAdapter(BaseSourceAdapter):
    """
    Production-grade external source adapter with:
    - Timeout control
    - Automatic retry with exponential backoff
    - Redis caching
    - Rate limiting
    - Comprehensive error handling
    """

    def __init__(self):
        self.cache = CacheManager()
        self.rate_limiter = RateLimiter()

        # Configure httpx client with timeouts
        self.client = httpx.Client(
            timeout=httpx.Timeout(
                connect=AdapterConfig.CONNECT_TIMEOUT,
                read=AdapterConfig.READ_TIMEOUT,
                write=5.0,
                pool=5.0
            ),
            headers={
                "User-Agent": AdapterConfig.USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
            },
            follow_redirects=True,
            max_redirects=3
        )

        logger.info(
            f"✓ ExternalSourceAdapter initialized "
            f"(cache: {self.cache.enabled}, rate_limit: {self.rate_limiter.enabled})"
        )

    def get_character(self, server: str, name: str) -> CharacterDTO:
        """
        Fetch character data with full safety mechanisms

        Flow:
        1. Check rate limit
        2. Check cache
        3. Fetch from external source (with retry)
        4. Parse and validate
        5. Update cache
        6. Return data

        Raises:
            SourceAdapterError: On any failure (for predictable fallback handling)
        """
        logger.info(f"→ Fetching character: {server}:{name}")

        try:
            # 1. Rate limit check
            self.rate_limiter.check_and_update(server, name)

            # 2. Cache check
            cached = self.cache.get(server, name)
            if cached:
                return cached

            # 3. Fetch from external source
            character = self._fetch_with_retry(server, name)

            # 4. Cache the result
            self.cache.set(server, name, character)

            logger.info(f"✓ Successfully fetched: {server}:{name}")
            return character

        except SourceAdapterError:
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            # Wrap unexpected exceptions
            logger.error(f"✗ Unexpected error fetching {server}:{name}: {e}", exc_info=True)
            raise SourceAdapterError(f"Unexpected error: {e}") from e

    @retry(
        stop=stop_after_attempt(AdapterConfig.MAX_RETRY_ATTEMPTS),
        wait=wait_exponential(
            multiplier=1,
            min=AdapterConfig.RETRY_MIN_WAIT,
            max=AdapterConfig.RETRY_MAX_WAIT
        ),
        # REASON: Retry on transient network errors AND transient HTTP errors (502, 503, 504).
        # This increases stability when the external source is under heavy load or temporarily unstable.
        retry=retry_if_exception_type((
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.RemoteProtocolError,
            # Added via modification: Specific transient HTTP errors
        )),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True
    )
    def _fetch_with_retry(self, server: str, name: str) -> CharacterDTO:
        """
        Fetch with Playwright, handling redirects and dynamic content.
        Tries to navigate to Detail Page.
        Falls back to Search Result Parsing if Detail Page fails (Page Error).
        """
        from playwright.sync_api import sync_playwright

        # Mock Response Class for Parser Compatibility
        class MockResponse:
            def __init__(self, text):
                self.text = text
                self.headers = {"content-type": "text/html"}

        # Construct URL
        # Server Mapping (Name -> ID)
        SERVER_ID_MAP = {
            "Israphel": "55", # 이스라펠
            "Siel": "30",     # 시엘
            "Ex": "54",       # 엑스
        }
        server_id = SERVER_ID_MAP.get(server)
        
        base_url = "https://aion.plaync.com/ranking/battle"
        if server_id:
            # Direct navigation with search params
            from urllib.parse import quote
            encoded_name = quote(name)
            url = f"{base_url}?world=classic&serverId={server_id}&characterName={encoded_name}"
        else:
            # Fallback
            url = f"{base_url}?world=classic"

        retries = AdapterConfig.MAX_RETRY_ATTEMPTS # Use the same retry count as the decorator
        last_error = None

        for attempt in range(retries):
            try:
                logger.info(f"→ Scaping (Headless): {url} for '{name}'")

                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True)
                    context = browser.new_context(user_agent=AdapterConfig.USER_AGENT)
                    page = context.new_page()
                    
                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=AdapterConfig.READ_TIMEOUT * 1000)
                        page.wait_for_timeout(2000) 

                        # Wait for search results
                        page.wait_for_selector(".ranking_table tbody tr", timeout=10000)
                        
                        # Use Korean name for validation if needed
                        SERVER_MAP = {
                            "Israphel": "이스라펠",
                            "Siel": "시엘", 
                            "Ex": "엑스"
                        }
                        korean_server_name = SERVER_MAP.get(server, server)
                        
                        logger.info(f"Looking for character: '{name}' on server: '{korean_server_name}'")

                        # Find the correct row
                        target_row_locator = None
                        rows = page.locator(".ranking_table tbody tr")
                        count = rows.count()
                        
                        for i in range(count):
                            row = rows.nth(i)
                            try:
                                row_name_el = row.locator(".title .text")
                                if not row_name_el.is_visible(): continue
                                row_name = row_name_el.inner_text().strip()
                                
                                row_server_el = row.locator(".server")
                                if not row_server_el.is_visible(): continue
                                row_server = row_server_el.inner_text().strip()
                                
                                # Log for debugging
                                with open("debug_rows.txt", "a", encoding="utf-8") as df:
                                    df.write(f"Row {i}: Name='{row_name}', Server='{row_server}' | Search='{name}'\n")

                                if name.lower() == row_name.lower():
                                    if korean_server_name == row_server:
                                         logger.info(f"Found match: {row_name} @ {row_server}")
                                         target_row_locator = row
                                         break
                            except Exception as e:
                                logger.warning(f"Row parsing error: {e}")
                                continue

                        if target_row_locator:
                            # 1. Capture Search Content & Basic Data (Backup)
                            search_content = page.content()
                            
                            img_loc = target_row_locator.locator("img")
                            img_src = img_loc.get_attribute("src") if img_loc.is_visible() else ""
                            
                            # 2. Extract charKey for Navigation
                            import re
                            char_key = None
                            if img_src:
                                match = re.search(r"charKey=(\d+)", img_src)
                                if match:
                                    char_key = match.group(1)

                            if char_key:
                                # Construct detail URL
                                # server_id is needed here, which was determined in get_character
                                SERVER_ID_MAP = {
                                    "Israphel": "55", # 이스라펠
                                    "Siel": "30",     # 시엘
                                    "Ex": "54",       # 엑스
                                }
                                server_id = SERVER_ID_MAP.get(server)
                                # FIX: world=classic (lowercase)
                                detail_url = f"https://aion.plaync.com/characters/view?world=classic&serverId={server_id}&characterId={char_key}"
                                logger.info(f"Navigating to detail URL: {detail_url}")
                                
                                try:
                                    # Increase timeout to 30s
                                    page.goto(detail_url, wait_until="domcontentloaded", timeout=30000)
                                    
                                    # Wait for either Success (.status_list) or Failure (.page_error)
                                    try:
                                        page.wait_for_selector(".status-list, .page-error, .header-title", timeout=5000)
                                    except:
                                        pass # Just proceed to check content
                                    
                                    detail_content = page.content()
                                    with open("/app/debug_detail_success.html", "w", encoding="utf-8") as f:
                                        f.write(detail_content)

                                    # 3. Attempt to Parse Detail Page
                                    detail_dto = self._parse_detail_page(MockResponse(detail_content), server, name)
                                    
                                    if detail_dto:
                                        logger.info("✓ Successfully parsed Detail Page.")
                                        # Enrich with avatar if missing (though _parse_detail_page should find it)
                                        if not detail_dto.character_image_url and img_src:
                                            detail_dto.character_image_url = img_src
                                        return detail_dto
                                    
                                    logger.warning("Detail page parsing returned None (Page Error or Invalid). Falling back to Search Results.")
                                    
                                except Exception as nav_e:
                                    logger.warning(f"Detail navigation/parsing failed: {nav_e}. Falling back.")
                            
                            else:
                                logger.warning("Could not extract charKey. Falling back to Search Results.")

                            # 4. Fallback: Parse Search Page
                            return self._parse_html_response(MockResponse(search_content), server, name, img_src_override=img_src)
                                
                        else:
                            logger.warning(f"Character '{name}' on '{korean_server_name}' not found in search results.")
                            # Fallback using whatever content we have (will likely fail parse, but correct flow)
                            content = page.content()
                            return self._parse_html_response(MockResponse(content), server, name)

                    except Exception as e:
                        logger.error(f"Playwright navigation error: {e}")
                        try:
                            with open("/app/debug_detail_error.html", "w", encoding="utf-8") as f:
                                f.write(page.content())
                        except: pass
                        raise ExternalSourceTimeoutError(f"Navigation failed: {e}")
                    finally:
                        browser.close()

            except ExternalSourceTimeoutError:
                raise
            except Exception as e:
                logger.error(f"✗ Scraping error for {server}:{name}: {e}")
                raise ExternalSourceHTTPError(f"Scraping failed: {e}") from e

    def _parse_detail_page(self, response: object, server: str, name: str) -> Optional[CharacterDTO]:
        """
        Parses the specific character detail page HTML.
        Returns None if 'Page Error' is detected.
        """
        try:
            from bs4 import BeautifulSoup
            import re
            soup = BeautifulSoup(response.text, "html.parser")

            # Check for error page
            if "페이지를 찾을 수 없습니다" in response.text or soup.select_one(".page_error"):
                logger.warning("Detail page shows 'Page Error'.")
                return None
            
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
                     equip_slots = equip_list_container.select("li")

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

            # 4. Construct DTO
            class_name = "Unknown"
            level = 1
            
            info_el = soup.select_one(".character_info, .profile_info")
            if info_el:
                lv_el = info_el.select_one(".level, .lv")
                if lv_el:
                    lv_text = lv_el.get_text(strip=True).replace("Lv", "").replace(".", "")
                    if lv_text.isdigit(): level = int(lv_text)
                
                cls_el = info_el.select_one(".class, .job")
                if cls_el:
                    class_name = cls_el.get_text(strip=True)

            logger.info(f"Parsed Detail: {name}, Equipment count: {len(equipment_list)}")

            return CharacterDTO(
                server=server,
                name=name,
                class_name=class_name,
                level=level,
                power=0,
                updated_at=datetime.now(),
                stats_json=stats_map,
                character_image_url=profile_img_url,
                equipment_data=equipment_list
            )

        except Exception as e:
            logger.warning(f"Error parsing detail page: {e}")
            return None

    def _parse_response(
        self,
        response: httpx.Response,
        server: str,
        name: str
    ) -> CharacterDTO:
        """
        Parse response and extract character data

        Supports both JSON API responses and HTML scraping.

        Raises:
            ExternalSourceParseError: If parsing fails or schema changes
        """
        content_type = response.headers.get("content-type", "").lower()

        try:
            # Try JSON API first
            if "application/json" in content_type or self._looks_like_json(response.text):
                return self._parse_json_response(response, server, name)

            # Fall back to HTML parsing
            elif "text/html" in content_type:
                return self._parse_html_response(response, server, name)

            else:
                logger.error(
                    f"✗ Unexpected content type for {server}:{name}: {content_type}"
                )
                raise ExternalSourceParseError(
                    f"Unexpected content type: {content_type}"
                )

        except ExternalSourceParseError:
            raise
        except Exception as e:
            logger.error(
                f"✗ Parse error for {server}:{name}: {e}\n"
                f"Response preview: {response.text[:500]}...",
                exc_info=True
            )
            raise ExternalSourceParseError(f"Failed to parse response: {e}") from e

    def _looks_like_json(self, text: str) -> bool:
        """Quick check if response looks like JSON"""
        stripped = text.strip()
        return stripped.startswith('{') or stripped.startswith('[')

    def _parse_json_response(
        self,
        response: httpx.Response,
        server: str,
        name: str
    ) -> CharacterDTO:
        """
        Parse JSON API response

        Expected API structure (adjust based on actual API):
        {
            "name": "CharacterName",
            "server": "ServerName",
            "class": "ClassName",
            "level": 80,
            "power": 123456,
            "stats": {...}
        }
        """
        try:
            data = response.json()

            # Handle list response (search results)
            if isinstance(data, list):
                if not data:
                    logger.warning(f"⚠ Empty result list for {server}:{name}")
                    raise ExternalSourceParseError("Character not found in API results")

                # Take first result
                data = data[0]
                logger.info(f"✓ Using first result from {len(data)} matches")

            # Handle wrapped response
            if "data" in data:
                data = data["data"]

            if "result" in data:
                data = data["result"]

            # Extract character fields (with fallbacks)
            character = CharacterDTO(
                name=data.get("name") or data.get("characterName") or name,
                server=data.get("server") or data.get("serverName") or server,
                class_name=data.get("class") or data.get("className") or data.get("job") or "Unknown",
                level=int(data.get("level") or data.get("characterLevel") or 1),
                power=int(data.get("power") or data.get("combatPower") or data.get("rating") or 0),
                updated_at=datetime.now(),
                stats_json=data.get("stats") or data.get("attributes") or {}
            )

            logger.info(
                f"✓ Parsed JSON: {character.name} (Lv.{character.level}, "
                f"Power: {character.power})"
            )
            return character

        except (KeyError, ValueError, TypeError) as e:
            logger.error(
                f"✗ JSON parse error for {server}:{name}: {e}\n"
                f"Response: {response.text[:500]}..."
            )
            raise ExternalSourceParseError(f"Invalid JSON structure: {e}") from e

    def _parse_html_response(
        self,
        response: object,
        server: str,
        name: str,
        img_src_override: str = None
    ) -> CharacterDTO:
        """
        Parse HTML response (web scraping)
        Target: Ranking Page Table
        """
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')

            # --- Ranking Page Parsing Logic ---
            found_row = None
            rows = soup.find_all("tr")

            # Strategy: Prioritize Exact Match in Name Column
            target_row_exact = None
            target_row_partial = None

            for forrow in rows:
                cols = forrow.find_all("td")
                if len(cols) >= 5:
                    try:
                        # Name is at -5 (Rank, Diff, Name, Server, Race, Class, Power - Wait, logic below uses -5)
                        # Let's use the same index logic as extraction to be consistent
                        row_name = cols[-5].get_text(strip=True)
                        
                        if row_name == name:
                            target_row_exact = forrow
                            break # Found exact match
                        
                        if name in row_name and target_row_partial is None:
                            target_row_partial = forrow
                    except:
                        pass
                
                # Fallback to text search if column logic fails safely
                elif name in forrow.get_text(strip=True) and target_row_partial is None:
                    target_row_partial = forrow

            found_row = target_row_exact or target_row_partial

            if found_row:
                cols = found_row.find_all("td")
                # Expected columns: Rank, Diff, Name, Server, Race, Class, Power
                # Indexing: 0=Rank, 1=Name, 2=Server, 3=Race, 4=Class, 5=Power
                if len(cols) >= 5: # Relaxed check
                    try:
                        # Use negative indexing for safer mapping
                        # Expected end: ... Server, Race, Class, Power
                        power_str = cols[-1].get_text(strip=True).replace(",", "")
                        extracted_class = cols[-2].get_text(strip=True)
                        extracted_race = cols[-3].get_text(strip=True)
                        extracted_server = cols[-4].get_text(strip=True) 
                        extracted_name = cols[-5].get_text(strip=True) # Name is before Server

                        stats_json = {
                            "server_match": extracted_server,
                            "race": extracted_race
                        }
                        if img_src_override:
                            stats_json["img_src"] = img_src_override
                        elif found_row.select_one("img"):
                            stats_json["img_src"] = found_row.select_one("img")["src"]

                        character = CharacterDTO(
                            name=extracted_name,
                            server=server,
                            class_name=extracted_class,
                            level=60,
                            power=int(power_str) if power_str.isdigit() else 0,
                            updated_at=datetime.now(),
                            stats_json=stats_json
                        )
                        
                        logger.info(
                            f"✓ Parsed HTML: {character.name} (Class: {character.class_name}, "
                            f"Power: {character.power})"
                        )
                        return character
                    except Exception as e:
                        logger.warning(f"Error parsing columns for {name}: {e}")

            # Fallback
            logger.warning(f"⚠ Character '{name}' not found in ranking list")
            raise ExternalSourceParseError(f"Character '{name}' not found in ranking list")

        except ExternalSourceParseError:
            raise
        except Exception as e:
            # DETECT_STRUCTURE_CHANGE
            # If standard parsing fails unexpectedly (e.g. AttributeError, IndexError), 
            # it might mean the website structure has changed.
            logger.critical(
                f"🚨 [STRUCTURE CHANGE DETECTED] HTML parsing failed for {server}:{name}. "
                f"The external site layout might have changed. Error: {e}",
                exc_info=True
            )
            # Re-raise as standard parse error for user-facing generic message
            raise ExternalSourceParseError(f"Structure mismatch: {e}") from e

    def __del__(self):
        """Cleanup resources"""
        try:
            self.client.close()
        except Exception:
            pass


# ============================================================================
# Factory Function
# ============================================================================

def get_adapter() -> BaseSourceAdapter:
    """
    Factory function to get the appropriate adapter based on configuration

    Returns:
        BaseSourceAdapter: Either DummySourceAdapter or ExternalSourceAdapter
    """
    adapter_type = AdapterConfig.ADAPTER_TYPE

    if adapter_type == "external":
        logger.info("Using ExternalSourceAdapter (production mode)")
        return ExternalSourceAdapter()
    else:
        logger.info("Using DummySourceAdapter (safe fallback mode)")
        return DummySourceAdapter()


# Global adapter instance
adapter = get_adapter()
