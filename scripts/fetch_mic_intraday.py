#!/usr/bin/env python3
"""Fetch 5-minute OHLCV snapshots for MIC.

This uses Yahoo's public chart endpoint as a zero-cost beta feed. It is not an
exchange-licensed trade feed and therefore cannot provide true tape/CVD data.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "mic" / "data" / "intraday"

SYMBOLS = {
    "THYAO": {"provider_symbol": "THYAO.IS", "timezone": "Europe/Istanbul", "market": "BIST", "open": "10:00", "close": "18:00"},
    "FROTO": {"provider_symbol": "FROTO.IS", "timezone": "Europe/Istanbul", "market": "BIST", "open": "10:00", "close": "18:00"},
    "TTKOM": {"provider_symbol": "TTKOM.IS", "timezone": "Europe/Istanbul", "market": "BIST", "open": "10:00", "close": "18:00"},
    "TUPRS": {"provider_symbol": "TUPRS.IS", "timezone": "Europe/Istanbul", "market": "BIST", "open": "10:00", "close": "18:00"},
    "AKBNK": {"provider_symbol": "AKBNK.IS", "timezone": "Europe/Istanbul", "market": "BIST", "open": "10:00", "close": "18:00"},
    "ISCTR": {"provider_symbol": "ISCTR.IS", "timezone": "Europe/Istanbul", "market": "BIST", "open": "10:00", "close": "18:00"},
    "LUNR": {"provider_symbol": "LUNR", "timezone": "America/New_York", "market": "US", "open": "09:30", "close": "16:00"},
    "ASTS": {"provider_symbol": "ASTS", "timezone": "America/New_York", "market": "US", "open": "09:30", "close": "16:00"},
    "RKLB": {"provider_symbol": "RKLB", "timezone": "America/New_York", "market": "US", "open": "09:30", "close": "16:00"},
    "NVDA": {"provider_symbol": "NVDA", "timezone": "America/New_York", "market": "US", "open": "09:30", "close": "16:00"},
    "GLD": {"provider_symbol": "GLD", "timezone": "America/New_York", "market": "US", "open": "09:30", "close": "16:00"},
}


def fetch_json(url: str, attempts: int = 3) -> dict:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 MIC/1.0",
                    "Accept": "application/json,text/plain,*/*",
                },
            )
            with urllib.request.urlopen(req, timeout=20) as response:
                return json.load(response)
        except Exception as exc:
            last_error = exc
            time.sleep(2**attempt)
    raise RuntimeError(f"request failed after {attempts} attempts: {last_error}")


def build_payload(symbol: str, config: dict) -> dict:
    encoded = urllib.parse.quote(config["provider_symbol"], safe="")
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
        "?range=1mo&interval=5m&includePrePost=false&events=div%2Csplits"
    )
    raw = fetch_json(url)
    chart = raw.get("chart") or {}
    if chart.get("error"):
        raise RuntimeError(str(chart["error"]))
    result = (chart.get("result") or [None])[0]
    if not result:
        raise RuntimeError("empty chart result")
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}
    quote = (indicators.get("quote") or [{}])[0]
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []
    bars = []
    for index, ts in enumerate(timestamps):
        values = [
            opens[index] if index < len(opens) else None,
            highs[index] if index < len(highs) else None,
            lows[index] if index < len(lows) else None,
            closes[index] if index < len(closes) else None,
        ]
        if any(value is None for value in values):
            continue
        bars.append(
            {
                "t": int(ts) * 1000,
                "open": float(values[0]),
                "high": float(values[1]),
                "low": float(values[2]),
                "close": float(values[3]),
                "volume": float(volumes[index] or 0) if index < len(volumes) else 0.0,
            }
        )
    if len(bars) < 3:
        raise RuntimeError("insufficient intraday bars")
    meta = result.get("meta") or {}
    return {
        "schema": 1,
        "symbol": symbol,
        "provider_symbol": config["provider_symbol"],
        "provider": "Yahoo Finance chart feed (unofficial beta)",
        "market": config["market"],
        "interval": "5m",
        "timezone": config["timezone"],
        "session": {"open": config["open"], "close": config["close"]},
        "currency": meta.get("currency"),
        "exchange_name": meta.get("exchangeName"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_bar_at": datetime.fromtimestamp(bars[-1]["t"] / 1000, timezone.utc).isoformat(),
        "bars": bars[-3000:],
    }


def stable_payload(payload: dict) -> dict:
    clone = dict(payload)
    clone.pop("updated_at", None)
    return clone


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    changed = 0
    errors: dict[str, str] = {}
    for symbol, config in SYMBOLS.items():
        try:
            payload = build_payload(symbol, config)
            path = OUT / f"{symbol}.json"
            old = None
            if path.exists():
                try:
                    old = json.loads(path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    old = None
            if old is None or stable_payload(old) != stable_payload(payload):
                path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
                changed += 1
            print(f"{symbol}: {len(payload['bars'])} bars")
        except Exception as exc:
            errors[symbol] = str(exc)
            print(f"{symbol}: ERROR {exc}")
    status = {
        "schema": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "changed_files": changed,
        "errors": errors,
    }
    status_path = OUT / "status.json"
    old_status = None
    if status_path.exists():
        try:
            old_status = json.loads(status_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    old_errors = (old_status or {}).get("errors", {})
    if changed or errors != old_errors or not status_path.exists():
        status_path.write_text(json.dumps(status, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    if errors and changed == 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
