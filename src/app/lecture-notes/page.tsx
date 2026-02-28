'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const lectureData = {
  title: "Ch 21 Electric Field and Electric Forces I",
  course: "PHYS1114",
  textbookRef: "21.2 – 21.3",
  learningOutcomes: [
    "Electric charge in real life",
    "Electric force between point charges (Coulomb's law)",
    "Electric field due to a point charge"
  ],
  sections: [
    {
      id: 1,
      title: "Why is E&M Important?",
      content: "Most relevant to everyday life (from mechanical forces to biological processes) among the four fundamental interactions.",
      subsections: [
        {
          title: "The Four Fundamental Forces",
          type: "table",
          headers: ["Force", "Relative Strength", "Range (m)", "Responsible for"],
          rows: [
            ["Strong", "10³⁸", "10⁻¹⁵", "Binding quarks into hadrons, neutrons and protons in nuclei"],
            ["Electromagnetic", "10³⁶", "∞", "Most everyday phenomena"],
            ["Weak", "10²⁵", "10⁻¹⁸", "Transforming neutron into proton in nuclear decay"],
            ["Gravitation", "1", "∞", "Gravitational attraction"]
          ]
        }
      ]
    },
    {
      id: 2,
      title: "Origin of Charge from Atoms",
      content: "The charges of the electron and proton are equal in magnitude.",
      subsections: [
        {
          title: "Subatomic Particles",
          type: "list",
          items: [
            { label: "Proton", details: "Positive charge, Mass = 1.673 × 10⁻²⁷ kg" },
            { label: "Neutron", details: "No charge, Mass = 1.675 × 10⁻²⁷ kg" },
            { label: "Electron", details: "Negative charge, Mass = 9.109 × 10⁻³¹ kg" }
          ]
        }
      ]
    },
    {
      id: 3,
      title: "Conductors vs Insulators",
      content: "A conductor permits easy movement of charge through it, while an insulator does not.",
      subsections: [
        {
          title: "Charging Methods",
          type: "concepts",
          items: [
            {
              name: "Charge by Rubbing (Insulators)",
              description: "Plastic rods rubbed on fur repel each other. Glass rods rubbed on silk repel each other. Fur-rubbed plastic and silk-rubbed glass attract each other."
            },
            {
              name: "Charge by Induction (Conductors)",
              description: "When a charged rod approaches an uncharged metal ball, electrons redistribute. Grounding can leave the ball with a net charge."
            }
          ]
        }
      ]
    },
    {
      id: 4,
      title: "Real Life Examples",
      content: "Electric phenomena are present in everyday activities.",
      subsections: [
        {
          title: "Applications",
          type: "concepts",
          items: [
            {
              name: "Combing Hair in Winter",
              description: "A charged comb attracts neutral insulators because electrons in molecules shift, creating a net attractive force."
            },
            {
              name: "Laser Printing",
              description: "Uses electrostatic principles: laser writes on drum, ions spray positive charge, toner adheres to negatively charged areas."
            },
            {
              name: "Electrostatic Painting",
              description: "Minimizes overspray and gives a smooth finish by attracting paint particles to the object."
            }
          ]
        }
      ]
    },
    {
      id: 5,
      title: "Important Facts About Charges",
      content: "Two fundamental principles govern electric charges.",
      subsections: [
        {
          title: "Key Principles",
          type: "principles",
          items: [
            {
              name: "Conservation of Charge",
              formula: "The algebraic sum of all electric charges in any closed system is constant."
            },
            {
              name: "Fundamental Unit of Charge",
              formula: "e = 1.602176565 × 10⁻¹⁹ C"
            }
          ]
        }
      ]
    },
    {
      id: 6,
      title: "Coulomb's Law",
      content: "Describes the magnitude of electric force between two point charges.",
      subsections: [
        {
          title: "Key Equations",
          type: "equations",
          items: [
            {
              name: "Coulomb's Law",
              formula: "F = (1/4πε₀) × |q₁q₂|/r²",
              description: "Force between two point charges"
            },
            {
              name: "Vacuum Permittivity",
              formula: "ε₀ = 8.854 × 10⁻¹² C²/N·m²",
              description: "Permittivity of free space"
            },
            {
              name: "Coulomb's Constant",
              formula: "1/4πε₀ = 8.988 × 10⁹ N·m²/C²",
              description: "Also written as k"
            }
          ]
        },
        {
          title: "Comparison with Gravitation",
          type: "note",
          content: "Electric force follows the same inverse-square law as gravitation (F = Gm₁m₂/r²), but is much stronger. For two helium nuclei, the ratio of electric to gravitational force is 3.1 × 10³⁵."
        }
      ]
    },
    {
      id: 7,
      title: "Electric Field",
      content: "Charges create electric fields that exert forces on other charges.",
      subsections: [
        {
          title: "Electric Field Equations",
          type: "equations",
          items: [
            {
              name: "Definition",
              formula: "E = F/q₀",
              description: "Electric field is force per unit charge"
            },
            {
              name: "Field due to Point Charge",
              formula: "E = (1/4πε₀) × q/r² × r̂",
              description: "r̂ points radially outward, q can be positive or negative"
            }
          ]
        },
        {
          title: "Field Direction",
          type: "note",
          content: "Electric field points radially outward for positive charges and radially inward for negative charges."
        }
      ]
    },
    {
      id: 8,
      title: "Clicker Questions",
      content: "Test your understanding with these practice questions.",
      subsections: [
        {
          title: "Practice Problems",
          type: "questions",
          items: [
            {
              question: "Q21.3: Three point charges at vertices of an equilateral triangle. Charges #1 and #2 are +q, charge #3 is -q. The net force on charge #1 is in which direction?",
              answer: "D. the -y-direction"
            },
            {
              question: "Q21.5: A positive point charge +Q released from rest in an electric field. At any later time, the velocity is:",
              answer: "E. Not enough information is given to decide"
            },
            {
              question: "Q21.6: Two point charges and point P at vertices of an equilateral triangle. Both charges have magnitude q but opposite signs. The net electric field at P is in:",
              answer: "C. the +y-direction"
            }
          ]
        }
      ]
    }
  ]
};

