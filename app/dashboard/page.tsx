'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  fetchLicenseOverview,
  fetchUserAssignments,
  fetchSubscriptions,
  fetchUserSignInActivity,
  type SignInActivity,
} from '@/lib/graph-api';
import { LicenseTier, classifyLicenseTier, TIER_CONFIGS } from '@/lib/license-tiers';
import {
  UserType,
  ActionFlag,
  UserClassification,
  UserContext,
  DepartmentMetrics,
  classifyUser,
  aggregateByDepartment,
} from '@/lib/user-classification';
import type { LicenseOverview, SubscriptionInfo, UserLicenseAssignment } from '@/types/license';
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Building2,
  TrendingUp,
  UserX,
  Search,
  Filter,
  X,
  Download,
  Activity,
  Clock,
  Crown,
  Inbox,
  Server,
  Wrench,
  ChevronRight,
} from 'lucide-react';

interface ClassifiedUser {
  user: UserLicenseAssignment;
  classification: UserClassification;
  lastSignInDateTime?: string;
}

export default function DashboardPage() {
  const { isAuthenticated, accessToken, loading } = useAuth();
  const [overview, setOverview] = useState<LicenseOverview | null>(null);
  const [users, setUsers] = useState<UserLicenseAssignment[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [signIns, setSignIns] = useState<SignInActivity[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
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
          fetchUserSignInActivity(accessToken).catch(() => [] as SignInActivity[]),
        ]);
        setOverview(overviewData);
        setUsers(usersData);
        setSubscriptions(subsData);
        setSignIns(signInData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [accessToken]);

  // Build license tier map (skuId -> tier)
  const tierBySkuId = useMemo(() => {
    const map: Record<string, LicenseTier> = {};
    if (!overview) return map;
    for (const sku of overview.skus) {
      map[sku.skuId] = classifyLicenseTier(sku.skuPartNumber);
    }
    return map;
  }, [overview]);

  // Build license name map (skuId -> display name)
  const skuNameById = useMemo(() => {
    const map: Record<string, string> = {};
    if (!overview) return map;
    for (const sku of overview.skus) {
      map[sku.skuId] = sku.skuPartNumber;
    }
    return map;
  }, [overview]);

  // Classify all users
  const classifiedUsers: ClassifiedUser[] = useMemo(() => {
    const signInMap = new Map(signIns.map((s) => [s.userPrincipalName.toLowerCase(), s.lastSignInDateTime]));
    return users.map((user) => {
      const lastSignIn = signInMap.get(user.userPrincipalName.toLowerCase());
      const userWithSignIn = { ...user, lastSignInDateTime: lastSignIn || user.lastSignInDateTime };
      return {
        user: userWithSignIn,
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
            licenseSkuNames: user.assignedLicenses.map((id) => skuNameById[id] || id),
            lastSignInDateTime: lastSignIn,
          },
          tierBySkuId
        ),
      };
    });
  }, [users, signIns, tierBySkuId, skuNameById]);

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
          licenseSkuNames: cu.user.assignedLicenses.map((id) => skuNameById[id] || id),
          lastSignInDateTime: cu.lastSignInDateTime,
        },
      }))
    ),
    [classifiedUsers, skuNameById]
  );

  // Executive summary
  const summary = useMemo(() => {
    const actionItems: { user: ClassifiedUser; priority: 'high' | 'medium' | 'low' }[] = [];
    let totalMonthlyCost = 0;
    let totalRiskCost = 0;
    const tierCounts: Record<LicenseTier, number> = { premium: 0, basic: 0, teams: 0, mailbox: 0, utility: 0, unknown: 0 };
    const typeCounts: Record<UserType, number> = { 'real-user': 0, 'mailbox-only': 0, 'service-account': 0, guest: 0, shared: 0, unknown: 0 };
    const flagCounts: Record<ActionFlag, number> = { dormant: 0, 'over-licensed': 0, 'under-licensed': 0, 'missing-department': 0, 'missing-title': 0, 'no-license': 0 };

    for (const cu of classifiedUsers) {
      tierCounts[cu.classification.primaryTier]++;
      typeCounts[cu.classification.type]++;
      totalMonthlyCost += cu.classification.monthlyCostEstimate;
      for (const flag of cu.classification.actionFlags) {
        flagCounts[flag]++;
        const priority: 'high' | 'medium' | 'low' = flag === 'over-licensed' ? 'high' : flag === 'dormant' ? 'high' : 'medium';
        if (flag === 'over-licensed' || flag === 'dormant') {
          totalRiskCost += cu.classification.monthlyCostEstimate;
        }
        actionItems.push({ user: cu, priority });
      }
    }

    const totalRiskSavings = Math.round(totalRiskCost);

    return {
      totalMonthlyCost: Math.round(totalMonthlyCost),
      totalRiskSavings,
      tierCounts,
      typeCounts,
      flagCounts,
      actionItems: actionItems.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }),
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
            <p className="text-gray-400 mt-1">License utilization, governance & action items</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            ← Back to Main
          </a>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Monthly Cost Estimate"
            value={`$${summary.totalMonthlyCost.toLocaleString()}`}
            color="purple"
            subtext={`${classifiedUsers.length} users analyzed`}
          />
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="At-Risk Spend"
            value={`$${summary.totalRiskSavings.toLocaleString()}/mo`}
            color="red"
            subtext="Dormant + over-licensed"
          />
          <SummaryCard
            icon={<UserX className="w-5 h-5" />}
            label="Dormant Accounts"
            value={summary.flagCounts.dormant}
            color="orange"
            subtext="Need investigation"
          />
          <SummaryCard
            icon={<Building2 className="w-5 h-5" />}
            label="Missing Department"
            value={summary.flagCounts['missing-department']}
            color="yellow"
            subtext="Ask IT to fix data quality"
          />
        </div>

        {/* User Type & Tier Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Account Type Breakdown</h2>
            <div className="space-y-3">
              <TypeBar
                icon={<Users className="w-4 h-4" />}
                label="Real Users"
                count={summary.typeCounts['real-user']}
                total={classifiedUsers.length}
                color="green"
              />
              <TypeBar
                icon={<Inbox className="w-4 h-4" />}
                label="Mailbox Only"
                count={summary.typeCounts['mailbox-only']}
                total={classifiedUsers.length}
                color="cyan"
              />
              <TypeBar
                icon={<Server className="w-4 h-4" />}
                label="Service Accounts"
                count={summary.typeCounts['service-account']}
                total={classifiedUsers.length}
                color="amber"
              />
              <TypeBar
                icon={<Crown className="w-4 h-4" />}
                label="Guests / External"
                count={summary.typeCounts.guest}
                total={classifiedUsers.length}
                color="purple"
              />
              <TypeBar
                icon={<Wrench className="w-4 h-4" />}
                label="Shared Resources"
                count={summary.typeCounts.shared}
                total={classifiedUsers.length}
                color="gray"
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">License Tier Distribution</h2>
            <div className="space-y-3">
              {(Object.keys(summary.tierCounts) as LicenseTier[]).map((tier) => {
                const config = TIER_CONFIGS[tier];
                const count = summary.tierCounts[tier];
                return (
                  <div key={tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${config.color}-500`} />
                      <span className="text-sm">{config.label}</span>
                      <span className="text-xs text-gray-500">— {config.description}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{count}</div>
                      <div className="text-xs text-gray-500">${config.monthlyCostEstimate}/mo</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Department Breakdown</h2>
            <span className="text-xs text-gray-500">Sorted by spend (high → low)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Department</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Headcount</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Premium</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Basic</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Teams</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Mailbox</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Service</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Utilization</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Monthly Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Score</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {departmentMetrics.map((dept) => (
                  <DepartmentRow key={dept.department} dept={dept} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Action Items (sorted by priority)</h2>
            <p className="text-xs text-gray-500 mt-1">
              These users need IT follow-up. Click Export to send to your IT team.
            </p>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 text-xs sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Action Needed</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-400">Last Sign-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {summary.actionItems.slice(0, 100).map((item, idx) => (
                  <ActionRow key={`${item.user.user.userId}-${idx}`} item={item} />
                ))}
                {summary.actionItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      No action items. Your license utilization is healthy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  subtext?: string;
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

function TypeBar({
  icon,
  label,
  count,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500', cyan: 'bg-cyan-500', amber: 'bg-amber-500',
    purple: 'bg-purple-500', gray: 'bg-gray-500',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-sm font-medium">{count}</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${colorClasses[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DepartmentRow({ dept }: { dept: DepartmentMetrics }) {
  const issues = dept.actionFlagCounts['over-licensed'] + dept.actionFlagCounts['missing-department'] + dept.actionFlagCounts['missing-title'] + dept.actionFlagCounts.dormant;
  const scoreColor = dept.costOptimalScore >= 80 ? 'text-green-400' : dept.costOptimalScore >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <tr className="hover:bg-gray-800/30">
      <td className="px-4 py-3 font-medium">
        {dept.department.startsWith('⚠') ? (
          <span className="text-yellow-400">{dept.department}</span>
        ) : (
          dept.department
        )}
      </td>
      <td className="px-4 py-3 text-right">{dept.headcount}</td>
      <td className="px-4 py-3 text-right text-blue-400">{dept.byTier.premium}</td>
      <td className="px-4 py-3 text-right text-gray-400">{dept.byTier.basic}</td>
      <td className="px-4 py-3 text-right text-purple-400">{dept.byTier.teams}</td>
      <td className="px-4 py-3 text-right text-cyan-400">{dept.byTier.mailbox}</td>
      <td className="px-4 py-3 text-right text-amber-400">{dept.byType['service-account'] + dept.byType.shared}</td>
      <td className="px-4 py-3 text-right">
        <span className={dept.utilizationRate >= 0.8 ? 'text-green-400' : dept.utilizationRate >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
          {Math.round(dept.utilizationRate * 100)}%
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium">${dept.totalMonthlyCostEstimate.toLocaleString()}</td>
      <td className={`px-4 py-3 text-right font-bold ${scoreColor}`}>{dept.costOptimalScore}</td>
      <td className="px-4 py-3 text-right">
        {issues > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/50 text-red-300 rounded text-xs">
            <AlertTriangle className="w-3 h-3" /> {issues}
          </span>
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500 inline" />
        )}
      </td>
    </tr>
  );
}

function ActionRow({ item }: { item: { user: ClassifiedUser; priority: 'high' | 'medium' | 'low' } }) {
  const { user, classification, lastSignInDateTime } = item.user;
  const flagLabels: Record<ActionFlag, string> = {
    dormant: 'Dormant account',
    'over-licensed': 'Over-licensed',
    'under-licensed': 'Under-licensed',
    'missing-department': 'Missing department',
    'missing-title': 'Missing job title',
    'no-license': 'No license',
  };
  return (
    <tr className="hover:bg-gray-800/30">
      <td className="px-4 py-2">
        <span className={`inline-block w-2 h-2 rounded-full ${
          item.priority === 'high' ? 'bg-red-500' :
          item.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
        }`} />
      </td>
      <td className="px-4 py-2">
        <div className="font-medium">{user.displayName}</div>
        <div className="text-xs text-gray-500">{user.userPrincipalName}</div>
      </td>
      <td className="px-4 py-2 text-gray-400">
        {user.department || <span className="text-yellow-400">⚠ None</span>}
      </td>
      <td className="px-4 py-2">
        <span className="text-xs px-2 py-0.5 bg-gray-800 rounded">{classification.type}</span>
      </td>
      <td className="px-4 py-2">
        <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">{classification.primaryTier}</span>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {classification.actionFlags.map((flag) => (
            <span key={flag} className="text-xs px-2 py-0.5 bg-orange-900/40 text-orange-300 rounded">
              {flagLabels[flag]}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">
        {lastSignInDateTime ? new Date(lastSignInDateTime).toLocaleDateString() : <span className="text-red-400">Never</span>}
      </td>
    </tr>
  );
}
