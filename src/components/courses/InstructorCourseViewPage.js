import React, { useEffect, useState, useRef, useMemo } from "react";
import { Modal } from "react-bootstrap";
import HeaderTop from "../../components/HeaderTop";
import RightSidebar from "../../components/RightSidebar";
import LeftSidebar from "../../components/LeftSidebar";
import Footer from "../../components/Footer";
import { useParams, useLocation, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Document, Page, pdfjs } from "react-pdf";
import API_BASE_URL from "../../config";

// If you later want to switch to your watermark component inside the modal, it's ready.
// import VimeoWithWatermark from "../VimeoWithWatermark";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/* =========================
   Debug helpers (toggleable)
   ========================= */
const DEBUG = true; // set false to silence all logs
const tag = "ICVP"; // InstructorCourseViewPage
const mask = (str) =>
  typeof str === "string" && str.length > 12
    ? `${str.slice(0, 4)}…${str.slice(-4)}`
    : str;

const log = (...args) => DEBUG && console.log(`[${tag}]`, ...args);
const info = (...args) => DEBUG && console.info(`[${tag}]`, ...args);
const warn = (...args) => DEBUG && console.warn(`[${tag}]`, ...args);
const error = (...args) => DEBUG && console.error(`[${tag}]`, ...args);
const group = (title, obj) => {
  if (!DEBUG) return;
  console.groupCollapsed(`[${tag}] ${title}`);
  if (obj !== undefined) console.log(obj);
  console.groupEnd();
};

/* =========================
   URL helpers
   ========================= */
function normalizeUrl(raw) {
  if (!raw) return "";
  let u = String(raw).trim();
  if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
    u = u.slice(1, -1);
  }
  u = u.replace(/&amp;/g, "&");
  u = u.replace(/%22$/i, "");
  return u;
}

/* =========================
   Watermark helpers
   ========================= */
