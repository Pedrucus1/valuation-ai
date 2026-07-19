/* secuenciasGif.js — exporta las 3 secuencias del reproductor Just Listed como
   un GIF animado real, con ken-burns (zoom) + crossfade entre secuencias.

   Requiere que el overlay de Secuencias esté abierto (lee del DOM el nodo
   #jl-seq-board y sus hijos [data-seq="0|1|2"]). Sin dependencias de worker:
   html2canvas (ya instalado) para capturar cada secuencia + gifenc para encodear.
*/
import html2canvas from "html2canvas";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const SRC_W = 1080, SRC_H = 1920;          // tamaño nativo de cada secuencia
const OUT_W = 480, OUT_H = 854;            // salida (9:16, ligero para redes)
const FPS = 10, SEQ_MS = 2400, XFADE_MS = 500, KB = 0.10; // zoom 0→10%

// Captura las 3 secuencias como imágenes a tamaño nativo (clonando el board,
// mostrando una secuencia a la vez y congelando la animación).
async function capturarSecuencias() {
  const board = document.getElementById("jl-seq-board");
  if (!board) throw new Error("Abre las Secuencias antes de exportar.");
  const imgs = [];
  for (let i = 0; i < 3; i++) {
    const clone = board.cloneNode(true);
    clone.id = "";
    Object.assign(clone.style, {
      transform: "none", position: "fixed", left: "-20000px", top: "0",
      borderRadius: "0", boxShadow: "none", width: SRC_W + "px", height: SRC_H + "px",
    });
    clone.querySelectorAll("[data-export-hide]").forEach((el) => el.remove());
    clone.querySelectorAll("[data-seq]").forEach((el) => {
      const on = el.getAttribute("data-seq") === String(i);
      el.style.opacity = on ? "1" : "0";
      el.style.display = on ? "block" : "none";
    });
    clone.querySelectorAll("img").forEach((im) => { im.style.animation = "none"; im.style.transform = "none"; });
    document.body.appendChild(clone);
    let canvas;
    try {
      canvas = await html2canvas(clone, { useCORS: true, backgroundColor: null, width: SRC_W, height: SRC_H, scale: 1, logging: false });
    } finally {
      document.body.removeChild(clone);
    }
    const img = new Image();
    img.src = canvas.toDataURL("image/png");
    await (img.decode ? img.decode().catch(() => {}) : Promise.resolve());
    imgs.push(img);
  }
  return imgs;
}

const drawCover = (ctx, img, s, alpha) => {
  ctx.globalAlpha = alpha;
  const w = OUT_W * s, h = OUT_H * s;
  ctx.drawImage(img, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h);
  ctx.globalAlpha = 1;
};

// Exporta las 3 secuencias como imágenes JPG (una por slide).
export async function exportSecuenciasJpg({ nombre = "propiedad" } = {}) {
  const imgs = await capturarSecuencias();
  imgs.forEach((img, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = SRC_W; canvas.height = SRC_H;
    canvas.getContext("2d").drawImage(img, 0, 0, SRC_W, SRC_H);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.download = `Secuencia_${i + 1}_${String(nombre).replace(/\s+/g, "_").slice(0, 30)}.jpg`;
    a.click();
  });
}

// Exporta las 3 secuencias como VIDEO (WebM/MP4) vía canvas + MediaRecorder.
export async function exportSecuenciasVideo({ nombre = "propiedad", onProgress } = {}) {
  const imgs = await capturarSecuencias();
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W; canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  const fps = 25;
  const stream = canvas.captureStream(fps);
  const mime = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  rec.start();

  const totalMs = 3 * SEQ_MS;
  const t0 = performance.now();
  await new Promise((resolve) => {
    const draw = () => {
      const t = performance.now() - t0;
      if (t >= totalMs) return resolve();
      const si = Math.floor(t / SEQ_MS) % 3;
      const local = t - Math.floor(t / SEQ_MS) * SEQ_MS;
      const p = local / SEQ_MS;
      ctx.clearRect(0, 0, OUT_W, OUT_H);
      drawCover(ctx, imgs[si], 1 + KB * p, 1);
      if (local > SEQ_MS - XFADE_MS) drawCover(ctx, imgs[(si + 1) % 3], 1, (local - (SEQ_MS - XFADE_MS)) / XFADE_MS);
      if (onProgress) onProgress(Math.round((t / totalMs) * 100));
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });
  rec.stop();
  await done;

  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Secuencias_${String(nombre).replace(/\s+/g, "_").slice(0, 40)}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportSecuenciasGif({ nombre = "propiedad", onProgress } = {}) {
  const imgs = await capturarSecuencias();

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W; canvas.height = OUT_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const gif = GIFEncoder();
  const delay = Math.round(1000 / FPS);
  const total = Math.round((3 * SEQ_MS) / 1000 * FPS);

  for (let f = 0; f < total; f++) {
    const t = (f / FPS) * 1000;               // ms dentro del loop
    const si = Math.floor(t / SEQ_MS) % 3;     // secuencia actual
    const local = t - Math.floor(t / SEQ_MS) * SEQ_MS;
    const p = local / SEQ_MS;

    ctx.clearRect(0, 0, OUT_W, OUT_H);
    drawCover(ctx, imgs[si], 1 + KB * p, 1);   // ken-burns
    if (local > SEQ_MS - XFADE_MS) {           // crossfade a la siguiente
      const xf = (local - (SEQ_MS - XFADE_MS)) / XFADE_MS;
      drawCover(ctx, imgs[(si + 1) % 3], 1, xf);
    }

    const { data } = ctx.getImageData(0, 0, OUT_W, OUT_H);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, OUT_W, OUT_H, { palette, delay });

    if (onProgress) onProgress(Math.round(((f + 1) / total) * 100));
    if (f % 6 === 0) await new Promise((r) => setTimeout(r)); // no congelar UI
  }

  gif.finish();
  const blob = new Blob([gif.bytes()], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Secuencias_${String(nombre).replace(/\s+/g, "_").slice(0, 40)}.gif`;
  a.click();
  URL.revokeObjectURL(url);
}
