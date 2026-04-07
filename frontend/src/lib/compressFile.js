/**
 * compressFile — comprime imágenes a <200 KB y valida PDFs a <1 MB.
 * Devuelve un File comprimido o lanza un Error con mensaje legible.
 */

const IMAGE_MAX_BYTES = 200 * 1024;       // 200 KB
const PDF_MAX_BYTES   = 1 * 1024 * 1024;  // 1 MB
const IMAGE_MAX_DIM   = 1920;             // px máx por lado

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > IMAGE_MAX_DIM || height > IMAGE_MAX_DIM) {
        const ratio = Math.min(IMAGE_MAX_DIM / width, IMAGE_MAX_DIM / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      const tryQuality = (q) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Error al comprimir imagen.")); return; }
          if (blob.size <= IMAGE_MAX_BYTES || q <= 0.25) {
            const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            resolve(new File([blob], name, { type: "image/jpeg" }));
          } else {
            tryQuality(Math.round((q - 0.1) * 10) / 10);
          }
        }, "image/jpeg", q);
      };

      tryQuality(0.85);
    };
    img.src = url;
  });
}

export async function compressFile(file) {
  if (!file) return file;

  const isPdf   = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");

  if (isPdf) {
    if (file.size > PDF_MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(`El PDF pesa ${mb} MB. Comprime el archivo a menos de 1 MB antes de subirlo.`);
    }
    return file;
  }

  if (isImage) {
    return await compressImage(file);
  }

  // Otros tipos — devolver sin cambios
  return file;
}
