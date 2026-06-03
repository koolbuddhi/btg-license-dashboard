import Link from 'next/link';
import { SUITE_CAPABILITY_MATRIX } from '@/lib/capability-coverage';
import { Check, X, BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Licensing Matrix — Reference',
};

function Yes() {
  return <Check className="w-4 h-4 text-green-400 inline" />;
}
function No() {
  return <X className="w-4 h-4 text-gray-600 inline" />;
}

function entraLabel(entra: 'none' | 'p1' | 'p2') {
  if (entra === 'none') return <No />;
  return <span className="text-green-400 font-medium">{entra.toUpperCase()}</span>;
}

export default function ReferencePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-400" /> Microsoft 365 Licensing Matrix
          </h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <p className="text-gray-400 mb-6 max-w-3xl">
          Which capabilities each suite grants, verified against the{' '}
          <a
            href="https://learn.microsoft.com/en-us/entra/identity/users/licensing-service-plan-reference"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 underline"
          >
            Microsoft licensing service-plan reference
          </a>
          . The org compliance policy requires every standard user to have{' '}
          <strong>O365 Productivity + Teams Chat + Entra/Intune management</strong>, satisfied by a
          single self-sufficient suite or a combination of à-la-carte licenses.
        </p>

        <div className="bg-amber-950/30 border border-amber-900 rounded-lg p-4 mb-6 text-sm text-amber-200/90">
          <strong>Key gotcha:</strong> <em>Office 365</em> E5/E3/E1 are NOT the same as{' '}
          <em>Microsoft 365</em> E5/E3. Office 365 plans contain no EMS — i.e. no Intune and no
          Entra ID Premium — so they need a separate management add-on (EMS / Intune + Entra) to
          become compliant.
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Suite</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-400">O365 Productivity</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-400">Teams Chat</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-400">Intune</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-400">Entra ID</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-400">Self-sufficient?</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">~$/user/mo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {SUITE_CAPABILITY_MATRIX.map((row) => (
                  <tr key={row.bundle} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-center">{row.productivity ? <Yes /> : <No />}</td>
                    <td className="px-4 py-3 text-center">{row.teams ? <Yes /> : <No />}</td>
                    <td className="px-4 py-3 text-center">{row.intune ? <Yes /> : <No />}</td>
                    <td className="px-4 py-3 text-center">{entraLabel(row.entra)}</td>
                    <td className="px-4 py-3 text-center">
                      {row.selfSufficient ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-300">covers all 3</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">needs add-on</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">${row.monthlyCost}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-md">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Costs are list-price estimates for relative comparison, not contracted prices. Management
          = Intune AND Entra ID Premium both present (full device + identity monitoring).
        </p>
      </div>
    </div>
  );
}
