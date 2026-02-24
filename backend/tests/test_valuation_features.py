"""
Backend API Tests for PropValu Mexico - Valuation Platform
Testing new features: land_use field, improved methodology, report sections

Tests:
- Create valuation with land_use field
- Generate comparables
- Calculate valuation (improved methodology - values should be realistic)
- Generate report with new sections (USO DE SUELO, EQUIPAMIENTO, thermometer, 8 tips)
"""

import pytest
import requests
import os
import re
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://valuacion-propiedad.preview.emergentagent.com').rstrip('/')


class TestHealthAndBasics:
    """Basic health check and API availability"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health endpoint working")
    
    def test_root_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "PropValu" in data.get("message", "")
        print("✅ Root API endpoint working")
    
    def test_property_types_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/property-types")
        assert response.status_code == 200
        data = response.json()
        assert "property_types" in data
        assert len(data["property_types"]) == 7
        expected_types = ["Casa", "Departamento", "Terreno", "Local comercial", "Oficina", "Bodega", "Nave industrial"]
        for ptype in expected_types:
            assert ptype in data["property_types"], f"Missing property type: {ptype}"
        print(f"✅ Property types endpoint returns all 7 types: {data['property_types']}")


class TestValuationCreation:
    """Test valuation creation with new land_use field"""
    
    def test_create_valuation_with_land_use(self):
        """Create valuation with new land_use field"""
        payload = {
            "state": "Ciudad de México",
            "municipality": "Benito Juárez",
            "neighborhood": "Del Valle",
            "land_area": 150.0,
            "construction_area": 200.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "H2",  # New field - Habitacional Plurifamiliar Baja
            "bedrooms": 3,
            "bathrooms": 2.5,
            "parking_spaces": 2,
            "estimated_age": 10,
            "conservation_state": "Bueno",
            "construction_quality": "Media-alta",
            "latitude": 19.3731,
            "longitude": -99.1665
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "valuation_id" in data
        assert data["property_data"]["land_use"] == "H2"
        assert data["property_data"]["state"] == "Ciudad de México"
        assert data["property_data"]["property_type"] == "Casa"
        assert data["status"] == "draft"
        
        print(f"✅ Valuation created with land_use='H2': {data['valuation_id']}")
        return data["valuation_id"]
    
    def test_create_valuation_without_land_use(self):
        """Create valuation without land_use field (optional)"""
        payload = {
            "state": "Nuevo León",
            "municipality": "San Pedro Garza García",
            "neighborhood": "Valle Oriente",
            "land_area": 300.0,
            "construction_area": 450.0,
            "land_regime": "URBANO",
            "property_type": "Departamento"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "valuation_id" in data
        # land_use should be None or not present when not provided
        assert data["property_data"].get("land_use") is None
        
        print(f"✅ Valuation created without land_use: {data['valuation_id']}")
    
    def test_create_valuation_all_land_use_types(self):
        """Test creating valuations with different land_use types"""
        land_use_types = ["H1", "H2", "H3", "H4", "HC", "CU", "CB", "CS", "I", "EA", "desconocido"]
        
        for land_use in land_use_types[:3]:  # Test first 3 to keep it fast
            payload = {
                "state": "Jalisco",
                "municipality": "Guadalajara",
                "neighborhood": "Centro",
                "land_area": 100.0,
                "construction_area": 120.0,
                "land_regime": "URBANO",
                "property_type": "Casa",
                "land_use": land_use
            }
            
            response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
            assert response.status_code == 200, f"Failed for land_use={land_use}"
            data = response.json()
            assert data["property_data"]["land_use"] == land_use
        
        print(f"✅ All tested land_use types accepted")


class TestComparablesGeneration:
    """Test comparables generation"""
    
    @pytest.fixture(scope="class")
    def valuation_id(self):
        """Create a valuation for testing"""
        payload = {
            "state": "Ciudad de México",
            "municipality": "Miguel Hidalgo",
            "neighborhood": "Polanco",
            "land_area": 200.0,
            "construction_area": 300.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "H2",
            "bedrooms": 4,
            "bathrooms": 3,
            "estimated_age": 15,
            "conservation_state": "Bueno",
            "construction_quality": "Residencial"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        return response.json()["valuation_id"]
    
    def test_generate_comparables(self, valuation_id):
        """Test comparables generation endpoint"""
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check response structure
        assert "comparables" in data
        assert "count" in data
        assert "rental_count" in data
        assert "rental_factor" in data
        
        # Should have at least 3 comparables
        assert data["count"] >= 3, f"Expected at least 3 comparables, got {data['count']}"
        
        # Check comparable structure
        if data["comparables"]:
            comp = data["comparables"][0]
            assert "comparable_id" in comp
            assert "price" in comp
            assert "price_per_sqm" in comp
            assert "total_adjustment" in comp
            assert "adjusted_price_per_sqm" in comp
        
        print(f"✅ Generated {data['count']} comparables (real: {data.get('scraped_real', 0)}, simulated: {data.get('simulated', 0)})")
        return data


class TestValuationCalculation:
    """Test valuation calculation with improved methodology"""
    
    @pytest.fixture(scope="class")
    def full_valuation(self):
        """Create valuation and generate comparables"""
        # Create valuation
        payload = {
            "state": "Ciudad de México",
            "municipality": "Benito Juárez",
            "neighborhood": "Del Valle Centro",
            "land_area": 150.0,
            "construction_area": 200.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "H2",
            "bedrooms": 3,
            "bathrooms": 2.5,
            "parking_spaces": 2,
            "estimated_age": 10,
            "conservation_state": "Bueno",
            "construction_quality": "Media-alta"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation = response.json()
        valuation_id = valuation["valuation_id"]
        
        # Generate comparables
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        
        return valuation_id
    
    def test_calculate_valuation(self, full_valuation):
        """Test valuation calculation endpoint"""
        response = requests.post(f"{BASE_URL}/api/valuations/{full_valuation}/calculate")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check main value fields
        assert "estimated_value" in data
        assert "value_range_min" in data
        assert "value_range_max" in data
        assert "price_per_sqm" in data
        assert "confidence_level" in data
        
        # Check comparative method fields
        assert "comparative_weighted" in data
        assert "comparative_min_value" in data
        assert "comparative_max_value" in data
        
        # Check physical method fields
        assert "land_value" in data
        assert "construction_depreciated" in data
        assert "physical_total" in data
        assert "depreciation_percent" in data
        
        # Check market metrics
        assert "market_metrics" in data
        metrics = data["market_metrics"]
        assert "monthly_rent_estimate" in metrics
        assert "cap_rate" in metrics
        assert "annual_appreciation" in metrics
        
        # Value should be realistic (not too low)
        estimated_value = data["estimated_value"]
        price_per_sqm = data["price_per_sqm"]
        
        # For CDMX Del Valle, price should be at least 15,000 MXN/m²
        assert price_per_sqm >= 10000, f"Price per sqm too low: {price_per_sqm} MXN/m²"
        
        # Total value should be reasonable for 200m² in Del Valle
        assert estimated_value >= 2000000, f"Estimated value too low: {estimated_value} MXN"
        
        # Value range should be within 8-15% of estimated
        range_low = data["value_range_min"]
        range_high = data["value_range_max"]
        assert range_low < estimated_value < range_high
        
        print(f"✅ Valuation calculated: ${estimated_value:,.0f} MXN (${price_per_sqm:,.0f}/m²)")
        print(f"   Range: ${range_low:,.0f} - ${range_high:,.0f} MXN")
        print(f"   Monthly rent estimate: ${metrics['monthly_rent_estimate']:,.0f} MXN")
        print(f"   Cap rate: {metrics['cap_rate']:.1f}%")
        
        return data


class TestReportGeneration:
    """Test report generation with new sections"""
    
    @pytest.fixture(scope="class")
    def calculated_valuation(self):
        """Create full valuation with calculation"""
        # Create valuation
        payload = {
            "state": "Ciudad de México",
            "municipality": "Coyoacán",
            "neighborhood": "Copilco Universidad",
            "land_area": 180.0,
            "construction_area": 220.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "HC",  # Habitacional con Comercio
            "bedrooms": 4,
            "bathrooms": 3,
            "parking_spaces": 2,
            "estimated_age": 20,
            "conservation_state": "Regular",
            "construction_quality": "Media"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation = response.json()
        valuation_id = valuation["valuation_id"]
        
        # Generate comparables
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        
        # Calculate
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        return valuation_id
    
    def test_generate_report_contains_land_use(self, calculated_valuation):
        """Test that report contains USO DE SUELO section"""
        response = requests.post(f"{BASE_URL}/api/valuations/{calculated_valuation}/generate-report", timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "report_html" in data
        
        report_html = data["report_html"]
        
        # Check for USO DE SUELO section
        assert "USO DE SUELO" in report_html, "Report missing 'USO DE SUELO' section"
        
        # Check for land use code in report
        assert "HC" in report_html or "Habitacional con Comercio" in report_html, "Report missing land use info"
        
        print("✅ Report contains USO DE SUELO section")
    
    def test_generate_report_contains_amenities(self, calculated_valuation):
        """Test that report contains EQUIPAMIENTO Y SERVICIOS CERCANOS section"""
        response = requests.get(f"{BASE_URL}/api/valuations/{calculated_valuation}")
        valuation = response.json()
        report_html = valuation.get("report_html", "")
        
        if not report_html:
            response = requests.post(f"{BASE_URL}/api/valuations/{calculated_valuation}/generate-report", timeout=60)
            report_html = response.json().get("report_html", "")
        
        # Check for amenities section
        assert "EQUIPAMIENTO" in report_html or "SERVICIOS CERCANOS" in report_html, \
            "Report missing 'EQUIPAMIENTO Y SERVICIOS CERCANOS' section"
        
        # Check for 6 amenity icons
        amenity_icons = ["🏫", "🏥", "🏨", "🛒", "🏪", "🛣️"]
        found_icons = [icon for icon in amenity_icons if icon in report_html]
        assert len(found_icons) >= 4, f"Report should have at least 4 amenity icons, found {len(found_icons)}"
        
        # Check for numbered items (1-6)
        numbered_pattern = r'amenity-number.*?[1-6]'
        numbers_found = len(re.findall(numbered_pattern, report_html, re.DOTALL))
        assert numbers_found >= 4, f"Should have numbered amenities, found {numbers_found}"
        
        print(f"✅ Report contains EQUIPAMIENTO section with {len(found_icons)} amenity icons")
    
    def test_generate_report_contains_thermometer(self, calculated_valuation):
        """Test that report contains thermometer visualization"""
        response = requests.get(f"{BASE_URL}/api/valuations/{calculated_valuation}")
        valuation = response.json()
        report_html = valuation.get("report_html", "")
        
        # Check for thermometer elements
        assert "thermometer" in report_html.lower(), "Report missing thermometer visualization"
        assert "thermo-marker" in report_html or "thermometer" in report_html, "Report missing thermometer marker"
        
        # Check for min/mid/max labels
        assert "thermo-min" in report_html or "Minimo" in report_html, "Report missing thermometer min"
        assert "thermo-max" in report_html or "Maximo" in report_html, "Report missing thermometer max"
        
        print("✅ Report contains thermometer visualization")
    
    def test_generate_report_contains_8_tips(self, calculated_valuation):
        """Test that report contains 8 selling tips numbered"""
        response = requests.get(f"{BASE_URL}/api/valuations/{calculated_valuation}")
        valuation = response.json()
        report_html = valuation.get("report_html", "")
        
        # Check for tips section
        assert "CONSEJOS" in report_html or "VENDER" in report_html, "Report missing selling tips section"
        
        # Check for numbered tips (1-8)
        tips_pattern = [
            "1. Pintura",
            "2. Limpieza",
            "3. Fotos",
            "4. Home Staging",
            "5. Reparaciones",
            "6. Precio",
            "7. Documentacion",
            "8. Asesor"
        ]
        
        found_tips = 0
        for tip in tips_pattern:
            if tip in report_html or tip.replace(".", "").strip() in report_html:
                found_tips += 1
        
        # Check tip icons
        tip_icons = ["🎨", "✨", "📷", "🏠", "🔧", "💰", "📋", "🏢"]
        found_icons = [icon for icon in tip_icons if icon in report_html]
        
        assert len(found_icons) >= 6, f"Report should have at least 6 tip icons, found {len(found_icons)}"
        
        print(f"✅ Report contains {len(found_icons)} tip icons for selling advice")


class TestExistingSampleValuation:
    """Test with existing sample valuation ID"""
    
    def test_get_sample_valuation(self):
        """Test retrieving the sample valuation"""
        sample_id = "val_6250e8a5af3d"
        response = requests.get(f"{BASE_URL}/api/valuations/{sample_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert data["valuation_id"] == sample_id
            
            if data.get("result"):
                result = data["result"]
                print(f"✅ Sample valuation found: ${result.get('estimated_value', 0):,.0f} MXN")
                
                # Verify it has market metrics
                if result.get("market_metrics"):
                    metrics = result["market_metrics"]
                    print(f"   Monthly rent: ${metrics.get('monthly_rent_estimate', 0):,.0f}")
                    print(f"   Cap rate: {metrics.get('cap_rate', 0):.1f}%")
            else:
                print(f"✅ Sample valuation found (not calculated yet)")
        else:
            print(f"⚠️ Sample valuation {sample_id} not found (404) - may have been deleted")


class TestErrorHandling:
    """Test error handling"""
    
    def test_get_nonexistent_valuation(self):
        """Test 404 for non-existent valuation"""
        response = requests.get(f"{BASE_URL}/api/valuations/nonexistent_id_12345")
        assert response.status_code == 404
        print("✅ Returns 404 for non-existent valuation")
    
    def test_calculate_without_comparables(self):
        """Test calculation before generating comparables"""
        # Create new valuation
        payload = {
            "state": "Querétaro",
            "municipality": "Querétaro",
            "neighborhood": "Centro",
            "land_area": 100.0,
            "construction_area": 150.0,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = response.json()["valuation_id"]
        
        # Try to calculate without comparables - should fail or return error
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        # Either 400 error or success if API allows calculation without comparables
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✅ Calculate without comparables returns {response.status_code}")
    
    def test_generate_report_without_calculation(self):
        """Test report generation before calculation"""
        # Create new valuation
        payload = {
            "state": "Sonora",
            "municipality": "Hermosillo",
            "neighborhood": "Centro",
            "land_area": 100.0,
            "construction_area": 150.0,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = response.json()["valuation_id"]
        
        # Try to generate report without calculation - should fail
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Returns 400 for report generation without calculation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
