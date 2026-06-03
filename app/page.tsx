'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { fetchLicenseOverview, fetchUserAssignments, fetchLicenseDetail, fetchSubscriptions, consolidateProducts } from '@/lib/graph-api';
import { SKU_ID_TO_NAME } from '@/types/license';
import type { LicenseOverview, UserLicenseAssignment, LicenseAssignmentDetail, SubscriptionInfo } from '@/types/license';
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Download,
  LogOut,
  Key,
  X,
  ChevronRight,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated, accessToken, userName, login, logout, loading } =
    useAuth();
  const [overview, setOverview] = useState<LicenseOverview | null>(null);
  const [users, setUsers] = useState<UserLicenseAssignment[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products'>(
    'overview'
  );
  const [modal, setModal] = useState<{
    type: 'license-users' | 'user-licenses';
    title: string;
    data: ({ userId: string; displayName: string; userPrincipalName: string } | { skuId: string; skuName: string; name: string; disabledPlans: string[]; assignedDateTime?: string })[];
    loading: boolean;
    skuId?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);

  const products = useMemo(() => {
    if (!overview || subscriptions.length === 0) return [];
    return consolidateProducts(overview.skus, subscriptions);
  }, [overview, subscriptions]);

  const getFilteredProducts = () => {
    return products.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (productSearch && !p.skuPartNumber.toLowerCase().includes(productSearch.toLowerCase())) return false;
      return true;
    });
  };

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;
      setDataLoading(true);
      setError(null);
      try {
        const [overviewData, usersData, subsData] = await Promise.all([
          fetchLicenseOverview(accessToken),
          fetchUserAssignments(accessToken),
          fetchSubscriptions(accessToken),
        ]);
        setOverview(overviewData);
        setUsers(usersData);
        setSubscriptions(subsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch license data'
        );
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [accessToken]);

  const openLicenseUsers = (skuId: string, skuName: string) => {
    const usersWithLicense = users
      .filter((u) => u.assignedLicenses.includes(skuId))
      .map((u) => ({
        userId: u.userId,
        displayName: u.displayName,
        userPrincipalName: u.userPrincipalName,
      }));
    setModal({
      type: 'license-users',
      title: `Users with ${skuName}`,
      data: usersWithLicense,
      loading: false,
      skuId,
    });
  };

  const openUserLicenses = async (user: UserLicenseAssignment) => {
    if (!accessToken) return;
    setModal({
      type: 'user-licenses',
      title: `Licenses for ${user.displayName}`,
      data: [],
      loading: true,
    });
    try {
      const details = await fetchLicenseDetail(accessToken, user.userId);
      const enriched = details.map((d) => ({
        ...d,
        name: d.skuName || SKU_ID_TO_NAME[d.skuId] || d.skuId,
      }));
      setModal({
        type: 'user-licenses',
        title: `Licenses for ${user.displayName}`,
        data: enriched,
        loading: false,
      });
    } catch {
      setModal({
        type: 'user-licenses',
        title: `Licenses for ${user.displayName}`,
        data: [],
        loading: false,
      });
      setError('Failed to fetch license details');
    }
  };

  const closeModal = () => {
    setModal(null);
    setModalSearchQuery('');
  };

  const licenseProductInfo = useMemo(() => {
    if (modal?.type !== 'license-users' || !modal.skuId || !overview) return null;
    const sku = overview.skus.find((s) => s.skuId === modal.skuId);
    if (!sku) return null;
    const unused = sku.enabledUnits - sku.consumedUnits;
    const matchingSubs = subscriptions.filter((s) => s.skuId === modal.skuId);
    const earliestStart = matchingSubs.length > 0
      ? matchingSubs.reduce((min, s) => s.createdDateTime && (!min || s.createdDateTime < min) ? s.createdDateTime : min, '' as string)
      : null;
    const latestExpiry = matchingSubs.length > 0
      ? matchingSubs.reduce((max, s) => s.nextLifecycleDateTime && (!max || s.nextLifecycleDateTime > max) ? s.nextLifecycleDateTime : max, '' as string)
      : null;
    const daysUntilExpiry = latestExpiry
      ? Math.ceil((new Date(latestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
    return { sku, unused, daysUntilExpiry, isExpiringSoon, isExpired, matchingSubs, earliestStart, latestExpiry };
  }, [modal, overview, subscriptions]);

  const getFilteredUsers = () => {
    return users
      .filter((u) => u.assignedLicenses.length > 0)
      .filter((u) => {
        if (selectedDepartments.length > 0 && u.department) {
          return selectedDepartments.includes(u.department);
        }
        return selectedDepartments.length === 0;
      })
      .filter((u) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          u.displayName.toLowerCase().includes(q) ||
          u.userPrincipalName.toLowerCase().includes(q) ||
          (u.department && u.department.toLowerCase().includes(q))
        );
      });
  };

  const exportToCSV = () => {
    if (!overview) return;
    let csv = 'SKU,Consumed,Enabled,Unused\n';
    for (const sku of overview.skus) {
      csv += `${sku.skuPartNumber},${sku.consumedUnits},${sku.enabledUnits},${sku.enabledUnits - sku.consumedUnits}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <div className="mb-8">
            <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">
              Microsoft License Checker
            </h1>
            <p className="text-gray-400">
              Sign in with your Microsoft 365 account to audit licenses
            </p>
          </div>
          <button
            onClick={login}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign in with Microsoft
          </button>
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold">Microsoft License Checker</h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded text-sm font-medium border border-blue-600/30"
            >
              CTO Dashboard
            </a>
            <span className="text-gray-400 text-sm">{userName}</span>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Products' },
              { id: 'users', label: 'Users' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {dataLoading ? (
              <div className="text-center py-12 text-gray-400">
                Loading license data...
              </div>
            ) : overview ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">License Overview</h2>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    icon={<Key className="w-5 h-5" />}
                    label="Total SKUs"
                    value={overview.totalSkus}
                    color="blue"
                  />
                  <StatCard
                    icon={<Shield className="w-5 h-5" />}
                    label="Total Licenses"
                    value={overview.totalLicenses}
                    color="purple"
                  />
                  <StatCard
                    icon={<Users className="w-5 h-5" />}
                    label="Assigned"
                    value={overview.totalConsumed}
                    color="green"
                  />
                  <StatCard
                    icon={<AlertTriangle className="w-5 h-5" />}
                    label="Unused"
                    value={overview.totalUnused}
                    color="orange"
                  />
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Overall Usage</span>
                    <span className="text-sm font-medium text-white">
                      {overview.totalLicenses > 0 ? Math.round((overview.totalConsumed / overview.totalLicenses) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (overview.totalConsumed / overview.totalLicenses) > 0.9
                          ? 'bg-red-500'
                          : (overview.totalConsumed / overview.totalLicenses) > 0.7
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${overview.totalLicenses > 0 ? (overview.totalConsumed / overview.totalLicenses) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{overview.totalConsumed} assigned</span>
                    <span>{overview.totalLicenses - overview.totalConsumed} available</span>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                          License
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                          Enabled
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                          Consumed
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                          Unused
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                          Usage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {overview.skus.map((sku) => {
                        const unused = sku.enabledUnits - sku.consumedUnits;
                        const usage =
                          sku.enabledUnits > 0
                            ? Math.round(
                                (sku.consumedUnits / sku.enabledUnits) * 100
                              )
                            : 0;
                        return (
                          <tr
                            key={sku.skuId}
                            className="hover:bg-gray-800/30 cursor-pointer group"
                            onClick={() => openLicenseUsers(sku.skuId, sku.skuPartNumber)}
                          >
                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                              {sku.skuPartNumber}
                              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {sku.enabledUnits}
                            </td>
                            <td className="px-4 py-3 text-right text-green-400">
                              {sku.consumedUnits}
                            </td>
                            <td className="px-4 py-3 text-right text-orange-400">
                              {unused}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      usage > 90
                                        ? 'bg-red-500'
                                        : usage > 70
                                          ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                    }`}
                                    style={{ width: `${usage}%` }}
                                  />
                                </div>
                                <span className="text-sm">{usage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                No license data available
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">User License Assignments</h2>
              <span className="text-gray-400">
                {users.filter((u) => u.assignedLicenses.length > 0).length} users with licenses
              </span>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <DepartmentFilter
                users={users}
                selectedDepartments={selectedDepartments}
                onToggle={(dept) => {
                  setSelectedDepartments((prev) =>
                    prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
                  );
                }}
                onClear={() => setSelectedDepartments([])}
              />
            </div>

            {dataLoading ? (
              <div className="text-center py-12 text-gray-400">
                Loading user data...
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                        User
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                        Email
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                        Department
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                        Licenses
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {getFilteredUsers()
                      .map((user) => (
                        <tr
                          key={user.userId}
                          className="hover:bg-gray-800/30 cursor-pointer group"
                          onClick={() => openUserLicenses(user)}
                        >
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            {user.displayName}
                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {user.userPrincipalName}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {user.department ? (
                              <span className="inline-flex px-2 py-0.5 bg-gray-800 rounded text-xs">
                                {user.department}
                              </span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm">
                              <CheckCircle className="w-3 h-3" />
                              {user.assignedLicenses.length}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'products' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Products & Subscriptions</h2>
              <span className="text-gray-400">
                {products.length} products across all billing accounts
              </span>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {(['All', 'Active', 'Expired', 'Disabled'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status === 'All' ? null : status)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      (status === 'All' && !statusFilter) || statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {dataLoading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Product</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Purchased</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Assigned</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Available</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Expires</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Subscriptions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {getFilteredProducts().map((product) => {
                      const daysUntilExpiry = product.latestExpiry
                        ? Math.ceil((new Date(product.latestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                      const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
                      const statusColor = product.status === 'Enabled'
                        ? 'bg-green-900/50 text-green-300'
                        : product.status === 'Warning'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-red-900/50 text-red-300';
                      return (
                        <tr
                          key={product.skuId}
                          className="hover:bg-gray-800/30 cursor-pointer group"
                          onClick={() => openLicenseUsers(product.skuId, product.skuPartNumber)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                                product.status === 'Enabled' || product.status === 'Warning'
                                  ? 'bg-blue-600'
                                  : 'bg-gray-600'
                              }`}>
                                <Key className="w-3 h-3 text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate">{product.skuPartNumber}</div>
                                {product.isTrial && (
                                  <span className="text-xs text-purple-400">Trial</span>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{product.purchased}</td>
                          <td className="px-4 py-3 text-right text-green-400">{product.assigned}</td>
                          <td className="px-4 py-3 text-right text-orange-400">{product.available}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                product.status === 'Enabled' ? 'bg-green-400' : product.status === 'Warning' ? 'bg-yellow-400' : 'bg-red-400'
                              }`} />
                              {product.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {product.latestExpiry ? (
                              <span className={isExpired ? 'text-red-400' : isExpiringSoon ? 'text-orange-400' : 'text-gray-400'}>
                                {new Date(product.latestExpiry).toLocaleDateString()}
                                {isExpired && ' (Expired)'}
                                {isExpiringSoon && ` (${daysUntilExpiry}d)`}
                              </span>
                            ) : (
                              <span className="text-gray-600">Perpetual</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {product.subscriptionCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">{modal.title}</h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {modal.loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : modal.type === 'license-users' ? (
                <>
                  {licenseProductInfo && (
                    <div className="mb-4">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Key className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold text-white truncate">{licenseProductInfo.sku.skuPartNumber}</h4>
                          <p className="text-sm text-gray-400">SKU: {licenseProductInfo.sku.skuId}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                            licenseProductInfo.isExpired
                              ? 'bg-red-900/50 text-red-300'
                              : licenseProductInfo.isExpiringSoon
                                ? 'bg-orange-900/50 text-orange-300'
                                : 'bg-green-900/50 text-green-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              licenseProductInfo.isExpired ? 'bg-red-400' : licenseProductInfo.isExpiringSoon ? 'bg-orange-400' : 'bg-green-400'
                            }`} />
                            {licenseProductInfo.isExpired ? 'Expired' : licenseProductInfo.isExpiringSoon ? `Expires in ${licenseProductInfo.daysUntilExpiry}d` : 'Active'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mb-4 px-14 text-sm">
                        <span className="text-gray-400">
                          <span className="text-gray-500">Start:</span>{' '}
                          <span className="text-white">{licenseProductInfo.earliestStart ? new Date(licenseProductInfo.earliestStart).toLocaleDateString() : 'N/A'}</span>
                        </span>
                        <span className={licenseProductInfo.isExpiringSoon || licenseProductInfo.isExpired ? 'text-orange-400' : 'text-gray-400'}>
                          <span className="text-gray-500">Expires:</span>{' '}
                          <span className="text-white">{licenseProductInfo.latestExpiry ? new Date(licenseProductInfo.latestExpiry).toLocaleDateString() : 'Perpetual'}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-white">{licenseProductInfo.sku.enabledUnits}</div>
                          <div className="text-xs text-gray-400">Purchased</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-green-400">{licenseProductInfo.sku.consumedUnits}</div>
                          <div className="text-xs text-gray-400">Assigned</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-orange-400">{licenseProductInfo.unused}</div>
                          <div className="text-xs text-gray-400">Available</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-blue-400">
                            {licenseProductInfo.sku.enabledUnits > 0 ? Math.round((licenseProductInfo.sku.consumedUnits / licenseProductInfo.sku.enabledUnits) * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-400">Usage</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-gray-800 pt-3">
                    <div className="flex items-center px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
                      <span className="flex-1">User</span>
                    </div>
                    {(modal.data as UserLicenseAssignment[])
                      .filter(
                        (u) =>
                          u.displayName.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                          u.userPrincipalName.toLowerCase().includes(modalSearchQuery.toLowerCase())
                      )
                      .map((user) => (
                        <div
                          key={user.userId}
                          className="flex items-center px-3 py-2 hover:bg-gray-800/50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{user.displayName}</div>
                            <div className="text-sm text-gray-400 truncate">
                              {user.userPrincipalName}
                            </div>
                          </div>
                        </div>
                      ))}
                    {modal.data.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No users found with this license
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {(modal.data as LicenseAssignmentDetail[])
                    .filter((l) =>
                      (l.name || l.skuName).toLowerCase().includes(modalSearchQuery.toLowerCase())
                    )
                    .map((license) => (
                      <div
                        key={license.skuId}
                        className="px-3 py-3 hover:bg-gray-800/50 rounded-lg border border-gray-800"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="font-medium">{license.name}</span>
                        </div>
                        <div className="ml-6 space-y-1 text-sm">
                          <div className="flex justify-between text-gray-400">
                            <span>SKU ID</span>
                            <span className="font-mono text-xs text-gray-500">{license.skuId}</span>
                          </div>
                          {license.assignedDateTime && (
                            <div className="flex justify-between text-gray-400">
                              <span>Assigned</span>
                              <span>{new Date(license.assignedDateTime).toLocaleDateString()}</span>
                            </div>
                          )}
                          {license.disabledPlans.length > 0 && (
                            <div className="text-gray-400">
                              <span className="text-orange-400">Disabled Plans ({license.disabledPlans.length})</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {license.disabledPlans.map((plan) => (
                                  <span key={plan} className="text-xs px-2 py-0.5 bg-orange-900/30 text-orange-300 rounded font-mono">
                                    {plan}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  {modal.data.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No licenses assigned
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-800 text-sm text-gray-400">
              {modal.data.length} result{modal.data.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800',
    green: 'bg-green-900/30 text-green-400 border-green-800',
    orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
  };

  return (
    <div
      className={`p-4 rounded-xl border ${colorClasses[color] || colorClasses.blue}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm opacity-80">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function DepartmentFilter({
  users,
  selectedDepartments,
  onToggle,
  onClear,
}: {
  users: UserLicenseAssignment[];
  selectedDepartments: string[];
  onToggle: (dept: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    for (const u of users) {
      if (u.department) deptSet.add(u.department);
    }
    return Array.from(deptSet).sort();
  }, [users]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <Filter className="w-4 h-4" />
        Department
        {selectedDepartments.length > 0 && (
          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
            {selectedDepartments.length}
          </span>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-gray-800 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Filter by department</span>
              {selectedDepartments.length > 0 && (
                <button
                  onClick={onClear}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear all
                </button>
              )}
            </div>
            {departments.map((dept) => (
              <label
                key={dept}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(dept)}
                  onChange={() => onToggle(dept)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300 truncate">{dept}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}