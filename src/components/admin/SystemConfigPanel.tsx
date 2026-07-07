"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Settings,
  Shield,
  Bell,
  Database,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle,
  Percent,
  Lock,
  Building,
  Users,
  FileText,
  CheckCircle,
} from "lucide-react";

function ToggleSwitch({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
        enabled ? "bg-orange-500" : "bg-stone-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-[18px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SystemConfigPanel() {
  // --- GST ---
  const [gstLocal, setGstLocal] = useState("18");
  const [gstSez, setGstSez] = useState("0");
  const [gstOutstation, setGstOutstation] = useState("18");

  // --- Feature Toggles ---
  const [appleResellerLock, setAppleResellerLock] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoGrnOnDelivery, setAutoGrnOnDelivery] = useState(true);
  const [requireDualApproval, setRequireDualApproval] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [fifoEnforcement, setFifoEnforcement] = useState(true);
  const [crossBranchTransfer, setCrossBranchTransfer] = useState(true);

  // --- Stock Thresholds ---
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [criticalStockThreshold, setCriticalStockThreshold] = useState("3");

  // --- Branch Feature Flags ---
  const [branchFlags, setBranchFlags] = useState<Record<string, boolean>>({
    HYD: true,
    BLR: true,
    MUM: true,
    CHN: true,
    DEL: true,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success("System configuration saved successfully.");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Settings className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">System Configuration</h3>
            <p className="text-[10px] text-stone-500">
              Manage ERP-wide settings, compliance rules, thresholds, and feature flags.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-655 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saving ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>

      {/* --- GST RATES SECTION --- */}
      <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
          <Percent className="w-4 h-4 text-orange-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">GST Tax Rates</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Local / Outstation (Standard)", key: "local", value: gstLocal, setter: setGstLocal, hint: "CGST + SGST / IGST" },
            { label: "SEZ / Export Sales", key: "sez", value: gstSez, setter: setGstSez, hint: "Zero-rated supply" },
            { label: "Outstation B2C", key: "out", value: gstOutstation, setter: setGstOutstation, hint: "IGST applicable" },
          ].map((item) => (
            <div key={item.key} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase block">{item.label}</span>
              <p className="text-[10px] text-stone-400">{item.hint}</p>
              <div className="flex items-center mt-1">
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => item.setter(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-white border border-stone-300 rounded text-sm font-bold text-stone-800 focus:outline-none focus:border-orange-500"
                  min="0"
                  max="28"
                  step="0.5"
                />
                <span className="ml-2 text-sm font-bold text-stone-500">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- STOCK THRESHOLDS --- */}
      <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
          <Database className="w-4 h-4 text-orange-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">Inventory Thresholds</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-stone-600 uppercase block">Low Stock Warning Level</span>
            <p className="text-[10px] text-stone-400">Alert sent to Inventory Manager when stock drops below this count.</p>
            <div className="flex items-center mt-1">
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-20 px-2 py-1.5 bg-white border border-stone-300 rounded text-sm font-bold text-stone-800 focus:outline-none focus:border-orange-500"
                min="1"
              />
              <span className="ml-2 text-xs font-bold text-stone-500">units</span>
            </div>
          </div>
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-stone-600 uppercase block">Critical Stock Threshold</span>
            <p className="text-[10px] text-stone-400">Triggers escalation to Regional Manager and auto-purchase request.</p>
            <div className="flex items-center mt-1">
              <input
                type="number"
                value={criticalStockThreshold}
                onChange={(e) => setCriticalStockThreshold(e.target.value)}
                className="w-20 px-2 py-1.5 bg-white border border-stone-300 rounded text-sm font-bold text-stone-850 focus:outline-none focus:border-orange-500"
                min="1"
              />
              <span className="ml-2 text-xs font-bold text-stone-500">units</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- COMPLIANCE & FEATURE TOGGLES --- */}
      <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
          <Shield className="w-4 h-4 text-orange-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">Compliance & Features</h4>
        </div>
        <div className="space-y-3">
          {[
            {
              icon: <Lock className="w-4 h-4 text-red-500" />,
              label: "Apple Reseller Lock",
              description: "Automatically reject any order from a customer flagged as a reseller for Apple products.",
              enabled: appleResellerLock,
              toggle: () => setAppleResellerLock(!appleResellerLock),
            },
            {
              icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
              label: "Maintenance Mode",
              description: "Lock all write operations (PO, GRN, Invoicing) globally. Useful during database migrations.",
              enabled: maintenanceMode,
              toggle: () => setMaintenanceMode(!maintenanceMode),
            },
            {
              icon: <CheckCircle className="w-4 h-4 text-orange-500" />,
              label: "Auto-GRN on Delivery Confirmation",
              description: "Automatically create a GRN entry when logistics marks a shipment as Delivered.",
              enabled: autoGrnOnDelivery,
              toggle: () => setAutoGrnOnDelivery(!autoGrnOnDelivery),
            },
            {
              icon: <Users className="w-4 h-4 text-orange-600" />,
              label: "Dual Approval for High-Value POs",
              description: "Require a second approval from Regional Manager for POs above ₹10,00,000.",
              enabled: requireDualApproval,
              toggle: () => setRequireDualApproval(!requireDualApproval),
            },
            {
              icon: <FileText className="w-4 h-4 text-orange-500" />,
              label: "FIFO Stock Enforcement",
              description: "Enforce First-In-First-Out inventory despatch order across all branches.",
              enabled: fifoEnforcement,
              toggle: () => setFifoEnforcement(!fifoEnforcement),
            },
            {
              icon: <Globe className="w-4 h-4 text-orange-500" />,
              label: "Cross-Branch Stock Transfers",
              description: "Allow warehouse managers to initiate stock transfer requests between branches.",
              enabled: crossBranchTransfer,
              toggle: () => setCrossBranchTransfer(!crossBranchTransfer),
            },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="pt-0.5">{item.icon}</div>
                <div>
                  <span className="text-xs font-bold text-stone-900 block">{item.label}</span>
                  <p className="text-[10px] text-stone-500 mt-0.5 max-w-lg">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 ml-4">
                <span className={`text-[9px] font-bold uppercase ${item.enabled ? "text-orange-600" : "text-stone-400"}`}>
                  {item.enabled ? "ON" : "OFF"}
                </span>
                <ToggleSwitch enabled={item.enabled} onToggle={item.toggle} label={item.label} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- NOTIFICATION SETTINGS --- */}
      <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
          <Bell className="w-4 h-4 text-orange-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">Notifications & Alerts</h4>
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Email Notifications",
              description: "Send email alerts for PO approvals, GRN submissions, and user registrations.",
              enabled: emailNotifications,
              toggle: () => setEmailNotifications(!emailNotifications),
            },
            {
              label: "SMS Alerts for Critical Events",
              description: "Send SMS to Regional Managers for critical stock alerts and large PO events.",
              enabled: smsAlerts,
              toggle: () => setSmsAlerts(!smsAlerts),
            },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-stone-900 block">{item.label}</span>
                <p className="text-[10px] text-stone-500 mt-0.5">{item.description}</p>
              </div>
              <div className="flex items-center space-x-2 shrink-0 ml-4">
                <span className={`text-[9px] font-bold uppercase ${item.enabled ? "text-orange-600" : "text-stone-400"}`}>
                  {item.enabled ? "ON" : "OFF"}
                </span>
                <ToggleSwitch enabled={item.enabled} onToggle={item.toggle} label={item.label} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- BRANCH ACTIVATION FLAGS --- */}
      <div className="glass-panel p-5 bg-white border border-[#fed7aa] rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-stone-100 pb-3">
          <Building className="w-4 h-4 text-orange-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">Branch Activation Flags</h4>
          <span className="ml-auto text-[9px] text-stone-500 italic">Deactivating a branch hides it from operations</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(branchFlags).map(([code, enabled]) => (
            <div key={code} className={`p-4 rounded-xl border text-center space-y-2 ${enabled ? "bg-orange-50/20 border-orange-200" : "bg-stone-50 border-stone-200"}`}>
              <span className="text-sm font-bold text-stone-900 block">{code}</span>
              <span className={`text-[9px] font-bold uppercase block ${enabled ? "text-orange-600" : "text-stone-450"}`}>
                {enabled ? "Active" : "Inactive"}
              </span>
              <div className="flex justify-center mt-2">
                <ToggleSwitch
                  enabled={enabled}
                  onToggle={() => setBranchFlags((prev) => ({ ...prev, [code]: !prev[code] }))}
                  label={`Toggle ${code}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
