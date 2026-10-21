#!/usr/bin/env python3
"""Aktuellen Laub-Stand (色づき状況) aller Herbstlaub-Orte von koyo.walkerplus.com abholen.

Läuft automatisch einmal bis zweimal am Tag über GitHub Actions
(.github/workflows/laub-stand.yml) und schreibt das Ergebnis nach
data/laub-stand.json. Die App liest diese Datei und zeigt den echten Stand an.

Von Hand testen:  python3 scripts/laub_stand.py
Nur Python-Standardbibliothek, keine Installation nötig.
"""

import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ORDNER = Path(__file__).resolve().parent.parent
QUELLE = ORDNER / "data" / "herbstlaub.json"
ZIEL = ORDNER / "data" / "laub-stand.json"
TOKIO = timezone(timedelta(hours=9))

# Stand und Uhrzeit stehen auf jeder Seite direkt unter dem Namen, z. B.
# <span class="text_status_status s1">青葉</span><span class="text_status_time">2026年10月20日 16:05更新</span>
MUSTER = [
    re.compile(r'text_status_status[^"]*">\s*([^<]+?)\s*</span>\s*<span class="text_status_time">\s*([^<]+?)\s*</span>'),
    re.compile(r'class="colored_text[^"]*">\s*([^<]+?)\s*</p>\s*<time class="colored_time">\s*([^<]+?)\s*</time>'),
]
ZEIT = re.compile(r"(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})")


def seite_laden(url, versuche=3):
    for nr in range(versuche):
        try:
            anfrage = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (TokioEntdecker; private Reise-App, 1 Abruf pro Tag)",
                "Accept-Language": "ja,en;q=0.8",
            })
            with urllib.request.urlopen(anfrage, timeout=30) as antwort:
                return antwort.read().decode("utf-8", errors="replace")
        except Exception as fehler:  # Netzwerkfehler: kurz warten, nochmal
            print(f"  Versuch {nr + 1} fehlgeschlagen: {fehler}", file=sys.stderr)
            time.sleep(3 * (nr + 1))
    return None


def stand_lesen(html):
    for muster in MUSTER:
        treffer = muster.search(html)
        if treffer:
            stand, zeit = treffer.group(1).strip(), treffer.group(2).strip()
            z = ZEIT.search(zeit)
            iso = f"{z[1]}-{int(z[2]):02d}-{int(z[3]):02d}T{int(z[4]):02d}:{z[5]}+09:00" if z else None
            return stand, iso
    return None, None


def main():
    orte = json.loads(QUELLE.read_text(encoding="utf-8"))
    alt = json.loads(ZIEL.read_text(encoding="utf-8")).get("orte", {}) if ZIEL.exists() else {}
    neu, ok, ohne = {}, 0, 0

    for ort in orte:
        url = next((l["url"] for l in ort.get("links", []) if "koyo.walkerplus.com/detail/" in l.get("url", "")), None)
        if not url:
            continue
        html = seite_laden(url)
        stand, zeit = stand_lesen(html) if html else (None, None)
        if stand:
            neu[ort["id"]] = {"stand": stand, "aktualisiert": zeit}
            ok += 1
            print(f"{ort['id']}: {stand} ({zeit})")
        elif html:
            ohne += 1  # Seite ohne täglichen Stand (gibt es bei manchen Orten)
            print(f"{ort['id']}: kein Stand auf der Seite")
        elif ort["id"] in alt:
            neu[ort["id"]] = alt[ort["id"]]  # Abruf fehlgeschlagen: letzten bekannten Stand behalten
            print(f"{ort['id']}: Abruf fehlgeschlagen, alter Stand bleibt")
        time.sleep(1.5)  # freundlich bleiben: nicht zu schnell hintereinander

    if ok == 0:
        print("Kein einziger Stand gefunden – hat Walkerplus die Seite umgebaut?", file=sys.stderr)
        sys.exit(1)  # lässt den GitHub-Lauf rot werden, damit es auffällt

    ergebnis = {
        "quelle": "koyo.walkerplus.com (色づき状況, Daten von JRシステム)",
        "abgerufen": datetime.now(TOKIO).isoformat(timespec="minutes"),
        "orte": neu,
    }
    ZIEL.write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Fertig: {ok} Orte mit Stand, {ohne} ohne täglichen Stand.")


if __name__ == "__main__":
    main()
