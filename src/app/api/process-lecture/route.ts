import { NextRequest, NextResponse } from 'next/server';
import { extractLecturePageContent, structureLectureContent } from '@/utils/aiService';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || 'Lecture Notes';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      return NextResponse.json(
        { error: 'Please upload a PDF or image file' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedContent = '';

    if (file.type.includes('image')) {
      const base64 = buffer.toString('base64');
      extractedContent = await extractLecturePageContent(base64, 1);
    } else {
      const pdfParse = (await import('pdf-parse')).default;
      
      try {
        const pdfData = await pdfParse(buffer);
        
        if (pdfData.text && pdfData.text.trim().length > 100) {
          extractedContent = pdfData.text;
        } else {
          return NextResponse.json(
            { 
              error: 'PDF appears to be image-based. Please upload individual page images instead, or use the OCR script.',
              suggestion: 'For image-based PDFs, convert pages to PNG/JPG and upload them as images.'
            },
            { status: 400 }
          );
        }
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to parse PDF. Try uploading page images instead.' },
          { status: 400 }
        );
      }
    }

    const structured = await structureLectureContent(extractedContent, title);

    return NextResponse.json({
      success: true,
      data: {
        ...structured,
        rawContent: extractedContent,
      },
    });
  } catch (error) {
    console.error('Error processing lecture:', error);
    return NextResponse.json(
      { error: 'Failed to process lecture file' },
      { status: 500 }
    );
  }
}
