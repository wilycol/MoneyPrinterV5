import json
import sys
import zipfile
import xml.etree.ElementTree as ET


def extract_text_from_docx(docx_path: str) -> str:
    with zipfile.ZipFile(docx_path) as z:
        xml_bytes = z.read("word/document.xml")

    root = ET.fromstring(xml_bytes)

    paragraphs = []
    current = []
    for el in root.iter():
        tag = el.tag
        if tag.endswith("}p"):
            if current:
                paragraphs.append("".join(current).strip())
            current = []
            continue
        if tag.endswith("}t"):
            if el.text:
                current.append(el.text)

    if current:
        paragraphs.append("".join(current).strip())

    return "\n".join([p for p in paragraphs if p])


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"text": ""}))
        return
    docx_path = sys.argv[1]
    try:
        text = extract_text_from_docx(docx_path)
        print(json.dumps({"text": text}, ensure_ascii=False))
    except Exception:
        print(json.dumps({"text": ""}))
        sys.exit(1)


if __name__ == "__main__":
    main()

