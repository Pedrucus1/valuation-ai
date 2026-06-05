import os

file_path = "frontend/src/pages/LoginPage.jsx"
with open(file_path, "r", encoding="utf8") as f:
    content = f.read()

target = """                  <Button type="submit" disabled={isLoading}
                    className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold py-2.5">
                    {isLoading ? "Ingresando..." : "Ingresar"}
                  </Button>"""

replacement = """                  <div className="flex justify-end mt-1 mb-2">
                    <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-[#52B788] hover:text-[#2D6A4F] font-medium transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <Button type="submit" disabled={isLoading}
                    className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold py-2.5">
                    {isLoading ? "Ingresando..." : "Ingresar"}
                  </Button>"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open(file_path, "w", encoding="utf8") as f:
        f.write(content)
    print("Success")
else:
    print("Target not found exactly.")
