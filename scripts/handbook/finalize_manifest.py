#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Add page count and file sizes to manifest.json after the PDF has been built.
Run this after build_handbook.py + convert_to_pdf.py.

Usage:
    python3 finalize_manifest.py
"""
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(HERE, "manifest.json")
REPO_ROOT = "/home/user/product-with-rohan"
DOCX_PATH = os.path.join(REPO_ROOT, "public", "handbook", "The-Product-Manager-Handbook.docx")
PDF_PATH = os.path.join(REPO_ROOT, "public", "handbook", "The-Product-Manager-Handbook.pdf")


def get_pdf_page_count(pdf_path):
    result = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True, check=True)
    for line in result.stdout.splitlines():
        if line.startswith("Pages:"):
            return int(line.split(":")[1].strip())
    raise RuntimeError("Could not determine page count from pdfinfo output")


def human_size(num_bytes):
    for unit in ("B", "KB", "MB", "GB"):
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"


def main():
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    page_count = get_pdf_page_count(PDF_PATH)
    docx_size = os.path.getsize(DOCX_PATH)
    pdf_size = os.path.getsize(PDF_PATH)

    manifest["page_count_pdf"] = page_count
    manifest["docx_path"] = DOCX_PATH
    manifest["pdf_path"] = PDF_PATH
    manifest["docx_size_bytes"] = docx_size
    manifest["pdf_size_bytes"] = pdf_size
    manifest["docx_size_human"] = human_size(docx_size)
    manifest["pdf_size_human"] = human_size(pdf_size)

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Page count: {page_count}")
    print(f"DOCX: {docx_size} bytes ({human_size(docx_size)})")
    print(f"PDF: {pdf_size} bytes ({human_size(pdf_size)})")
    print(f"Updated {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
