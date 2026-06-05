const fs = require('fs');
const file = 'frontend/src/pages/LoginPage.jsx';
let content = fs.readFileSync(file, 'utf8');
const searchStr = `                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading}`;
const replaceStr = `                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-1 mb-2">
                    <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs text-[#52B788] hover:text-[#2D6A4F] font-medium transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <Button type="submit" disabled={isLoading}`;

// Try to normalize line endings for search
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedSearch = searchStr.replace(/\r\n/g, '\n');
const normalizedReplace = replaceStr.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedSearch)) {
    const newContent = normalizedContent.replace(normalizedSearch, normalizedReplace);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Success');
} else {
    console.log('Search string not found');
}
