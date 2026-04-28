#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Feature-017 改造后，验证前端调用的后端 URL 是否按新规范返回 {success, data, meta}/{success, error}。
仅跑 GET 列表 + 非破坏性探测。"""
import json
import uuid
from http.client import HTTPConnection

HOST, PORT = "21.6.66.244", 8080

def get(path, expected_success):
    conn = HTTPConnection(HOST, PORT, timeout=30)
    conn.request("GET", path, headers={"Accept": "application/json"})
    r = conn.getresponse()
    code = r.status
    raw = r.read(32768)
    conn.close()
    try:
        body = json.loads(raw)
    except Exception:
        body = {"raw": raw[:200].decode("utf-8", "replace")}
    has_envelope = isinstance(body, dict) and "success" in body
    ok = has_envelope and body.get("success") == expected_success
    return code, ok, body

def post(path, payload, expected_success):
    conn = HTTPConnection(HOST, PORT, timeout=30)
    body = json.dumps(payload).encode()
    conn.request("POST", path, body=body, headers={
        "Content-Type": "application/json", "Accept": "application/json"
    })
    r = conn.getresponse()
    code = r.status
    raw = r.read(16384)
    conn.close()
    try:
        b = json.loads(raw)
    except Exception:
        b = {"raw": raw[:200].decode("utf-8", "replace")}
    ok = isinstance(b, dict) and "success" in b and b.get("success") == expected_success
    return code, ok, b

fake = str(uuid.uuid4())
tests = [
    # 前端 views/*.vue 实际调用的 GET 列表端点
    ("GET",  "/api/v1/coaches",                True,  "coaches list"),
    ("GET",  "/api/v1/tasks?page=1&page_size=5", True, "tasks list"),
    ("GET",  "/api/v1/tasks/cos-videos?limit=3", True, "cos-videos"),
    ("GET",  "/api/v1/classifications?page=1&page_size=5", True, "classifications list (new path)"),
    ("GET",  "/api/v1/extraction-jobs?page=1&page_size=5", True, "extraction-jobs list"),
    ("GET",  "/api/v1/knowledge-base/versions", True, "kb versions"),
    ("GET",  "/api/v1/teaching-tips?page=1&page_size=5", True, "teaching-tips list"),
    ("GET",  "/api/v1/standards",               True, "standards list"),
    # 不存在 UUID 应返回 success:false
    ("GET",  f"/api/v1/coaches/{fake}",         False, "coach not found"),
    ("GET",  f"/api/v1/tasks/{fake}",           False, "task not found"),
    ("GET",  f"/api/v1/extraction-jobs/{fake}", False, "job not found"),
    ("GET",  f"/api/v1/video-preprocessing/{fake}", False, "preprocessing not found"),
    # 废弃端点 → ENDPOINT_RETIRED
    ("POST", "/api/v1/tasks/expert-video",      False, "expert-video (retired)"),
    ("POST", "/api/v1/videos/classifications/refresh", False, "videos refresh (retired)"),
    ("POST", "/api/v1/diagnosis",               False, "sync diagnosis (retired)"),
]

print(f"{'Endpoint':<60s} {'HTTP':<6s} {'Envelope':<10s} Note")
print("─" * 100)
all_ok = True
for t in tests:
    method, path = t[0], t[1]
    expected = t[2]
    note = t[3]
    if method == "GET":
        code, ok, body = get(path, expected)
    else:
        code, ok, body = post(path, {}, expected)
    err_code = ""
    if isinstance(body, dict):
        err_code = (body.get("error") or {}).get("code", "") if body.get("success") is False else ""
    mark = "✓" if ok else "✗"
    print(f"{path:<60s} {code:<6d} {mark} success={str(body.get('success','?')):<5s} "
          f"{('['+err_code+']') if err_code else ''} {note}")
    if not ok:
        all_ok = False

print()
print("✅ 全部通过 — 前端信封解析兼容性验证成功" if all_ok else "⚠️ 仍有端点未按规范返回（见上 ✗）")
