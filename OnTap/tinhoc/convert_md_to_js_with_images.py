#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Parse input.md that contains Vietnamese multiple-choice questions (CÂU NNN: ...),
extract each question, options A-D, and the answer line (ĐÁP ÁN: X).
Additionally extract and save base64 images to files.

Outputs:
- questions.json: array of question objects
- questions.js: export const questions = [...]
- images/: folder containing extracted images

Usage:
  python convert_md_to_js_with_images.py [input_md]
"""

from __future__ import annotations

import json
import re
import sys
import base64
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Tuple, Optional


VI_UPPER = "A-ZÁ-Â-Ã-È-É-Ê-Ì-Í-Ò-Ó-Ô-Õ-Ù-Ú-Ă-Đ-Ĩ-Ũ-Ơ-Ư-Ạ-Ả-Ấ-Ầ-Ẩ-Ẫ-Ậ-Ắ-Ằ-Ẳ-Ẵ-Ặ-Ẹ-Ẻ-Ẽ-Ề-Ế-Ể-Ễ-Ệ-Ỉ-Ị-Ọ-Ỏ-Ố-Ồ-Ổ-Ỗ-Ộ-Ớ-Ờ-Ở-Ỡ-Ợ-Ụ-Ủ-Ứ-Ừ-Ử-Ữ-Ự-Ỳ-Ỵ-Ỷ-Ỹ"


@dataclass
class Question:
    section: str
    number: int
    prompt: str
    sentences: List[str]
    options: Dict[str, str]
    answer: str
    images: List[str]  # Paths to image files


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_and_save_image(image_line: str, images_dir: Path, question_num: int, img_count: int, section: str) -> str:
    """Extract base64 image data and save to file, return relative path."""
    # Match pattern: ![filename](data:image/jpeg;base64,...)
    match = re.match(r'!\[([^\]]*)\]\(data:image/([^;]+);base64,([^)]+)\)', image_line.strip())
    if not match:
        return ""
    
    original_filename = match.group(1)
    image_type = match.group(2)
    base64_data = match.group(3)
    
    # Create unique filename using section and question number
    if original_filename and original_filename != "chunk-0-img-0":
        # Use original name if it's meaningful
        filename = f"{section}_Q{question_num:03d}_{original_filename}"
    else:
        # Create descriptive name
        filename = f"{section}_Q{question_num:03d}_img{img_count}"
    
    # Ensure proper extension
    if not filename.endswith(f'.{image_type}'):
        filename = f"{filename}.{image_type}"
    
    try:
        # Decode base64 data
        image_data = base64.b64decode(base64_data)
        
        # Save to images directory
        image_path = images_dir / filename
        
        # Skip if file already exists with same content
        if image_path.exists():
            existing_data = image_path.read_bytes()
            if existing_data == image_data:
                return f"images/{filename}"
        
        image_path.write_bytes(image_data)
        
        # Return relative path
        return f"images/{filename}"
    except Exception as e:
        print(f"Error saving image for question {question_num}: {e}")
        return ""


def sentence_split_vi(text: str) -> List[str]:
    """A simple Vietnamese sentence splitter."""
    # Normalize ellipses to a single token to reduce over-splitting
    norm = re.sub(r"\u2026|\.\.\.", "…", text)
    # Replace LaTeX arrows and symbols to plain tokens to avoid odd splits
    norm = norm.replace("$->$", "→").replace("$\\rightarrow$", "→").replace("\\rightarrow", "→")
    # Split with regex: punctuation followed by whitespace (simple heuristic)
    splitter = re.compile(r"(?<=[\.!?…])\s+")
    parts = splitter.split(norm)
    # Clean parts
    out: List[str] = []
    for p in parts:
        q = p.strip()
        if not q:
            continue
        out.append(q)
    return out


def parse_questions(md: str, out_dir: Path) -> List[Question]:
    # Create images directory
    images_dir = out_dir / "images"
    images_dir.mkdir(exist_ok=True)
    
    # Locate all question headers
    q_header_re = re.compile(r"^\s*C\S*U\s*0*(\d+)\s*[:：\.-]?\s*(.*)$", re.MULTILINE | re.IGNORECASE)
    matches = list(q_header_re.finditer(md))

    # Identify module-level headings
    module_head_re = re.compile(r"^\s*#\s+(.+)$", re.MULTILINE)
    module_heads: List[Tuple[int, str]] = []
    for m in module_head_re.finditer(md):
        title = m.group(1).strip()
        t_upper = title.upper()
        label: Optional[str] = None
        if "IU07" in t_upper or "VĂN BẢN" in t_upper or "WORD" in t_upper:
            label = "IU07"
        elif "IU08" in t_upper or "BẢNG TÍNH" in t_upper or "EXCEL" in t_upper:
            label = "IU08"
        elif "IU09" in t_upper or "TRÌNH CHIẾU" in t_upper or "POWERPOINT" in t_upper:
            label = "IU09"
        if label:
            module_heads.append((m.start(), label))
    
    questions: List[Question] = []
    
    for i, m in enumerate(matches):
        num = int(m.group(1))
        
        # Determine module section
        section = ""
        if module_heads:
            idx = -1
            lo, hi = 0, len(module_heads) - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                if module_heads[mid][0] <= m.start():
                    idx = mid
                    lo = mid + 1
                else:
                    hi = mid - 1
            if idx >= 0:
                section = module_heads[idx][1]
        
        # Get question block content
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        block = m.group(2).strip() + "\n" + md[start:end]

        # Parse the block
        lines = [ln.rstrip() for ln in block.splitlines()]
        prompt_lines: List[str] = []
        options: Dict[str, str] = {}
        answer: str | None = None
        images: List[str] = []
        img_count = 0

        # Regex patterns
        opt_re = re.compile(r"^[ \t]*([A-Da-d])[ \t]*[\.:\)\-–—][ \t]*(.+)$")
        ans_re = re.compile(r"^[ĐD][ÁAâ]*P\s*[ÁAâ]*N\s*:\s*([A-Da-d])\b", re.IGNORECASE)

        for ln in lines:
            if not ln.strip():
                continue
            
            # Handle image lines
            if ln.lstrip().startswith("!["):
                img_count += 1
                image_path = extract_and_save_image(ln, images_dir, num, img_count, section)
                if image_path:
                    images.append(image_path)
                    prompt_lines.append(f"[HÌNH: {image_path}]")
                else:
                    prompt_lines.append("[HÌNH]")
                continue
            
            # Handle option lines
            mo = opt_re.match(ln)
            if mo:
                opt_key = mo.group(1).upper()
                options[opt_key] = mo.group(2).strip()
                continue
            
            # Handle answer lines
            ma = ans_re.match(ln)
            if ma:
                answer = ma.group(1).upper()
                continue
            
            # Check if line contains answer pattern anywhere (not just at start)
            ma_anywhere = re.search(r"[ĐD][ÁAâ]*P\s*[ÁAâ]*N\s*:\s*([A-Da-d])\b", ln, re.IGNORECASE)
            if ma_anywhere:
                answer = ma_anywhere.group(1).upper()
                # Remove answer part from line and add rest to prompt if any
                clean_line = re.sub(r"[ĐD][ÁAâ]*P\s*[ÁAâ]*N\s*:\s*[A-Da-d]\b.*", "", ln, flags=re.IGNORECASE).strip()
                if clean_line:
                    prompt_lines.append(clean_line)
                continue
            
            # Otherwise, part of prompt
            prompt_lines.append(ln)

        prompt = " ".join([p.strip() for p in prompt_lines]).strip()
        prompt = re.sub(r"\s+", " ", prompt)
        sentences = sentence_split_vi(prompt) if prompt else []
        
        questions.append(
            Question(
                section=section, 
                number=num, 
                prompt=prompt, 
                sentences=sentences, 
                options=options, 
                answer=answer or "",
                images=images
            )
        )

    # Deduplicate by (section, number): prefer entries with complete data
    best: Dict[Tuple[str, int], Question] = {}
    for q in questions:
        key = (q.section, q.number)
        prev = best.get(key)
        def score(qq: Question) -> Tuple[int, int, int]:
            # Higher is better: has answer (1/0), number of options, prompt length
            return (
                1 if qq.answer in {"A", "B", "C", "D"} else 0,
                sum(1 for k in ["A","B","C","D"] if k in qq.options and qq.options[k]),
                len(qq.prompt),
            )
        if prev is None or score(q) > score(prev):
            best[key] = q
    
    # Keep section order by first appearance
    section_order: List[str] = []
    seen = set()
    for q in questions:
        if q.section not in seen:
            section_order.append(q.section)
            seen.add(q.section)
    
    out: List[Question] = []
    for sec in section_order:
        items = [v for (s, _n), v in best.items() if s == sec]
        items.sort(key=lambda x: x.number)
        out.extend(items)
    
    return out


def validate(questions: List[Question], check_seq_per_section: bool = True, expected_total: Optional[int] = None) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if not questions:
        errors.append("No questions parsed.")
        return False, errors

    # Check sequential numbers within each section
    if check_seq_per_section:
        by_sec: Dict[str, List[int]] = {}
        for q in questions:
            by_sec.setdefault(q.section, []).append(q.number)
        for sec, nums in by_sec.items():
            nums_sorted = sorted(nums)
            for i in range(1, len(nums_sorted)):
                if nums_sorted[i] != nums_sorted[i - 1] + 1:
                    errors.append(f"Section '{sec}': non-sequential numbers near {nums_sorted[i-1]} -> {nums_sorted[i]}")
                    break

    # Validate each question
    for q in questions:
        if len(q.options) != 4:
            errors.append(f"[{q.section}] Question {q.number}: expected 4 options, found {len(q.options)}")
        for opt in ["A", "B", "C", "D"]:
            if opt not in q.options:
                errors.append(f"[{q.section}] Question {q.number}: missing option {opt}")
        if q.answer not in {"A", "B", "C", "D"}:
            errors.append(f"[{q.section}] Question {q.number}: invalid/missing answer '{q.answer}'")
        if q.answer and q.answer in q.options and not q.options[q.answer]:
            errors.append(f"[{q.section}] Question {q.number}: empty text for answer option {q.answer}")
        if len(q.sentences) == 0:
            errors.append(f"[{q.section}] Question {q.number}: prompt has no sentences")

    if expected_total is not None and expected_total != len(questions):
        errors.append(f"Total questions {len(questions)} != expected {expected_total}")

    return len(errors) == 0, errors


def write_outputs(questions: List[Question], out_dir: Path) -> None:
    json_path = out_dir / "questions.json"
    js_path = out_dir / "questions.js"

    data = [asdict(q) for q in questions]
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    js = "export const questions = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    js_path.write_text(js, encoding="utf-8")


def main(argv: List[str]) -> int:
    root = Path(__file__).resolve().parent
    strict = False
    expected_total: Optional[int] = None
    args = [a for a in argv[1:] if a]
    
    # Parse arguments
    i = 0
    while i < len(args):
        if args[i] == "--strict":
            strict = True
            i += 1
        elif args[i] == "--expected" and i + 1 < len(args):
            try:
                expected_total = int(args[i + 1])
            except ValueError:
                print(f"Invalid --expected value: {args[i+1]}")
                return 2
            i += 2
        else:
            break
    
    args = args[i:]
    md_path = Path(args[0]) if args else (root / "input.md")
    
    if not md_path.exists():
        print(f"Input file not found: {md_path}")
        return 2

    md = read_text(md_path)
    questions = parse_questions(md, root)
    ok, errors = validate(questions, check_seq_per_section=True, expected_total=expected_total)
    write_outputs(questions, root)

    # Print summary
    total_sentences = sum(len(q.sentences) for q in questions)
    total_images = sum(len(q.images) for q in questions)
    
    print("Parse summary:")
    if questions:
        # Per-section counts
        per_sec: Dict[str, int] = {}
        for q in questions:
            per_sec[q.section] = per_sec.get(q.section, 0) + 1
        print(f"- Questions total: {len(questions)}")
        for sec, cnt in per_sec.items():
            # Extract range and missing
            nums = sorted(q.number for q in questions if q.section == sec)
            max_num = nums[-1] if nums else 0
            min_num = nums[0] if nums else 0
            expected = set(range(min_num, max_num + 1))
            missing_nums = sorted(expected.difference(nums))
            miss_info = "" if not missing_nums else f" missing {len(missing_nums)}: {missing_nums[:10]}{'…' if len(missing_nums)>10 else ''}"
            print(f"  * {sec}: {cnt} ({min_num}..{max_num}){miss_info}")
    else:
        print("- Questions: 0")
    
    print(f"- Total sentences: {total_sentences}")
    print(f"- Total images extracted: {total_images}")
    
    missing = [q.number for q in questions if len(q.options) != 4 or q.answer not in {'A','B','C','D'}]
    if missing:
        print(f"- Issues in questions: {missing}")
    
    if errors:
        print("Validation errors:")
        for e in errors:
            print(f"  - {e}")
    
    return 0 if (ok or not strict) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))