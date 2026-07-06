from __future__ import annotations

import re

LANGUAGES: dict[str, str] = {
    "en": "English",
    "zh": "中文 (Chinese)",
    "ja": "日本語 (Japanese)",
    "ko": "한국어 (Korean)",
}

TARGET_LANGUAGE_OPTIONS: list[str] = [
    LANGUAGES["zh"],
    LANGUAGES["ja"],
    LANGUAGES["ko"],
    LANGUAGES["en"],
]

_LABEL_TO_CODE: dict[str, str] = {label: code for code, label in LANGUAGES.items()}


def label_to_code(label: str) -> str:
    """Map a dropdown label back to its language code (defaults to 'en')."""
    return _LABEL_TO_CODE.get(label, "en")


CAMERA_GLOSSARY: dict[str, dict[str, str]] = {
    # Azimuth / horizontal direction
    "front view":               {"zh": "正面视角", "ja": "正面",   "ko": "정면"},
    "front-right quarter view": {"zh": "右前方视角", "ja": "右前方", "ko": "우측 전방"},
    "right side view":          {"zh": "右侧视角", "ja": "右側面",   "ko": "우측면"},
    "back-right quarter view":  {"zh": "右后方视角", "ja": "右後方", "ko": "우측 후방"},
    "back view":                {"zh": "背面视角", "ja": "背面",     "ko": "후면"},
    "back-left quarter view":   {"zh": "左后方视角", "ja": "左後方", "ko": "좌측 후방"},
    "left side view":           {"zh": "左侧视角", "ja": "左側面",   "ko": "좌측면"},
    "front-left quarter view":  {"zh": "左前方视角", "ja": "左前方", "ko": "좌측 전방"},
    # Elevation / vertical direction
    "low-angle shot":           {"zh": "仰拍",   "ja": "ローアングル", "ko": "로우 앵글"},
    "eye-level shot":           {"zh": "平视",   "ja": "アイレベル",   "ko": "아이 레벨"},
    "elevated shot":            {"zh": "高角度", "ja": "ハイアングル", "ko": "하이 앵글"},
    "high-angle shot":          {"zh": "俯拍",   "ja": "俯瞰",         "ko": "부감"},
    # Distance / shot size
    "wide shot":                {"zh": "远景",   "ja": "ワイドショット",   "ko": "와이드 샷"},
    "medium shot":              {"zh": "中景",   "ja": "ミディアムショット", "ko": "미디엄 샷"},
    "close-up":                 {"zh": "特写",   "ja": "クローズアップ",   "ko": "클로즈업"},
}


_SORTED_PHRASES = sorted(CAMERA_GLOSSARY.keys(), key=len, reverse=True)
_PHRASE_RE = re.compile(
    r"(?<![A-Za-z])(" + "|".join(re.escape(p) for p in _SORTED_PHRASES) + r")(?![A-Za-z])",
    re.IGNORECASE,
)


def translate_camera_terms(text: str, lang_code: str) -> str:
    if not text or lang_code == "en" or lang_code not in ("zh", "ja", "ko"):
        return text

    def _sub(match: re.Match) -> str:
        phrase = match.group(1)
        entry = CAMERA_GLOSSARY.get(phrase.lower())
        if not entry:
            return phrase
        return entry.get(lang_code, phrase)

    return _PHRASE_RE.sub(_sub, text)
