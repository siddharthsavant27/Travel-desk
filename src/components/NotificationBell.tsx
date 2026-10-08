"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink, Inbox } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  initialCount?: number;
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const sessionEnded = useRef(false);

  const fetchNotifications = async () => {
    if (sessionEnded.current) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) {
        sessionEnded.current = true;
        setNotifications([]);
        setFetched(true);
        window.dispatchEvent(new Event("traveldesk:session-expired"));
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setFetched(true);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = fetched
    ? notifications.filter((n) => !n.isRead).length
    : initialCount;

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        id="notification-bell-btn"
        className="glass-control flex h-11 w-11 items-center justify-center rounded-full border border-[var(--glass-border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]"
        aria-label={`View notifications (${unreadCount} unread)`}
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span 
            id="unread-notifications-badge"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand-amber)] text-black text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--canvas-bg)]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div 
          className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl glass-floating p-4 shadow-2xl border border-[var(--glass-border)] z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
          role="region"
          aria-label="Notification center"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)] mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--foreground)]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--brand-teal)]/15 text-[var(--brand-teal)] font-bold text-[10px]">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-[var(--brand-teal)] hover:underline flex items-center gap-1 font-medium"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--glass-border)]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[var(--foreground-muted)] space-y-2">
                <Inbox className="w-8 h-8 mx-auto opacity-40" />
                <p>No operational alerts yet.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`py-3 space-y-1 transition-colors ${
                    !n.isRead ? "bg-[var(--brand-teal)]/5 px-2 rounded-lg" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[var(--foreground)]">{n.title}</span>
                    <span className="text-[10px] text-[var(--foreground-muted)] shrink-0 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-[var(--foreground-muted)] leading-relaxed">{n.message}</p>
                  <div className="flex items-center justify-between pt-1">
                    {n.linkUrl ? (
                      <Link
                        href={n.linkUrl}
                        onClick={() => {
                          markAsRead(n.id);
                          setOpen(false);
                        }}
                        className="text-[11px] font-semibold text-[var(--brand-teal)] hover:underline flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span />
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-[10px] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
