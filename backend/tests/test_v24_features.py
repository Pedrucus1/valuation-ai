"""
Test PropValu v2.4 Features:
- Landing page loading
- Valuation form navigation
- Dashboard charts for comparables vs subject
- API health endpoint
- Report generator with new amenity (Parques)
- Report generator with updated disclaimer text
- Land use visible only in valuer mode
- Footer differentiated for valuer vs public mode
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestHealthEndpoint:
    """Test API health endpoint"""
    
    def test_health_returns_healthy(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ API /api/health returns healthy")


class TestValuationAPI:
    """Test valuation CRUD operations"""
    
    def test_create_valuation_public_mode(self):
        """Create valuation in public mode (no auth)"""
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "bedrooms": 3,
            "bathrooms": 2.5,
            "estimated_age": 10
        }
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "valuation_id" in data
        assert data["mode"] == "public"
        assert data["property_data"]["state"] == "Jalisco"
        print(f"✅ Created valuation {data['valuation_id']} in public mode")
        return data["valuation_id"]
    
    def test_generate_comparables(self):
        """Test comparables generation"""
        # First create a valuation
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        # Generate comparables
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        assert response.status_code == 200
        data = response.json()
        assert "comparables" in data
        assert data["count"] >= 10  # Should generate 10-15 comparables
        print(f"✅ Generated {data['count']} comparables")
        
    def test_calculate_valuation(self):
        """Test valuation calculation"""
        # Create and generate comparables
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "estimated_age": 10,
            "conservation_state": "Bueno"
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        
        # Calculate
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        assert response.status_code == 200
        data = response.json()
        assert "estimated_value" in data
        assert data["estimated_value"] > 0
        assert "market_metrics" in data
        print(f"✅ Calculated value: ${data['estimated_value']:,.0f}")


class TestReportGenerator:
    """Test report generation with new features"""
    
    def test_report_has_parques_amenity(self):
        """Report should include 'Parques y espacios deportivos' amenity"""
        # Create, generate, calculate
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "estimated_age": 10
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        # Generate report
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        assert response.status_code == 200
        data = response.json()
        report_html = data.get("report_html", "")
        
        # Check for Parques amenity
        assert "Parques" in report_html, "Report should contain Parques amenity"
        assert "🌳" in report_html, "Report should contain park emoji icon"
        print("✅ Report contains 'Parques' amenity with icon")
        
    def test_report_has_updated_disclaimer(self):
        """Report should have updated disclaimer with legal info"""
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        assert response.status_code == 200
        report_html = response.json().get("report_html", "")
        
        # Check disclaimer content
        assert "AVISO LEGAL" in report_html, "Report should have 'AVISO LEGAL' section"
        assert "CNBV" in report_html or "SHF" in report_html, "Report should mention CNBV/SHF methodology"
        assert "estimación orientativa" in report_html, "Report should mention it's an orientative estimate"
        print("✅ Report has updated disclaimer with legal info")
        
    def test_report_value_breakdown_title(self):
        """Report should have 'DESGLOSE DE VALOR FÍSICO' title with Ross-Heidecke mention"""
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "estimated_age": 10
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        report_html = response.json().get("report_html", "")
        
        assert "DESGLOSE DE VALOR FÍSICO" in report_html, "Report should have 'DESGLOSE DE VALOR FÍSICO' title"
        assert "Ross-Heidecke" in report_html, "Report should mention Ross-Heidecke method"
        print("✅ Report has correct value breakdown title with Ross-Heidecke mention")
        
    def test_report_public_mode_footer(self):
        """Public mode report should have appropriate footer (no valuador verification)"""
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        report_html = response.json().get("report_html", "")
        
        # Public mode should mention automatic generation
        assert "sin verificación" in report_html.lower() or "automáticamente" in report_html.lower()
        print("✅ Public mode footer correctly indicates automatic generation")
        
    def test_report_2km_radius_note_only_valuer_mode(self):
        """Amenities 2km radius note should only appear in valuer mode"""
        # Public mode - no auth
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        report_html = response.json().get("report_html", "")
        
        # In public mode, 2km radius note should NOT appear
        assert "2 km" not in report_html, "Public mode should not show 2km radius note"
        print("✅ Public mode correctly hides 2km radius note")


class TestLandUseVisibility:
    """Test land use section visibility in different modes"""
    
    def test_land_use_hidden_in_public_mode(self):
        """Land use section should NOT be visible in public mode report"""
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "H2-V"  # Even if provided, should not show in public mode
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        report_html = response.json().get("report_html", "")
        
        # Public mode should NOT have USO DE SUELO section
        assert "USO DE SUELO" not in report_html, "Public mode report should NOT show 'USO DE SUELO' section"
        print("✅ Land use section correctly hidden in public mode")


class TestPropertyTypes:
    """Test property types endpoint"""
    
    def test_get_property_types(self):
        """Should return list of property types"""
        response = requests.get(f"{BASE_URL}/api/property-types")
        assert response.status_code == 200
        data = response.json()
        assert "property_types" in data
        assert "Casa" in data["property_types"]
        assert "Departamento" in data["property_types"]
        assert "Terreno" in data["property_types"]
        print(f"✅ Property types: {data['property_types']}")


class TestStatsEndpoint:
    """Test stats endpoint"""
    
    def test_get_stats(self):
        """Should return platform statistics"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_valuations" in data
        assert "completed_valuations" in data
        assert "total_users" in data
        print(f"✅ Stats: {data['total_valuations']} total, {data['completed_valuations']} completed")


class TestDashboardDataStructure:
    """Test data structure for dashboard charts"""
    
    def test_valuation_has_comparables_for_charts(self):
        """Completed valuation should have comparables with price_per_sqm for charts"""
        # Create full valuation
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 180,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        create_resp = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = create_resp.json()["valuation_id"]
        
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        
        # Get valuation
        response = requests.get(f"{BASE_URL}/api/valuations/{valuation_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Check comparables have required fields for charts
        assert "comparables" in data
        assert len(data["comparables"]) > 0
        
        for comp in data["comparables"]:
            assert "price_per_sqm" in comp, "Comparable should have price_per_sqm for chart"
            assert "price" in comp, "Comparable should have price for chart"
        
        # Check result has required fields
        assert "result" in data
        assert "price_per_sqm" in data["result"], "Result should have price_per_sqm for chart"
        assert "estimated_value" in data["result"], "Result should have estimated_value for chart"
        
        print("✅ Valuation has all required fields for dashboard charts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
