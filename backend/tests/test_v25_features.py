"""
Backend tests for PropValu v2.5 features
Tests the recent updates:
1. Green 'Ajustar coordenadas' button styling (verified in frontend code)
2. Tips with 'Inmobiliaria Profesional' instead of 'Asesor'
3. No 'Clínicas' in amenities
4. Equipment section title has 'Radio 2 km'
5. Disclaimer without 'bancaria'
6. Larger text (12pt base) and icons (28pt)
7. Taller map (200pt height)
8. Coordinates visible in report
9. 'Reporte de Valuación' with white text for contrast
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Test API health endpoint"""
    
    def test_health_returns_healthy(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health endpoint returns healthy")


class TestValuationAPI:
    """Test valuation API endpoints"""
    
    def test_get_existing_valuation(self):
        """Test fetching existing valuation"""
        valuation_id = "val_7348428e33a4"
        response = requests.get(f"{BASE_URL}/api/valuations/{valuation_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["valuation_id"] == valuation_id
        assert "property_data" in data
        assert "comparables" in data
        assert len(data["comparables"]) > 0
        print(f"✅ Valuation {valuation_id} fetched with {len(data['comparables'])} comparables")
    
    def test_get_nonexistent_valuation(self):
        """Test 404 for nonexistent valuation"""
        response = requests.get(f"{BASE_URL}/api/valuations/nonexistent_id")
        assert response.status_code == 404
        print("✅ Returns 404 for nonexistent valuation")


class TestReportGeneration:
    """Test report generation with v2.5 features"""
    
    def test_generate_report_returns_html(self):
        """Test report generation returns HTML"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        assert response.status_code == 200
        
        data = response.json()
        assert "report_html" in data
        assert len(data["report_html"]) > 1000
        print(f"✅ Report generated with {len(data['report_html'])} chars of HTML")
    
    def test_report_includes_inmobiliaria_profesional(self):
        """Test that tips include 'Inmobiliaria Profesional' instead of 'Asesor'"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        assert "Inmobiliaria Profesional" in html, "Tips should include 'Inmobiliaria Profesional'"
        print("✅ Report includes 'Inmobiliaria Profesional' in tips")
    
    def test_report_no_clinicas_in_amenities(self):
        """Test that 'Clínicas' is removed from amenities"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        assert "Clínicas" not in html, "Amenities should not include 'Clínicas'"
        print("✅ Report does not include 'Clínicas' in amenities")
    
    def test_report_has_radio_2km_in_equipment_title(self):
        """Test equipment section has 'Radio 2 km' in title"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        assert "Radio 2 km" in html, "Equipment section should have 'Radio 2 km' in title"
        print("✅ Report has 'Radio 2 km' in equipment section title")
    
    def test_report_disclaimer_no_bancaria(self):
        """Test disclaimer does not contain 'bancaria'"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"].lower()
        
        # Check that 'bancaria' is not in disclaimer context
        assert "validez legal o bancaria" not in html, "Disclaimer should not contain 'bancaria'"
        assert "validez bancaria" not in html, "Disclaimer should not contain 'bancaria'"
        print("✅ Report disclaimer does not contain 'bancaria'")
    
    def test_report_has_12pt_base_font(self):
        """Test report has 12pt base font size"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        assert "font-size: 12pt" in html, "Report should have 12pt base font"
        print("✅ Report has 12pt base font size")
    
    def test_report_has_28pt_icons(self):
        """Test report has 28pt icons"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        assert "28pt" in html, "Report should have 28pt icons"
        print("✅ Report has 28pt icons")
    
    def test_report_has_200pt_map_height(self):
        """Test report has 200pt map height"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        assert "height: 200pt" in html, "Report should have 200pt map height"
        print("✅ Report has 200pt map height")
    
    def test_report_shows_coordinates(self):
        """Test report shows coordinates"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        assert "Coordenadas:" in html, "Report should show coordinates"
        print("✅ Report shows coordinates")
    
    def test_report_has_white_title(self):
        """Test 'Reporte de Valuación' has white text for contrast"""
        valuation_id = "val_7348428e33a4"
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        data = response.json()
        html = data["report_html"]
        
        # The title should be styled with white color
        assert "Reporte de Valuación" in html, "Report should have 'Reporte de Valuación' title"
        assert "color: white" in html, "Title should have white color"
        print("✅ Report has 'Reporte de Valuación' with white text")


class TestStatsEndpoint:
    """Test stats endpoint"""
    
    def test_stats_returns_counts(self):
        """Test stats endpoint returns valuation counts"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_valuations" in data
        assert "completed_valuations" in data
        assert data["total_valuations"] >= 0
        print(f"✅ Stats: {data['total_valuations']} total valuations, {data['completed_valuations']} completed")


class TestPropertyTypes:
    """Test property types endpoint"""
    
    def test_property_types_returns_list(self):
        """Test property types endpoint returns list"""
        response = requests.get(f"{BASE_URL}/api/property-types")
        assert response.status_code == 200
        
        data = response.json()
        assert "property_types" in data
        assert isinstance(data["property_types"], list)
        assert len(data["property_types"]) > 0
        assert "Casa" in data["property_types"]
        print(f"✅ Property types: {data['property_types']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
