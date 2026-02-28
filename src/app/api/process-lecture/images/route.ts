import { NextRequest, NextResponse } from 'next/server';
import { extractLecturePageContent, structureLectureContent } from '@/utils/aiService';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = (formData.get('title') as string) || 'Lecture Notes';
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const extractedPages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.includes('image')) {
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      const pageContent = await extractLecturePageContent(base64, i + 1);
      extractedPages.push(`--- Page ${i + 1} ---\n${pageContent}`);
    }

    if (extractedPages.length === 0) {
      return NextResponse.json(
        { error: 'No valid image files found' },
        { status: 400 }
      );
    }

    const rawContent = extractedPages.join('\n\n');
    const structured = await structureLectureContent(rawContent, title);

    return NextResponse.json({
      success: true,
      data: {
        ...structured,
        rawContent,
        pagesProcessed: extractedPages.length,
      },
    });
  } catch (error) {
    console.error('Error processing lecture images:', error);
    return NextResponse.json(
      { error: 'Failed to process lecture images' },
      { status: 500 }
    );
  }
}
