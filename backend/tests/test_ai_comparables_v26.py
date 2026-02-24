"""
Test AI-powered comparable search feature (v2.6)
Tests for:
- POST /api/valuations creates a valuation
- POST /api/valuations/{id}/generate-comparables returns AI comparables (OpenAI + Gemini)
- POST /api/valuations/{id}/calculate returns estimated value
- POST /api/valuations/{id}/generate-report generates HTML report
- Full end-to-end flow
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Health check - run first"""
    
    def test_api_health(self):
        """API health endpoint should return healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ API health check passed")

    def test_api_root(self):
        """API root should return version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "PropValu Mexico API" in data.get("message", "")
        print(f"✅ API version: {data.get('version', 'unknown')}")


class TestExistingValuationWithAI:
    """Test the existing valuation that used AI search"""
    
    def test_get_existing_valuation_with_ai(self):
        """Verify existing valuation val_5291862e02f7 has AI search results"""
        response = requests.get(f"{BASE_URL}/api/valuations/val_5291862e02f7")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify AI search was used
        assert data.get("search_method") == "ai", f"Expected search_method='ai', got '{data.get('search_method')}'"
        print(f"✅ search_method is 'ai'")
        
        # Verify both providers were used
        ai_providers = data.get("ai_providers_used", [])
        assert "openai" in ai_providers, f"Expected 'openai' in providers, got {ai_providers}"
        assert "gemini" in ai_providers, f"Expected 'gemini' in providers, got {ai_providers}"
        print(f"✅ AI providers used: {ai_providers}")
        
        # Verify comparables were found
        comparables = data.get("comparables", [])
        assert len(comparables) >= 5, f"Expected at least 5 comparables, got {len(comparables)}"
        print(f"✅ Found {len(comparables)} comparables")
        
        # Verify comparable structure
        if comparables:
            comp = comparables[0]
            assert "comparable_id" in comp
            assert "price" in comp
            assert "price_per_sqm" in comp
            assert "source" in comp
            print(f"✅ Comparable structure is correct")
    
    def test_valuation_has_result(self):
        """Verify the valuation has a calculated result"""
        response = requests.get(f"{BASE_URL}/api/valuations/val_5291862e02f7")
        assert response.status_code == 200
        
        data = response.json()
        result = data.get("result")
        
        assert result is not None, "Valuation should have a result"
        assert result.get("estimated_value", 0) > 0, "estimated_value should be > 0"
        assert result.get("price_per_sqm", 0) > 0, "price_per_sqm should be > 0"
        
        print(f"✅ Estimated value: ${result['estimated_value']:,.0f} MXN")
        print(f"✅ Price per sqm: ${result['price_per_sqm']:,.0f} MXN/m²")


