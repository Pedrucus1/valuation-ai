// Compress image to max 800x600 keeping aspect ratio, returns {dataUrl, isVertical}
export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_W = 800;
        const MAX_H = 600;
        const isVertical = img.height > img.width; // portrait (phone vertical)
        let { width, height } = img;

        // Rotate constraints for vertical photos
        const maxW = isVertical ? MAX_H : MAX_W;
        const maxH = isVertical ? MAX_W : MAX_H;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ dataUrl, isVertical });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};
