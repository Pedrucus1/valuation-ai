import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Descarga el reporte (HTML string) como PDF tamaño carta, SIN abrir el diálogo
 * de impresión. Renderiza el HTML en un iframe oculto y captura cada `.page`.
 *
 * Nota: si el reporte trae imágenes de otro dominio sin CORS (ej. mapa estático),
 * html2canvas puede fallar en esa página; por eso se captura página por página
 * y se usa useCORS. Devuelve true si descargó, false si algo falló.
 */
export async function downloadReportPdf(reportHtml, fileName = "Reporte PropValu") {
  if (!reportHtml) return false;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";  // ancho A4 @ 96dpi (210mm) — el reporte está diseñado en A4
  iframe.style.height = "1123px"; // alto A4 @ 96dpi (297mm)
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(reportHtml);
    doc.close();

    // Esperar carga + fuentes/imágenes
    await new Promise((res) => { iframe.onload = res; setTimeout(res, 900); });
    await new Promise((res) => setTimeout(res, 500));

    const pages = doc.querySelectorAll(".page");
    const targets = pages.length ? Array.from(pages) : [doc.body];

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    let added = 0;
    for (let i = 0; i < targets.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const canvas = await html2canvas(targets[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      if (!canvas.width || !canvas.height) continue; // página vacía → no la agregamos
      const img = canvas.toDataURL("image/jpeg", 0.92);
      // Ajustar a la hoja carta SIN cortar: llena el ancho; si queda más alto que la
      // página, se escala para caber completo (centrado horizontalmente).
      let w = pw;
      let h = (canvas.height * pw) / canvas.width;
      if (h > ph) { h = ph; w = (canvas.width * ph) / canvas.height; }
      const x = (pw - w) / 2;
      if (added > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", x, 0, w, h);
      added++;
    }
    if (added === 0) return false;

    pdf.save(`${fileName}.pdf`);
    return true;
  } catch (e) {
    console.error("downloadReportPdf falló:", e);
    return false;
  } finally {
    document.body.removeChild(iframe);
  }
}
