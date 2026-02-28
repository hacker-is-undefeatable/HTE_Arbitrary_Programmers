"""
OCR Script for PDF Documents with Equation Support
Uses Azure OpenAI Vision (GPT-4o) for accurate text and equation extraction.

Requirements:
    pip install pymupdf openai Pillow python-dotenv
"""

import os
import sys
import base64
from pathlib import Path

try:
    import fitz  # PyMuPDF
    from PIL import Image
    from openai import AzureOpenAI
    from dotenv import load_dotenv
    import io
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install required packages: pip install pymupdf openai Pillow python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv(".env.local")

# Azure OpenAI configuration
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
)
DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")


def image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string."""
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def extract_text_with_vision(image: Image.Image, page_num: int) -> str:
    """
    Use Azure OpenAI Vision to extract text and equations from an image.
    Equations are returned in LaTeX format.
    """
    base64_image = image_to_base64(image)
    
    response = client.chat.completions.create(
        model=DEPLOYMENT_NAME,
        messages=[
            {
                "role": "system",
                "content": """You are an expert at extracting text from lecture slides and documents.
Extract ALL text from the image exactly as it appears.
For mathematical equations and formulas:
- Write them in LaTeX format enclosed in $ for inline or $$ for display equations
- Example: $E = mc^2$ or $$F = \\frac{1}{4\\pi\\epsilon_0} \\frac{|q_1 q_2|}{r^2}$$
Preserve the document structure (headings, bullet points, etc.)."""
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Extract all text and equations from this page (Page {page_num}). Convert all math to LaTeX format."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        max_tokens=4096,
    )
    
    return response.choices[0].message.content


def extract_text_from_pdf(pdf_path: str, dpi: int = 150) -> str:
    """
    Extract text from a PDF using Azure OpenAI Vision.
    Handles both regular text and mathematical equations.

    Args:
        pdf_path: Path to the PDF file
        dpi: Resolution for PDF-to-image conversion

    Returns:
        Extracted text with equations in LaTeX format
    """
    pdf_path = Path(pdf_path)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError(f"File is not a PDF: {pdf_path}")

    print(f"Processing: {pdf_path.name}")

    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)

    print(f"Found {total_pages} page(s). Extracting with GPT-4 Vision...")

    extracted_text: list[str] = []
    zoom = dpi / 72

    for i, page in enumerate(doc, 1):
        print(f"  Processing page {i}/{total_pages}...", end=" ", flush=True)

        try:
            # Render page to image
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data))

            # Use GPT-4 Vision to extract text
            text = extract_text_with_vision(image, i)
            extracted_text.append(f"--- Page {i} ---\n{text}")
            print("Done")
        except Exception as e:
            print(f"Error: {e}")
            extracted_text.append(f"--- Page {i} ---\n[Extraction error: {e}]")

    doc.close()
    return "\n\n".join(extracted_text)


def save_text_to_file(text: str, output_path: str) -> None:
    """Save extracted text to a file."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Text saved to: {output_path}")


if __name__ == "__main__":
    pdf_file = r"c:\Users\liuwi\Documents\GitHub\HTE_Arbitrary_Programmers\lecture01-ch21-1.pdf"
    
    if os.path.exists(pdf_file):
        text = extract_text_from_pdf(pdf_file, dpi=150)
        print("\n" + "="*50)
        print("EXTRACTED TEXT:")
        print("="*50)
        try:
            print(text)
        except UnicodeEncodeError:
            print(text.encode('ascii', 'replace').decode('ascii'))
        
        save_text_to_file(text, pdf_file.replace(".pdf", "_extracted.txt"))
    else:
        print(f"PDF not found: {pdf_file}")