// Live clock (ticks every second)
function useLiveClock({ timeZone = 'Asia/Kolkata', intervalMs = 1000 } = {}) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now.toLocaleString('en-IN', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

// Extract only identity once (role + userId)
function getIdentityFromToken(storageKey = "jwt") {
  try {
    const token = localStorage.getItem(storageKey) || (storageKey !== "jwt" ? localStorage.getItem("jwt") : null);
    if (!token) return { role: "User", userId: "NA" };
    const claims = jwtDecode(token) || {};
    const role =
      claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      claims.role ||
      (Array.isArray(claims.roles) && claims.roles[0]) ||
      "User";
    const userId =
      claims.UserId ||
      claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      claims.sub || claims.nameid || "NA";
    return { role, userId };
  } catch {
    return { role: "User", userId: "NA" };
  }
}

function getDisplayTextFromToken(storageKey = "jwt") {
  try {
    const token = localStorage.getItem(storageKey) || (storageKey !== "jwt" ? localStorage.getItem("jwt") : null);
    if (!token) return "User-NA";
    const claims = jwtDecode(token) || {};
    const role =
      claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      claims.role ||
      (Array.isArray(claims.roles) && claims.roles[0]) ||
      "User";
    const userId =
      claims.UserId ||
      claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      claims.sub ||
      claims.nameid ||
      "NA";
    const loginDateTime =
      claims.loginDateTime ||
      (claims.iat ? new Date(claims.iat * 1000).toLocaleString() : new Date().toLocaleString());
    return `${role}-${userId} | ${loginDateTime}`;
  } catch {
    return "User-NA";
  }
}

function getApiOrigin() {
  // Accepts values like "https://host/api" or "https://host" or "https://host:port/api/"
  try {
    const u = new URL(API_BASE_URL);
    const path = u.pathname.replace(/\/+$/, "");
    if (path.toLowerCase().endsWith("/api")) {
      const stripped = path.replace(/\/api$/i, "");
      return `${u.origin}${stripped || ""}`;
    }
    return u.origin;
  } catch {
    // Fallback: if API_BASE_URL is a bare origin or something unexpected
    try {
      const u = new URL(window.location.origin);
      return u.origin;
    } catch {
      return "";
    }
  }
}

function isHttpUrl(u) {
  return /^https?:\/\//i.test(u || "");
}
function isVimeo(u) {
  return /vimeo\.com/i.test(u || "");
}
function isYouTube(u) {
  return /youtu\.be|youtube\.com/i.test(u || "");
}
function toAbsoluteLocal(origin, pathOrUrl) {
  if (!pathOrUrl) return "";
  if (isHttpUrl(pathOrUrl)) return pathOrUrl; // already absolute
  if (!origin) return pathOrUrl; // last resort
  if (pathOrUrl.startsWith("/")) return `${origin}${pathOrUrl}`;
  return `${origin}/${pathOrUrl}`;
}

/* =========================
   Robust fetch helper
   ========================= */
async function safeFetchJson(url, options = {}, { label = "", retries = 0, signal } = {}) {
  const attempt = async () => {
    const res = await fetch(url, { ...options, signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[${tag}] Fetch failed${label ? " - " + label : ""}`, {
        url,
        status: res.status,
        body: text,
      });
      throw new Error(`HTTP ${res.status} ${label || ""}`.trim());
    }
    return res.json();
  };
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

/* =========================
   Component
   ========================= */
function InstructorCourseViewPage() {
  const { courseId } = useParams();
  const location = useLocation();

  const courseName = location.state?.paperName || "Unknown courseName";
  const courseCode = location.state?.paperCode || "Unknown courseCode";
  const batchName = location.state?.batchName || "Unknown Batch";
  const courseDisplayName = location.state?.name || "Unknown Name";
  const semester = location.state?.semester || "Unknown Semester";
  const examId = location.state?.examinationID || "Unknown examination ID";
  const className = location.state?.class || "Unknown Class";

  // NEW: keep raw content and a unit -> title map
  const [rawContent, setRawContent] = useState(() => {
    log("Initializing rawContent state");
    return [];
  });
  const [unitTitleByUnit, setUnitTitleByUnit] = useState(() => {
    log("Initializing unitTitleByUnit state");
    return {};
  });

  const [materials, setMaterials] = useState(() => {
    log("Initializing materials state");
    return [];
  });
  const [ebooks, setEBOOKS] = useState(() => {
    log("Initializing ebooks state");
    return [];
  });
  const [webresources, setwebresources] = useState(() => {
    log("Initializing webresources state");
    return [];
  });
  const [videos, setVideos] = useState(() => {
    log("Initializing videos state");
    return [];
  });
  const [liveClasses, setLiveClasses] = useState(() => {
    log("Initializing liveClasses state");
    return [];
  });

  const [showVideoModal, setShowVideoModal] = useState(() => {
    log("Initializing showVideoModal state");
    return false;
  });
  const [videoUrl, setVideoUrl] = useState(() => {
    log("Initializing videoUrl state");
    return "";
  });
  const [isVimeoUrl, setIsVimeoUrl] = useState(() => {
    log("Initializing isVimeoUrl state");
    return false;
  });
  const [isYouTubeUrl, setIsYouTubeUrl] = useState(() => {
    log("Initializing isYouTubeUrl state");
    return false;
  });
  const [currentVideoProgress, setCurrentVideoProgress] = useState(() => {
    log("Initializing currentVideoProgress state");
    return 0;
  });

  const [showFileModal, setShowFileModal] = useState(() => {
    log("Initializing showFileModal state");
    return false;
  });
  const [fileUrl, setFileUrl] = useState(() => {
    log("Initializing fileUrl state");
    return "";
  });
  const [fileProgress, setFileProgress] = useState(() => {
    log("Initializing fileProgress state");
    return 0;
  });
  const [pageNumber, setPageNumber] = useState(() => {
    log("Initializing pageNumber state");
    return 1;
  });
  const [numPages, setNumPages] = useState(() => {
    log("Initializing numPages state");
    return null;
  });
  const [visitedPages, setVisitedPages] = useState(() => {
    log("Initializing visitedPages state");
    return new Set();
  });

  const [activeUnit, setActiveUnit] = useState(() => {
    log("Initializing activeUnit state");
    return "";
  });
  const [allUnits, setAllUnits] = useState(() => {
    log("Initializing allUnits state");
    return [];
  });

  const sectionRefs = {
    ebooks: useRef(null),
    videos: useRef(null),
    webresources: useRef(null),
  };

  const lastLoggedVideoPct = useRef(-1);

  // Watermark refs and displayText (live ticking time)
  const { role: wmRole, userId: wmUserId } = useMemo(() => {
    const identity = getIdentityFromToken("jwt");
    log("Watermark identity extracted", identity);
    return identity;
  }, []);
  const liveTime = useLiveClock({ timeZone: 'Asia/Kolkata', intervalMs: 1000 });
  const displayText = `${wmRole}-${wmUserId} | ${liveTime}`;

  const wmVideoRef = useRef(null);
  const wmPdfRef = useRef(null);
  // Animation state for watermarks
  const videoWmStateRef = useRef({
    x: 20,
    y: 20,
    vx: 40 * 0.7, // speed * 0.7
    vy: 40 * 0.3, // speed * 0.3
    lastT: 0,
    nextJitterAt: 0,
  });

  const pdfWmStateRef = useRef({
    x: 50,
    y: 50,
    vx: 35 * 0.8,
    vy: 35 * 0.4,
    lastT: 0,
    nextJitterAt: 0,
  });

  const apiOrigin = getApiOrigin();

  // === Delete helpers ===
  function getContentId(obj) {
    return (
      obj?.contentId ??
      obj?.ContentId ??
      obj?.id ??
      obj?.Id ??
      obj?.cid ??
      obj?.Cid ??
      null
    );
  }
  const [deletingId, setDeletingId] = useState(null);

  function removeContentLocallyById(id) {
    log("Removing content locally by id", { id });
    const drop = (arr) => (Array.isArray(arr) ? arr.filter((x) => getContentId(x) !== id) : []);
    setEBOOKS((p) => {
      const filtered = drop(p);
      log("Updated ebooks after removal", { before: p.length, after: filtered.length });
      return filtered;
    });
    setVideos((p) => {
      const filtered = drop(p);
      log("Updated videos after removal", { before: p.length, after: filtered.length });
      return filtered;
    });
    setwebresources((p) => {
      const filtered = drop(p);
      log("Updated webresources after removal", { before: p.length, after: filtered.length });
      return filtered;
    });
    setMaterials((p) => {
      const filtered = drop(p);
      log("Updated materials after removal", { before: p.length, after: filtered.length });
      return filtered;
    });
    log("Content removal complete", { id });
  }

  async function handleDeleteContent(item, e) {
    if (e) e.stopPropagation();
    const id = getContentId(item);
    log("Delete content initiated", { id, item });
    if (!id) {
      warn("Cannot delete: no content id on item", item);
      alert("Delete failed: content id not found.");
      return;
    }
    log("Prompting user for delete confirmation", { id });
    if (!window.confirm("Are you sure you want to delete this content? This cannot be undone.")) {
      log("Delete cancelled by user", { id });
      return;
    }
    log("Delete confirmed by user", { id });
    try {
      setDeletingId(id);
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${API_BASE_URL}/Content/Delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const bodyText = await res.text().catch(() => "");
      log("DELETE Content response", { status: res.status, ok: res.ok, bodyText });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${bodyText || ""}`);

      // best-effort: clean cached progress keys
      try {
        const fileUrlAbs = item?.fileUrl ? toAbsoluteLocal(apiOrigin, item.fileUrl) : "";
        const vurl = normalizeUrl(item?.vurl || "");
        const playableUrl = isHttpUrl(vurl) ? vurl : fileUrlAbs;
        [
          `video-progress-${playableUrl}`,
          `ebook-progress-${fileUrlAbs}`,
          `webresource-progress-${fileUrlAbs}`,
        ].forEach((k) => localStorage.removeItem(k));
      } catch { }

      removeContentLocallyById(id);
      alert("✅ Content deleted successfully.");
    } catch (e2) {
      error("Delete failed", e2);
      alert("❌ Delete failed. See console for details.");
    } finally {
      setDeletingId(null);
    }
  }

  // Enhanced right-click and developer tools blocking
  useEffect(() => {
    const root = document.getElementById("main_content");
    if (!root) return;

    // Prevent right-click context menu
    const preventCtx = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent common developer shortcuts
    const preventDevTools = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent text selection
    const preventSelection = (e) => {
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    root.addEventListener("contextmenu", preventCtx);
    document.addEventListener("keydown", preventDevTools);
    document.addEventListener("keydown", preventSelection);

    // Disable drag and drop
    root.addEventListener("dragstart", preventCtx);
    root.addEventListener("drop", preventCtx);

    return () => {
      root.removeEventListener("contextmenu", preventCtx);
      document.removeEventListener("keydown", preventDevTools);
      document.removeEventListener("keydown", preventSelection);
      root.removeEventListener("dragstart", preventCtx);
      root.removeEventListener("drop", preventCtx);
    };
  }, []);

  // Watermark animation effect
  useEffect(() => {
    log("Watermark animation effect triggered", { showVideoModal, showFileModal });
    let rafId = null;

    const animateWatermark = (wmRef, stateRef, containerId) => {
      log("Setting up watermark animation", { containerId });
      const wm = wmRef.current;
      const container = document.querySelector(containerId);
      if (!wm || !container) return;

      const getBounds = () => {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const ww = wm.offsetWidth;
        const wh = wm.offsetHeight;
        return { cw, ch, ww, wh };
      };

      const pickJitter = (speed = 40) => {
        const now = performance.now();
        stateRef.current.nextJitterAt = now + 1500 + Math.random() * 2000;
        const angle = Math.random() * 0.9 - 0.45; // ~±26°
        const { vx, vy } = stateRef.current;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let nvx = vx * cos - vy * sin;
        let nvy = vx * sin + vy * cos;
        const mag = Math.hypot(nvx, nvy) || 1;
        stateRef.current.vx = (nvx / mag) * speed;
        stateRef.current.vy = (nvy / mag) * speed;
      };

      const step = (t) => {
        const s = stateRef.current;
        if (!s.lastT) s.lastT = t;
        const dt = Math.min(0.05, (t - s.lastT) / 1000);
        s.lastT = t;

        if (t >= s.nextJitterAt) pickJitter();

        let { x, y, vx, vy } = s;
        x += vx * dt;
        y += vy * dt;

        const { cw, ch, ww, wh } = getBounds();

        if (x <= 0) { x = 0; vx = Math.abs(vx); }
        else if (x + ww >= cw) { x = cw - ww; vx = -Math.abs(vx); }

        if (y <= 0) { y = 0; vy = Math.abs(vy); }
        else if (y + wh >= ch) { y = ch - wh; vy = -Math.abs(vy); }

        s.x = x; s.y = y; s.vx = vx; s.vy = vy;
        if (wm) {
          wm.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }

        rafId = requestAnimationFrame(step);
      };

      stateRef.current.nextJitterAt = performance.now() + 1500;
      return step;
    };

    // Start animation when modals are open
    if (showVideoModal) {
      log("Starting video modal watermark animation");
      const step = animateWatermark(wmVideoRef, videoWmStateRef, '.video-wrapper');
      rafId = requestAnimationFrame(step);
      log("Video watermark animation frame requested", { rafId });
    } else if (showFileModal) {
      log("Starting file modal watermark animation");
      const step = animateWatermark(wmPdfRef, pdfWmStateRef, '.relative-wrap');
      rafId = requestAnimationFrame(step);
      log("File watermark animation frame requested", { rafId });
    }

    return () => {
      if (rafId) {
        log("Cleaning up watermark animation", { rafId });
        cancelAnimationFrame(rafId);
        log("Watermark animation cancelled");
      }
    };
  }, [showVideoModal, showFileModal]);

  // Enhanced modal security - Block right-click when modals are open
  useEffect(() => {
    log("Modal security effect triggered", { showVideoModal, showFileModal });
    if (!showVideoModal && !showFileModal) {
      log("No modals open, skipping security setup");
      return;
    }
    log("Setting up enhanced modal security");

    const preventAll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventDevToolsStrict = (e) => {
      // Block all developer shortcuts when modal is open
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 'S') || // Block Ctrl+S (Save As)
        (e.ctrlKey && e.shiftKey && e.key === 'S') || // Block Ctrl+Shift+S
        (e.ctrlKey && e.key === 'P') // Block Ctrl+P (Print)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Add strict event listeners when modal is open
    document.addEventListener("contextmenu", preventAll, true);
    document.addEventListener("selectstart", preventAll, true);
    document.addEventListener("dragstart", preventAll, true);
    document.addEventListener("keydown", preventDevToolsStrict, true);

    // Disable print screen
    document.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        return false;
      }
    }, true);

    return () => {
      log("Cleaning up modal security listeners");
      document.removeEventListener("contextmenu", preventAll, true);
      document.removeEventListener("selectstart", preventAll, true);
      document.removeEventListener("dragstart", preventAll, true);
      document.removeEventListener("keydown", preventDevToolsStrict, true);
      log("Modal security cleanup complete");
    };
  }, [showVideoModal, showFileModal]);

  useEffect(() => {
    info("Component mounted", {
      courseId,
      examId,
      courseName,
      courseCode,
      batchName,
      semester,
      courseDisplayName,
      apiOrigin,
      API_BASE_URL,
    });
    if (!apiOrigin) {
      warn("apiOrigin is empty. Check API_BASE_URL:", API_BASE_URL);
    }
    return () => info("Component unmounted");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     Video open/close
     ========================= */
  function getPlayableVideoUrl(item) {
    // Prefer local fileUrl if present; else use vurl
    const vurlClean = normalizeUrl(item.vurl || "");
    const chosen = item.fileUrl ? toAbsoluteLocal(apiOrigin, item.fileUrl) : vurlClean;
    return chosen;
  }

  const handleWatchVideo = (item) => {
    const chosen = getPlayableVideoUrl(item);
    const vimeo = isVimeo(chosen);
    const ytb = isYouTube(chosen);

    group("Open Video – Payload", {
      item,
      normalized: {
        fileUrl: item.fileUrl,
        vurl: normalizeUrl(item.vurl || ""),
      },
      chosenUrl: chosen,
      classification: { vimeo, youTube: ytb, absolute: isHttpUrl(chosen) },
      apiOrigin,
      progressKey: `video-progress-${chosen}`,
    });

    if (!chosen) {
      error("No playable URL found for video item");
      return;
    }

    setIsVimeoUrl(vimeo);
    setIsYouTubeUrl(ytb);
    setVideoUrl(chosen);
    setShowVideoModal(true);

    const progress = parseInt(localStorage.getItem(`video-progress-${chosen}`)) || 0;
    log("Loaded stored video progress", { progress, key: `video-progress-${chosen}` });
    setCurrentVideoProgress(progress);
  };

  const handleCloseVideo = () => {
    log("Closing video modal");
    setShowVideoModal(false);
    setVideoUrl("");
    setCurrentVideoProgress(0);
    lastLoggedVideoPct.current = -1;
    setIsVimeoUrl(false);
    setIsYouTubeUrl(false);
  };

  /* =========================
     File open/close (PDF etc.)
     ========================= */
  const handleViewFile = (urlOrPath) => {
    const fullUrl = toAbsoluteLocal(apiOrigin, urlOrPath);
    group("Open File – Payload", { raw: urlOrPath, fullUrl, apiOrigin, progressKey: `ebook-progress-${fullUrl}` });
    setFileUrl(fullUrl);
    setShowFileModal(true);
    const progress = parseInt(localStorage.getItem(`ebook-progress-${fullUrl}`)) || 0;
    log("Loaded stored file progress", { progress, key: `ebook-progress-${fullUrl}` });
    setFileProgress(progress);
  };

  const handleCloseFile = () => {
    log("Closing file modal");
    setShowFileModal(false);
    setFileUrl("");
    setFileProgress(0);
    setPageNumber(1);
    setNumPages(null);
    setVisitedPages(new Set());
  };

  const handlePageChange = (newPage) => {
    log("PDF page change", { from: pageNumber, to: newPage, numPages });
    setPageNumber(newPage);

    setVisitedPages((prev) => {
      const updated = new Set(prev);
      updated.add(newPage);

      let percent = Math.round((updated.size / numPages) * 100);
      if (newPage === numPages) percent = 100;

      const storedProgress = parseInt(localStorage.getItem(`ebook-progress-${fileUrl}`)) || 0;
      const updatedProgress = Math.max(percent, storedProgress);

      setFileProgress(updatedProgress);
      localStorage.setItem(`ebook-progress-${fileUrl}`, updatedProgress);

      log("PDF progress updated", {
        visitedPages: Array.from(updated).sort((a, b) => a - b),
        percent,
        storedProgress,
        updatedProgress,
        key: `ebook-progress-${fileUrl}`,
      });

      return updated;
    });
  };

  /* =========================
     Auth / data loads
     ========================= */
  const [practiceExams, setPracticeExams] = useState(() => {
    log("Initializing practiceExams state");
    return [];
  });
  const [userId, setUserId] = useState(() => {
    log("Initializing userId state");
    return null;
  });
  const [role, setRole] = useState(() => {
    log("Initializing role state");
    return "";
  });

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const extractedUserId = parseInt(decoded?.UserId);
        const extractedRole =
          decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        group("JWT decoded", {
          userId: extractedUserId,
          role: extractedRole,
          raw: { ...decoded, token: `Bearer ${mask(token)}` },
        });
        setUserId(extractedUserId);
        setRole(extractedRole);
      } catch (err) {
        error("Error decoding JWT:", err);
      }
    } else {
      warn("No JWT found in localStorage");
    }
  }, []);

  // Practice exam submit
  const submitSubjectivePracticeExam = async (examId, studentId, file) => {
    const token = localStorage.getItem("jwt");
    const url = `${API_BASE_URL}/ExamSubmissions/PracticeExamSubjective?ExamId=${examId}&studentId=${studentId}`;
    const headers = { Authorization: `Bearer ${token}` };
    const formData = new FormData();
    formData.append("file", file);

    group("Submitting Subjective Practice Exam – Payload", {
      url,
      headers: { ...headers, Authorization: `Bearer ${mask(token)}` },
      examId,
      studentId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    });

    try {
      console.time(`[${tag}] POST PracticeExamSubjective`);
      const res = await fetch(url, { method: "POST", body: formData, headers });
      const result = await res.text();
      console.timeEnd(`[${tag}] POST PracticeExamSubjective`);
      log("PracticeExamSubjective response", { status: res.status, ok: res.ok, result });
      if (!res.ok) throw new Error(result);
      alert("✅ Subjective practice exam submitted successfully!");
    } catch (err) {
      error("Failed to submit subjective practice exam", err);
      alert("❌ Failed to submit subjective practice exam.");
    }
  };

  // Fetch practice exams for student
  useEffect(() => {
    const fetchPracticeExams = async () => {
      if (!activeUnit || !userId) {
        warn("Skipping fetch: activeUnit or userId is missing", { activeUnit, userId });
        return;
      }
      const unitId = Number(activeUnit.split("-")[1]);
      const examinationId = parseInt(examId);
      const url = `${API_BASE_URL}/InstructorExam/StudentPracticeExams/?userId=${userId}&UnitId=${unitId}&examinationid=${examinationId}`;
      const token = localStorage.getItem("jwt");

      group("Fetch Practice Exams – Payload", {
        url,
        query: { userId, unitId, examinationId },
        headers: { Authorization: `Bearer ${mask(token)}` },
      });

      try {
        console.time(`[${tag}] GET PracticeExams`);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        console.timeEnd(`[${tag}] GET PracticeExams`);
        log("PracticeExams response status", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          log("PracticeExams array length", data.length);
          DEBUG && console.table(data);
          setPracticeExams(data);
        } else {
          warn("PracticeExams: API response is not an array", data);
          setPracticeExams([]);
        }
      } catch (err) {
        error("Error fetching practice exams:", err);
        setPracticeExams([]);
      }
    };
    fetchPracticeExams();
  }, [activeUnit, examId, userId]);

  // Fetch admin practice tests
  const [adminPracticeTests, setAdminPracticeTests] = useState(() => {
    log("Initializing adminPracticeTests state");
    return [];
  });
  useEffect(() => {
    const fetchAdminPracticeTests = async () => {
      if (!userId || !activeUnit || !examId) {
        warn("Skipping admin tests fetch; missing userId/activeUnit/examId", {
          userId,
          activeUnit,
          examId,
        });
        return;
      }
      const unitId = Number(activeUnit.split("-")[1]);
      const examinationId = parseInt(examId);
      const url = `${API_BASE_URL}/AssignmentSubmission/GetPracticeExamsSubmissionsById/?instructorId=${userId}&UnitId=${unitId}&examinationid=${examinationId}`;
      const token = localStorage.getItem("jwt");

      group("Fetch Admin Practice Tests – Payload", {
        url,
        query: { instructorId: userId, unitId, examinationId },
        headers: { Authorization: `Bearer ${mask(token)}` },
      });

      try {
        console.time(`[${tag}] GET AdminPracticeTests`);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        console.timeEnd(`[${tag}] GET AdminPracticeTests`);
        log("AdminPracticeTests response status", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          log("AdminPracticeTests array length", data.length);
          DEBUG && console.table(data);
          setAdminPracticeTests(data);
        } else {
          warn("AdminPracticeTests: expected array, got", data);
          setAdminPracticeTests([]);
        }
      } catch (err) {
        error("Error fetching Admin Practice Tests:", err);
        setAdminPracticeTests([]);
      }
    };
    fetchAdminPracticeTests();
  }, [userId, activeUnit, examId]);

  /* =========================
     Fetch content bundle (user-specific)
     ========================= */
  useEffect(() => {
    if (!courseId || !userId) {
      warn("Skipping content fetch: missing courseId or userId", { courseId, userId });
      return;
    }
    const token = localStorage.getItem("jwt");
    const headers = { Authorization: `Bearer ${token}` };
    const ac = new AbortController();

    const contentUrl = `${API_BASE_URL}/Content/Course/${courseId}?userId=${userId}`;

    group("Fetch Content Bundle – Payload", {
      contentUrl,
      headers: { Authorization: `Bearer ${mask(token)}` },
    });

    (async () => {
      try {
        console.time("[ICVP] GET Content bundle");
        const [content, allLiveClasses] = await Promise.all([
          safeFetchJson(
            contentUrl,
            { headers, signal: ac.signal },
            { label: "Content/Course", retries: 1 }
          ),
          safeFetchJson(
            `${API_BASE_URL}/LiveClass/All`,
            { headers, signal: ac.signal },
            { label: "LiveClass", retries: 1 }
          ),
        ]);
        console.timeEnd("[ICVP] GET Content bundle");

        // Keep the raw list for unit tabs
        log("Processing content bundle", { contentLength: content?.length, allLiveClassesLength: allLiveClasses?.length });
        setRawContent(Array.isArray(content) ? content : []);

        // case-insensitive contentType filter
        const ci = (v) => String(v || "").toLowerCase();
        const ebooksFiltered = content.filter((c) => ci(c.contentType) === "ebook");
        let videosFiltered = content.filter((c) => ci(c.contentType) === "video");
        const webresourcesFiltered = content.filter((c) => ci(c.contentType) === "webresources");
        const materialsFiltered = content.filter((c) => ci(c.contentType) === "pdf");

        // Filter videos based on role and utype
        // Admin: sees all (O and S) - will be separated in UI
        // Faculty/Instructor: sees only 'O' (Other) videos
        // Student: sees only 'S' (Student) videos - handled by backend but we double-check
        const currentRole = role || "";
        const roleUpper = currentRole.toUpperCase();

        if (roleUpper === "FACULTY" || roleUpper === "INSTRUCTOR") {
          videosFiltered = videosFiltered.filter((v) => {
            const utype = String(v.utype || "").toUpperCase();
            return utype === "O";
          });
          log("Faculty role: filtered videos to show only utype='O'", { count: videosFiltered.length });
        } else if (roleUpper === "STUDENT") {
          videosFiltered = videosFiltered.filter((v) => {
            const utype = String(v.utype || "").toUpperCase();
            return utype === "S";
          });
          log("Student role: filtered videos to show only utype='S'", { count: videosFiltered.length });
        } else if (roleUpper === "ADMIN") {
          log("Admin role: showing all videos (O and S)", { count: videosFiltered.length });
          // Admin sees all - no filtering
        }

        log("Content filtered by type", {
          ebooks: ebooksFiltered.length,
          videos: videosFiltered.length,
          webresources: webresourcesFiltered.length,
          materials: materialsFiltered.length,
          role: currentRole
        });

        setEBOOKS(ebooksFiltered);
        setVideos(videosFiltered);
        setwebresources(webresourcesFiltered);
        setMaterials(materialsFiltered);

        const cid = parseInt(courseId);
        const filteredLiveClasses = (allLiveClasses || []).filter((lc) => lc.examinationID === cid);
        log("Filtered live classes for course", { courseId: cid, totalClasses: allLiveClasses?.length, filteredCount: filteredLiveClasses.length });
        setLiveClasses(filteredLiveClasses);
      } catch (err) {
        console.error("[ICVP] Content bundle load failed", err);
      }
    })();

    return () => ac.abort();
  }, [courseId, userId]); // ⬅ now depends on userId too

  // Build unit tabs from rawContent (handles Title/title casing)
  useEffect(() => {
    log("Building unit tabs from rawContent", { rawContentLength: rawContent?.length });
    const toStr = (v) => (v == null ? "" : String(v).trim());

    // be liberal about keys coming from the API
    const getUnit = (it) => toStr(it.unit ?? it.Unit);
    const getTitle = (it) =>
      toStr(
        it.title ??
        it.Title ??
        it.unitTitle ??
        it.UnitTitle
      );

    const unitSet = new Set();
    const titleMap = {};

    for (const it of rawContent || []) {
      const u = getUnit(it);
      if (!u) continue;

      unitSet.add(u);

      const t = getTitle(it);
      if (t && !titleMap[u]) titleMap[u] = t;
    }

    if (unitSet.size > 0) {
      const byUnit = {};
      for (const it of rawContent || []) {
        const u = getUnit(it);
        if (!u) continue;
        (byUnit[u] ||= []).push(it);
      }
      for (const u of unitSet) {
        if (!titleMap[u]) {
          const firstWithTitle = (byUnit[u] || []).find((x) => getTitle(x));
          if (firstWithTitle) titleMap[u] = getTitle(firstWithTitle);
        }
      }
    }

    const num = (u) => {
      const m = /(\d+)$/.exec(u.replace(/\s+/g, ""));
      return m ? parseInt(m[1], 10) : 0;
    };
    const sortedUnits = Array.from(unitSet).sort((a, b) => num(a) - num(b));

    log("Unit tabs built", {
      totalUnits: sortedUnits.length,
      units: sortedUnits,
      titleMap,
      willSetActiveUnit: !activeUnit && sortedUnits.length > 0
    });

    setAllUnits(sortedUnits);
    setUnitTitleByUnit(titleMap);

    if (!activeUnit && sortedUnits.length > 0) {
      log("Setting initial active unit", { unit: sortedUnits[0] });
      setActiveUnit(sortedUnits[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContent]);

  const renderEmptyMessage = (label) => (
    <div className="text-muted text-center py-3">No {label} available.</div>
  );

  const filteredByUnit = (data) => {
    const filtered = data.filter((item) => item.unit?.trim() === activeUnit);
    log("Filtered data by unit", { activeUnit, beforeCount: data.length, afterCount: filtered.length });
    return filtered;
  };

  const filteredEbooks = filteredByUnit(ebooks);
  const filteredVideos = filteredByUnit(videos);
  const filteredWebResources = filteredByUnit(webresources);

  // For Admin: separate videos by utype
  const isAdmin = role?.toUpperCase() === "ADMIN";
  const studentVideos = isAdmin ? filteredVideos.filter(v => String(v.utype || "").toUpperCase() === "S") : [];
  const otherVideos = isAdmin ? filteredVideos.filter(v => String(v.utype || "").toUpperCase() === "O") : [];

  log("Content filtered for active unit", {
    activeUnit,
    ebooks: filteredEbooks.length,
    videos: filteredVideos.length,
    studentVideos: studentVideos.length,
    otherVideos: otherVideos.length,
    webresources: filteredWebResources.length,
    isAdmin
  });

  // Styles for Tabs
  const unitTabContainerStyle = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    padding: '8px 4px',
    marginBottom: '20px',
    alignItems: 'center'
  };

  const getUnitTabStyle = (isActive) => ({
    flex: '0 0 auto',
    padding: '8px 16px', // Compact padding
    borderRadius: '50px',
    border: isActive ? 'none' : '1px solid rgba(0,0,0,0.08)',
    background: isActive ? 'linear-gradient(135deg, #1f69b9 0%, #4a90e2 100%)' : 'rgba(255,255,255,0.7)',
    color: isActive ? '#fff' : '#555',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 3px 8px rgba(31, 105, 185, 0.25)' : '0 2px 4px rgba(0,0,0,0.03)',
    outline: 'none',
    fontSize: '0.8rem' // Creating a smaller/compact look
  });

  const getGradientForColor = (color) => {
    switch (color) {
      case 'success': return ['#28a745', '#218838'];
      case 'info': return ['#17a2b8', '#138496'];
      case 'warning': return ['#ffc107', '#e0a800'];
      case 'danger': return ['#dc3545', '#c82333'];
      default: return ['#1f69b9', '#4a90e2']; // primary
    }
  };

  // Helper function to render video sections
  const renderVideoSection = (title, key, data, color, icon) => {
    log(`Rendering video section: ${title}`, { itemCount: data.length, key });
    return (
      <div key={key} ref={key === "videos" ? sectionRefs.videos : null} className={`card shadow-sm mb-4 section-card animate-section border-${color}`}>
        <div className={`card-header bg-${color} text-white`}>
          <h6 className="mb-0">
            <i className={`${icon} me-2 mr-2`}></i>
            {title}
          </h6>
        </div>
        <div className="card-body">
          {data.length === 0 ? (
            renderEmptyMessage(title)
          ) : (
            <div className="row">
              {data.map((item, idx) => {
                const playableUrl = getPlayableVideoUrl(item);
                const idKey = item.id ?? item.contentId ?? item.examid ?? playableUrl ?? idx;
                const thisItemId = item.id ?? item.contentId ?? item.Id ?? item.ContentId;

                return (
                  <div className="col-md-6 col-lg-4 col-xl-3 mb-4" key={idKey}>
                    <div
                      className="card h-100 border-0"
                      style={{
                        borderRadius: "16px",
                        background: "linear-gradient(135deg, #eaf2fb, #ffffff)",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.5)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        position: 'relative'
                      }}
                    >
                      {/* Delete icon (only for non-students) */}
                      {role !== "Student" && (
                        <button
                          type="button"
                          className="delete-btn text-danger btn btn-link p-0"
                          title="Delete content"
                          onClick={(e) => handleDeleteContent(item, e)}
                          disabled={deletingId === thisItemId}
                          style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}
                        >
                          <i className="fa fa-trash" />
                        </button>
                      )}

                      <div className="card-body p-3 d-flex flex-column">
                        {item.utype && (
                          <span
                            className={`badge ${item.utype?.toUpperCase() === 'S' ? 'bg-success' : 'bg-info'} text-white mb-2 align-self-start`}
                            style={{ fontSize: "0.6rem", borderRadius: "10px", padding: "4px 8px" }}
                          >
                            {item.utype?.toUpperCase() === 'S' ? 'Student' : 'Faculty'}
                          </span>
                        )}

                        <p className="text-muted mb-1" style={{ fontSize: "0.80rem", lineHeight: "1.3" }}>
                          {item.title}
                        </p>
                        <h6 className="font-weight-bold flex-grow-1 mb-3" style={{ fontSize: "0.85rem", color: "#206aba" }}>
                          {item.description}
                        </h6>

                        <button
                          className="btn btn-sm btn-outline-info rounded-pill w-100 mt-auto"
                          style={{ fontSize: "0.8rem", fontWeight: "600" }}
                          onClick={() => handleWatchVideo(item)}
                        >
                          Watch Video
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Reusable styles for stats grid
  const statContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "3px",
    marginTop: "8px",
    marginBottom: "10px"
  };
  const statItemStyle = {
    background: "rgba(255, 255, 255, 0.5)",
    borderRadius: "6px",
    padding: "4px 2px",
    textAlign: "center",
    border: "1px solid rgba(0, 0, 0, 0.14)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    minHeight: "45px"
  };
  const statValStyle = { fontSize: "0.75rem", fontWeight: 700, color: "#2d3748", lineHeight: "1.1", marginBottom: "1px" };
  const statLblStyle = { fontSize: "0.55rem", fontWeight: 600, color: "#718096", textTransform: "uppercase", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

  return (
    <div
      id="main_content"
      className="font-muli theme-blush"
      onContextMenu={(e) => e.preventDefault()}
      onSelectStart={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
    >

      <HeaderTop />
      <RightSidebar />
      <LeftSidebar role="Instructor" />

      <div className="section-wrapper">
        <div className="page admin-dashboard pt-0">
          <div className="section-body mt-3 pt-0">
            <div className="container-fluid">
              <div className="jumbotron bg-light rounded shadow-sm mb-3 welcome-card dashboard-hero">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div style={{ width: "80px" }}></div>
                  <h2 className="page-title text-primary pt-0 dashboard-hero-title">View Course Content</h2>
                  <a href="/my-courseware" className="btn btn-outline-primary mt-3 mt-md-0">
                    <i className="fa fa-arrow-left mr-1"></i> Back
                  </a>
                </div>
                <h5 className="text-muted mb-0 mt-0 dashboard-hero-sub">
                  <strong>{`${batchName} - ${className} - ${courseCode} - ${courseName} `}</strong>
                </h5>
              </div>
            </div>

            {/* Unit Tabs */}
            <div style={unitTabContainerStyle}>
              {allUnits.map((unit) => {
                const titleForUnit = unitTitleByUnit[unit] || "No title found";

                return (
                  <button
                    key={unit}
                    style={getUnitTabStyle(activeUnit === unit)}
                    onClick={() => {
                      log("Unit tab clicked", { from: activeUnit, to: unit });
                      setActiveUnit(unit);
                    }}
                    title={`${titleForUnit}`}
                  >
                    {unit}
                  </button>
                );
              })}

              <Link
                to="/discussionforum"
                state={{
                  examinationId: parseInt(courseId),
                  unitId: activeUnit ? Number(activeUnit.split("-")[1]) : null,
                }}
              >
                <button style={getUnitTabStyle(false)}>Discussion Forum</button>
              </Link>

              <Link to="/recorded-classes">
                <button style={getUnitTabStyle(false)}>Recorded classes</button>
              </Link>
            </div>

            {activeUnit && (
              <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                <h5 className="mb-0">
                  <i className="fa fa-book text-primary me-2 mr-2"></i> Chapter Title:{" "}
                  {unitTitleByUnit[activeUnit] || "No title found"}
                </h5>
                {role !== "Student" && (
                  <Link
                    to="/add-objective-subjective-assignment"
                    state={{
                      unitId: activeUnit,
                      batchName,
                      semester,
                      courseCode,
                      courseName,
                      examinationID: examId,
                    }}
                  >
                    <button className="btn btn-outline-primary">
                      <i className="fa fa-plus me-1"></i> Add Practice Test
                    </button>
                  </Link>
                )}
              </div>
            )}

            {/* Section Mapping */}
            {isAdmin ? (
              <>
                {renderVideoSection("Student Videos", "student-videos", studentVideos, "success", "fas fa-graduation-cap")}
                {renderVideoSection("Faculty Videos", "other-videos", otherVideos, "info", "fas fa-chalkboard-teacher")}
              </>
            ) : (
              renderVideoSection("Videos", "videos", filteredVideos, "info", "fas fa-video")
            )}

            {/* EBOOK and Web Resources - same for all roles */}
            {[
              { title: "EBOOK Materials", key: "ebooks", data: filteredEbooks, ref: sectionRefs.ebooks, color: "primary", icon: "fas fa-file-pdf" },
              { title: "Web Resources Materials", key: "webresources", data: filteredWebResources, ref: sectionRefs.webresources, color: "primary", icon: "fas fa-file-pdf" },
            ].map((section, idx) => {
              log(`Rendering section: ${section.title}`, { itemCount: section.data.length, key: section.key });
              return (
                <div key={section.key} ref={section.ref} className={`card shadow-sm mb-4 section-card animate-section border-${section.color}`}>
                  <div className={`card-header bg-${section.color} text-white`}>
                    <h6 className="mb-0">
                      <i className={`${section.icon} me-2 mr-2`}></i>
                      {section.title}
                    </h6>
                  </div>
                  <div className="card-body">
                    {section.data.length === 0 ? (
                      renderEmptyMessage(section.title)
                    ) : (
                      <div className="row">
                        {section.data.map((item, idx2) => {
                          const playableUrl =
                            section.key === "videos"
                              ? getPlayableVideoUrl(item)
                              : toAbsoluteLocal(apiOrigin, item.fileUrl);

                          const idKey =
                            item.id ?? item.contentId ?? item.examid ?? playableUrl ?? idx2;
                          const thisItemId = (item.id ?? item.contentId ?? item.Id ?? item.ContentId);

                          return (
                            <div className="col-md-6 col-lg-4 col-xl-3 mb-4" key={idKey}>
                              <div
                                className="card h-100 border-0"
                                style={{
                                  borderRadius: "16px",
                                  background: "linear-gradient(135deg, #eaf2fb, #ffffff)",
                                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.5)",
                                  backdropFilter: "blur(16px)",
                                  WebkitBackdropFilter: "blur(16px)",
                                  position: 'relative'
                                }}
                              >
                                {role !== "Student" && (
                                  <button
                                    type="button"
                                    className="delete-btn text-danger btn btn-link p-0"
                                    title="Delete content"
                                    onClick={(e) => handleDeleteContent(item, e)}
                                    disabled={deletingId === thisItemId}
                                    style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}
                                  >
                                    <i className="fa fa-trash" aria-hidden="true"></i>
                                  </button>
                                )}

                                <div className="card-body p-3 d-flex flex-column">
                                  <h6 className="font-weight-bold text-dark mb-1" style={{ fontSize: "0.95rem" }}>{item.title}</h6>
                                  <p className="text-muted flex-grow-1 mb-3" style={{ fontSize: "0.75rem" }}>{item.description}</p>

                                  {section.key === "videos" ? (
                                    <button
                                      className="btn btn-sm btn-outline-info rounded-pill w-100 mt-auto"
                                      onClick={() => handleWatchVideo(item)}
                                    >
                                      Watch Video
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-sm btn-outline-primary rounded-pill w-100 mt-auto"
                                      onClick={() => handleViewFile(item.fileUrl)}
                                    >
                                      View File
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {role === "Student" ? (
            <div className="card shadow-sm mb-5 section-card animate-section border-info">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">
                  <i className="fa fa-tools me-2 mr-2"></i> Student Practice Exams
                </h6>
              </div>

              <div className="card-body">
                {practiceExams.length === 0 ? (
                  <div className="text-muted text-center py-3">No practice exams available.</div>
                ) : (
                  <div className="row">
                    {practiceExams.map((exam) => {
                      const isSubjective = exam.examType?.toUpperCase() === "DP";
                      const isAttendStatus = exam.examStatus?.toLowerCase() === "attendexam";
                      const isMCQ = exam.examType === "MP";

                      return (
                        <div className="col-md-6 col-lg-4 col-xl-3 mb-4" key={exam.examid}>
                          <div
                            className="card h-100 border-0"
                            style={{
                              borderRadius: "16px",
                              background: "linear-gradient(135deg, #eaf2fb, #ffffff)",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.5)",
                              backdropFilter: "blur(16px)",
                              WebkitBackdropFilter: "blur(16px)",
                            }}
                          >
                            <div className="card-body p-3 d-flex flex-column">
                              <h6 className="font-weight-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: "0.9rem" }}>
                                <i className="fa fa-book text-primary"></i> {exam.title}
                              </h6>

                              {/* Compact Stats Grid */}
                              <div style={statContainerStyle}>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{new Date(exam.createdAt).toLocaleDateString()}</div>
                                  <div style={statLblStyle}>Created</div>
                                </div>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{exam.durationMinutes} min</div>
                                  <div style={statLblStyle}>Duration</div>
                                </div>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{exam.totmrk} / {exam.passmrk}</div>
                                  <div style={statLblStyle}>Marks / Pass</div>
                                </div>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{exam.unitId}</div>
                                  <div style={statLblStyle}>Unit</div>
                                </div>
                              </div>

                              {exam.fileurl ? (
                                <a
                                  href={toAbsoluteLocal(apiOrigin, exam.fileurl)}
                                  className="btn btn-sm btn-outline-primary rounded-pill w-100 mt-2"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  📄 View Attachment
                                </a>
                              ) : !isMCQ ? (
                                <button className="btn btn-sm btn-outline-secondary rounded-pill w-100 mt-2" disabled>
                                  🚫 No Attachment
                                </button>
                              ) : null}

                              {isMCQ && isAttendStatus && (
                                <Link to={`/practice-exam/${exam.examid}`} state={{ exam }} className="mt-2 w-100">
                                  <button className="btn btn-sm btn-success rounded-pill w-100">📝 Attend Exam</button>
                                </Link>
                              )}

                              {isSubjective && isAttendStatus && (
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f && userId) submitSubjectivePracticeExam(exam.examid, userId, f);
                                  }}
                                  className="form-control form-control-sm mt-2"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (

            <div className="card shadow-sm mb-5 section-card animate-section border-info">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">
                  <i className="fa fa-tools me-2 mr-2"></i> View Practice Tests
                </h6>
              </div>

              <div className="card-body">
                {adminPracticeTests.length === 0 ? (
                  <div className="text-muted text-center py-3">No practice test records found.</div>
                ) : (
                  <div className="row">
                    {adminPracticeTests.map((test) => {
                      const isObjective = (test.PracticeExamType || "").toLowerCase() === "objective";
                      const isSubjective = (test.PracticeExamType || "").toLowerCase() === "subjective";

                      const typeBadge = isObjective ? (
                        <span className="badge bg-primary px-2 py-1 rounded-pill" style={{ fontSize: "0.6rem" }}>Objective</span>
                      ) : isSubjective ? (
                        <span className="badge bg-warning text-dark px-2 py-1 rounded-pill" style={{ fontSize: "0.6rem" }}>Subjective</span>
                      ) : (
                        <span className="badge bg-secondary px-2 py-1 rounded-pill" style={{ fontSize: "0.6rem" }}>{test.PracticeExamType}</span>
                      );

                      return (
                        <div className="col-md-6 col-lg-4 col-xl-3 mb-4" key={test.examid}>
                          <div
                            className="card h-100 border-0"
                            style={{
                              borderRadius: "16px",
                              background: "linear-gradient(135deg, #eaf2fb, #ffffff)",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.5)",
                              backdropFilter: "blur(16px)",
                              WebkitBackdropFilter: "blur(16px)",
                            }}
                          >
                            <div className="card-body p-3 d-flex flex-column">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: "0.9rem" }}>
                                  <i className="fa fa-book text-primary"></i> {test.AssignmentTitle}
                                </h6>
                                {typeBadge}
                              </div>

                              <div style={statContainerStyle}>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{test.pname}</div>
                                  <div style={statLblStyle}>User</div>
                                </div>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{test.Duration} min</div>
                                  <div style={statLblStyle}>Duration</div>
                                </div>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{test.totmrk} / {test.passmrk}</div>
                                  <div style={statLblStyle}>Marks/Pass</div>
                                </div>
                                <div style={statItemStyle}>
                                  <div style={statValStyle}>{test.attempted ? "Yes" : "No"}</div>
                                  <div style={statLblStyle}>Attempted</div>
                                </div>
                              </div>

                              <div className="mt-2 text-center">
                                <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>
                                  {new Date(test.StartDate).toLocaleDateString()} - {new Date(test.EndDate).toLocaleDateString()}
                                </small>
                              </div>

                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          )}

        </div>
      </div>

      {/* VIDEO MODAL */}
      <Modal
        show={showVideoModal}
        onHide={handleCloseVideo}
        centered
        size="lg"
        onContextMenu={(e) => e.preventDefault()}
        onSelectStart={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <Modal.Header closeButton onContextMenu={(e) => e.preventDefault()}>
          <Modal.Title>Video Playback</Modal.Title>
        </Modal.Header>
        <Modal.Body
          onContextMenu={(e) => e.preventDefault()}
          onSelectStart={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
        >
          <div className="relative-wrap">
            {/* If Vimeo/YouTube URL -> iframe; else HTML5 video */}
            {isVimeoUrl || isYouTubeUrl ? (
              <>
                <div className="video-wrapper">
                  <iframe
                    src={videoUrl}
                    title="Video player"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin"
                    onLoad={() => log("Iframe loaded for external video", { videoUrl })}
                  />
                </div>

                {/* Watermark overlay */}
                <div className="wm-overlay" aria-hidden="true" onContextMenu={(e) => e.preventDefault()}>
                  {/* Animated main watermark */}
                  <div ref={wmVideoRef} className="wm-chip" onContextMenu={(e) => e.preventDefault()}>
                    {displayText}
                  </div>
                </div>

                <div className="text-muted mt-2" style={{ fontSize: "0.9rem" }}>
                  Playing external video via iframe. Progress tracking is not available for iframes here.
                </div>
              </>
            ) : (
              <>
                <div className="video-wrapper">
                  <video
                    controls
                    controlsList="nodownload"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    onTimeUpdate={(e) => {
                      const video = e.target;
                      if (video.duration > 0) {
                        const percent = Math.round((video.currentTime / video.duration) * 100);
                        const storedProgress = parseInt(localStorage.getItem(`video-progress-${videoUrl}`)) || 0;
                        const updatedProgress = Math.max(percent, storedProgress);
                        setCurrentVideoProgress(updatedProgress);
                        localStorage.setItem(`video-progress-${videoUrl}`, updatedProgress);
                        const bucket = Math.floor(updatedProgress / 10) * 10;
                        if (bucket !== lastLoggedVideoPct.current) {
                          lastLoggedVideoPct.current = bucket;
                          log("Video progress updated", { percent, storedProgress, updatedProgress, key: `video-progress-${videoUrl}` });
                        }
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const video = e.target;
                      const percent = parseInt(localStorage.getItem(`video-progress-${videoUrl}`)) || 0;
                      if (video.duration > 0 && percent > 0) {
                        video.currentTime = (percent / 100) * video.duration;
                        log("Seek video to stored position", { percent, seekTo: video.currentTime });
                      } else {
                        log("No stored position; start from 0");
                      }
                    }}
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support HTML5 video.
                  </video>

                  {/* Watermark overlay */}
                  <div className="wm-overlay" aria-hidden="true" onContextMenu={(e) => e.preventDefault()}>
                    {/* Animated main watermark */}
                    <div ref={wmVideoRef} className="wm-chip" onContextMenu={(e) => e.preventDefault()}>
                      {displayText}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* FILE MODAL */}
      <Modal
        show={showFileModal}
        onHide={handleCloseFile}
        centered
        size="lg"
        onContextMenu={(e) => e.preventDefault()}
        onSelectStart={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <Modal.Header closeButton onContextMenu={(e) => e.preventDefault()}>
          <Modal.Title>View PDF</Modal.Title>
        </Modal.Header>
        <Modal.Body
          onContextMenu={(e) => e.preventDefault()}
          onSelectStart={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
        >
          <div className="relative-wrap">
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                log("PDF loaded", { numPages, fileUrl });
              }}
              onLoadError={(err) => error("PDF load error", err)}
            >
              <Page pageNumber={pageNumber} width={600} onContextMenu={(e) => e.preventDefault()} />
            </Document>

            {/* Watermark overlay */}
            <div className="wm-overlay" aria-hidden="true" onContextMenu={(e) => e.preventDefault()}>
              {/* Animated main watermark */}
              <div ref={wmPdfRef} className="wm-chip" onContextMenu={(e) => e.preventDefault()}>
                {displayText}
              </div>
            </div>
          </div>

          {numPages && (
            <div className="d-flex justify-content-between mt-3">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pageNumber <= 1}
                onClick={() => handlePageChange(pageNumber - 1)}
              >
                Prev
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={pageNumber >= numPages}
                onClick={() => handlePageChange(pageNumber + 1)}
              >
                Next
              </button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Footer />
    </div>
  );
}

export default InstructorCourseViewPage;