export default function LectureNotesPage() {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const toggleSection = (id: number) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <AppShell title="Lecture Notes" subtitle="Ch 21 Electric Field and Electric Forces I">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Card */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="px-2 py-1 bg-blue-500/20 rounded-md">{lectureData.course}</span>
              <span>•</span>
              <span>Textbook: {lectureData.textbookRef}</span>
            </div>
            <CardTitle className="text-2xl">{lectureData.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-2">Learning Outcomes</h4>
            <ul className="space-y-1">
              {lectureData.learningOutcomes.map((outcome, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          {lectureData.sections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                      {section.id}
                    </span>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                  <span className="text-muted-foreground text-xl">
                    {expandedSection === section.id ? '−' : '+'}
                  </span>
                </div>
              </CardHeader>
              
              {(expandedSection === section.id || expandedSection === null) && (
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-4">{section.content}</p>
                  
                  {section.subsections.map((sub, subIdx) => (
                    <div key={subIdx} className="mt-4">
                      <h4 className="font-semibold text-sm text-primary mb-3">{sub.title}</h4>
                      
                      {sub.type === 'table' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-muted/50">
                                {sub.headers?.map((h, i) => (
                                  <th key={i} className="px-3 py-2 text-left font-medium border">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sub.rows?.map((row, i) => (
                                <tr key={i} className="hover:bg-muted/30">
                                  {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-2 border">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {sub.type === 'list' && (
                        <div className="grid gap-2 sm:grid-cols-3">
                          {sub.items?.map((item: { label: string; details: string }, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-sm text-muted-foreground">{item.details}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {sub.type === 'concepts' && (
                        <div className="space-y-3">
                          {sub.items?.map((item: { name: string; description: string }, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-muted/20 border-l-2 border-blue-500">
                              <div className="font-medium mb-1">{item.name}</div>
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {sub.type === 'principles' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {sub.items?.map((item: { name: string; formula: string }, i: number) => (
                            <div key={i} className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                              <div className="font-medium text-sm mb-2">{item.name}</div>
                              <div className="font-mono text-sm bg-background/50 p-2 rounded">{item.formula}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {sub.type === 'equations' && (
                        <div className="space-y-3">
                          {sub.items?.map((item: { name: string; formula: string; description: string }, i: number) => (
                            <div key={i} className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <div className="font-medium min-w-[140px]">{item.name}</div>
                                <code className="font-mono text-lg bg-background/50 px-3 py-1 rounded flex-grow">
                                  {item.formula}
                                </code>
                              </div>
                              <div className="text-sm text-muted-foreground mt-2">{item.description}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {sub.type === 'note' && (
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <p className="text-sm">{sub.content}</p>
                        </div>
                      )}
                      
                      {sub.type === 'questions' && (
                        <div className="space-y-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAnswers(!showAnswers)}
                          >
                            {showAnswers ? 'Hide Answers' : 'Show Answers'}
                          </Button>
                          {sub.items?.map((item: { question: string; answer: string }, i: number) => (
                            <div key={i} className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-sm mb-2">{item.question}</p>
                              {showAnswers && (
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                  Answer: {item.answer}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