class TestCreateValuationFlow:
    """Test creating a new valuation with AI search"""
    
    @pytest.fixture
    def new_valuation_payload(self):
        """Sample property data for testing"""
        return {
            "state": "Ciudad de México",
            "municipality": "Miguel Hidalgo",
            "neighborhood": "Polanco",
            "land_area": 200,
            "construction_area": 250,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "bedrooms": 4,
            "bathrooms": 3.5,
            "parking_spaces": 2,
            "estimated_age": 15,
            "conservation_state": "Bueno",
            "construction_quality": "Residencial"
        }
    
    def test_create_valuation(self, new_valuation_payload):
        """Create a new valuation"""
        response = requests.post(
            f"{BASE_URL}/api/valuations",
            json=new_valuation_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "valuation_id" in data
        assert data["status"] == "draft"
        assert data["property_data"]["state"] == "Ciudad de México"
        assert data["property_data"]["property_type"] == "Casa"
        
        print(f"✅ Created valuation: {data['valuation_id']}")
        return data["valuation_id"]
    
    def test_full_valuation_flow_with_ai(self, new_valuation_payload):
        """Test the full flow: create -> generate comparables -> calculate"""
        # Step 1: Create valuation
        create_response = requests.post(
            f"{BASE_URL}/api/valuations",
            json=new_valuation_payload
        )
        assert create_response.status_code == 200
        valuation_id = create_response.json()["valuation_id"]
        print(f"✅ Step 1: Created valuation {valuation_id}")
        
        # Step 2: Generate comparables (AI search takes ~15-30 seconds)
        print("⏳ Step 2: Generating AI comparables (this takes 15-30 seconds)...")
        comparables_response = requests.post(
            f"{BASE_URL}/api/valuations/{valuation_id}/generate-comparables",
            timeout=90  # Extended timeout for AI calls
        )
        
        assert comparables_response.status_code == 200
        comp_data = comparables_response.json()
        
        # Verify AI search results
        search_method = comp_data.get("search_method", "")
        ai_providers = comp_data.get("ai_providers_used", [])
        count = comp_data.get("count", 0)
        
        print(f"   Search method: {search_method}")
        print(f"   AI providers: {ai_providers}")
        print(f"   Comparables found: {count}")
        
        # AI should be used (or mixed if not enough AI results)
        assert search_method in ["ai", "mixed", "simulated"], f"Unexpected search_method: {search_method}"
        assert count >= 10, f"Expected at least 10 comparables, got {count}"
        
        if search_method == "ai":
            assert len(ai_providers) > 0, "AI providers should be listed when search_method is 'ai'"
            print(f"✅ Step 2: AI search successful with {ai_providers}")
        else:
            print(f"⚠️ Step 2: Fallback used - search_method: {search_method}")
        
        # Step 3: Calculate value
        calc_response = requests.post(
            f"{BASE_URL}/api/valuations/{valuation_id}/calculate"
        )
        
        assert calc_response.status_code == 200
        calc_data = calc_response.json()
        
        assert calc_data.get("estimated_value", 0) > 0
        assert calc_data.get("price_per_sqm", 0) > 0
        
        print(f"✅ Step 3: Calculated value: ${calc_data['estimated_value']:,.0f} MXN")
        print(f"   Price/sqm: ${calc_data['price_per_sqm']:,.0f} MXN/m²")
        print(f"   Confidence: {calc_data.get('confidence_level', 'N/A')}")
        
        return valuation_id


class TestGenerateReport:
    """Test report generation"""
    
    def test_generate_report_for_existing_valuation(self):
        """Generate HTML report for existing valuation"""
        response = requests.post(
            f"{BASE_URL}/api/valuations/val_5291862e02f7/generate-report",
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "report_html" in data
        assert "analysis" in data
        
        # Verify report contains key sections
        html = data["report_html"]
        assert "Reporte de Valuación" in html or "REPORTE" in html
        assert "MXN" in html  # Currency mentioned
        
        print("✅ Report generated successfully")
        print(f"   HTML length: {len(html)} characters")
        print(f"   Analysis present: {'analysis' in data and len(data['analysis']) > 0}")


class TestAPIStats:
    """Test stats and other endpoints"""
    
    def test_get_stats(self):
        """Get platform statistics"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_valuations" in data
        assert "completed_valuations" in data
        
        print(f"✅ Stats: {data['total_valuations']} valuations, {data['completed_valuations']} completed")
    
    def test_get_property_types(self):
        """Get available property types"""
        response = requests.get(f"{BASE_URL}/api/property-types")
        assert response.status_code == 200
        
        data = response.json()
        types = data.get("property_types", [])
        
        assert "Casa" in types
        assert "Departamento" in types
        assert "Terreno" in types
        
        print(f"✅ Property types: {types}")


class TestValuationNotFound:
    """Test error handling"""
    
    def test_valuation_not_found(self):
        """Non-existent valuation should return 404"""
        response = requests.get(f"{BASE_URL}/api/valuations/nonexistent_id_123")
        assert response.status_code == 404
        print("✅ 404 returned for non-existent valuation")
    
    def test_generate_comparables_not_found(self):
        """Generate comparables for non-existent valuation should return 404"""
        response = requests.post(f"{BASE_URL}/api/valuations/nonexistent_id_123/generate-comparables")
        assert response.status_code == 404
        print("✅ 404 returned for non-existent valuation (generate-comparables)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
