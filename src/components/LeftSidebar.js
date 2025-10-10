// src/components/LeftSidebar.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "../App.css";

function LeftSidebar({ role: propRole }) {
  /* ===== Debug helpers ===== */
  const DEBUG = true;
  const log = (...args) => DEBUG && console.log("[LeftSidebar]", ...args);
  const group = (label, fn) => {
    if (!DEBUG) return fn?.();
    console.groupCollapsed(`[LeftSidebar] ${label}`);
    try { fn?.(); } finally { console.groupEnd(); }
  };

  const location = useLocation();
  const [userName, setUserName] = useState("User");
  const [role, setRole] = useState(propRole || "");
  const [serverMenus, setServerMenus] = useState([]);

  // Force dynamic-only menus (no fallback)
  const DYNAMIC_ONLY = true;

  /* Keep sidebar open */
  useEffect(() => {
    document.body.classList.add("sidebar-open");
    log("Mounted: forcing sidebar-open class on body");
  }, []);

  /* Load user + menus from storage (and on storage updates) */
  useEffect(() => {
    const loadFromStorage = () => {
      group("loadFromStorage()", () => {
        const token = localStorage.getItem("jwt");
        log("jwt present?", !!token);

        if (token) {
          try {
            const decoded = jwtDecode(token);
            log("decoded token:", decoded);

            const resolvedRole =
              decoded?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
              decoded?.role ||
              "";
            const name =
              decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
              decoded?.Username ||
              decoded?.name ||
              "User";

            setRole(resolvedRole);
            setUserName(name);
            log("resolved role:", resolvedRole, "resolved name:", name);
          } catch (err) {
            console.error("[LeftSidebar] Token decode failed", err);
            setRole(propRole || "");
            setUserName("User");
          }
        } else {
          setRole(propRole || "");
          setUserName("User");
          log("no token; using propRole:", propRole || "");
        }

        const rawMenus = localStorage.getItem("menus");
        log("raw menus in storage:", rawMenus);

        if (rawMenus) {
          try {
            const parsed = JSON.parse(rawMenus);

            // Normalize & sanitize menu items
            const normalized = (Array.isArray(parsed) ? parsed : [])
              .filter((m) => typeof m?.path === "string" && m.path.trim().length > 0)
              .map((m) => {
                let href = m.path.trim().replace(/\s+/g, " ");
                if (!href.startsWith("/")) href = "/" + href;
                // Remove accidental internal spaces like "/student-exams  "
                href = href.replace(/\s+$/g, "");
                return {
                  icon: m?.icon || "fa fa-circle",
                  label: (m?.text || m?.mainMenuName || "Menu").toString().trim(),
                  href,
                  order: Number.isFinite(m?.order) ? m.order : 0,
                };
              })
              .sort((a, b) => a.order - b.order);

            setServerMenus(normalized);
            log("normalized menus (sanitized):", normalized);
          } catch (e) {
            console.error("[LeftSidebar] Failed to parse menus from storage", e);
            setServerMenus([]);
          }
        } else {
          setServerMenus([]);
          log("no menus in storage; serverMenus cleared");
        }
      });
    };

    loadFromStorage();

    const onStorage = (evt) => {
      group("storage event", () => {
        log("key:", evt?.key, "oldValue:", evt?.oldValue, "newValue:", evt?.newValue);
        loadFromStorage();
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propRole]);

  /* Keep sidebar open on route change */
  useEffect(() => {
    document.body.classList.add("sidebar-open");
    log("route changed ->", location.pathname, "keeping sidebar-open");
  }, [location.pathname]);

  /* Click-outside to close on mobile only */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth <= 767) {
        const sidebar = document.getElementById("left-sidebar");
        const isClickInsideSidebar = sidebar && sidebar.contains(event.target);
        const isMenuToggleClick = event.target.closest?.(".menu_toggle");
        if (!isClickInsideSidebar && !isMenuToggleClick) {
          document.body.classList.remove("sidebar-open");
          log("mobile: click outside sidebar -> closing");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    log("mounted click-outside listener (mobile only)");
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      log("unmounted click-outside listener");
    };
  }, []);

  /* Menu list (dynamic only) */
  const menuItems = DYNAMIC_ONLY ? serverMenus : serverMenus;

  /* Active route rules */
  const isCoursewareActive =
    location.pathname === "/my-courseware" ||
    location.pathname.startsWith("/view-course-content") ||
    location.pathname.startsWith("/instructor/upload-course-content");

  const isManageUsersActive =
    location.pathname.startsWith("/students") ||
    location.pathname.startsWith("/professors") ||
    location.pathname.startsWith("/admin-users");

  return (
    <div id="left-sidebar" className="sidebar" style={{ paddingTop: "10px" }}>
      <div className="sidebar-header" style={{ padding: 0, paddingLeft: "20px" }}>
        <h5 className="brand-name d-flex align-items-center">
          <img src="/assets/EdVedha-Logo.png" alt="logo" height="32" />
        </h5>
      </div>

      <div className="sidebar-welcome" style={{ padding: "0px" }}>
        <div
          className="welcome-card animate-welcome"
          style={{
            minHeight: "0px",
            margin: "auto",
            alignItems: "center",
            textAlign: "center",
            marginTop: "5px",
            marginBottom: "5px",
          }}
        >
          <div className="text-center" style={{ padding: "0px" }}>
            <div className="welcome-name">
              {userName} - ({role || "N/A"})
            </div>
          </div>
        </div>
      </div>

      <div>
        <nav className="sidebar-nav">
          <ul className="metismenu">
            {menuItems.length === 0 ? (
              <li className="text-muted px-3" style={{ opacity: 0.8 }}>
                No menus assigned to this role.
              </li>
            ) : (
              menuItems.map((item, index) => {
                const computedActive =
                  item.href === "/my-courseware"
                    ? isCoursewareActive
                    : item.href === "/users-dashboard"
                    ? isManageUsersActive
                    : location.pathname === item.href;

                DEBUG &&
                  console.debug(
                    "[LeftSidebar] render menu",
                    { idx: index, href: item.href, label: item.label },
                    "active?", computedActive
                  );

                return (
                  <li key={`${item.href || "menu"}-${index}`}>
                    <NavLink
                      to={item.href || "#"}
                      className={`d-flex align-items-center ${
                        computedActive ? "fw-bold text-primary" : ""
                      }`}
                    >
                      <i className={`${item.icon || "fa fa-circle"} mr-2`} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default LeftSidebar;
