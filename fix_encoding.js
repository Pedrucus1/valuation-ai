const fs = require("fs");
const path = "frontend/src/pages/InmobiliariaDashboardPage.jsx";
let content = fs.readFileSync(path, "utf8");

// When text is read as CP1252 but it was actually UTF-8, and then written back as UTF-8,
// each byte of the original UTF-8 sequence becomes a separate character.
// To reverse this, we can encode the "corrupted" string back to bytes using latin1,
// then decode those bytes using utf8.
try {
    const buffer = Buffer.from(content, "latin1");
    content = buffer.toString("utf8");
    
    // Sometimes there are leftover fallback characters like '' if latin1 wasn't perfect.
    // Let's check if the decoding worked without errors.
    fs.writeFileSync(path, content, "utf8");
    console.log("Encoding restored!");
} catch (e) {
    console.error(e);
}
