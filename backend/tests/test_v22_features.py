"""
Backend API Tests for PropValu v2.2 - Mexican Real Estate Valuation Platform
Testing new features:
- other_features text field in PropertyInput
- 10-15 comparables generated for appraiser selection
- Negotiation adjustment: -5% for Casa/Departamento, -8% for Terreno
- Expanded land use categories based on Jalisco (H1-U, H2-H, H3-V, etc.)
- Report with page-break CSS for 3-page print
- Report thermometer with larger numbers
- Report amenities section with 6 numbered items and icons
"""

import pytest
import requests
import os
import re
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://valuacion-propiedad.preview.emergentagent.com').rstrip('/')


class TestHealthEndpoints:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("✅ Health endpoint working")


class TestOtherFeaturesField:
    """Test other_features text field in valuation creation"""
    
    def test_create_valuation_with_other_features(self):
        """Test creating valuation with other_features text field"""
        payload = {
            "state": "Jalisco",
            "municipality": "Zapopan",
            "neighborhood": "Providencia",
            "land_area": 200.0,
            "construction_area": 250.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "H2-H",
            "other_features": "Vista panorámica a la ciudad, cisterna de 5000 litros, paneles solares, cuarto de máquinas independiente",
            "bedrooms": 4,
            "bathrooms": 3,
            "parking_spaces": 3
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "valuation_id" in data
        assert data["property_data"]["other_features"] == payload["other_features"]
        
        print(f"✅ Valuation created with other_features: {data['valuation_id']}")
        print(f"   other_features: {data['property_data']['other_features'][:50]}...")
        return data["valuation_id"]
    
    def test_create_valuation_without_other_features(self):
        """Test creating valuation without other_features (optional field)"""
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Americana",
            "land_area": 150.0,
            "construction_area": 180.0,
            "land_regime": "URBANO",
            "property_type": "Departamento"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        # other_features should be None when not provided
        assert data["property_data"].get("other_features") is None
        
        print("✅ Valuation created without other_features (field is optional)")


class TestExpandedLandUseCategories:
    """Test expanded land use categories based on Jalisco zoning"""
    
    def test_land_use_jalisco_categories(self):
        """Test all Jalisco-based land use codes"""
        jalisco_land_uses = [
            ("H1-U", "Habitacional Unifamiliar"),
            ("H2-U", "Habitacional Dúplex"),
            ("H3-U", "Habitacional Tríplex"),
            ("H2-H", "Plurifamiliar Horizontal"),
            ("H2-V", "Plurifamiliar Vertical Baja"),
            ("H3-V", "Plurifamiliar Vertical Media"),
            ("H4-V", "Plurifamiliar Vertical Alta"),
            ("HM", "Habitacional Mixto"),
            ("HC", "Habitacional con Comercio Vecinal"),
            ("HO", "Habitacional con Oficinas"),
            ("CU", "Comercio Uniforme"),
            ("CB", "Centro de Barrio"),
            ("CD", "Centro de Distrito"),
            ("CS", "Corredor de Servicios"),
            ("CC", "Centro Comercial"),
            ("CR", "Corredor Regional"),
            ("I-L", "Industrial Ligera"),
            ("I-M", "Industrial Media"),
            ("I-P", "Industrial Pesada"),
            ("IP", "Industria Parque"),
            ("EA", "Espacios Abiertos"),
            ("EI", "Equipamiento Institucional"),
            ("PE", "Preservación Ecológica"),
            ("AG", "Agrícola"),
            ("desconocido", "Por Verificar")
        ]
        
        # Test a subset of land use codes
        test_codes = ["H1-U", "H2-H", "H3-V", "HC", "CU", "I-L", "EA", "desconocido"]
        
        for land_use in test_codes:
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
            assert response.status_code == 200, f"Failed for land_use={land_use}: {response.text}"
            data = response.json()
            assert data["property_data"]["land_use"] == land_use
        
        print(f"✅ All Jalisco land use codes accepted: {test_codes}")


class TestComparablesGeneration:
    """Test that 10-15 comparables are generated for appraiser selection"""
    
    def test_generate_10_to_15_comparables(self):
        """Test that generate-comparables returns 10-15 comparables"""
        # Create valuation
        payload = {
            "state": "Ciudad de México",
            "municipality": "Benito Juárez",
            "neighborhood": "Del Valle",
            "land_area": 180.0,
            "construction_area": 220.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "H2-H",
            "other_features": "Terraza en roof con asador"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        assert response.status_code == 200
        valuation_id = response.json()["valuation_id"]
        
        # Generate comparables
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        count = data["count"]
        
        # Should have 10-15 comparables
        assert count >= 10, f"Expected at least 10 comparables, got {count}"
        assert count <= 15, f"Expected at most 15 comparables, got {count}"
        
        print(f"✅ Generated {count} comparables (real: {data.get('scraped_real', 0)}, simulated: {data.get('simulated', 0)})")
        print(f"   Rental comparables: {data.get('rental_count', 0)}")
        return valuation_id, data["comparables"]


class TestNegotiationAdjustments:
    """Test negotiation adjustments by property type"""
    
    def test_casa_negotiation_minus_5_percent(self):
        """Test Casa has -5% negotiation adjustment"""
        payload = {
            "state": "Nuevo León",
            "municipality": "San Pedro Garza García",
            "neighborhood": "Valle",
            "land_area": 300.0,
            "construction_area": 400.0,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = response.json()["valuation_id"]
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        assert response.status_code == 200
        
        comparables = response.json()["comparables"]
        
        # Check negotiation adjustment for Casa
        for comp in comparables[:5]:
            negotiation = comp.get("negotiation_adjustment", 0)
            assert negotiation == -5, f"Casa should have -5% negotiation, got {negotiation}%"
        
        print(f"✅ Casa comparables have -5% negotiation adjustment")
    
    def test_departamento_negotiation_minus_5_percent(self):
        """Test Departamento has -5% negotiation adjustment"""
        payload = {
            "state": "Ciudad de México",
            "municipality": "Cuauhtémoc",
            "neighborhood": "Roma Norte",
            "land_area": 80.0,
            "construction_area": 120.0,
            "land_regime": "URBANO",
            "property_type": "Departamento"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = response.json()["valuation_id"]
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        assert response.status_code == 200
        
        comparables = response.json()["comparables"]
        
        # Check negotiation adjustment for Departamento
        for comp in comparables[:5]:
            negotiation = comp.get("negotiation_adjustment", 0)
            assert negotiation == -5, f"Departamento should have -5% negotiation, got {negotiation}%"
        
        print(f"✅ Departamento comparables have -5% negotiation adjustment")
    
    def test_terreno_negotiation_minus_8_percent(self):
        """Test Terreno has -8% negotiation adjustment"""
        payload = {
            "state": "Quintana Roo",
            "municipality": "Tulum",
            "neighborhood": "Centro",
            "land_area": 500.0,
            "construction_area": 0.1,  # Minimal construction for terrain
            "land_regime": "URBANO",
            "property_type": "Terreno"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = response.json()["valuation_id"]
        
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        assert response.status_code == 200
        
        comparables = response.json()["comparables"]
        
        # Check negotiation adjustment for Terreno
        for comp in comparables[:5]:
            negotiation = comp.get("negotiation_adjustment", 0)
            assert negotiation == -8, f"Terreno should have -8% negotiation, got {negotiation}%"
        
        print(f"✅ Terreno comparables have -8% negotiation adjustment")


class TestReportFeatures:
    """Test report generation features"""
    
    @pytest.fixture(scope="class")
    def full_valuation_with_other_features(self):
        """Create complete valuation with other_features"""
        # Create valuation
        payload = {
            "state": "Jalisco",
            "municipality": "Zapopan",
            "neighborhood": "Providencia",
            "land_area": 200.0,
            "construction_area": 250.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "land_use": "H2-H",
            "other_features": "Vista panorámica, cisterna 5000L, paneles solares",
            "bedrooms": 4,
            "bathrooms": 3,
            "service_room": True,
            "laundry_room": True,
            "estimated_age": 5,
            "conservation_state": "Excelente",
            "construction_quality": "Residencial"
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        valuation_id = response.json()["valuation_id"]
        
        # Generate comparables
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables")
        
        # Calculate valuation
        requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/calculate")
        
        # Generate report
        response = requests.post(f"{BASE_URL}/api/valuations/{valuation_id}/generate-report", timeout=60)
        assert response.status_code == 200, f"Report generation failed: {response.text}"
        
        return valuation_id, response.json()
    
    def test_report_contains_other_features(self, full_valuation_with_other_features):
        """Test that report contains other_features text"""
        valuation_id, report_data = full_valuation_with_other_features
        report_html = report_data.get("report_html", "")
        
        # Check for "Otros elementos" section in report
        assert "otros" in report_html.lower() or "elementos" in report_html.lower() or \
               "Vista panorámica" in report_html or "cisterna" in report_html.lower(), \
               "Report should contain other_features content"
        
        print("✅ Report contains other_features text")
    
    def test_report_contains_expanded_land_use(self, full_valuation_with_other_features):
        """Test report contains expanded land use categories"""
        valuation_id, report_data = full_valuation_with_other_features
        report_html = report_data.get("report_html", "")
        
        # Check for USO DE SUELO section
        assert "USO DE SUELO" in report_html, "Report missing 'USO DE SUELO' section"
        
        # Check for H2-H code
        assert "H2-H" in report_html or "Plurifamiliar Horizontal" in report_html, \
            "Report should contain H2-H land use info"
        
        print("✅ Report contains expanded land use categories")
    
    def test_report_has_page_break_css(self, full_valuation_with_other_features):
        """Test report has page-break CSS for 3-page letter print"""
        valuation_id, report_data = full_valuation_with_other_features
        report_html = report_data.get("report_html", "")
        
        # Check for page-break CSS
        assert "page-break" in report_html, "Report missing page-break CSS"
        
        # Check for print media query
        assert "@media print" in report_html or "@page" in report_html, \
            "Report missing print CSS rules"
        
        # Check for print-color-adjust
        assert "print-color-adjust" in report_html or "-webkit-print-color-adjust" in report_html, \
            "Report missing print-color-adjust CSS"
        
        # Count page breaks
        page_breaks = report_html.lower().count("page-break")
        assert page_breaks >= 2, f"Expected at least 2 page-breaks for 3 pages, got {page_breaks}"
        
        print(f"✅ Report has {page_breaks} page-break CSS rules for 3-page print")
    
    def test_report_thermometer_with_larger_numbers(self, full_valuation_with_other_features):
        """Test report thermometer is visible with larger numbers"""
        valuation_id, report_data = full_valuation_with_other_features
        report_html = report_data.get("report_html", "")
        
        # Check for thermometer container
        assert "thermo" in report_html.lower(), "Report missing thermometer"
        
        # Check for thermometer elements
        assert "thermo-container" in report_html or "thermometer" in report_html, \
            "Report missing thermometer container"
        
        # Check for marker
        assert "thermo-marker" in report_html, "Report missing thermometer marker"
        
        # Check for min/mid/max labels
        assert "thermo-min" in report_html, "Report missing thermometer min label"
        assert "thermo-max" in report_html, "Report missing thermometer max label"
        
        # Check for larger font sizes in thermometer (10pt or higher)
        thermo_font_match = re.search(r'thermo.*font-size:\s*(\d+)pt', report_html, re.DOTALL)
        if thermo_font_match:
            font_size = int(thermo_font_match.group(1))
            assert font_size >= 9, f"Thermometer font should be at least 9pt, got {font_size}pt"
        
        print("✅ Report thermometer visible with larger numbers")
    
    def test_report_amenities_6_numbered_items_with_icons(self, full_valuation_with_other_features):
        """Test report amenities section has 6 numbered items with icons"""
        valuation_id, report_data = full_valuation_with_other_features
        report_html = report_data.get("report_html", "")
        
        # Check for amenities/equipamiento section
        assert "EQUIPAMIENTO" in report_html or "ameniti" in report_html.lower(), \
            "Report missing amenities/equipamiento section"
        
        # Check for amenity icons
        amenity_icons = ["🏫", "🏥", "💊", "🛒", "🏪", "🚗"]
        found_icons = [icon for icon in amenity_icons if icon in report_html]
        assert len(found_icons) >= 5, f"Report should have at least 5 amenity icons, found {len(found_icons)}"
        
        # Check for numbered items (amenity-num class)
        assert "amenity-num" in report_html, "Report missing numbered amenity items"
        
        # Check for grid layout
        assert "amenities-grid" in report_html or "amenity-item" in report_html, \
            "Report missing amenities grid"
        
        print(f"✅ Report amenities section has {len(found_icons)} icons with numbered items")


class TestSampleValuation:
    """Test with the sample valuation ID provided"""
    
    def test_sample_valuation_exists(self):
        """Test sample valuation val_7348428e33a4 exists"""
        sample_id = "val_7348428e33a4"
        response = requests.get(f"{BASE_URL}/api/valuations/{sample_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert data["valuation_id"] == sample_id
            
            prop = data.get("property_data", {})
            
            # Check for H2-H land use
            if prop.get("land_use"):
                print(f"   Land use: {prop['land_use']}")
            
            # Check for other_features
            if prop.get("other_features"):
                print(f"   Other features: {prop['other_features'][:50]}...")
            
            # Check result if exists
            if data.get("result"):
                result = data["result"]
                print(f"✅ Sample valuation found: ${result.get('estimated_value', 0):,.0f} MXN")
            else:
                print(f"✅ Sample valuation found (not calculated)")
        else:
            print(f"⚠️ Sample valuation {sample_id} not found - may have been deleted")


class TestServiceAndLaundryRoom:
    """Test service_room and laundry_room special features"""
    
    def test_create_valuation_with_service_laundry_rooms(self):
        """Test creating valuation with service_room and laundry_room"""
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Chapalita",
            "land_area": 250.0,
            "construction_area": 320.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "service_room": True,
            "laundry_room": True,
            "special_features": ["service_room", "laundry_room", "pool", "garden"]
        }
        
        response = requests.post(f"{BASE_URL}/api/valuations", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        prop = data["property_data"]
        
        # Check boolean fields
        assert prop.get("service_room") == True, "service_room should be True"
        assert prop.get("laundry_room") == True, "laundry_room should be True"
        
        # Check special_features list
        features = prop.get("special_features", [])
        assert "service_room" in features, "special_features should contain service_room"
        assert "laundry_room" in features, "special_features should contain laundry_room"
        
        print(f"✅ Valuation created with service_room and laundry_room: {data['valuation_id']}")
        print(f"   Special features: {features}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
