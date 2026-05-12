#!/usr/bin/env python3
"""Quorum Consultant — 3 models vote in parallel, consensus picks the answer.

Providers: OpenRouter (free + paid) + RouterAI (paid)
Keys loaded from: ~/.openclaw/workspace/secrets/
"""

import sys, os, json, time, urllib.request, urllib.error, concurrent.futures

SECRETS_DIR = os.path.expanduser("~/.openclaw/workspace/secrets")

def load_key(name):
    path = os.path.join(SECRETS_DIR, name)
    try:
        with open(path) as f:
            return f.read().strip()
    except FileNotFoundError:
        return None

# Load API keys
OR_KEY = load_key("openrouter-apikey")
RA_KEY = load_key("routerai-apikey")

# Config — pick which models to use
USE_OPENROUTER = OR_KEY is not None
USE_ROUTERAI = RA_KEY is not None

if not USE_OPENROUTER and not USE_ROUTERAI:
    print("ERROR: No API keys found.")
    print(f"  Expected keys in {SECRETS_DIR}/")
    print(f"  openrouter-apikey: {'✅' if USE_OPENROUTER else '❌'}")
    print(f"  routerai-apikey:   {'✅' if USE_ROUTERAI else '❌'}")
    sys.exit(1)

# OpenRouter API (same format as OpenAI)
OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
ROUTERAI_BASE = "https://routerai.ru/api/v1/chat/completions"

# === Free-tier models (OpenRouter) ===
# These have worked without paid tier — but may 429
FREE_MODELS = [
    "openai/gpt-oss-20b:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
]

# === Paid-tier models ===
# Add your favorite paid models here
PAID_MODELS = {
    # 2 from RouterAI + 1 from OpenRouter = 3 total
    "openrouter": [
        "meta-llama/llama-3.3-70b-instruct",
    ],
    "routerai": [
        "openai/gpt-4o",
        "anthropic/claude-sonnet-4.6",
    ],
}

# Build active model list
def build_model_list():
    models = []
    
    # Priority: paid models first, then free as fallback
    if USE_ROUTERAI and PAID_MODELS["routerai"]:
        models.extend([f"routerai:{m}" for m in PAID_MODELS["routerai"]])
    if USE_OPENROUTER and PAID_MODELS["openrouter"]:
        models.extend([f"openrouter:{m}" for m in PAID_MODELS["openrouter"]])
    
    # Fill remaining slots with free models if we have < 3
    if len(models) < 3 and USE_OPENROUTER:
        for m in FREE_MODELS:
            if len(models) >= 3:
                break
            models.append(m)
    
    # If still nothing, error out
    if not models:
        print("No models configured. Add paid models to PAID_MODELS dict.")
        sys.exit(1)
    
    # Take exactly 3 for quorum (or all if < 3)
    return models[:3]

# Select a model by provider
def get_model_info(tag):
    """Convert 'routerai:model' or 'openrouter:model' into (base_url, model_id)."""
    if tag.startswith("routerai:"):
        return ROUTERAI_BASE, tag[len("routerai:"):]
    elif tag.startswith("openrouter:"):
        return OPENROUTER_BASE, tag[len("openrouter:"):]
    else:
        return OPENROUTER_BASE, tag  # raw model name → OpenRouter

def get_auth_header(base_url, model_tag):
    """Get the right auth header for this endpoint."""
    if base_url == ROUTERAI_BASE:
        key = RA_KEY
    else:
        key = OR_KEY
    return {"Authorization": f"Bearer {key}"}

def query_model(model_tag, question):
    """Query a single model."""
    base_url, model_id = get_model_info(model_tag)
    key = RA_KEY if base_url == ROUTERAI_BASE else OR_KEY
    
    data = json.dumps({
        "model": model_id,
        "messages": [{"role": "user", "content": question}],
        "max_tokens": 4000,
        "temperature": 0.2,
    }).encode()
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
    }
    
    req = urllib.request.Request(base_url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
            content = result["choices"][0]["message"]["content"]
            if content is None:
                return model_tag, None, "Empty response", None
            content = content.strip()
            tokens = result.get("usage", {}).get("total_tokens", "?")
            provider = "🇷🇺 RA" if base_url == ROUTERAI_BASE else "🌐 OR"
            return model_tag, content, None, (tokens, provider)
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return model_tag, None, f"HTTP {e.code}: {body[:200]}", None
    except Exception as e:
        return model_tag, None, f"{type(e).__name__}: {e}", None

def similarity(a, b):
    """Jaccard similarity of word sets."""
    if not a or not b: return 0
    wa = set(a.lower().split())
    wb = set(b.lower().split())
    return len(wa & wb) / len(wa | wb) if wa | wb else 0

def quorum_consensus(answers):
    """Pick the answer that matches most others."""
    valid = [(m, c) for m, c, e, _ in answers if e is None]
    if not valid:
        return None, "No models responded successfully"
    if len(valid) == 1:
        return valid[0][0], valid[0][1]

    best_score = 0
    best_idx = 0
    for i, (mi, ci) in enumerate(valid):
        score = sum(similarity(ci, cj) for j, (mj, cj) in enumerate(valid) if i != j)
        if score > best_score:
            best_score = score
            best_idx = i

    chosen = valid[best_idx]
    return chosen[0], chosen[1]

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 consult.py <question>")
        sys.exit(1)

    question = sys.argv[1]
    
    MODELS = build_model_list()
    if not MODELS:
        sys.exit(1)
    
    print(f"\n⚡ Quorum consulting ({len(MODELS)} models)...\n")
    print(f"  OpenRouter (paid): {'✅' if USE_OPENROUTER else '❌'}")
    print(f"  RouterAI (paid):   {'✅' if USE_ROUTERAI else '❌'}")
    print()

    start = time.time()
    results = [None] * len(MODELS)

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(MODELS)) as pool:
        futures = {}
        for i, m in enumerate(MODELS):
            futures[pool.submit(query_model, m, question)] = i

        for fut in concurrent.futures.as_completed(futures):
            idx = futures[fut]
            results[idx] = fut.result()

    elapsed = time.time() - start

    # Show all results
    for i, result in enumerate(results):
        mid, content, error, tokens_info = result
        # Short name: routerai:openai/gpt-4o → gpt-4o
        short_name = mid.split(":")[-1][:30]
        if error:
            print(f"❌ {short_name}: {error}")
        else:
            tokens, provider = tokens_info
            preview = content[:100].replace('\n', ' ')
            print(f"✅ [{provider}] {short_name} ({tokens}tok): {preview}...")

    # Consensus
    chosen_model, chosen_answer = quorum_consensus(results)
    total_valid = sum(1 for _, _, e, _ in results if e is None)
    
    print(f"\n{'─' * 60}")
    if chosen_model:
        short = chosen_model.split(":")[-1][:30]
        print(f"🏆 QUORUM RESULT: {short}")
    else:
        print(f"🏆 QUORUM RESULT: N/A")
    print(f"   Agreed: {total_valid}/{len(MODELS)} models responded")
    print(f"   Time: {elapsed:.1f}s")
    print(f"{'─' * 60}")
    
    if chosen_answer:
        print(chosen_answer)

if __name__ == "__main__":
    main()
