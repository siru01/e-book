import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

const NAV = [
  { label: "Dashboard", icon: "🏠", route: "/dashboard" },
  { label: "Discover",  icon: "🔍", route: "/discover" },
  { label: "Genres",    icon: "🏷️", route: "/discover" },
];

export default function Sidebar({ expanded, onToggle }) {
  const { pathname } = useLocation();

  return (
    <aside className={`sidebar ${expanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {/* Header */}
      <div className="sidebar-header">
        <button className="sidebar-hamburger" onClick={onToggle} title="Toggle sidebar">
          <span /><span /><span />
        </button>
        <span className="sidebar-title">S H E L F</span>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        {NAV.map(({ label, icon, route }) => {
          const active = pathname === route;
          return (
            <Link key={label} to={route} className={`sidebar-item ${active ? "sidebar-item-active" : ""}`} title={label}>
              <span className="sidebar-icon">{icon}</span>
              <span className="sidebar-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}