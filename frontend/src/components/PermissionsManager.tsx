import { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionGroupDescriptor, PermissionOverride, User } from "../types/auth";
import apiService from "../services/api";
import { toast } from "sonner";
import { useToast } from "../hooks";
import { Shield, Loader2, LayoutGrid, Package, ReceiptText, Settings, ShieldAlert, Search, RefreshCw, UserCog, ShieldCheck, Info, ArrowUpRight } from "lucide-react";

interface PermissionsManagerProps {
  currentUser: User;
  onNavigate: (tab: string) => void;
}

type RoleKey = "owner" | "admin" | "cashier";
type OverrideEffect = "inherit" | "allow" | "deny";
type DraftMap = Record<string, OverrideEffect>;

const ROLE_SUMMARY: Record<RoleKey, { label: string; description: string; capabilities: string[] }> = {
  owner: {
    label: "Owner",
    description: "Full access to every module and security setting.",
    capabilities: [
      "Create, view, delete transactions",
      "Create, update, delete products",
      "Manage settings, backups, notifications, sign-ups",
      "Grant or revoke admin/cashier access",
    ],
  },
  admin: {
    label: "Admin",
    description: "Operational control without tenant-level actions.",
    capabilities: [
      "Create, view, delete transactions",
      "Create & update products (no deletes)",
      "View dashboards and manage store/notification settings",
      "Cannot change sign-up rules or user roles",
    ],
  },
  cashier: {
    label: "Cashier",
    description: "Frontline point-of-sale access only.",
    capabilities: [
      "Create and view transactions",
      "View inventory (read-only)",
      "No access to settings, backups, or deletion endpoints",
    ],
  },
};

const EFFECT_OPTIONS: OverrideEffect[] = ["inherit", "allow", "deny"];
const EFFECT_LABEL: Record<Exclude<OverrideEffect, "inherit">, string> = { allow: "Allow", deny: "Deny" };

const getPermissionKey = (resource: string, action: string, possession = "any") =>
  `${resource}:${action}:${possession}`;

