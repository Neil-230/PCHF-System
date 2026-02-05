import { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionGroupDescriptor, PermissionOverride, User } from "../types/auth";
import apiService from "../services/api";
import { toast } from "sonner";
import { Shield, UserCheck, UserX, Loader2 } from "lucide-react";

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
      toast.error(err?.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    try {
      const { catalog } = await apiService.getPermissionCatalog();
      setCatalog(catalog);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load permission catalog");
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

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
      toast.error("Only admin or cashier roles can be assigned.");
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
      toast.error(err?.message || "Failed to update user role");
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
      toast.error(err?.message || "Failed to update overrides");
    } finally {
      setSavingOverrides(false);
    }
  };

  const renderEffectiveBadge = (user: User) => {
    const count = user.permissionOverrides?.length || 0;
    if (!count) {
      return <span className="badge text-bg-light border">Inherited</span>;
    }
    return (
      <span className="badge bg-warning text-dark">
        {count} override{count > 1 ? "s" : ""}
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

    return catalog.map((group) => (
      <div key={group.id} className="mb-4 border rounded-3">
        <div className="p-3 border-bottom bg-light">
          <h5 className="mb-1">{group.label}</h5>
          <p className="text-muted small mb-0">{group.description}</p>
        </div>
        <div className="table-responsive">
          <table className="table table-sm mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Action</th>
                <th>Role default</th>
                <th style={{ width: "40%" }}>Override</th>
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
                    <td>
                      <div className="fw-semibold">{descriptor.label}</div>
                      <div className="text-muted small text-uppercase">
                        {descriptor.action} ({possession})
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${defaultAllowed ? "text-bg-success" : "text-bg-secondary"}`}>
                        {defaultAllowed ? "Default allow" : "Default deny"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {EFFECT_OPTIONS.map((effect) => (
                          <button
                            key={effect}
                            className={`btn btn-sm ${
                              draftEffect === effect ? "btn-dark" : "btn-outline-dark"
                            }`}
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
    ));
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Permission Control Center</h2>
          <p className="text-muted mb-0">
            Grant or revoke Admin/Cashier privileges. RBAC rules apply instantly across the system.
          </p>
        </div>
        <button className="btn btn-outline-dark" onClick={loadUsers} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 size={16} className="me-2 spin" />
              Refreshing...
            </>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      <div className="row g-3 mb-4">
        {(Object.keys(ROLE_SUMMARY) as RoleKey[]).map((role) => (
          <div className="col-md-4" key={role}>
            <div className="card border-0 h-100" style={{ boxShadow: "2px 4px 8px rgba(0,0,0,0.08)" }}>
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-2">
                  {role === "owner" ? <Shield size={18} /> : role === "admin" ? <UserCheck size={18} /> : <UserX size={18} />}
                  <h5 className="m-0">{ROLE_SUMMARY[role].label}</h5>
                </div>
                <p className="text-muted small">{ROLE_SUMMARY[role].description}</p>
                <ul className="small ps-3">
                  {ROLE_SUMMARY[role].capabilities.map((cap) => (
                    <li key={cap}>{cap}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0" style={{ boxShadow: "2px 4px 8px rgba(0,0,0,0.08)" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row align-items-md-center gap-3 mb-3">
            <div className="flex-grow-1">
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-muted small">
              Showing {filteredUsers.length} of {Math.max(users.length - 1, 0)} managed accounts
            </span>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Overrides</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <Loader2 className="spin me-2" />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="fw-semibold">{user.name}</td>
                      <td className="text-muted small">{user.email}</td>
                      <td>
                        <span className="badge text-uppercase bg-dark">{user.role}</span>
                      </td>
                      <td>{renderEffectiveBadge(user)}</td>
                      <td className="text-end">
                        <div className="btn-group me-2">
                          {(["admin", "cashier"] as RoleKey[]).map((role) => (
                            <button
                              key={role}
                              className={`btn btn-sm ${
                                user.role === role ? "btn-dark" : "btn-outline-dark"
                              }`}
                              disabled={updatingUserId === user.id}
                              onClick={() => handleRoleUpdate(user, role)}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openOverrideManager(user)}
                          disabled={isCatalogLoading}
                        >
                          Manage access
                        </button>
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
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title">Manage access: {activeUser.name}</h5>
                    <p className="text-muted small mb-0">
                      Base role: <strong className="text-uppercase">{activeUser.role}</strong>
                    </p>
                  </div>
                  <button type="button" className="btn-close" onClick={closeOverrideManager} disabled={savingOverrides} />
                </div>
                <div className="modal-body">{renderPermissionControls()}</div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeOverrideManager}
                    disabled={savingOverrides}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveOverrides}
                    disabled={savingOverrides}
                  >
                    {savingOverrides && <Loader2 size={16} className="me-2 spin" />}
                    Save overrides
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
