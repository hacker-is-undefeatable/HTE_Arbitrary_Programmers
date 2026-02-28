'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface RealWorldExample {
  title: string;
  description: string;
  funFact?: string;
}

interface Derivation {
  available: boolean;
  teaser?: string;
}

interface LectureSection {
  title: string;
  content: string;
  type: 'text' | 'equation' | 'table' | 'list' | 'example' | 'question' | 'concept';
  realWorldExample?: RealWorldExample;
  derivation?: Derivation;
  whyItMatters?: string;
  explorationHook?: string;
}

interface LectureData {
  title: string;
  course?: string;
  subjectType?: 'stem' | 'humanities' | 'business' | 'other';
  openingHook?: string;
  sections: LectureSection[];
  keyTakeaways?: string[];
  rawContent?: string;
}

interface DerivationData {
  derivation: string;
  steps: Array<{ step: string; explanation: string }>;
  sources: Array<{ title: string; url?: string; description: string }>;
}

interface WhyData {
  explanation: string;
  historicalContext?: string;
  modernRelevance: string;
}

export default function LectureViewerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single');
  
  // Separate cache from visibility state to avoid re-fetching
  const [derivationCache, setDerivationCache] = useState<Record<number, DerivationData>>({});
  const [whyCache, setWhyCache] = useState<Record<number, WhyData>>({});
  const [expandedDerivations, setExpandedDerivations] = useState<Record<number, boolean>>({});
  const [expandedWhy, setExpandedWhy] = useState<Record<number, boolean>>({});
  const [loadingDerivations, setLoadingDerivations] = useState<Record<number, boolean>>({});
  const [loadingWhy, setLoadingWhy] = useState<Record<number, boolean>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setError(null);
      if (!title && selectedFiles[0]) {
        setTitle(selectedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title || 'Lecture Notes');

      const isMultipleImages = files.length > 1 || (files.length === 1 && files[0].type.includes('image'));
      
      if (isMultipleImages && files.every(f => f.type.includes('image'))) {
        files.forEach(f => formData.append('files', f));
        
        const response = await fetch('/api/process-lecture/images', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to process images');
        }
        setLectureData(data.data);
      } else {
        formData.append('file', files[0]);
        
        const response = await fetch('/api/process-lecture', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to process file');
        }
        setLectureData(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [files, title]);

  const loadDerivation = async (sectionIndex: number, formula: string, context: string, forceRegenerate = false) => {
    // Check cache first - if already loaded and not forcing regenerate, just toggle visibility
    if (derivationCache[sectionIndex] && !forceRegenerate) {
      setExpandedDerivations(prev => ({ ...prev, [sectionIndex]: !prev[sectionIndex] }));
      return;
    }
    
    // Fetch from API (either not cached or forcing regenerate)
    setExpandedDerivations(prev => ({ ...prev, [sectionIndex]: true }));
    setLoadingDerivations(prev => ({ ...prev, [sectionIndex]: true }));
    try {
      const response = await fetch('/api/process-lecture/derivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Pass isRetry: true when regenerating to use more detailed prompt
        body: JSON.stringify({ formula, context, isRetry: forceRegenerate }),
      });
      const data = await response.json();
      if (data.success && data.data?.steps?.length > 0) {
        setDerivationCache(prev => ({ ...prev, [sectionIndex]: data.data }));
      } else if (data.success && (!data.data?.steps || data.data.steps.length === 0)) {
        // Show a message if derivation is empty
        setDerivationCache(prev => ({ 
          ...prev, 
          [sectionIndex]: {
            derivation: 'Unable to generate derivation for this formula. Try clicking Regenerate.',
            steps: [],
            sources: []
          }
        }));
      }
    } catch {
      // On error, collapse the section if no cached data
      if (!derivationCache[sectionIndex]) {
        setExpandedDerivations(prev => ({ ...prev, [sectionIndex]: false }));
      }
    } finally {
      setLoadingDerivations(prev => ({ ...prev, [sectionIndex]: false }));
    }
  };

  const loadWhyExplanation = async (sectionIndex: number, concept: string, context: string, forceRegenerate = false) => {
    // Check cache first - if already loaded and not forcing regenerate, just toggle visibility
    if (whyCache[sectionIndex] && !forceRegenerate) {
      setExpandedWhy(prev => ({ ...prev, [sectionIndex]: !prev[sectionIndex] }));
      return;
    }
    
    // Fetch from API (either not cached or forcing regenerate)
    setExpandedWhy(prev => ({ ...prev, [sectionIndex]: true }));
    setLoadingWhy(prev => ({ ...prev, [sectionIndex]: true }));
    try {
      const response = await fetch('/api/process-lecture/why', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, context }),
      });
      const data = await response.json();
      if (data.success) {
        setWhyCache(prev => ({ ...prev, [sectionIndex]: data.data }));
      }
    } catch {
      // On error, collapse the section if no cached data
      if (!whyCache[sectionIndex]) {
        setExpandedWhy(prev => ({ ...prev, [sectionIndex]: false }));
      }
    } finally {
      setLoadingWhy(prev => ({ ...prev, [sectionIndex]: false }));
    }
  };

  const renderContent = (content: string | undefined | null) => {
    // Guard against undefined/null content
    if (!content) return null;
    
    // First normalize different LaTeX formats to $ format
    let normalized = content
      // Convert \[ ... \] to $$ ... $$
      .replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$')
      // Convert \( ... \) to $ ... $
      .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    
    // Split on LaTeX delimiters
    const parts = normalized.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const latex = part.slice(2, -2).trim();
        try {
          return <BlockMath key={index} math={latex} />;
        } catch {
          return <code key={index} className="block bg-gray-100 p-2 rounded">{latex}</code>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const latex = part.slice(1, -1).trim();
        try {
          return <InlineMath key={index} math={latex} />;
        } catch {
          return <code key={index} className="bg-gray-100 px-1 rounded">{latex}</code>;
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lecture Viewer</h1>
            <p className="text-sm text-gray-500">Upload a PDF or image to generate a presentable lecture page</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">← Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!lectureData ? (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Upload Lecture Material</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lecture Title
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Electric Fields and Forces"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Mode
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setUploadMode('single'); setFiles([]); }}
                    className={`px-3 py-1.5 text-sm rounded-md border ${
                      uploadMode === 'single' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    Single PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUploadMode('multiple'); setFiles([]); }}
                    className={`px-3 py-1.5 text-sm rounded-md border ${
                      uploadMode === 'multiple' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    Multiple Images (for scanned PDFs)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {uploadMode === 'single' ? 'Upload File' : 'Upload Page Images'}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept={uploadMode === 'single' ? '.pdf,.png,.jpg,.jpeg' : '.png,.jpg,.jpeg'}
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    multiple={uploadMode === 'multiple'}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {files.length > 0 ? (
                      <div>
                        {files.length === 1 ? (
                          <>
                            <p className="font-medium text-gray-900">{files[0].name}</p>
                            <p className="text-sm text-gray-500">{(files[0].size / 1024 / 1024).toFixed(2)} MB</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900">{files.length} images selected</p>
                            <p className="text-sm text-gray-500">
                              {(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600">
                          {uploadMode === 'single' 
                            ? 'Click to select a PDF or image' 
                            : 'Click to select page images (in order)'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {uploadMode === 'single' ? 'Supports PDF, PNG, JPG' : 'Select all pages as PNG/JPG images'}
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={files.length === 0 || loading}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Processing{files.length > 1 ? ` ${files.length} pages` : ''}... (this may take a minute)
                  </span>
                ) : (
                  'Process Lecture'
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                The AI will extract text and equations, then structure them into sections.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => { setLectureData(null); setFiles([]); setTitle(''); }}>
                ← Upload Another
              </Button>
              <Button variant="outline" onClick={() => setShowRaw(!showRaw)}>
                {showRaw ? 'Show Structured' : 'Show Raw Text'}
              </Button>
            </div>

            {showRaw ? (
              <Card>
                <CardHeader>
                  <CardTitle>Raw Extracted Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]">
                    {lectureData.rawContent}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Header with Opening Hook */}
                <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {lectureData.course && (
                        <span className="px-2 py-1 bg-blue-500/20 rounded-md text-sm text-blue-700">
                          {lectureData.course}
                        </span>
                      )}
                      {lectureData.subjectType && (
                        <span className={`px-2 py-1 rounded-md text-sm ${
                          lectureData.subjectType === 'stem' ? 'bg-green-100 text-green-700' :
                          lectureData.subjectType === 'humanities' ? 'bg-purple-100 text-purple-700' :
                          lectureData.subjectType === 'business' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lectureData.subjectType.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-2xl">{lectureData.title}</CardTitle>
                  </CardHeader>
                  {lectureData.openingHook && (
                    <CardContent className="pt-0">
                      <div className="bg-white/50 rounded-lg p-4 border-l-4 border-blue-400">
                        <p className="text-gray-700 italic">{renderContent(lectureData.openingHook)}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Sections */}
                {lectureData.sections.map((section, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`h-8 w-8 rounded-full text-sm font-semibold flex items-center justify-center ${
                          section.type === 'equation' ? 'bg-green-100 text-green-700' :
                          section.type === 'example' ? 'bg-yellow-100 text-yellow-700' :
                          section.type === 'question' ? 'bg-purple-100 text-purple-700' :
                          section.type === 'concept' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {index + 1}
                        </span>
                        <CardTitle className="text-lg flex-1">{section.title}</CardTitle>
                      </div>
                      {section.explorationHook && (
                        <p className="text-sm text-blue-600 mt-2 italic">{renderContent(section.explorationHook)}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Main Content */}
                      <div className="prose prose-sm max-w-none">
                        {renderContent(section.content)}
                      </div>

                      {/* Real World Example */}
                      {section.realWorldExample && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Real-World Application</span>
                          </div>
                          <h4 className="font-semibold text-slate-800 mb-1">{renderContent(section.realWorldExample.title)}</h4>
                          <p className="text-gray-700 text-sm">{renderContent(section.realWorldExample.description)}</p>
                          {section.realWorldExample.funFact && (
                            <p className="text-slate-600 text-sm mt-2 border-t border-slate-200 pt-2">
                              {renderContent(section.realWorldExample.funFact)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Derivation Button & Content */}
                      {section.derivation?.available && (
                        <div className="border border-green-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => {
                              // Use section title as main concept, content as context
                              loadDerivation(index, section.title, section.content.slice(0, 500));
                            }}
                            className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-800">View Derivation</span>
                              {section.derivation.teaser && (
                                <span className="text-green-600 text-sm">— {section.derivation.teaser}</span>
                              )}
                            </div>
                            <span className="text-green-600">
                              {expandedDerivations[index] ? '▲' : '▼'}
                            </span>
                          </button>
                          
                          {loadingDerivations[index] && (
                            <div className="p-4 text-center text-gray-500">
                              <span className="animate-pulse">Loading derivation...</span>
                            </div>
                          )}
                          
                          {expandedDerivations[index] && derivationCache[index] && (
                            <div className="p-4 bg-white border-t border-green-200">
                              <div className="flex justify-between items-start mb-4">
                                <p className="text-gray-700 flex-1">{renderContent(derivationCache[index].derivation)}</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadDerivation(index, section.title, section.content.slice(0, 500), true);
                                  }}
                                  disabled={loadingDerivations[index]}
                                  className="ml-3 px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded border border-green-200 flex-shrink-0"
                                >
                                  {loadingDerivations[index] ? 'Regenerating...' : 'Regenerate'}
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                {derivationCache[index].steps.map((step, stepIdx) => (
                                  <div key={stepIdx} className="flex gap-3">
                                    <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center flex-shrink-0 mt-1">
                                      {stepIdx + 1}
                                    </span>
                                    <div>
                                      <div className="font-mono text-sm bg-gray-50 p-2 rounded mb-1">
                                        {renderContent(step.step)}
                                      </div>
                                      <p className="text-gray-600 text-sm">{renderContent(step.explanation)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {derivationCache[index].sources.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-2">References</h5>
                                  <ul className="space-y-1">
                                    {derivationCache[index].sources.map((source, srcIdx) => (
                                      <li key={srcIdx} className="text-sm text-gray-600">
                                        {source.url ? (
                                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {source.title}
                                          </a>
                                        ) : (
                                          <span className="font-medium">{source.title}</span>
                                        )}
                                        {source.description && <span className="text-gray-500"> — {renderContent(source.description)}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Why It Matters Button & Content */}
                      {section.whyItMatters && (
                        <div className="border border-purple-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => loadWhyExplanation(index, section.title, section.content)}
                            className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-purple-800">Why This Matters</span>
                            </div>
                            <span className="text-purple-600">
                              {expandedWhy[index] ? '▲' : '▼'}
                            </span>
                          </button>
                          
                          {loadingWhy[index] && (
                            <div className="p-4 text-center text-gray-500">
                              <span className="animate-pulse">Loading...</span>
                            </div>
                          )}
                          
                          {expandedWhy[index] && whyCache[index] && (
                            <div className="p-4 bg-white border-t border-purple-200 space-y-3">
                              <div className="flex justify-between items-start">
                                <p className="text-gray-700 flex-1">{renderContent(whyCache[index].explanation)}</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadWhyExplanation(index, section.title, section.content, true);
                                  }}
                                  disabled={loadingWhy[index]}
                                  className="ml-3 px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-purple-200 flex-shrink-0"
                                >
                                  {loadingWhy[index] ? 'Regenerating...' : 'Regenerate'}
                                </button>
                              </div>
                              {whyCache[index].historicalContext && (
                                <div className="bg-purple-50 rounded p-3">
                                  <p className="text-sm text-purple-700">
                                    <span className="font-medium">Historical context:</span> {renderContent(whyCache[index].historicalContext)}
                                  </p>
                                </div>
                              )}
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Modern relevance:</span> {renderContent(whyCache[index].modernRelevance)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Key Takeaways */}
                {lectureData.keyTakeaways && lectureData.keyTakeaways.length > 0 && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {lectureData.keyTakeaways.map((takeaway, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-gray-700">{renderContent(takeaway)}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {lectureData.sections.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      No sections could be extracted. Try viewing the raw content.
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
