const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Ruta a las credenciales que preparaste en el Módulo Drive IA
const CREDENTIALS_PATH = path.join(__dirname, '..', 'Modulo Drive IA', 'credentials.json');
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
];

class GoogleSheetsConnector {
    constructor() {
        this.auth = null;
    }

    /**
     * Autentica con Google usando el archivo de credenciales de la cuenta de servicio.
     */
    async authenticate() {
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error(`No se encontró el archivo de credenciales en: ${CREDENTIALS_PATH}`);
        }

        if (this.auth) return this.auth;
        
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: SCOPES,
        });
        this.auth = await auth.getClient();
        return this.auth;
    }

    /**
     * Obtiene los datos de una hoja de cálculo específica.
     * @param {string} spreadsheetId - El ID de la hoja de Google Sheets.
     * @param {string} range - El rango (ej: 'Hoja1!A1:Z100').
     */
    async getSpreadsheetData(spreadsheetId, range) {
        const auth = await this.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });
            return response.data.values;
        } catch (error) {
            console.error('Error obteniendo datos de Sheets:', error.message);
            throw error;
        }
    }

    /**
     * Lista las hojas de cálculo más recientes en Drive para ayudar a identificar el ID.
     */
    async listRecentSheets() {
        const auth = await this.authenticate();
        const drive = google.drive({ version: 'v3', auth });
        try {
            const response = await drive.files.list({
                q: "mimeType='application/vnd.google-apps.spreadsheet'",
                pageSize: 20,
                fields: 'files(id, name, modifiedTime)',
                orderBy: 'modifiedTime desc'
            });
            return response.data.files;
        } catch (error) {
            console.error('Error listando archivos de Drive:', error.message);
            throw error;
        }
    }
}

module.exports = new GoogleSheetsConnector();
