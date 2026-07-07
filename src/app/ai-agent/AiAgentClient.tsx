"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, History, User, Bot, AlertTriangle, ShieldCheck, ChevronRight, CornerDownLeft, Trash2, Copy, Download, Boxes, ShoppingBag, DollarSign, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { logoutUserAction } from "@/app/actions";
import { useErpStore } from "@/lib/store";
import React from "react";

const MemoizedChart = React.memo(({ chartJson }: { chartJson: any }) => {
  const { type, data, xKey, yKey, name } = chartJson;

  if (!data || data.length === 0) return null;

  const chartColors = ["#ea580c", "#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#d97706"];

  return (
    <div className="my-4 p-4 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-3">
      {name && (
        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-outfit">
          📊 {name}
        </h4>
      )}
      <div className="h-56 w-full text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
              <XAxis dataKey={xKey} stroke="#78716c" />
              <YAxis stroke="#78716c" />
              <Tooltip />
              <Bar dataKey={yKey} fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : type === "horizontalBar" ? (
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
              <XAxis type="number" stroke="#78716c" />
              <YAxis dataKey={xKey} type="category" stroke="#78716c" width={85} />
              <Tooltip />
              <Bar dataKey={yKey} fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
              <XAxis dataKey={xKey} stroke="#78716c" />
              <YAxis stroke="#78716c" />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke="#ea580c" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          ) : type === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey={yKey}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          ) : type === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" />
              <XAxis dataKey={xKey} stroke="#78716c" />
              <YAxis stroke="#78716c" />
              <Tooltip />
              <Area type="monotone" dataKey={yKey} stroke="#ea580c" fill="#ffedd5" />
            </AreaChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
MemoizedChart.displayName = "MemoizedChart";

interface AiAgentClientProps {
  userEmail: string;
  userRole: string;
}

export default function AiAgentClient({ userEmail, userRole }: AiAgentClientProps) {
  const [messages, setMessages] = useState<Array<{ sender: "USER" | "AI"; text: string; time: Date }>>([
    {
      sender: "AI",
      text: `Hello! I am your role-aware **Cognitive Inventory Assistant**. Ask me anything about products, pricing, stock levels, or analytics.`,
      time: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { logoutSession } = useErpStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorState, setErrorState] = useState(false);
  const [lastUserQuery, setLastUserQuery] = useState("");

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUserAction();
      logoutSession();
      toast.success("Logged out successfully.");
      window.location.href = "/login";
    } catch {
      toast.error("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  };

  const handleRetry = () => {
    setErrorState(false);
    if (lastUserQuery) {
      handleSendMessage(lastUserQuery);
    }
  };

  const isSuperAdminOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const isEmployee = userRole === "EMPLOYEE";
  const isCustomer = userRole === "CUSTOMER";

  // Role suggestions mapping
  const getSuggestions = () => {
    if (isSuperAdminOrAdmin) {
      return [
        "Show inventory summary.",
        "Show products below reorder level.",
        "Which products have highest inventory value?",
        "Compare branch inventory.",
        "Show inventory movement today.",
        "Show product pricing summary."
      ];
    }
    if (isEmployee) {
      return [
        "Is MacBook Air M4 available?",
        "Show HP Victus stock.",
        "Compare iPhone 16 and Pixel 9.",
        "Show latest price updates.",
        "Which products are low in stock?"
      ];
    }
    return [
      "Compare MacBook Air M4 and HP Spectre.",
      "Show iPhone 16 price history.",
      "Recommend laptops under ₹90,000.",
      "Which Apple products are available?",
      "Compare Pixel 9 Pro and iPhone 16."
    ];
  };

  const suggestions = getSuggestions();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const streamText = (text: string) => {
    setLoading(false);
    let currentText = "";
    const words = text.split(" ");
    let i = 0;

    // Add empty AI message placeholder
    setMessages(prev => [...prev, { sender: "AI", text: "", time: new Date() }]);

    const interval = setInterval(() => {
      if (i < words.length) {
        currentText += (i === 0 ? "" : " ") + words[i];
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: currentText
          };
          return updated;
        });
        i++;
      } else {
        clearInterval(interval);
      }
    }, 25);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue("");
    }

    setLastUserQuery(text);
    setErrorState(false);

    // Add user message
    setMessages(prev => [...prev, { sender: "USER", text, time: new Date() }]);
    setQueryHistory(prev => Array.from(new Set([text, ...prev].slice(0, 10))));
    setLoading(true);

    try {
      let apiEndpoint = "/api/ai/customer";
      if (isSuperAdminOrAdmin) {
        apiEndpoint = "/api/ai/admin";
      } else if (isEmployee) {
        apiEndpoint = "/api/ai/employee";
      }

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      if (res.ok && data.response) {
        streamText(data.response);
      } else {
        setLoading(false);
        setErrorState(true);
        toast.error(data.error || "An error occurred while generating reply.");
      }
    } catch (err: any) {
      console.error(err);
      setLoading(false);
      setErrorState(true);
      toast.error("Failed to connect to the AI Agent API.");
    }
  };

  const handleClearConversation = () => {
    setMessages([
      {
        sender: "AI",
        text: `Conversation cleared. I am ready for your next query. Role active: **${userRole.replace(/_/g, " ")}**.`,
        time: new Date()
      }
    ]);
    toast.info("Chat history cleared.");
  };

  const handleCopyText = (text: string) => {
    // Strip out JSON blocks for copy
    const cleanText = text.replace(/:::INVENTORY_CARD[\s\S]*?:::/g, "[Product Card Information]");
    navigator.clipboard.writeText(cleanText);
    toast.success("Response copied to clipboard!");
  };

  const handleExportChat = () => {
    const log = messages.map(m => `[${m.sender} - ${m.time.toLocaleTimeString()}]\n${m.text}`).join("\n\n---\n\n");
    const blob = new Blob([log], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_ai_chat_${Date.now()}.txt`;
    link.click();
    toast.success("Chat history exported!");
  };

  // Helper: Matches :::INVENTORY_CARD ... ::: block and extracts JSON
  const renderProductCard = (text: string) => {
    const regex = /:::INVENTORY_CARD\s*([\s\S]*?)\s*:::/;
    const match = text.match(regex);
    if (!match) return null;

    try {
      const data = JSON.parse(match[1].trim());
      return (
        <div className="my-4 p-5 bg-gradient-to-br from-amber-50 to-white border border-orange-200 rounded-2xl shadow-md hover:shadow-lg transition-all space-y-4 max-w-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{data.brand}</span>
              <h4 className="font-extrabold text-stone-900 text-sm font-outfit">{data.name}</h4>
              <span className="text-[10px] text-stone-400 font-mono block">SKU: {data.sku}</span>
            </div>
            <Boxes className="w-8 h-8 text-orange-500 bg-orange-50 p-1.5 rounded-lg border border-orange-100" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div className="bg-white border border-stone-200/60 p-2.5 rounded-xl">
              <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Selling Price</span>
              <span className="font-black text-stone-900 mt-0.5 block text-sm">₹{Number(data.price).toLocaleString("en-IN")}</span>
            </div>
            <div className="bg-white border border-stone-200/60 p-2.5 rounded-xl">
              <span className="text-[9px] text-stone-400 block font-bold uppercase tracking-wider">Catalog MRP</span>
              <span className="font-bold text-stone-500 mt-0.5 block text-sm line-through">₹{Number(data.mrp).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[10px] font-bold text-stone-500">
              <span>Availability: {data.availability}</span>
              <span>Stock: {data.qty} units</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${data.qty > 15 ? 'bg-emerald-500' : data.qty > 0 ? 'bg-amber-500' : 'bg-red-500'}`} 
                style={{ width: `${Math.min(100, (data.qty / 40) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      );
    } catch (err) {
      console.error("JSON parse error inside INVENTORY_CARD tag", err);
      return null;
    }
  };

  const renderChart = (text: string) => {
    const regex = /:::CHART\s*([\s\S]*?)\s*:::/;
    const match = text.match(regex);
    if (!match) return null;

    try {
      const chartJson = JSON.parse(match[1].trim());
      return <MemoizedChart chartJson={chartJson} />;
    } catch (err) {
      console.error("JSON parse error inside CHART tag", err);
      return null;
    }
  };

  const parseMarkdownResponse = (text: string) => {
    // Exclude JSON blocks from text rendering
    const textWithoutCard = text
      .replace(/:::INVENTORY_CARD[\s\S]*?:::/g, "")
      .replace(/:::CHART[\s\S]*?:::/g, "");
    
    const lines = textWithoutCard.split("\n");
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    const elements: React.ReactNode[] = [];
    let paragraphAccumulator: string[] = [];

    const flushParagraph = (keyIdx: number) => {
      if (paragraphAccumulator.length > 0) {
        const txt = paragraphAccumulator.join("\n");
        elements.push(
          <div key={`p-${keyIdx}`} className="text-stone-700 text-xs leading-relaxed my-2 whitespace-pre-line">
            {parseInlineStyles(txt)}
          </div>
        );
        paragraphAccumulator = [];
      }
    };

    const flushTable = (keyIdx: number) => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`tbl-${keyIdx}`} className="my-3 overflow-x-auto border border-stone-200 rounded-xl bg-stone-50/50 shadow-sm max-w-full">
            <table className="w-full text-left text-[11px] border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                  {tableHeaders.map((h, i) => (
                    <th key={`th-${i}`} className="px-3 py-2.5">{h.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {tableRows.map((row, ri) => (
                  <tr key={`tr-${ri}`} className="hover:bg-orange-50/20 text-stone-700">
                    {row.map((cell, ci) => {
                      const txt = cell.trim();
                      let badge = "";
                      if (txt.includes("CRITICAL") || txt.includes("LOW STOCK") || txt.includes("DEAD STOCK") || txt.includes("Block")) {
                        badge = "bg-rose-50 text-rose-700 border-rose-200 font-bold border rounded px-1.5 py-0.5 text-[9px] uppercase";
                      } else if (txt.includes("LOW") || txt.includes("PENDING")) {
                        badge = "bg-amber-50 text-amber-700 border-amber-250 font-bold border rounded px-1.5 py-0.5 text-[9px] uppercase";
                      } else if (txt.includes("HEALTHY") || txt.includes("In Stock") || txt.includes("Available") || txt.includes("High Availability") || txt.includes("OK") || txt.includes("Active")) {
                        badge = "bg-emerald-50 text-emerald-700 border-emerald-255 font-bold border rounded px-1.5 py-0.5 text-[9px] uppercase";
                      }

                      return (
                        <td key={`td-${ci}`} className="px-3 py-2.5 font-medium">
                          {badge ? <span className={badge}>{txt}</span> : parseInlineStyles(txt)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("> [!")) {
        flushParagraph(idx);
        flushTable(idx);
        const alertType = trimmed.includes("CRITICAL") || trimmed.includes("WARNING") ? "warning" : "info";
        const contentLine = lines[idx + 1] ? lines[idx + 1].replace(/^\s*>\s*/, "") : "";
        elements.push(
          <div key={`alert-${idx}`} className={`p-3.5 my-3 border rounded-xl flex items-start space-x-2.5 text-xs ${
            alertType === "warning" ? "bg-red-50 text-red-800 border-red-200" : "bg-orange-50 text-orange-850 border-orange-200"
          }`}>
            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alertType === "warning" ? "text-red-500" : "text-orange-500"}`} />
            <div className="font-semibold">{parseInlineStyles(contentLine)}</div>
          </div>
        );
        lines[idx + 1] = ""; // Skip next line
        return;
      }

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        flushParagraph(idx);
        inTable = true;
        const cells = trimmed.split("|").slice(1, -1);
        if (trimmed.includes("---")) {
          return;
        }
        if (tableHeaders.length === 0) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
      } else {
        if (inTable) {
          flushTable(idx);
          inTable = false;
        }
        if (trimmed.startsWith("###")) {
          flushParagraph(idx);
          elements.push(
            <h3 key={`h3-${idx}`} className="text-stone-900 font-bold font-outfit text-sm my-3.5 border-b border-stone-100 pb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-orange-500 rounded-sm"></span>
              {parseInlineStyles(trimmed.replace(/^###\s*/, ""))}
            </h3>
          );
        } else if (trimmed.startsWith("- ")) {
          flushParagraph(idx);
          elements.push(
            <div key={`li-${idx}`} className="flex items-start space-x-2 my-1 text-xs text-stone-700 ml-4">
              <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-500" />
              <span>{parseInlineStyles(trimmed.replace(/^- \s*/, ""))}</span>
            </div>
          );
        } else if (trimmed) {
          paragraphAccumulator.push(line);
        } else {
          flushParagraph(idx);
        }
      }
    });

    flushParagraph(lines.length);
    flushTable(lines.length);

    return elements;
  };

  const parseInlineStyles = (txt: string) => {
    const parts = txt.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-extrabold text-stone-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="bg-stone-100 border border-stone-200/80 text-orange-655 font-mono px-1 rounded text-[10px]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col space-y-6 min-h-[calc(100vh-120px)] bg-stone-50/50 p-4 rounded-3xl border border-stone-200/80 shadow-sm relative">
      
      {/* 1. LOGO & HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-stone-200/80 px-6 py-4 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Conquer Logo" className="h-8 object-contain shrink-0" />
          <div>
            <h1 className="font-black text-stone-900 text-lg tracking-tight font-outfit">Inventory AI Agent</h1>
            <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Secure Session: {userEmail}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-orange-600 text-[10px] font-black uppercase shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{userRole.replace(/_/g, " ")}</span>
          </span>
          <button 
            onClick={handleClearConversation}
            className="p-2 text-stone-400 hover:text-orange-600 hover:bg-orange-50/50 rounded-lg transition-colors border border-transparent hover:border-orange-100 cursor-pointer"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* 2. SUGGESTED QUESTIONS */}
      <div className="bg-white border border-stone-200/80 p-4 rounded-2xl shadow-sm space-y-2">
        <span className="block text-[9px] font-bold text-stone-400 uppercase tracking-wider">Suggested Questions</span>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(s)}
              className="px-3 py-1.5 bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-200 text-stone-600 hover:text-orange-700 font-semibold text-[10px] rounded-xl transition-all cursor-pointer shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONVERSATION VIEW */}
      <div className="flex-1 bg-white border border-stone-200/80 p-5 rounded-2xl shadow-sm min-h-[350px] max-h-[500px] overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex items-start gap-3 ${m.sender === "USER" ? "flex-row-reverse" : ""}`}>
            <div className={`p-2.5 rounded-xl shrink-0 ${m.sender === "USER" ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-500 border border-stone-200/80"}`}>
              {m.sender === "USER" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-orange-500" />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl p-4 border text-xs shadow-sm space-y-2 relative group ${
              m.sender === "USER"
                ? "bg-orange-50/50 border-orange-100 text-stone-850 rounded-tr-none"
                : "bg-white border-stone-200/80 text-stone-750 rounded-tl-none"
            }`}>
              {m.sender === "AI" ? (
                <>
                  {parseMarkdownResponse(m.text)}
                  {renderProductCard(m.text)}
                  {renderChart(m.text)}
                  
                  {/* Bubble copy actions */}
                  <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-white/90 border border-stone-200 rounded-md p-1">
                    <button 
                      onClick={() => handleCopyText(m.text)}
                      className="p-1 hover:text-orange-500 text-stone-400 transition-colors cursor-pointer"
                      title="Copy Response"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <p className="leading-relaxed whitespace-pre-line font-semibold text-stone-850">{m.text}</p>
              )}
              
              <span className="text-[8px] text-stone-400 font-bold block text-right mt-1.5">
                {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-stone-50 text-stone-500 border border-stone-200/80 rounded-xl shrink-0">
              <Bot className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            </div>
            <div className="bg-white border border-stone-200/80 text-stone-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-2">
              <span className="text-[10px] text-stone-400 font-bold animate-pulse mr-1">Querying database...</span>
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        {errorState && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl rounded-tl-none p-4 shadow-sm space-y-2 max-w-[80%]">
              <p className="text-xs font-semibold">Retrieval or database query has failed. Please verify connection and retry.</p>
              <button 
                onClick={handleRetry}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                Retry Last Query
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. CHAT INPUT AREA */}
      <div className="space-y-3">
        <div className="relative">
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Query details, prices, comparisons, or stock levels..."
            className="w-full bg-white border border-stone-250 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 rounded-2xl py-3.5 pl-4 pr-32 text-xs text-stone-850 placeholder-stone-400 focus:outline-none transition-all resize-none shadow-sm font-medium"
          />
          <div className="absolute right-3 top-2.5 flex items-center space-x-2">
            <button 
              onClick={handleExportChat}
              className="p-2 text-stone-400 hover:text-orange-600 hover:bg-stone-50 rounded-lg transition-all cursor-pointer"
              title="Export Conversation"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputValue.trim()}
              className="p-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-orange-500/10 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. RECENT QUERIES LIST */}
      <div className="bg-white border border-stone-200/80 p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center space-x-1.5 text-[9px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-1.5">
          <History className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
          <span>Recent Queries History</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {queryHistory.length === 0 ? (
            <div className="col-span-3 text-[10px] text-stone-400 italic py-2 text-center bg-stone-50/50 border border-dashed border-stone-200 rounded-xl">
              No queries logged in this session yet.
            </div>
          ) : (
            queryHistory.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="p-2 bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-100 rounded-xl text-[10px] font-semibold text-stone-700 hover:text-orange-700 text-left transition-all truncate block cursor-pointer"
              >
                {q}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
