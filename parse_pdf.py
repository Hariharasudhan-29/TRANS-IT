import PyPDF2
import sys

def extract_text(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        with open('extracted_pdf.txt', 'w', encoding='utf-8') as out_file:
            out_file.write(text)

if __name__ == '__main__':
    extract_text('Daily Bus Routes From 16.02.2026 (1).pdf')
