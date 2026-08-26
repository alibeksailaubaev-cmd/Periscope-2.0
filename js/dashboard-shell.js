"use strict";

/**
 * Переключение разделов общего дэшборда (Качество мойки / Качество смывов /
 * Несоответствия). Один клик по левой панели — меняется видимая секция,
 * без перезагрузки страницы.
 */

const VIEW_STORAGE_KEY = "aitas_dashboard_view";
const VALID_VIEWS = ["washing", "swabs", "discrepancies"];

const dashViews = document.querySelectorAll(".view[data-view]");
const dashNavButtons = document.querySelectorAll("[data-view]");
const dashIncubatorGroup = document.querySelector('.nav-group[data-group="incubator"]');
const dashIncubatorHead = document.getElementById("incubatorGroupHead");

function setView(view) {
  if (!VALID_VIEWS.includes(view)) view = "washing";

  dashViews.forEach((v) => {
    v.hidden = v.dataset.view !== view;
  });

  dashNavButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  const inIncubatorGroup = view === "washing" || view === "swabs";
  dashIncubatorHead.classList.toggle("active", inIncubatorGroup);
  if (inIncubatorGroup) dashIncubatorGroup.classList.remove("collapsed");

  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (err) {
    /* ignore */
  }

  if (location.hash.slice(1) !== view) {
    history.replaceState(null, "", `#${view}`);
  }

  closeMasterSidebar();
}

dashNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

dashIncubatorHead.addEventListener("click", () => {
  dashIncubatorGroup.classList.toggle("collapsed");
});

function openMasterSidebar() {
  document.body.classList.add("master-sidebar-open");
}
function closeMasterSidebar() {
  document.body.classList.remove("master-sidebar-open");
}

document.querySelectorAll("[data-master-menu]").forEach((btn) => btn.addEventListener("click", openMasterSidebar));
document.getElementById("masterSidebarBackdrop")?.addEventListener("click", closeMasterSidebar);
document.getElementById("masterSidebarClose")?.addEventListener("click", closeMasterSidebar);

window.addEventListener("hashchange", () => setView(location.hash.slice(1)));

const initialView = location.hash.slice(1) || localStorage.getItem(VIEW_STORAGE_KEY) || "washing";
setView(initialView);
