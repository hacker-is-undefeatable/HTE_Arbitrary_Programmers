'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export default function PhysicsLecturePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">PHYS1114 Lecture Notes</h1>
            <p className="text-sm text-gray-500">Ch 21 Electric Field and Electric Forces I</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">← Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">PHYS1114</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">Textbook Reference: 21.2 – 21.3</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Intended Learning Outcomes</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Electric charge in real life</li>
            <li>Electric force between point charges (Coulomb's law)</li>
            <li>Electric field due to a point charge</li>
          </ol>
        </div>

        <Section title="Why is E&M Important?" page={1}>
          <p className="text-gray-700 mb-4">
            Most relevant to everyday life (from mechanical forces to biological processes) among the four fundamental interactions.
          </p>
          <h4 className="font-semibold text-gray-800 mb-3">The Four Fundamental Forces</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-3 py-2 text-left">Force</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">Relative Strength</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">Range (m)</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">Responsible for</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-gray-200 px-3 py-2">Strong</td><td className="border border-gray-200 px-3 py-2"><InlineMath math="10^{38}" /></td><td className="border border-gray-200 px-3 py-2"><InlineMath math="10^{-15}" /></td><td className="border border-gray-200 px-3 py-2">Binding quarks into hadrons, neutrons and protons in nuclei</td></tr>
                <tr className="bg-gray-50"><td className="border border-gray-200 px-3 py-2">Electromagnetic</td><td className="border border-gray-200 px-3 py-2"><InlineMath math="10^{36}" /></td><td className="border border-gray-200 px-3 py-2"><InlineMath math="\infty" /></td><td className="border border-gray-200 px-3 py-2">Most everyday phenomena</td></tr>
                <tr><td className="border border-gray-200 px-3 py-2">Weak</td><td className="border border-gray-200 px-3 py-2"><InlineMath math="10^{25}" /></td><td className="border border-gray-200 px-3 py-2"><InlineMath math="10^{-18}" /></td><td className="border border-gray-200 px-3 py-2">Transforming neutron into proton in nuclear decay</td></tr>
                <tr className="bg-gray-50"><td className="border border-gray-200 px-3 py-2">Gravitation</td><td className="border border-gray-200 px-3 py-2"><InlineMath math="1" /></td><td className="border border-gray-200 px-3 py-2"><InlineMath math="\infty" /></td><td className="border border-gray-200 px-3 py-2">Gravitational attraction</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Origin of Charge from Atoms" page={1}>
          <p className="text-gray-700 mb-4">The charges of the electron and proton are equal in magnitude.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="font-semibold text-red-700">Proton</div>
              <div className="text-sm text-gray-600">Positive charge</div>
              <div className="text-sm text-gray-600">Mass = <InlineMath math="1.673 \times 10^{-27} \text{ kg}" /></div>
            </div>
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
              <div className="font-semibold text-gray-700">Neutron</div>
              <div className="text-sm text-gray-600">No charge</div>
              <div className="text-sm text-gray-600">Mass = <InlineMath math="1.675 \times 10^{-27} \text{ kg}" /></div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-semibold text-blue-700">Electron</div>
              <div className="text-sm text-gray-600">Negative charge</div>
              <div className="text-sm text-gray-600">Mass = <InlineMath math="9.109 \times 10^{-31} \text{ kg}" /></div>
            </div>
          </div>
          <p className="text-gray-600 mt-4 text-sm italic">A conductor permits easy movement of charge through it, while an insulator does not.</p>
        </Section>

        <Section title="Charge by Rubbing (Insulators)" page={2}>
          <ul className="space-y-2 text-gray-700">
            <li><strong>(a)</strong> Plain plastic rods neither attract nor repel each other, but after being rubbed with fur, the rods repel each other.</li>
            <li><strong>(b)</strong> Plain glass rods neither attract nor repel each other, but after being rubbed with silk, the rods repel each other.</li>
            <li><strong>(c)</strong> The fur-rubbed plastic rod and the silk-rubbed glass rod attract each other.</li>
          </ul>
        </Section>

        <Section title="Charge by Induction (Conductors)" page={2}>
          <ol className="space-y-2 text-gray-700 list-decimal list-inside">
            <li>Uncharged metal ball</li>
            <li>Negative charge on rod repels electrons, creating zones of negative and positive charge</li>
            <li>Wire lets electron buildup (induced negative charge) flow into ground</li>
            <li>Wire removed; ball now has only an electron-deficient region of positive charge</li>
            <li>Rod removed; electrons rearrange themselves, ball has overall electron deficiency (net positive charge)</li>
          </ol>
        </Section>

        <Section title="Real Life Examples" page={2}>
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-400 pl-4">
              <h4 className="font-semibold text-gray-800">Combing Hair in Winter</h4>
              <p className="text-gray-600 text-sm">A charged comb attracts neutral insulators. Electrons in molecules shift, so the opposite charges are closer to the comb and feel a stronger force. The net force is always attractive.</p>
            </div>
            <div className="border-l-4 border-green-400 pl-4">
              <h4 className="font-semibold text-gray-800">Laser Printing</h4>
              <p className="text-gray-600 text-sm">1. Laser writes on drum, leaving negatively charged areas. 2. Wire sprays ions giving drum positive charge. 3. Positively charged toner adheres to negative areas. 4. Wires spray stronger negative charge on paper so toner adheres.</p>
            </div>
            <div className="border-l-4 border-purple-400 pl-4">
              <h4 className="font-semibold text-gray-800">Electrostatic Painting</h4>
              <p className="text-gray-600 text-sm">Minimizes overspray and gives a smooth finish.</p>
            </div>
          </div>
        </Section>

        <Section title="Important Facts About Charges" page={3}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800">1. Conservation of Charge</h4>
              <p className="text-gray-700">The algebraic sum of all the electric charges in any closed system (no charge can escape) is constant.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800">2. Fundamental Unit of Charge</h4>
              <p className="text-gray-700">Electron charge is the fundamental (cannot be further divided) unit of charge:</p>
              <div className="mt-2 bg-white px-3 py-2 rounded border text-center">
                <BlockMath math="e = 1.602176565 \times 10^{-19} \text{ C}" />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Coulomb's Law" page={4}>
          <p className="text-gray-700 mb-4">Magnitude of electric force between two point charges:</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <BlockMath math="F = \frac{1}{4\pi \epsilon_0} \frac{|q_1 q_2|}{r^2}" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Vacuum Permittivity</div>
              <BlockMath math="\epsilon_0 = 8.854 \times 10^{-12} \text{ C}^2/\text{N}\cdot\text{m}^2" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Coulomb's Constant</div>
              <BlockMath math="\frac{1}{4\pi \epsilon_0} = 8.988 \times 10^{9} \text{ N}\cdot\text{m}^2/\text{C}^2" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <strong className="text-red-700">Warning:</strong> Two 1 C charges at 1 m apart exert a force of <InlineMath math="9 \times 10^{9}" /> N on each other! 1 C is a huge amount of electric charge!
          </div>
          <p className="text-gray-700 mb-2">Very much like gravitation but much stronger:</p>
          <div className="bg-gray-100 rounded-lg p-3 mb-3">
            <BlockMath math="F = G \frac{m_1 m_2}{r^2}" />
          </div>
          <p className="text-gray-700">For two helium nuclei (<InlineMath math="\text{He}^{2+}" />, <InlineMath math="m = 6.64 \times 10^{-27} \text{ kg}" /> and <InlineMath math="q = 3.2 \times 10^{-19} \text{ C}" />), the ratio of electric to gravitational force is:</p>
          <div className="bg-gray-100 rounded-lg p-3 mt-2">
            <BlockMath math="\frac{F_e}{F_g} = 3.1 \times 10^{35}" />
          </div>
        </Section>

        <Section title="Electric Field due to a Point Charge" page={5}>
          <p className="text-gray-700 mb-4">Always radially outward (for +ve charge) or inward (for –ve charge).</p>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Electric Field Definition</div>
              <BlockMath math="\vec{E} = \frac{\vec{F}}{q_0}" />
              <p className="text-sm text-gray-600 mt-2">Electric field = electric force per unit charge</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Field due to Point Charge (Eq. 21.7)</div>
              <BlockMath math="\vec{E} = \frac{1}{4 \pi \epsilon_0} \frac{q}{r^2} \hat{r}" />
              <p className="text-sm text-gray-600 mt-2"><InlineMath math="\hat{r}" /> is always pointing radially outwards; <InlineMath math="q" /> can be +ve or -ve</p>
            </div>
          </div>
        </Section>

        <Section title="Example 21.4: Vector Addition of Electric Forces" page={4}>
          <p className="text-gray-700 mb-3">
            Two equal positive charges <InlineMath math="q_1 = q_2 = 2.0 \, \mu\text{C}" /> are located at <InlineMath math="x = 0, y = 0.30 \text{ m}" /> and <InlineMath math="x = 0, y = -0.30 \text{ m}" />. Find the total electric force on <InlineMath math="Q = 4.0 \, \mu\text{C}" /> at <InlineMath math="x = 0.40 \text{ m}, y = 0" />.
          </p>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-gray-700 mb-3">By symmetry, <InlineMath math="F_y = 0" /></p>
            <BlockMath math="F_x = 2 \cdot \frac{1}{4\pi \epsilon_0} \frac{|Q q_1|}{r^2} \cos \alpha" />
            <BlockMath math="= 2 \cdot (9.0 \times 10^9 \text{ N}\cdot\text{m}^2/\text{C}^2) \cdot (4.0 \times 10^{-6} \text{ C}) \cdot (2.0 \times 10^{-6} \text{ C}) \cdot \frac{0.40 \text{ m}}{(0.50 \text{ m})^2}" />
          </div>
        </Section>

        <Section title="Example 21.6" page={6}>
          <p className="text-gray-700 mb-3">
            A point charge <InlineMath math="q = -0.8 \text{ nC}" /> placed at the origin. Find the electric field at <InlineMath math="x = 1.2 \text{ m}" /> and <InlineMath math="y = -1.6 \text{ m}" />.
          </p>
          <div className="bg-gray-100 rounded-lg p-4 space-y-3">
            <BlockMath math="r = \sqrt{x^2 + y^2} = \sqrt{(1.2 \text{ m})^2 + (-1.6 \text{ m})^2} = 2.0 \text{ m}" />
            <BlockMath math="\hat{r} = \frac{x \hat{i} + y \hat{j}}{r} = \frac{(1.2 \text{ m}) \hat{i} + (-1.6 \text{ m}) \hat{j}}{2.0 \text{ m}} = (0.60 \hat{i} - 0.80 \hat{j})" />
            <BlockMath math="\vec{E} = \frac{1}{4 \pi \epsilon_0} \frac{q}{r^2} = (9.0 \times 10^9)(−8.0 \times 10^{-9})\frac{1}{(2.0)^2}" />
            <div className="bg-white rounded p-2 border-2 border-green-300">
              <BlockMath math="\vec{E} = (-11 \text{ N/C}) \hat{i} + (14 \text{ N/C}) \hat{j}" />
            </div>
          </div>
        </Section>

        <Section title="Clicker Questions" page={7}>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="font-semibold text-purple-800 mb-2">Q21.3</div>
              <p className="text-gray-700 mb-3">
                Three point charges lie at the vertices of an equilateral triangle. Charges #1 and #2 are positive (<InlineMath math="+q" />) and charge #3 is negative (<InlineMath math="-q" />). The net electric force that charges #2 and #3 exert on charge #1 is in:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 mb-3">
                <li>A. the <InlineMath math="+x" />-direction</li>
                <li>B. the <InlineMath math="-x" />-direction</li>
                <li>C. the <InlineMath math="+y" />-direction</li>
                <li>D. the <InlineMath math="-y" />-direction</li>
                <li>E. none of the above</li>
              </ul>
              <details className="text-sm">
                <summary className="cursor-pointer text-purple-700 font-medium">Show Answer</summary>
                <p className="mt-2 text-green-700 font-semibold">Answer: D (the <InlineMath math="-y" />-direction)</p>
              </details>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="font-semibold text-purple-800 mb-2">Q21.5</div>
              <p className="text-gray-700 mb-3">
                A positive point charge <InlineMath math="+Q" /> is released from rest in an electric field. At any later time, the velocity of the point charge:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 mb-3">
                <li>A. is in the direction of the electric field</li>
                <li>B. is opposite the direction of the electric field</li>
                <li>C. is perpendicular to the electric field</li>
                <li>D. is zero</li>
                <li>E. Not enough information is given</li>
              </ul>
              <details className="text-sm">
                <summary className="cursor-pointer text-purple-700 font-medium">Show Answer</summary>
                <p className="mt-2 text-green-700 font-semibold">Answer: E (Not enough information is given)</p>
              </details>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="font-semibold text-purple-800 mb-2">Q21.6</div>
              <p className="text-gray-700 mb-3">
                Two point charges and point <InlineMath math="P" /> lie at vertices of an equilateral triangle. Both charges have magnitude <InlineMath math="q" /> but opposite signs. The net electric field at point <InlineMath math="P" /> is in:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 mb-3">
                <li>A. the <InlineMath math="+x" />-direction</li>
                <li>B. the <InlineMath math="-x" />-direction</li>
                <li>C. the <InlineMath math="+y" />-direction</li>
                <li>D. the <InlineMath math="-y" />-direction</li>
                <li>E. none of the above</li>
              </ul>
              <details className="text-sm">
                <summary className="cursor-pointer text-purple-700 font-medium">Show Answer</summary>
                <p className="mt-2 text-green-700 font-semibold">Answer: C (the <InlineMath math="+y" />-direction)</p>
              </details>
            </div>
          </div>
        </Section>

      </main>

      <footer className="border-t bg-white py-6 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          PHYS1114 Lecture 1 Electric Field and Electric Forces I
        </div>
      </footer>
    </div>
  );
}

function Section({ title, page, children }: { title: string; page: number; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-400">Page {page}</span>
      </div>
      {children}
    </section>
  );
}