export function PermissionsManager({ currentUser, onNavigate }: PermissionsManagerProps) {
  const dedupToast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<PermissionGroupDescriptor[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<DraftMap>({});
  const [savingOverrides, setSavingOverrides] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { users } = await apiService.getAllUsers();
      setUsers(users);
    } catch (err: any) {
      dedupToast.error(err?.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [dedupToast]);

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    try {
      const { catalog } = await apiService.getPermissionCatalog();
      setCatalog(catalog);
    } catch (err: any) {
      dedupToast.error(err?.message || "Failed to load permission catalog");
    } finally {
      setIsCatalogLoading(false);
    }
  }, [dedupToast]);

  useEffect(() => {
    if (currentUser.role !== "owner") return;
    loadUsers();
    loadCatalog();
  }, [currentUser.role, loadCatalog, loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((u) => u.role !== "owner")
      .filter((u) => {
        if (!query) return true;
        return (
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
        );
      });
  }, [search, users]);

  const handleRoleUpdate = async (user: User, role: RoleKey) => {
    if (role === user.role) return;
    if (role !== "admin" && role !== "cashier") {
      dedupToast.error("Only admin or cashier roles can be assigned.");
      return;
    }
    const confirmed = window.confirm(`Grant ${role.toUpperCase()} permissions to ${user.name}?`);
    if (!confirmed) return;
    setUpdatingUserId(user.id);
    try {
      await apiService.setUserRole(user.id, role);
      toast.success(`${user.name} is now ${role}`);
      loadUsers();
    } catch (err: any) {
      dedupToast.error(err?.message || "Failed to update user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openOverrideManager = (user: User) => {
    const draft: DraftMap = {};
    (user.permissionOverrides || []).forEach((ovr) => {
      const key = getPermissionKey(ovr.resource, ovr.action, ovr.possession || "any");
      draft[key] = ovr.effect as OverrideEffect;
    });
    setActiveUser(user);
    setOverrideDraft(draft);
  };

  const closeOverrideManager = () => {
    setActiveUser(null);
    setOverrideDraft({});
  };

  const handleOverrideEffectChange = (key: string, effect: OverrideEffect) => {
    setOverrideDraft((prev) => ({ ...prev, [key]: effect }));
  };

  const handleSaveOverrides = async () => {
    if (!activeUser) return;
    setSavingOverrides(true);

    const overridesPayload: PermissionOverride[] = Object.entries(overrideDraft)
      .filter(([, effect]) => effect !== "inherit")
      .map(([key, effect]) => {
        const [resource, action, possession = "any"] = key.split(":");
        return {
          resource,
          action: action as PermissionOverride["action"],
          possession: possession as PermissionOverride["possession"],
          effect: effect as Exclude<OverrideEffect, "inherit">,
        };
      });

    try {
      await apiService.setPermissionOverrides(activeUser.id, {
        overrides: overridesPayload,
        version: Number((activeUser as any).__v ?? 0),
      });
      toast.success(`Overrides updated for ${activeUser.name}`);
      closeOverrideManager();
      loadUsers();
    } catch (err: any) {
      dedupToast.error(err?.message || "Failed to update overrides");
    } finally {
      setSavingOverrides(false);
    }
  };

  const renderEffectiveBadge = (user: User) => {
    const count = user.permissionOverrides?.length || 0;
    if (!count) {
      return (
        <span className="badge bg-light text-muted border py-2 px-3 rounded-pill fw-medium d-flex align-items-center gap-1">
          <Shield size={12} /> Standard Inherit
        </span>
      );
    }
    return (
      <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 py-2 px-3 rounded-pill fw-bold d-flex align-items-center gap-1">
        <ShieldAlert size={12} /> {count} Active Overrides
      </span>
    );
  };

  const renderPermissionControls = () => {
    if (!activeUser) return null;
    if (isCatalogLoading) {
      return (
        <div className="py-5 text-center text-muted">
          <Loader2 className="me-2 spin" />
          Loading catalog...
        </div>
      );
    }

    const sections = [
      {
        name: "Core Features",
        icon: <LayoutGrid size={18} className="me-2 text-primary" />,
        groupIds: ["posAccess", "inventoryAccess", "transactionsAccess", "settingsAccess", "dashboard"],
      },
      {
        name: "Inventory Management",
        icon: <Package size={18} className="me-2 text-success" />,
        groupIds: ["inventory"],
      },
      {
        name: "Sales & Records",
        icon: <ReceiptText size={18} className="me-2 text-info" />,
        groupIds: ["transactions"],
      },
      {
        name: "System Configuration",
        icon: <Settings size={18} className="me-2 text-secondary" />,
        groupIds: ["storeSettings", "notifications", "backup", "signup"],
      },
      {
        name: "Security & Administration",
        icon: <ShieldAlert size={18} className="me-2 text-danger" />,
        groupIds: ["userPermissions"],
      },
    ];

    return (
      <div className="permission-sections">
        {sections.map((section) => {
          const sectionGroups = catalog.filter((g) => section.groupIds.includes(g.id));
          if (sectionGroups.length === 0) return null;

          return (
            <div key={section.name} className="mb-5">
              <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                {section.icon}
                <h5 className="fw-bold mb-0">{section.name}</h5>
              </div>

              {sectionGroups.map((group) => (
                <div key={group.id} className="mb-4 border rounded-3 overflow-hidden shadow-sm bg-white">
                  <div className="p-3 border-bottom bg-light bg-opacity-50">
                    <h6 className="fw-bold mb-1">{group.label}</h6>
                    <p className="text-muted small mb-0">{group.description}</p>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "40%", paddingLeft: "1rem" }}>Action</th>
                          <th>Role Default</th>
                          <th style={{ width: "40%", paddingRight: "1rem" }}>Override Control</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.actions.map((descriptor) => {
                          const possession = descriptor.possession || "any";
                          const key = getPermissionKey(group.resource, descriptor.action, possession);
                          const draftEffect = overrideDraft[key] || "inherit";
                          const defaultAllowed = descriptor.defaultRoles.includes(activeUser.role as RoleKey);

                          return (
                            <tr key={key}>
                              <td style={{ paddingLeft: "1rem" }}>
                                <div className="fw-semibold small">{descriptor.label}</div>
                                <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                  {descriptor.action.toUpperCase()} ({possession})
                                </div>
                              </td>
                              <td>
                                <span className={`badge rounded-pill ${defaultAllowed ? "text-bg-success" : "text-bg-secondary"}`} style={{ fontSize: "0.65rem" }}>
                                  {defaultAllowed ? "Allow" : "Deny"}
                                </span>
                              </td>
                              <td style={{ paddingRight: "1rem" }}>
                                <div className="btn-group w-100" role="group">
                                  {EFFECT_OPTIONS.map((effect) => (
                                    <button
                                      key={effect}
                                      className={`btn btn-xs py-1 px-2 ${
                                        draftEffect === effect 
                                          ? (effect === 'allow' ? 'btn-success' : effect === 'deny' ? 'btn-danger' : 'btn-dark')
                                          : 'btn-outline-secondary opacity-50'
                                      }`}
                                      style={{ fontSize: "0.7rem" }}
                                      onClick={() => handleOverrideEffectChange(key, effect)}
                                      type="button"
                                      disabled={savingOverrides}
                                    >
                                      {effect === "inherit" ? "Inherit" : EFFECT_LABEL[effect as "allow" | "deny"]}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const isModalOpen = Boolean(activeUser);

  if (currentUser.role !== "owner") {
    return (
      <div className="container py-4">
        <div className="alert alert-warning d-flex align-items-center gap-3">
          <Shield size={20} />
          <div>
            <strong>Permission denied.</strong> Only the store owner can manage RBAC assignments.
          </div>
        </div>
        <button className="btn btn-dark" onClick={() => onNavigate("dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5">
        <div>
          <h2 className="fw-bold mb-1 text-dark">Access Control Center</h2>
          <p className="text-muted mb-0">
            Provision roles and manage granular permission overrides for your team.
          </p>
        </div>
        <button className="btn btn-lg btn-white border-light shadow-sm d-flex align-items-center fw-medium px-4" onClick={loadUsers} disabled={isLoading}>
          {isLoading ? (
            <Loader2 size={20} className="me-2 spin text-primary" />
          ) : (
            <RefreshCw size={18} className="me-2 text-primary" />
          )}
          {isLoading ? "Syncing..." : "Refresh"}
        </button>
      </div>

      <div className="row g-4 mb-5">
        {(Object.keys(ROLE_SUMMARY) as RoleKey[]).map((role) => (
          <div className="col-md-4" key={role}>
            <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className={`p-3 rounded-circle bg-opacity-10 ${
                    role === 'owner' ? 'bg-primary text-primary' : 
                    role === 'admin' ? 'bg-success text-success' : 
                    'bg-secondary text-secondary'
                  }`}>
                    {role === "owner" ? <Shield size={22} /> : role === "admin" ? <ShieldCheck size={22} /> : <UserCog size={22} />}
                  </div>
                  <div>
                    <h5 className="fw-bold m-0 text-dark">{ROLE_SUMMARY[role].label} Permissions</h5>
                    <span className="text-muted small">Standard Role</span>
                  </div>
                </div>
                <p className="text-muted mb-4 small" style={{minHeight: "40px"}}>{ROLE_SUMMARY[role].description}</p>
                <div className="bg-light bg-opacity-50 p-3 rounded-3 mt-auto">
                  <h6 className="small fw-bold text-uppercase mb-2 text-muted">Core Capabilities</h6>
                  <ul className="list-unstyled mb-0 small text-dark d-flex flex-column gap-2">
                    {ROLE_SUMMARY[role].capabilities.slice(0, 4).map((cap) => (
                      <li key={cap} className="d-flex align-items-start gap-2">
                        <div className="mt-1 small-dot bg-dark rounded-circle" style={{width: "4px", height: "4px", minWidth: "4px"}}></div>
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
        <div className="card-header bg-white border-0 p-4 pb-0">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="position-relative flex-grow-1" style={{maxWidth: "500px"}}>
              <Search size={18} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
              <input
                type="text"
                className="form-control form-control-lg border-light bg-light bg-opacity-50 ps-5 fs-6"
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-muted small d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark px-2 border">{filteredUsers.length}</span>
              <span>managed accounts</span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light text-muted small fw-bold text-uppercase border-bottom border-light">
                <tr>
                  <th className="ps-4 py-3">User Instance</th>
                  <th className="py-3">Primary Role</th>
                  <th className="py-3">Customization</th>
                  <th className="pe-4 py-3 text-end">Administrative Controls</th>
                </tr>
              </thead>
              <tbody className="border-0">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted">Synchronizing user data...</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-5">
                      No staff accounts found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-bottom border-light transition-all hover-bg-light">
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-light d-flex align-items-center justify-content-center p-2 text-primary" style={{width: "40px", height: "40px"}}>
                            <UserCog size={18} />
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{user.name}</div>
                            <div className="text-muted small" style={{fontSize: "0.75rem"}}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={`badge rounded-pill px-3 py-1 fw-bold ${
                          user.role === 'admin' ? 'bg-success bg-opacity-10 text-success' : 'bg-primary bg-opacity-10 text-primary'
                        }`} style={{fontSize: "0.7rem"}}>
                          {user.role.toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2 fw-medium text-muted small">
                          {renderEffectiveBadge(user)}
                        </div>
                      </td>
                      <td className="pe-4 text-end">
                        <div className="d-inline-flex gap-2">
                          <div className="btn-group shadow-sm rounded-3 overflow-hidden border">
                            {(["admin", "cashier"] as RoleKey[]).map((role) => (
                              <button
                                key={role}
                                className={`btn btn-sm px-3 border-0 transition-all ${
                                  user.role === role ? "bg-dark text-white" : "bg-white text-muted hover-bg-light"
                                }`}
                                disabled={updatingUserId === user.id}
                                onClick={() => handleRoleUpdate(user, role)}
                              >
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </button>
                            ))}
                          </div>
                          <button
                            className="btn btn-sm btn-outline-dark d-flex align-items-center gap-2 rounded-3 px-3 fw-medium shadow-sm"
                            onClick={() => openOverrideManager(user)}
                            disabled={isCatalogLoading}
                          >
                            <ShieldAlert size={16} />
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && activeUser && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg">
                <div className="modal-header border-0 p-4 pb-0">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 bg-primary bg-opacity-10 rounded-4 text-primary">
                      <ShieldAlert size={28} />
                    </div>
                    <div>
                      <h4 className="fw-bold mb-0 text-dark">Permission Settings</h4>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <span className="text-muted small">Managing for:</span>
                        <span className="fw-bold text-dark small">{activeUser.name}</span>
                        <div className="vr mx-1 opacity-25"></div>
                        <span className="badge bg-dark rounded-pill px-3 py-1 text-uppercase" style={{fontSize: "0.65rem"}}>{activeUser.role}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-close shadow-none" onClick={closeOverrideManager} disabled={savingOverrides} />
                </div>
                <div className="modal-body p-4 pt-4">
                  <div className="bg-light bg-opacity-50 p-3 rounded-4 mb-4 border border-light d-flex align-items-center gap-3">
                    <Info size={16} className="text-primary" />
                    <p className="small text-muted mb-0">
                      Changes here will create explicit overrides that ignore the default behavior of the <strong>{activeUser.role}</strong> role. Use <strong>"Inherit"</strong> to revert to standard role settings.
                    </p>
                  </div>
                  {renderPermissionControls()}
                </div>
                <div className="modal-footer border-0 p-4 pt-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-lg btn-light border rounded-3 px-4 fw-medium fs-6"
                    onClick={closeOverrideManager}
                    disabled={savingOverrides}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-lg btn-dark rounded-3 px-5 fw-bold fs-6 shadow-sm d-flex align-items-center gap-2"
                    onClick={handleSaveOverrides}
                    disabled={savingOverrides}
                  >
                    {savingOverrides ? (
                      <Loader2 size={20} className="spin" />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                    {savingOverrides ? "Applying Changes..." : "Apply Overrides"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </div>
  );
}
