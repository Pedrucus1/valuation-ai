import os

file_path = "frontend/src/pages/LoginPage.jsx"
with open(file_path, "r", encoding="utf8") as f:
    content = f.read()

search_str = """                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading}"""

replace_str = """                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end mt-1 mb-2">
                    <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-[#52B788] hover:text-[#2D6A4F] font-medium transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <Button type="submit" disabled={isLoading}"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    with open(file_path, "w", encoding="utf8") as f:
        f.write(content)
    print("Success")
else:
    print("Not found")
