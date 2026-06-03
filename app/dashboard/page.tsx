'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  fetchLicenseOverview,
  fetchUserAssignments,
  fetchSubscriptions,
  fetchUserSignInActivity,
  type SignInActivity,
} from '@/lib/graph-api';
import { BUNDLE_INFO, BundleTier, getSkuFriendlyName } from '@/lib/license-sku-map';
import {
  UserType,
  ActionFlag,
  UserClassification,
  UserContext,
  DepartmentMetrics,
  ClassifiedUserForDrill,
  ComplianceVerdict,
  classifyUser,
  aggregateByDepartment,
} from '@/lib/user-classification';
import { Capability, CAPABILITY_LABELS } from '@/lib/capability-coverage';
import type { LicenseOverview, SubscriptionInfo, UserLicenseAssignment } from '@/types/license';
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Building2,
  TrendingUp,
  UserX,
  X,
  Inbox,
  Server,
  Wrench,
  Crown,
  Activity,
  Clock,
  Download,
  ChevronRight,
  ListChecks,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Check,
  BookOpen,
} from 'lucide-react';

interface ClassifiedUser {
  user: UserLicenseAssignment;
  classification: UserClassification;
  lastSignInDateTime?: string;
}

type DrillCategory =
  | { kind: 'service-account' }
  | { kind: 'guest' }
  | { kind: 'shared' }
  | { kind: 'mailbox-only' }
  | { kind: 'dormant' }
  | { kind: 'over-licensed' }
  | { kind: 'missing-data' }
  | { kind: 'compliant' }
  | { kind: 'gap' }
  | { kind: 'exception' }
  | { kind: 'disabled-licensed' }
  | { kind: 'missing-capability'; capability: Capability }
  | { kind: 'department'; department: string }
  | null;

