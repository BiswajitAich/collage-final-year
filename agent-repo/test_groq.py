#!/usr/bin/env python3
"""Test Groq API key and list available models."""

import os
import sys
import requests

API_KEY = os.environ.get("GROQ_API_KEY") or input("Paste your Groq API key: ").strip()
if not API_KEY:
    print("No API key provided")
    sys.exit(1)

headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Test with a simple chat completion
print("\n--- Testing chat completion ---")
r = requests.post(
    "https://api.groq.com/openai/v1/chat/completions",
    headers=headers,
    json={
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": "Say hello in one word"}],
        "max_tokens": 10,
    },
)
if r.ok:
    print("OK:", r.json()["choices"][0]["message"]["content"])
else:
    print("FAILED:", r.status_code, r.json().get("error", {}).get("message", r.text))
    sys.exit(1)

# List models
print("\n--- Available models ---")
r = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
if r.ok:
    for m in r.json()["data"]:
        print(f"  {m['id']}")
else:
    print("FAILED:", r.status_code, r.text)
