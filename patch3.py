import os
import re

file_path = "frontend/src/pages/LoginPage.jsx"
with open(file_path, "r", encoding="utf8") as f:
    content = f.read()

pattern = r"(<Button type=\"submit\" disabled=\{isLoading\}\s+className=\"w-full bg-\[#1B4332\] hover:bg-\[#2D6A4F\] text-white font-semibold py-2\.5\">)"
replacement = r"""<div className="flex justify-end mt-1 mb-2">
                    <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-[#52B788] hover:text-[#2D6A4F] font-medium transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  \1"""

content, count = re.subn(pattern, replacement, content, count=1)

if count > 0:
    with open(file_path, "w", encoding="utf8") as f:
        f.write(content)
    print("Success")
else:
    print("Not found via regex")
