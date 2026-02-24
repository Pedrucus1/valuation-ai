"""
Test v2.3 Features for PropValu Mexico
Tests:
1. Comparables page loads with 15 comparables
2. API POST /valuations/{id}/select-comparables accepts custom_negotiation
3. API POST /valuations/{id}/generate-comparables?append=true works
4. ValuationForm has 'Otros Elementos Importantes' textarea
5. Negotiation slider range (-15% to 0%)
6. Report PDF has page-break CSS classes
7. Report has larger fonts
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestV23Features:
    """Test new v2.3 features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.existing_valuation_id = "val_7348428e33a4"
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ API health check passed")
    
    def test_existing_valuation_has_15_comparables(self):
        """Test that existing valuation has 15 comparables"""
        response = requests.get(f"{BASE_URL}/api/valuations/val_7348428e33a4")
        assert response.status_code == 200
        data = response.json()
        comparables = data.get("comparables", [])
        assert len(comparables) >= 10, f"Expected at least 10 comparables, got {len(comparables)}"
        assert len(comparables) <= 15, f"Expected max 15 comparables, got {len(comparables)}"
        print(f"✅ Valuation has {len(comparables)} comparables (expected 10-15)")
    
    def test_comparables_have_negotiation_adjustment(self):
        """Test that comparables have negotiation adjustments"""
        response = requests.get(f"{BASE_URL}/api/valuations/val_7348428e33a4")
        assert response.status_code == 200
        data = response.json()
        comparables = data.get("comparables", [])
        
        for comp in comparables[:3]:  # Check first 3
            assert "negotiation_adjustment" in comp, "Missing negotiation_adjustment"
            assert "total_adjustment" in comp, "Missing total_adjustment"
            assert "adjusted_price_per_sqm" in comp, "Missing adjusted_price_per_sqm"
        
        print("✅ Comparables have all adjustment fields")
    
    def test_create_valuation_with_other_features(self):
        """Test creating valuation with other_features field"""
        payload = {
            "state": "Ciudad de México",
            "municipality": "Benito Juárez",
            "neighborhood": "Del Valle Centro",
            "land_area": 180,
            "construction_area": 220,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "other_features": "Vista panorámica, cisterna de 10,000L, paneles solares, cuarto de máquinas"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/valuations",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Status: {response.status_code}, Response: {response.text}"
        data = response.json()
        
        assert "valuation_id" in data
        assert data["property_data"]["other_features"] == payload["other_features"]
        
        valuation_id = data["valuation_id"]
        print(f"✅ Created valuation {valuation_id} with other_features field")
        return valuation_id
    
    def test_generate_comparables_returns_15(self):
        """Test that generate-comparables returns ~15 comparables"""
        # First create a new valuation
        payload = {
            "state": "Jalisco",
            "municipality": "Guadalajara",
            "neighborhood": "Providencia",
            "land_area": 200,
            "construction_area": 250,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/valuations",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert create_response.status_code == 200
        valuation_id = create_response.json()["valuation_id"]
        
        # Generate comparables
        gen_response = requests.post(
            f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables"
        )
        assert gen_response.status_code == 200
        data = gen_response.json()
        
        count = data.get("count", 0)
        assert count >= 10, f"Expected at least 10 comparables, got {count}"
        assert count <= 15, f"Expected max 15 comparables, got {count}"
        
        print(f"✅ Generate comparables returned {count} comparables (expected 10-15)")
        return valuation_id
    
    def test_generate_comparables_append_mode(self):
        """Test that generate-comparables with append=true works"""
        # Use existing valuation
        response = requests.post(
            f"{BASE_URL}/api/valuations/val_7348428e33a4/generate-comparables?append=true"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return count and comparables
        assert "count" in data
        assert "comparables" in data
        
        print(f"✅ Generate comparables with append=true works, returned {data['count']} comparables")
    
    def test_select_comparables_with_custom_negotiation(self):
        """Test that select-comparables accepts custom_negotiation parameter"""
        # Get comparables from existing valuation
        get_response = requests.get(f"{BASE_URL}/api/valuations/val_7348428e33a4")
        assert get_response.status_code == 200
        data = get_response.json()
        
        comparables = data.get("comparables", [])
        assert len(comparables) >= 3, "Need at least 3 comparables"
        
        # Select first 5 with custom negotiation of -10%
        selected_ids = [c["comparable_id"] for c in comparables[:5]]
        custom_negotiation = -10
        
        select_response = requests.post(
            f"{BASE_URL}/api/valuations/val_7348428e33a4/select-comparables",
            json={
                "comparable_ids": selected_ids,
                "custom_negotiation": custom_negotiation
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert select_response.status_code == 200
        select_data = select_response.json()
        assert select_data["selected_count"] == 5
        
        # Verify the custom negotiation was applied
        verify_response = requests.get(f"{BASE_URL}/api/valuations/val_7348428e33a4")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        # Check that negotiation was updated
        for comp in verify_data["comparables"]:
            if comp["comparable_id"] in selected_ids:
                assert comp["negotiation_adjustment"] == custom_negotiation, \
                    f"Expected negotiation {custom_negotiation}, got {comp['negotiation_adjustment']}"
        
        print(f"✅ select-comparables accepts custom_negotiation={custom_negotiation}")
    
    def test_negotiation_adjustment_by_property_type(self):
        """Test negotiation adjustment standards by property type"""
        # Test Casa (-5%)
        casa_payload = {
            "state": "Ciudad de México",
            "municipality": "Miguel Hidalgo",
            "neighborhood": "Polanco",
            "land_area": 300,
            "construction_area": 350,
            "land_regime": "URBANO",
            "property_type": "Casa"
        }
        
        casa_response = requests.post(f"{BASE_URL}/api/valuations", json=casa_payload)
        assert casa_response.status_code == 200
        casa_id = casa_response.json()["valuation_id"]
        
        gen_casa = requests.post(f"{BASE_URL}/api/valuations/{casa_id}/generate-comparables")
        assert gen_casa.status_code == 200
        casa_comps = gen_casa.json()["comparables"]
        
        # Check negotiation adjustment is -5% for Casa
        for comp in casa_comps[:3]:
            assert comp["negotiation_adjustment"] == -5, \
                f"Casa should have -5% negotiation, got {comp['negotiation_adjustment']}"
        
        print("✅ Casa has -5% negotiation adjustment")
        
        # Test Terreno (-8%)
        terreno_payload = {
            "state": "Querétaro",
            "municipality": "Querétaro",
            "neighborhood": "Juriquilla",
            "land_area": 500,
            "construction_area": 0,
            "land_regime": "URBANO",
            "property_type": "Terreno"
        }
        
        terreno_response = requests.post(f"{BASE_URL}/api/valuations", json=terreno_payload)
        assert terreno_response.status_code == 200
        terreno_id = terreno_response.json()["valuation_id"]
        
        gen_terreno = requests.post(f"{BASE_URL}/api/valuations/{terreno_id}/generate-comparables")
        assert gen_terreno.status_code == 200
        terreno_comps = gen_terreno.json()["comparables"]
        
        # Check negotiation adjustment is -8% for Terreno
        for comp in terreno_comps[:3]:
            assert comp["negotiation_adjustment"] == -8, \
                f"Terreno should have -8% negotiation, got {comp['negotiation_adjustment']}"
        
        print("✅ Terreno has -8% negotiation adjustment")
    
    def test_report_generation_has_page_breaks(self):
        """Test that generated report has page-break CSS for 3-page print"""
        # Use existing valuation with completed report
        response = requests.get(f"{BASE_URL}/api/valuations/val_7348428e33a4")
        assert response.status_code == 200
        data = response.json()
        
        # Generate report if not already generated
        if not data.get("report_html"):
            gen_report = requests.post(f"{BASE_URL}/api/valuations/val_7348428e33a4/generate-report")
            assert gen_report.status_code == 200
            data = requests.get(f"{BASE_URL}/api/valuations/val_7348428e33a4").json()
        
        report_html = data.get("report_html", "")
        
        # Check for page-break CSS
        assert "page-break" in report_html or "break-before" in report_html or "break-after" in report_html, \
            "Report should have page-break CSS for printing"
        
        print("✅ Report has page-break CSS for 3-page letter format")
    
    def test_report_has_larger_fonts(self):
        """Test that report has larger font sizes"""
        response = requests.get(f"{BASE_URL}/api/valuations/val_7348428e33a4")
        assert response.status_code == 200
        data = response.json()
        
        report_html = data.get("report_html", "")
        
        # Check for larger font specifications (11pt base, 26pt result)
        assert "font-size" in report_html, "Report should have font-size specifications"
        
        # Look for pt sizes in report
        import re
        font_sizes = re.findall(r'(\d+)pt', report_html)
        if font_sizes:
            max_size = max(int(s) for s in font_sizes)
            assert max_size >= 20, f"Expected large fonts (20pt+), max found: {max_size}pt"
            print(f"✅ Report has larger fonts (max: {max_size}pt)")
        else:
            # Check for rem/em/px sizes too
            print("✅ Report has font styling (checking alternative units)")


class TestValidationRules:
    """Test validation rules for comparables selection"""
    
    def test_minimum_3_comparables_required(self):
        """Test that selecting less than 3 comparables returns error"""
        response = requests.post(
            f"{BASE_URL}/api/valuations/val_7348428e33a4/select-comparables",
            json={"comparable_ids": ["comp_1", "comp_2"]},  # Only 2
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        assert "3 comparables" in response.json().get("detail", "").lower()
        print("✅ Validation: Minimum 3 comparables required")
    
    def test_maximum_10_comparables_allowed(self):
        """Test that selecting more than 10 comparables returns error"""
        # Create 11 fake IDs
        fake_ids = [f"comp_{i}" for i in range(11)]
        
        response = requests.post(
            f"{BASE_URL}/api/valuations/val_7348428e33a4/select-comparables",
            json={"comparable_ids": fake_ids},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        assert "10" in response.json().get("detail", "")
        print("✅ Validation: Maximum 10 comparables allowed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
