"use strict";

/**
 * Общие элементы бренда aitas ukpf: декоративная полоса иконок слева.
 * Используется на всех дашбордах (discrepancies.html, washing.html).
 */

const BRAND_ICONS = [
  // птица
  '<path d="M4 14c2-4 6-6 10-5 3 .7 5 3 6 6-1.5.6-3 .6-4.5 0" /><circle cx="17" cy="8" r="1" /><path d="M4 14c-1 1-1.5 2.5-1 4" />',
  // капля
  '<path d="M13 3c3 4 6 8 6 12a6 6 0 1 1-12 0c0-4 3-8 6-12z" />',
  // волна
  '<path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />',
  // лист
  '<path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z" /><path d="M5 19c2-4 5-7 9-9" />',
  // цветок
  '<circle cx="13" cy="13" r="2.4" /><circle cx="13" cy="6" r="2.4" /><circle cx="13" cy="20" r="2.4" /><circle cx="6" cy="13" r="2.4" /><circle cx="20" cy="13" r="2.4" />',
  // спираль
  '<path d="M13 13a3 3 0 1 1 3-3 5 5 0 1 1-5-5 7 7 0 1 1-7 7" />',
  // солнце
  '<circle cx="13" cy="13" r="4" /><path d="M13 4v2M13 20v2M4 13h2M20 13h2M6.5 6.5l1.4 1.4M19 19l-1.4-1.4M19.5 6.5l-1.4 1.4M7 19l-1.4-1.4" />',
  // птенец / гнездо
  '<path d="M5 17c3-6 15-6 18 0" /><circle cx="14" cy="9" r="3" /><path d="M14 6V4" />',
  // орнамент-ромб
  '<path d="M13 4l9 9-9 9-9-9z" /><circle cx="13" cy="13" r="2.4" />',
  // облако / гора
  '<path d="M4 20l6-8 4 5 3-4 6 7z" />',
];

function initBrandStrip() {
  const strip = document.getElementById("brandStrip");
  if (!strip) return;

  const cellSize = 52;

  function fill() {
    const needed = Math.ceil(window.innerHeight / cellSize) + 1;
    const current = strip.children.length;
    if (current === needed) return;

    strip.innerHTML = "";
    for (let i = 0; i < needed; i++) {
      const cell = document.createElement("div");
      cell.className = "cell" + (i % 2 === 1 ? " alt" : "");
      const icon = BRAND_ICONS[i % BRAND_ICONS.length];
      cell.innerHTML = `<svg viewBox="0 0 26 26">${icon}</svg>`;
      strip.appendChild(cell);
    }
  }

  fill();
  window.addEventListener("resize", fill);
}

function initTopnavActive() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".topnav-tabs a").forEach((a) => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === path);
  });
}

initBrandStrip();
initTopnavActive();
