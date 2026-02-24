import requests
import sys
import json
from datetime import datetime

class PropValuAPITester:
    def __init__(self, base_url="https://valuacion-propiedad.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.valuation_id = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Response text: {response.text}")

            return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test root endpoint
        self.run_test("Root Endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)

    def test_property_types_endpoint(self):
        """Test property types endpoint (v2)"""
        print("\n=== Testing Property Types Endpoint (v2) ===")
        
        success, response = self.run_test("Get Property Types", "GET", "property-types", 200)
        if success:
            property_types = response.get("property_types", [])
            expected_types = [
                "Casa", "Departamento", "Terreno", "Local comercial", 
                "Oficina", "Bodega", "Nave industrial"
            ]
            
            print(f"   ✅ Found {len(property_types)} property types")
            for prop_type in property_types:
                print(f"      - {prop_type}")
            
            # Check if all expected types are present
            missing_types = [t for t in expected_types if t not in property_types]
            if missing_types:
                print(f"   ⚠️ Missing property types: {missing_types}")
            else:
                print("   ✅ All 7 expected property types present")
                
            return len(property_types) >= 7
        return False

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        print("\n=== Testing Stats Endpoint ===")
        
        success, response = self.run_test("Get Stats", "GET", "stats", 200)
        if success:
            expected_keys = ["total_valuations", "completed_valuations", "total_users"]
            for key in expected_keys:
                if key in response:
                    print(f"   ✅ {key}: {response[key]}")
                else:
                    print(f"   ❌ Missing key: {key}")
            return response
        return {}

    def test_create_valuation(self):
        """Test creating a valuation with v2 fields"""
        print("\n=== Testing Create Valuation (v2) ===")
        
        valuation_data = {
            "state": "Ciudad de México",
            "municipality": "Benito Juárez",
            "neighborhood": "Del Valle",
            "street_address": "Calle Insurgentes Sur 123",
            "postal_code": "03100",
            "latitude": 19.4326,
            "longitude": -99.1332,
            "land_area": 150.0,
            "construction_area": 200.0,
            "land_regime": "URBANO",
            "property_type": "Casa",
            "bedrooms": 3,
            "bathrooms": 2.5,
            "estimated_age": 10,
            "conservation_state": "Bueno",
            "construction_quality": "Media",
            "special_features": ["parking", "garden"],
            "photos": []
        }
        
        success, response = self.run_test(
            "Create Valuation",
            "POST",
            "valuations",
            200,  # Expecting 200 based on the backend code
            valuation_data
        )
        
        if success and "valuation_id" in response:
            self.valuation_id = response["valuation_id"]
            print(f"   ✅ Valuation created with ID: {self.valuation_id}")
            print(f"   ✅ Mode: {response.get('mode', 'N/A')}")
            print(f"   ✅ Status: {response.get('status', 'N/A')}")
            
            # Check v2 fields
            prop_data = response.get('property_data', {})
            if 'property_type' in prop_data:
                print(f"   ✅ Property type: {prop_data['property_type']}")
            if 'latitude' in prop_data and 'longitude' in prop_data:
                print(f"   ✅ Coordinates: {prop_data['latitude']}, {prop_data['longitude']}")
            
            return response
        else:
            print("   ❌ No valuation_id in response")
            return {}

    def test_get_valuation(self):
        """Test getting a specific valuation"""
        if not self.valuation_id:
            print("❌ No valuation ID available for get test")
            return False
            
        print("\n=== Testing Get Valuation ===")
        
        success, response = self.run_test(
            "Get Valuation",
            "GET",
            f"valuations/{self.valuation_id}",
            200
        )
        
        if success:
            print(f"   ✅ Retrieved valuation: {self.valuation_id}")
            print(f"   ✅ Property location: {response.get('property_data', {}).get('neighborhood')}")
            return True
        return False

    def test_generate_comparables(self):
        """Test generating comparables with rental factor (v2)"""
        if not self.valuation_id:
            print("❌ No valuation ID available for comparables test")
            return False
            
        print("\n=== Testing Generate Comparables (v2 with Rental Factor) ===")
        
        success, response = self.run_test(
            "Generate Comparables",
            "POST",
            f"valuations/{self.valuation_id}/generate-comparables",
            200
        )
        
        if success:
            comparables_count = len(response.get("comparables", []))
            rental_count = response.get("rental_count", 0)
            rental_factor = response.get("rental_factor", {})
            scraped_real = response.get("scraped_real", 0)
            simulated = response.get("simulated", 0)
            
            print(f"   ✅ Generated {comparables_count} sale comparables")
            print(f"   ✅ Generated {rental_count} rental comparables")
            print(f"   ✅ Real scraped: {scraped_real}, Simulated: {simulated}")
            
            # Check rental factor data
            if rental_factor:
                print(f"   ✅ Rental factor: {rental_factor.get('factor', 'N/A')}")
                print(f"   ✅ Rental factor source: {rental_factor.get('source', 'N/A')}")
                print(f"   ✅ Rental listings count: {rental_factor.get('rental_listings_count', 0)}")
            
            if comparables_count >= 6:
                print("   ✅ Sufficient comparables generated (6+)")
                return True
            else:
                print(f"   ⚠️ Only {comparables_count} comparables generated")
                return True
        return False

    def test_calculate_valuation(self):
        """Test calculating the valuation with market metrics (v2)"""
        if not self.valuation_id:
            print("❌ No valuation ID available for calculation test")
            return False
            
        print("\n=== Testing Calculate Valuation (v2 with Market Metrics) ===")
        
        success, response = self.run_test(
            "Calculate Valuation",
            "POST",
            f"valuations/{self.valuation_id}/calculate",
            200
        )
        
        if success:
            print(f"   ✅ Estimated value: ${response.get('estimated_value', 0):,.2f} MXN")
            print(f"   ✅ Price per sqm: ${response.get('price_per_sqm', 0):,.2f}")
            print(f"   ✅ Confidence level: {response.get('confidence_level', 'N/A')}")
            
            # Check market metrics (v2 feature)
            market_metrics = response.get('market_metrics', {})
            if market_metrics:
                print(f"   ✅ Monthly rent estimate: ${market_metrics.get('monthly_rent_estimate', 0):,.2f}")
                print(f"   ✅ Annual rent estimate: ${market_metrics.get('annual_rent_estimate', 0):,.2f}")
                print(f"   ✅ Cap rate: {market_metrics.get('cap_rate', 0):.2f}%")
                print(f"   ✅ Annual appreciation: {market_metrics.get('annual_appreciation', 0):.1f}%")
                print(f"   ✅ Rental factor used: {market_metrics.get('rental_factor_used', 0):.5f}")
                print(f"   ✅ Similar properties count: {market_metrics.get('similar_properties_count', 0)}")
            else:
                print("   ❌ No market metrics found")
            
            # Check expected result fields
            expected_fields = [
                'comparative_min_value', 'comparative_avg_value', 'comparative_max_value',
                'land_value', 'construction_new_value', 'estimated_value',
                'value_range_min', 'value_range_max', 'confidence_level', 'market_metrics'
            ]
            
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️ Missing result fields: {missing_fields}")
            else:
                print("   ✅ All expected result fields present")
                
            return True
        return False

    def test_generate_report(self):
        """Test generating AI report"""
        if not self.valuation_id:
            print("❌ No valuation ID available for report test")
            return False
            
        print("\n=== Testing Generate AI Report ===")
        
        success, response = self.run_test(
            "Generate Report",
            "POST",
            f"valuations/{self.valuation_id}/generate-report",
            200
        )
        
        if success:
            has_html = bool(response.get("report_html"))
            has_analysis = bool(response.get("analysis"))
            
            print(f"   ✅ Report HTML generated: {has_html}")
            print(f"   ✅ AI Analysis generated: {has_analysis}")
            
            if has_html:
                html_length = len(response["report_html"])
                print(f"   ✅ HTML report length: {html_length} characters")
                
                # Check if HTML contains expected elements
                html = response["report_html"]
                if "PropValu" in html and "VALOR DE MERCADO ESTIMADO" in html:
                    print("   ✅ HTML contains expected content")
                else:
                    print("   ⚠️ HTML may be missing expected content")
            
            return has_html and has_analysis
        return False

    def test_error_cases(self):
        """Test error handling"""
        print("\n=== Testing Error Cases ===")
        
        # Test invalid valuation ID
        self.run_test(
            "Invalid Valuation ID",
            "GET",
            "valuations/invalid_id",
            404
        )
        
        # Test missing required fields
        invalid_data = {
            "state": "Ciudad de México",
            # Missing required fields
        }
        
        self.run_test(
            "Missing Required Fields",
            "POST",
            "valuations",
            422  # Pydantic validation error
        )

def main():
    """Run all tests"""
    print("🚀 Starting PropValu API Testing")
    print(f"📅 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = PropValuAPITester()
    
    # Run all tests in sequence
    try:
        tester.test_health_endpoints()
        tester.test_property_types_endpoint()
        tester.test_stats_endpoint()
        valuation_created = tester.test_create_valuation()
        
        if valuation_created:
            tester.test_get_valuation()
            tester.test_generate_comparables()
            tester.test_calculate_valuation()
            tester.test_generate_report()
        else:
            print("❌ Skipping dependent tests due to valuation creation failure")
        
        tester.test_error_cases()
        
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
    
    # Print final results
    print(f"\n📊 Test Results:")
    print(f"   Total tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.valuation_id:
        print(f"\n🏠 Test valuation created: {tester.valuation_id}")
        print(f"   View at: https://valuacion-propiedad.preview.emergentagent.com/reporte/{tester.valuation_id}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())