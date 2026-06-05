const fs = require("fs");
const path = require("path");

const dir = "frontend/src/components/dashboard/tabs/";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".jsx"));

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, "utf8");
    try {
        if (content.includes("Ã")) {
            const buffer = Buffer.from(content, "latin1");
            content = buffer.toString("utf8");
            fs.writeFileSync(fullPath, content, "utf8");
            console.log(`Encoding restored for ${file}`);
        }
    } catch (e) {
        console.error(e);
    }
}