export default function DashboardPage() {
  const { isAuthenticated, accessToken, loading } = useAuth();
  const [overview, setOverview] = useState<LicenseOverview | null>(null);
  const [users, setUsers] = useState<UserLicenseAssignment[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [signIns, setSignIns] = useState<SignInActivity[]>([]);
  const [signInDataAvailable, setSignInDataAvailable] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillCategory>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;
      setDataLoading(true);
      setError(null);
      try {
        const [overviewData, usersData, subsData, signInData] = await Promise.all([
          fetchLicenseOverview(accessToken),
          fetchUserAssignments(accessToken),
          fetchSubscriptions(accessToken),
          fetchUserSignInActivity(accessToken).catch(
            () => ({ available: false, activities: [] as SignInActivity[] })
          ),
        ]);
        setOverview(overviewData);
        setUsers(usersData);
        setSubscriptions(subsData);
        setSignIns(signInData.activities);
        setSignInDataAvailable(signInData.available);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [accessToken]);

  // Classify all users
  const classifiedUsers: ClassifiedUser[] = useMemo(() => {
    const signInMap = new Map(signIns.map((s) => [s.userPrincipalName.toLowerCase(), s.lastSignInDateTime]));
    return users.map((user) => {
      const lastSignIn = signInMap.get(user.userPrincipalName.toLowerCase());
      return {
        user: { ...user, lastSignInDateTime: lastSignIn || user.lastSignInDateTime },
        lastSignInDateTime: lastSignIn,
        classification: classifyUser(
          {
            userId: user.userId,
            displayName: user.displayName,
            userPrincipalName: user.userPrincipalName,
            department: user.department,
            jobTitle: user.jobTitle,
            userTypeFromGraph: user.userTypeFromGraph,
            usageLocation: user.usageLocation,
            accountEnabled: user.accountEnabled,
            assignedLicenseSkus: user.assignedLicenses,
            licenseSkuNames: user.assignedLicenses,
            assignedPlans: user.assignedPlans,
            lastSignInDateTime: lastSignIn,
          },
          { signInDataAvailable }
        ),
      };
    });
  }, [users, signIns, signInDataAvailable]);

  // Department metrics
  const departmentMetrics = useMemo(
    () => aggregateByDepartment(
      classifiedUsers.map((cu) => ({
        classification: cu.classification,
        user: {
          userId: cu.user.userId,
          displayName: cu.user.displayName,
          userPrincipalName: cu.user.userPrincipalName,
          department: cu.user.department,
          jobTitle: cu.user.jobTitle,
          userTypeFromGraph: cu.user.userTypeFromGraph,
          usageLocation: cu.user.usageLocation,
          accountEnabled: cu.user.accountEnabled,
          assignedLicenseSkus: cu.user.assignedLicenses,
          licenseSkuNames: cu.user.assignedLicenses,
          assignedPlans: cu.user.assignedPlans,
          lastSignInDateTime: cu.lastSignInDateTime,
        },
      }))
    ),
    [classifiedUsers]
  );

  // Drill-down filtered users
  const drillUsers = useMemo((): ClassifiedUserForDrill[] => {
    if (!drill) return [];
    const all = departmentMetrics.flatMap((d) => d.users);
    switch (drill.kind) {
      case 'service-account': return all.filter((u) => u.type === 'service-account');
      case 'guest': return all.filter((u) => u.type === 'guest');
      case 'shared': return all.filter((u) => u.type === 'shared');
      case 'mailbox-only': return all.filter((u) => u.type === 'mailbox-only');
      case 'dormant': return all.filter((u) => u.isDormant);
      case 'over-licensed': return all.filter((u) => u.actionFlags.includes('over-licensed'));
      case 'missing-data': return all.filter((u) => u.actionFlags.includes('missing-department') || u.actionFlags.includes('missing-title'));
      case 'compliant': return all.filter((u) => u.complianceVerdict === 'compliant');
      case 'gap': return all.filter((u) => u.complianceVerdict === 'gap');
      case 'exception': return all.filter((u) => u.complianceVerdict === 'exception');
      case 'disabled-licensed': return all.filter((u) => u.actionFlags.includes('disabled-but-licensed'));
      case 'missing-capability': return all.filter((u) => u.complianceVerdict === 'gap' && u.coverage.missing.includes(drill.capability));
      case 'department': return all.filter((u) => u.department === drill.department);
    }
  }, [drill, departmentMetrics]);

  // Executive summary
  const summary = useMemo(() => {
    let totalMonthlyCost = 0;
    let totalRiskSavings = 0;
    let totalWastedOnRedundancy = 0;
    const byType: Record<UserType, number> = { 'real-user': 0, 'mailbox-only': 0, 'service-account': 0, guest: 0, shared: 0, unknown: 0 };
    const byBundle: Record<BundleTier, number> = {
      'e5': 0, 'e3': 0, 'o365-e5': 0, 'o365-e3': 0, 'e1': 0, 'f3': 0, 'f1': 0,
      'business-premium': 0, 'business-standard': 0, 'business-basic': 0,
      'ems-e5': 0, 'ems-e3': 0, 'unknown-bundle': 0,
    };
    let dormant = 0;
    let overLicensed = 0;
    let missingData = 0;
    let compliant = 0;
    let gap = 0;
    let exception = 0;
    let disabledLicensed = 0;
    const missingByCapability: Record<Capability, number> = {
      productivity: 0, teams: 0, intune: 0, entra: 0,
    };

    for (const cu of classifiedUsers) {
      const c = cu.classification;
      byType[c.type]++;
      byBundle[c.licenseAnalysis.effectiveBundle]++;
      totalMonthlyCost += c.monthlyCostEstimate;
      if (c.complianceVerdict === 'compliant') compliant++;
      else if (c.complianceVerdict === 'gap') {
        gap++;
        for (const cap of c.coverage.missing) missingByCapability[cap]++;
      } else exception++;
      if (c.actionFlags.includes('disabled-but-licensed')) {
        disabledLicensed++;
        totalRiskSavings += c.monthlyCostEstimate;
      }
      if (c.isDormant) {
        dormant++;
        totalRiskSavings += c.monthlyCostEstimate;
      }
      if (c.actionFlags.includes('over-licensed')) {
        overLicensed++;
        totalWastedOnRedundancy += c.licenseAnalysis.redundantMonthlyCost;
        totalRiskSavings += c.licenseAnalysis.redundantMonthlyCost;
      }
      if (c.actionFlags.includes('missing-department') ||
          c.actionFlags.includes('missing-title')) {
        missingData++;
      }
    }

    return {
      totalMonthlyCost: Math.round(totalMonthlyCost),
      totalRiskSavings: Math.round(totalRiskSavings),
      totalWastedOnRedundancy: Math.round(totalWastedOnRedundancy),
      byType,
      byBundle,
      dormant,
      overLicensed,
      missingData,
      compliant,
      gap,
      exception,
      disabledLicensed,
      missingByCapability,
    };
  }, [classifiedUsers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Sign in required</h1>
          <p className="text-gray-400">Please sign in to view the CTO Dashboard</p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">CTO Dashboard</h1>
            <p className="text-gray-400 mt-1">License compliance, governance & action items</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/reference"
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Licensing Matrix
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              ← Back to Main
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {!signInDataAvailable && (
          <div className="mb-6 p-3 bg-gray-800/60 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-gray-400" />
            Sign-in activity is unavailable (needs <code className="text-gray-400">AuditLog.Read.All</code>).
            Dormancy is shown as <strong>unknown</strong> rather than guessed.
          </div>
        )}

        {/* Compliance headline — the primary decision */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <ClickableSummaryCard
            icon={<ShieldCheck className="w-5 h-5" />}
            label="Compliant Users"
            value={summary.compliant}
            color="green"
            subtext="O365 + Teams + Entra/Intune covered · click to view"
            onClick={() => setDrill({ kind: 'compliant' })}
          />
          <ClickableSummaryCard
            icon={<ShieldAlert className="w-5 h-5" />}
            label="Gaps to Fix"
            value={summary.gap}
            color="red"
            subtext="Real users missing a required capability · IT action"
            onClick={() => setDrill({ kind: 'gap' })}
          />
          <ClickableSummaryCard
            icon={<HelpCircle className="w-5 h-5" />}
            label="Exceptions to Review"
            value={summary.exception}
            color="yellow"
            subtext="Mailboxes / guests / service accounts · accidental or intended?"
            onClick={() => setDrill({ kind: 'exception' })}
          />
        </div>

        {/* Capability gap breakdown — exactly what's missing across the org */}
        {summary.gap > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              What&apos;s missing (click a capability to see who needs it)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(summary.missingByCapability) as Capability[]).map((cap) => (
                <button
                  key={cap}
                  disabled={summary.missingByCapability[cap] === 0}
                  onClick={() => setDrill({ kind: 'missing-capability', capability: cap })}
                  className="text-left p-3 rounded-lg border border-gray-800 bg-gray-800/40 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="text-2xl font-bold text-red-300">{summary.missingByCapability[cap]}</div>
                  <div className="text-xs text-gray-400 mt-1">missing {CAPABILITY_LABELS[cap]}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary: cost & hygiene signals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Monthly Cost (est.)"
            value={`$${summary.totalMonthlyCost.toLocaleString()}`}
            color="purple"
            subtext={`${classifiedUsers.length} users`}
          />
          <ClickableSummaryCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="At-Risk Spend"
            value={`$${summary.totalRiskSavings.toLocaleString()}/mo`}
            color="red"
            subtext={`${summary.totalWastedOnRedundancy > 0 ? `incl. $${summary.totalWastedOnRedundancy} redundant SKUs` : 'dormant + over-licensed'}`}
            onClick={() => setDrill({ kind: 'over-licensed' })}
          />
          <ClickableSummaryCard
            icon={<UserX className="w-5 h-5" />}
            label="Disabled but Licensed"
            value={summary.disabledLicensed}
            color="orange"
            subtext="Paying for disabled accounts · click to view"
            onClick={() => setDrill({ kind: 'disabled-licensed' })}
          />
          <ClickableSummaryCard
            icon={<Building2 className="w-5 h-5" />}
            label="Missing Data"
            value={summary.missingData}
            color="yellow"
            subtext="Ask IT to populate · click to view"
            onClick={() => setDrill({ kind: 'missing-data' })}
          />
        </div>

        {/* Account Type & Bundle Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Account Type Breakdown</h2>
            <div className="space-y-2">
              <DrillableTypeRow
                icon={<Users className="w-4 h-4" />}
                label="Real Users"
                count={summary.byType['real-user']}
                total={classifiedUsers.length}
                color="green"
                onClick={() => setDrill({ kind: 'department', department: 'ALL' })}
              />
              <DrillableTypeRow
                icon={<Inbox className="w-4 h-4" />}
                label="Mailbox Only"
                count={summary.byType['mailbox-only']}
                total={classifiedUsers.length}
                color="cyan"
                onClick={() => setDrill({ kind: 'mailbox-only' })}
              />
              <DrillableTypeRow
                icon={<Server className="w-4 h-4" />}
                label="Service Accounts"
                count={summary.byType['service-account']}
                total={classifiedUsers.length}
                color="amber"
                onClick={() => setDrill({ kind: 'service-account' })}
              />
              <DrillableTypeRow
                icon={<Crown className="w-4 h-4" />}
                label="Guests / External"
                count={summary.byType.guest}
                total={classifiedUsers.length}
                color="purple"
                onClick={() => setDrill({ kind: 'guest' })}
              />
              <DrillableTypeRow
                icon={<Wrench className="w-4 h-4" />}
                label="Shared Resources"
                count={summary.byType.shared}
                total={classifiedUsers.length}
                color="gray"
                onClick={() => setDrill({ kind: 'shared' })}
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Effective License Bundle</h2>
            <p className="text-xs text-gray-500 mb-3">
              Each user is counted by their <strong>highest-tier bundle</strong> only — E5 already includes E3, AAD P2, Defender P2, etc.
            </p>
            <div className="space-y-2">
              {(Object.keys(summary.byBundle) as BundleTier[]).map((bundle) => {
                const config = BUNDLE_INFO[bundle];
                const count = summary.byBundle[bundle];
                if (count === 0) return null;
                return (
                  <div key={bundle} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        bundle === 'e5' ? 'bg-blue-400' :
                        bundle === 'e3' ? 'bg-blue-300' :
                        bundle === 'business-premium' ? 'bg-purple-400' :
                        bundle === 'business-standard' ? 'bg-purple-300' :
                        bundle === 'f3' ? 'bg-cyan-400' :
                        'bg-gray-500'
                      }`} />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{count}</div>
                      <div className="text-xs text-gray-500">${config.monthlyCost}/mo</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Department Breakdown - now clickable */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Department Breakdown</h2>
            <span className="text-xs text-gray-500">Click any row to drill down · sorted by spend (high → low)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Department</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Users</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Compliant</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Gaps</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">E5</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">E3</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">E1</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">F1/F3</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Business</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">EMS</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Service</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Wasted</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Monthly</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {departmentMetrics.map((dept) => (
                  <DepartmentRow
                    key={dept.department}
                    dept={dept}
                    onClick={() => setDrill({ kind: 'department', department: dept.department })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Over-licensed users - dedicated section for visibility */}
        {summary.overLicensed > 0 && (
          <div className="bg-red-950/30 border border-red-900 rounded-xl mb-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-900 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-red-300">
                <AlertTriangle className="w-5 h-5" />
                Over-Licensed Users ({summary.overLicensed})
              </h2>
              <button
                onClick={() => setDrill({ kind: 'over-licensed' })}
                className="text-sm text-red-300 hover:text-red-200 underline"
              >
                View all →
              </button>
            </div>
            <p className="px-5 py-2 text-xs text-red-200/70">
              These users have a bundle license (E3/E5) PLUS component SKUs that are already included in their bundle.
              Removing the redundant SKUs saves <strong>${summary.totalWastedOnRedundancy}/month</strong>.
            </p>
          </div>
        )}

        {/* Drill-down Modal */}
        {drill && (
          <DrillModal
            category={drill}
            users={drillUsers}
            onClose={() => setDrill(null)}
          />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon, label, value, color, subtext,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string; subtext?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800',
    green: 'bg-green-900/30 text-green-400 border-green-800',
    orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
    red: 'bg-red-900/30 text-red-400 border-red-800',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  };
  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs opacity-80 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs opacity-70 mt-1">{subtext}</div>}
    </div>
  );
}

function ClickableSummaryCard({
  icon, label, value, color, subtext, onClick,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string; subtext?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <SummaryCard icon={icon} label={label} value={value} color={color} subtext={subtext} />
    </button>
  );
}

function DrillableTypeRow({
  icon, label, count, total, color, onClick,
}: {
  icon: React.ReactNode; label: string; count: number; total: number; color: string; onClick: () => void;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500', cyan: 'bg-cyan-500', amber: 'bg-amber-500',
    purple: 'bg-purple-500', gray: 'bg-gray-500',
  };
  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      className="w-full text-left p-2 rounded hover:bg-gray-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <span>{label}</span>
          {count > 0 && <ChevronRight className="w-3 h-3 text-gray-600" />}
        </div>
        <span className="text-sm font-medium">{count}</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${colorClasses[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

function DepartmentRow({ dept, onClick }: { dept: DepartmentMetrics; onClick: () => void }) {
  const scoreColor = dept.costOptimalScore >= 80 ? 'text-green-400' : dept.costOptimalScore >= 60 ? 'text-yellow-400' : 'text-red-400';
  const businessTotal = dept.byBundle['business-premium'] + dept.byBundle['business-standard'] + dept.byBundle['business-basic'];
  const emsTotal = dept.byBundle['ems-e5'] + dept.byBundle['ems-e3'];
  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-800/30 cursor-pointer"
    >
      <td className="px-4 py-3 font-medium">
        {dept.department.startsWith('⚠') ? (
          <span className="text-yellow-400">{dept.department}</span>
        ) : (
          dept.department
        )}
      </td>
      <td className="px-4 py-3 text-right">{dept.headcount}</td>
      <td className="px-4 py-3 text-right text-green-400">{dept.compliantCount || '-'}</td>
      <td className="px-4 py-3 text-right">
        {dept.gapCount > 0 ? <span className="text-red-400">{dept.gapCount}</span> : <span className="text-gray-600">-</span>}
      </td>
      <td className="px-4 py-3 text-right text-blue-400">{dept.byBundle.e5 || '-'}</td>
      <td className="px-4 py-3 text-right text-blue-300">{dept.byBundle.e3 || '-'}</td>
      <td className="px-4 py-3 text-right text-gray-400">{dept.byBundle.e1 || '-'}</td>
      <td className="px-4 py-3 text-right text-cyan-300">{(dept.byBundle.f3 || 0) + (dept.byBundle.f1 || 0) || '-'}</td>
      <td className="px-4 py-3 text-right text-purple-300">{businessTotal || '-'}</td>
      <td className="px-4 py-3 text-right text-amber-300">{emsTotal || '-'}</td>
      <td className="px-4 py-3 text-right text-amber-400">
        {(dept.byType['service-account'] + dept.byType.shared) || '-'}
      </td>
      <td className="px-4 py-3 text-right">
        {dept.redundantMonthlyCost > 0 ? (
          <span className="text-red-400">${dept.redundantMonthlyCost}</span>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-medium">${dept.totalMonthlyCost.toLocaleString()}</td>
      <td className={`px-4 py-3 text-right font-bold ${scoreColor}`}>{dept.costOptimalScore}</td>
    </tr>
  );
}

function DrillModal({ category, users, onClose }: {
  category: NonNullable<DrillCategory>;
  users: ClassifiedUserForDrill[];
  onClose: () => void;
}) {
  const title = getDrillTitle(category);
  const exportCsv = () => {
    const rows = [
      ['Display Name', 'UPN', 'Department', 'Job Title', 'Type', 'Verdict', 'Account Enabled', 'Bundle', 'Productivity', 'Teams', 'Intune', 'Entra', 'Monthly Cost', 'Last Sign-In', 'Action Flags', 'Reason'],
      ...users.map((u) => [
        u.displayName,
        u.userPrincipalName,
        u.department,
        u.jobTitle || '',
        u.type,
        u.complianceVerdict,
        u.accountEnabled ? 'Yes' : 'No',
        u.bundleLabel,
        u.coverage.productivityOk ? 'Yes' : 'No',
        u.coverage.teamsOk ? 'Yes' : 'No',
        u.coverage.intuneOk ? 'Yes' : 'No',
        u.coverage.entraOk ? 'Yes' : 'No',
        u.monthlyCost.toString(),
        u.lastSignInDateTime || (u.dormancyStatus === 'unknown' ? 'Unknown' : 'Never'),
        u.actionFlags.join(';'),
        u.reasonSummary,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drilldown-${category.kind}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-xs text-gray-500 mt-1">{users.length} user{users.length !== 1 ? 's' : ''} · send this list to IT for action</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={users.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No users in this category. Looks clean!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 text-xs sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">User</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Department</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Title</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Type</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-400" title="O365 Productivity · Teams · Intune · Entra">Coverage (P·T·I·E)</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Bundle</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Licenses</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Status</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-400">$/mo</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Last Sign-In</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-400">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <DrillRow key={u.userId} u={u} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function DrillRow({ u }: { u: ClassifiedUserForDrill }) {
  return (
    <tr className="hover:bg-gray-800/30">
      <td className="px-3 py-2">
        <div className="font-medium">{u.displayName}</div>
        <div className="text-xs text-gray-500">{u.userPrincipalName}</div>
      </td>
      <td className="px-3 py-2 text-gray-300">
        {u.department.startsWith('⚠') ? <span className="text-yellow-400">Unassigned</span> : u.department}
      </td>
      <td className="px-3 py-2 text-gray-400 text-xs">{u.jobTitle || <span className="text-yellow-400">⚠</span>}</td>
      <td className="px-3 py-2">
        <span className="text-xs px-2 py-0.5 bg-gray-800 rounded">{u.type}</span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-center gap-1">
          <CapDot ok={u.coverage.productivityOk} letter="P" label="O365 Productivity" />
          <CapDot ok={u.coverage.teamsOk} letter="T" label="Teams Chat" />
          <CapDot ok={u.coverage.intuneOk} letter="I" label="Intune" />
          <CapDot ok={u.coverage.entraOk} letter="E" label="Entra ID Premium" />
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">{u.bundleLabel}</span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-400 max-w-xs truncate" title={u.skuIds.join('\n')}>
        {u.skuIds.map((id) => getSkuFriendlyName(id)).join(' + ') || <span className="text-red-400">None</span>}
      </td>
      <td className="px-3 py-2">
        <VerdictBadge verdict={u.complianceVerdict} />
        {!u.accountEnabled && (
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-300">disabled</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">${u.monthlyCost}</td>
      <td className="px-3 py-2 text-xs text-gray-500">
        {u.lastSignInDateTime
          ? new Date(u.lastSignInDateTime).toLocaleDateString()
          : <span className="text-red-400">Never</span>}
      </td>
      <td className="px-3 py-2 text-xs">
        <div className="flex flex-wrap gap-1">
          {u.actionFlags.map((flag) => (
            <span key={flag} className={`px-1.5 py-0.5 rounded ${
              flag === 'over-licensed' || flag === 'redundant-sku' ? 'bg-red-900/50 text-red-300' :
              flag === 'dormant' ? 'bg-orange-900/50 text-orange-300' :
              flag === 'missing-department' || flag === 'missing-title' ? 'bg-yellow-900/50 text-yellow-300' :
              'bg-gray-800 text-gray-400'
            }`}>
              {flag}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

function CapDot({ ok, letter, label }: { ok: boolean; letter: string; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? 'covered' : 'missing'}`}
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
        ok ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-600 line-through'
      }`}
    >
      {letter}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: ComplianceVerdict }) {
  const map: Record<ComplianceVerdict, { label: string; cls: string; icon: React.ReactNode }> = {
    compliant: { label: 'Compliant', cls: 'bg-green-900/50 text-green-300', icon: <Check className="w-3 h-3" /> },
    gap: { label: 'Gap', cls: 'bg-red-900/50 text-red-300', icon: <ShieldAlert className="w-3 h-3" /> },
    exception: { label: 'Exception', cls: 'bg-yellow-900/50 text-yellow-300', icon: <HelpCircle className="w-3 h-3" /> },
  };
  const v = map[verdict];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${v.cls}`}>
      {v.icon} {v.label}
    </span>
  );
}

function getDrillTitle(category: NonNullable<DrillCategory>): string {
  switch (category.kind) {
    case 'service-account': return 'Service Accounts';
    case 'guest': return 'Guests / External Accounts';
    case 'shared': return 'Shared Resources';
    case 'mailbox-only': return 'Mailbox-Only Users';
    case 'dormant': return 'Dormant Accounts (No sign-in >30 days)';
    case 'over-licensed': return 'Over-Licensed Users (Redundant SKUs)';
    case 'missing-data': return 'Users Missing Department / Title';
    case 'compliant': return 'Compliant Users (O365 + Teams + Entra/Intune)';
    case 'gap': return 'Gaps to Fix — Real Users Missing a Required Capability';
    case 'exception': return 'Exceptions to Review (mailbox / guest / service / shared)';
    case 'disabled-licensed': return 'Disabled Accounts Still Holding Licenses';
    case 'missing-capability': return `Users Missing: ${CAPABILITY_LABELS[category.capability]}`;
    case 'department': return `Department: ${category.department}`;
  }
}
