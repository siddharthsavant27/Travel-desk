"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { 
  Users, 
  HelpCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Copy, 
  Check, 
  KeyRound, 
  Lock, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  History,
  X,
  FileQuestion,
  Search,
  Filter
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "CSR" | "ADMIN";
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count?: {
    applications: number;
    decisions: number;
  };
}

interface QuestionItem {
  id: string;
  key: string;
  visaType: string;
  stepCategory: string;
  orderIndex: number;
  questionText: string;
  helpText: string | null;
  responseType: string;
  options: string | null;
  isMandatory: boolean;
  isActive: boolean;
  flagTriggerRule: string | null;
}

interface AuditLogItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  actor?: { name: string; email: string; role: string } | null;
  targetUser?: { name: string; email: string; role: string } | null;
  application?: { caseNumber: string; visaType: string } | null;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"users" | "questions" | "audit">("users");

  // Data states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create User Modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"CUSTOMER" | "CSR" | "ADMIN">("CUSTOMER");
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);

  // Temporary Password Display Modal state
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    isOpen: boolean;
    userEmail: string;
    tempPassword: string;
    actionType: "created" | "reset";
  }>({
    isOpen: false,
    userEmail: "",
    tempPassword: "",
    actionType: "created",
  });
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Question filter state
  const [questionVisaFilter, setQuestionVisaFilter] = useState("ALL");
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    key: "",
    visaType: "SCHENGEN_BUSINESS",
    stepCategory: "TRAVEL_DETAILS",
    orderIndex: 5,
    questionText: "",
    helpText: "",
    responseType: "SINGLE_CHOICE",
    options: "",
    isMandatory: true,
  });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [uRes, qRes, aRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/questions"),
        fetch("/api/admin/audit"),
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAuditLogs(aData.auditLogs || []);
      }
    } catch (err) {
      console.error("Error loading admin datasets:", err);
      setErrorMsg("Failed to synchronize administrative datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setCreateUserSubmitting(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create user account.");
        setCreateUserSubmitting(false);
        return;
      }

      setShowCreateUserModal(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("CUSTOMER");

      // Open temp password copy modal
      setTempPasswordModal({
        isOpen: true,
        userEmail: data.user.email,
        tempPassword: data.tempPassword,
        actionType: "created",
      });

      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected network error occurred while creating user.");
    } finally {
      setCreateUserSubmitting(false);
    }
  };

  // Handle Role Change
  const handleRoleChange = async (userId: string, newRole: "CUSTOMER" | "CSR" | "ADMIN") => {
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHANGE_ROLE", role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to change user role.");
        return;
      }
      setSuccessMsg(`User role updated to ${newRole} successfully.`);
      fetchData();
    } catch (err) {
      setErrorMsg("Network error updating role.");
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_ACTIVE", isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update account active status.");
        return;
      }
      setSuccessMsg(`User account ${!currentActive ? "reactivated" : "deactivated"} successfully.`);
      fetchData();
    } catch (err) {
      setErrorMsg("Network error toggling account status.");
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (userId: string, userEmail: string) => {
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_PASSWORD" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to reset password.");
        return;
      }

      setTempPasswordModal({
        isOpen: true,
        userEmail,
        tempPassword: data.tempPassword,
        actionType: "reset",
      });
      fetchData();
    } catch (err) {
      setErrorMsg("Network error initiating password reset.");
    }
  };

  // Handle Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const optionsArray = newQuestionForm.options
        ? newQuestionForm.options.split("\n").map((o) => o.trim()).filter(Boolean)
        : null;

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newQuestionForm,
          options: optionsArray,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to add question to bank.");
        return;
      }

      setShowAddQuestionModal(false);
      setSuccessMsg("New statutory question created in bank successfully.");
      setNewQuestionForm({
        key: "",
        visaType: "SCHENGEN_BUSINESS",
        stepCategory: "TRAVEL_DETAILS",
        orderIndex: 6,
        questionText: "",
        helpText: "",
        responseType: "SINGLE_CHOICE",
        options: "",
        isMandatory: true,
      });
      fetchData();
    } catch (err) {
      setErrorMsg("Network error saving question.");
    }
  };

  // Handle Toggle Question Active
  const handleToggleQuestionActive = async (questionId: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: questionId, isActive: !currentActive }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPasswordModal.tempPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (questionVisaFilter === "ALL") return true;
    return q.visaType === questionVisaFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Link href="/admin/booking-providers" className="inline-flex rounded-xl border border-teal-300/30 px-4 py-3 text-sm text-teal-100">Manage booking websites →</Link>
      <Link href="/admin/access" className="inline-flex rounded-xl border border-teal-300/30 bg-teal-300/10 px-4 py-3 text-sm text-teal-100 hover:bg-teal-300/20">Review account access & password reset requests →</Link>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-teal)]/10 text-[var(--brand-teal)] border border-[var(--brand-teal)]/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CORPORATE GOVERNANCE & SECURITY DESK</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[var(--foreground)] tracking-tight">
            System Administration & Security
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1 max-w-2xl">
            Manage authorized Harbinger employee credentials, audit statutory pre-screening question banks, and review immutable security logs.
          </p>
        </div>

        {/* Action Button */}
        {activeTab === "users" && (
          <button
            onClick={() => setShowCreateUserModal(true)}
            id="admin-create-user-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-teal)] text-white text-sm font-semibold hover:bg-[var(--brand-teal-light)] transition-colors shadow-sm self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Corporate Account</span>
          </button>
        )}
        {activeTab === "questions" && (
          <button
            onClick={() => setShowAddQuestionModal(true)}
            id="admin-add-question-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand-teal)] text-white text-sm font-semibold hover:bg-[var(--brand-teal-light)] transition-colors shadow-sm self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Statutory Question</span>
          </button>
        )}
      </div>

      {/* Notifications / Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("users")}
          id="tab-admin-users"
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "users"
              ? "bg-[var(--brand-teal)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("questions")}
          id="tab-admin-questions"
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "questions"
              ? "bg-[var(--brand-teal)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>Question Bank</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
            Starter set, pending CSR team approval
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          id="tab-admin-audit"
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "audit"
              ? "bg-[var(--brand-teal)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-bg)]"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* User Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 space-y-1">
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider block">
                Total Corporate Accounts
              </span>
              <div className="text-2xl font-bold text-[var(--foreground)]">{users.length}</div>
              <span className="text-xs text-[var(--foreground-muted)] block">Authorized @harbingergroup.com users</span>
            </div>
            <div className="glass-panel p-5 space-y-1">
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider block">
                Active Staff Roles
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {users.filter((u) => (u.role === "CSR" || u.role === "ADMIN") && u.isActive).length}
              </div>
              <span className="text-xs text-[var(--foreground-muted)] block">CSRs & Administrators</span>
            </div>
            <div className="glass-panel p-5 space-y-1">
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider block">
                Deactivated Accounts
              </span>
              <div className="text-2xl font-bold text-[var(--brand-amber)]">
                {users.filter((u) => !u.isActive).length}
              </div>
              <span className="text-xs text-[var(--foreground-muted)] block">Blocked from system access</span>
            </div>
          </div>

          {/* User Table */}
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--background-muted)]/70 text-[var(--foreground-muted)] border-b border-[var(--border)] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Role Assignment</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4">Password Status</th>
                    <th className="py-3.5 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                      {/* Employee details */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm">{u.name}</div>
                        <div className="text-[var(--foreground-muted)] text-[11px]">{u.email}</div>
                      </td>

                      {/* Role selection */}
                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserItem["role"])}
                          aria-label={`Change role for ${u.name}`}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)] font-medium focus:ring-1 focus:ring-[var(--brand-teal)]"
                        >
                          <option value="CUSTOMER">Customer (Employee)</option>
                          <option value="CSR">CSR (Service Rep)</option>
                          <option value="ADMIN">Admin (System Manager)</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Password Status */}
                      <td className="py-3.5 px-4">
                        {u.mustChangePassword ? (
                          <span className="text-[11px] text-[var(--brand-amber)] font-medium">
                            Pending First-Time Reset
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--foreground-muted)]">
                            Active & Verified
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u.id, u.email)}
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--glass-bg)] text-[11px] font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[var(--brand-amber)]" />
                            <span>Reset Pwd</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1 ${
                              u.isActive
                                ? "border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                          >
                            {u.isActive ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTION BANK */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          {/* Question Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--background-muted)]/50 border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--brand-teal)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">
                Filter by Statutory Visa Program:
              </span>
            </div>
            <div className="flex items-center gap-2">
              {["ALL", "SCHENGEN_BUSINESS", "US_B1"].map((vt) => (
                <button
                  key={vt}
                  onClick={() => setQuestionVisaFilter(vt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    questionVisaFilter === vt
                      ? "bg-[var(--brand-teal)] text-white"
                      : "bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {vt === "ALL" ? "All Programs" : vt === "SCHENGEN_BUSINESS" ? "Germany Schengen (C)" : "US Visitor (B-1)"}
                </button>
              ))}
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="glass-panel p-5 space-y-3 hover:border-[var(--brand-teal)]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--background-muted)] text-[var(--foreground-muted)] border border-[var(--border)]">
                        #{q.orderIndex} · {q.key}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-teal)]/15 text-[var(--brand-teal)]">
                        {q.visaType}
                      </span>
                      <span className="text-[10px] uppercase text-[var(--foreground-muted)]">
                        {q.stepCategory}
                      </span>
                      {q.isMandatory && (
                        <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                          * Mandatory
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{q.questionText}</h3>
                    {q.helpText && (
                      <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{q.helpText}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleQuestionActive(q.id, q.isActive)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      q.isActive
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25"
                    }`}
                  >
                    {q.isActive ? "Active in Pre-Screening" : "Draft (Disabled)"}
                  </button>
                </div>

                {q.flagTriggerRule && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-[var(--foreground-muted)] flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>Deterministic Flag Rule:</strong> {q.flagTriggerRule}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--background-muted)]/70 text-[var(--foreground-muted)] border-b border-[var(--border)] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Security Action</th>
                  <th className="py-3.5 px-4">Target / Case</th>
                  <th className="py-3.5 px-4">Operational Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--glass-bg)] transition-colors">
                    <td className="py-3.5 px-4 text-[var(--foreground-muted)] font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.actor ? (
                        <div>
                          <div className="font-semibold">{log.actor.name}</div>
                          <div className="text-[10px] text-[var(--foreground-muted)]">
                            {log.actor.email} ({log.actor.role})
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--foreground-muted)]">System Service</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--brand-teal)]/15 text-[var(--brand-teal)] font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {log.targetUser && (
                        <div className="text-[11px]">
                          User: <span className="font-semibold">{log.targetUser.email}</span>
                        </div>
                      )}
                      {log.application && (
                        <div className="text-[11px]">
                          Case: <span className="font-semibold">{log.application.caseNumber}</span>
                        </div>
                      )}
                      {!log.targetUser && !log.application && (
                        <span className="text-[var(--foreground-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--foreground-muted)] max-w-xs truncate font-mono text-[11px]">
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE USER */}
      {showCreateUserModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-panel w-full max-w-md p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-teal)]">
                  Identity Provisioning
                </span>
                <h2 className="font-serif text-xl font-medium text-[var(--foreground)]">
                  Create Corporate User Account
                </h2>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="p-1 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">
                  Employee Full Name
                </label>
                <input
                  type="text"
                  required
                  id="admin-new-user-name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--brand-teal)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">
                  Authorized Corporate Email (@harbingergroup.com)
                </label>
                <input
                  type="email"
                  required
                  id="admin-new-user-email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="name@harbingergroup.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--brand-teal)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">
                  Assigned System Role
                </label>
                <select
                  id="admin-new-user-role"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserItem["role"])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--brand-teal)]"
                >
                  <option value="CUSTOMER">Customer (Employee Submitting Cases)</option>
                  <option value="CSR">CSR (Service Representative Reviewing Cases)</option>
                  <option value="ADMIN">Admin (System Governance Administrator)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--foreground-muted)]">
                A strong 14-character temporary password will be generated and shown to you once. The employee will be strictly forced to set a personal password upon first login.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="admin-confirm-create-user-btn"
                  disabled={createUserSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--brand-teal)] text-white text-sm font-semibold hover:bg-[var(--brand-teal-light)] transition-colors shadow-sm disabled:opacity-50"
                >
                  {createUserSubmitting ? "Provisioning..." : "Generate Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TEMPORARY PASSWORD SINGLE-VIEW MODAL */}
      {tempPasswordModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-panel w-full max-w-md p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 border-2 border-[var(--brand-amber)] shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-amber)]/15 text-[var(--brand-amber)] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-amber)]">
                  SINGLE DISCLOSURE NOTICE
                </span>
                <h2 className="font-serif text-xl font-medium text-[var(--foreground)]">
                  {tempPasswordModal.actionType === "created"
                    ? "Temporary Password Generated"
                    : "Password Reset Completed"}
                </h2>
              </div>
            </div>

            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Copy and safely communicate this temporary password to <strong>{tempPasswordModal.userEmail}</strong> through an approved internal channel. For corporate security compliance, this password is only stored as an encrypted bcrypt hash and <em>will never be displayed again</em>.
            </p>

            {/* Password Copy Box */}
            <div className="p-4 rounded-xl bg-[var(--background-muted)]/80 border border-[var(--border)] flex items-center justify-between gap-3">
              <div className="font-mono text-sm sm:text-base font-bold text-[var(--brand-teal)] tracking-wider truncate select-all">
                {tempPasswordModal.tempPassword}
              </div>
              <button
                type="button"
                id="copy-temp-password-btn"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-teal)] text-white text-xs font-semibold hover:bg-[var(--brand-teal-light)] transition-colors shrink-0"
              >
                {copiedPassword ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[var(--brand-teal)]/10 border border-[var(--brand-teal)]/20 text-xs text-[var(--foreground-muted)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--brand-teal)] shrink-0" />
              <span>
                Employee is flagged with <code>mustChangePassword=true</code>. They cannot navigate to any dashboard route until setting a verified personal password.
              </span>
            </div>

            <button
              type="button"
              id="close-temp-password-modal-btn"
              onClick={() =>
                setTempPasswordModal({ isOpen: false, userEmail: "", tempPassword: "", actionType: "created" })
              }
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-navy)] text-white dark:bg-[var(--brand-teal)] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              I Have Securely Copied This Password
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD STATUTORY QUESTION */}
      {showAddQuestionModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-teal)]">
                  Question Bank Authoring
                </span>
                <h2 className="font-serif text-xl font-medium text-[var(--foreground)]">
                  Add Statutory Pre-Screening Question
                </h2>
              </div>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="p-1 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--foreground-muted)]">Unique Key</label>
                  <input
                    type="text"
                    required
                    value={newQuestionForm.key}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, key: e.target.value })}
                    placeholder="e.g. schengen_invitation_host"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-xs text-[var(--foreground)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--foreground-muted)]">Visa Program</label>
                  <select
                    value={newQuestionForm.visaType}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, visaType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-xs text-[var(--foreground)]"
                  >
                    <option value="SCHENGEN_BUSINESS">Germany Schengen (C)</option>
                    <option value="US_B1">US Visitor (B-1)</option>
                    <option value="ALL">All Statutory Programs</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">Question Text</label>
                <input
                  type="text"
                  required
                  value={newQuestionForm.questionText}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, questionText: e.target.value })}
                  placeholder="Enter regulatory question presented to employee..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">Consular Guidance / Help Text</label>
                <textarea
                  rows={2}
                  value={newQuestionForm.helpText}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, helpText: e.target.value })}
                  placeholder="Statutory explanation citing visa code..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--foreground-muted)]">Response Type</label>
                  <select
                    value={newQuestionForm.responseType}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, responseType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-xs text-[var(--foreground)]"
                  >
                    <option value="SINGLE_CHOICE">Single Choice (Options)</option>
                    <option value="NUMBER">Number (e.g. Days)</option>
                    <option value="DATE">Date Selection</option>
                    <option value="TEXT">Short Text</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--foreground-muted)]">Step Category</label>
                  <select
                    value={newQuestionForm.stepCategory}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, stepCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-xs text-[var(--foreground)]"
                  >
                    <option value="TRAVEL_DETAILS">Travel Details</option>
                    <option value="STATUTORY_COMPLIANCE">Statutory Compliance</option>
                    <option value="PASSPORT_VALIDITY">Passport Validity</option>
                    <option value="FINANCIAL_DOCUMENTATION">Financial Documentation</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--foreground-muted)]">Options (One per line if choice)</label>
                <textarea
                  rows={3}
                  value={newQuestionForm.options}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, options: e.target.value })}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] text-xs text-[var(--foreground)]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--brand-teal)] text-white text-xs font-semibold hover:bg-[var(--brand-teal-light)] transition-colors"
                >
                  Save to Question Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
