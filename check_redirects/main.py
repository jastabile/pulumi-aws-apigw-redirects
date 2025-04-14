import csv
import requests
from urllib.parse import urljoin
import sys

def check_redirects(rules_file):
    # Read the CSV file
    with open(rules_file, 'r') as f:
        reader = csv.DictReader(f)
        rules = list(reader)

    base_url = "https://gateway.mydomain.com/example-path/"
    
    print("Checking redirects...\n")
    
    for rule in rules:
        source_path = rule['source_path']
        expected_destination = rule['destination_url']
        
        # Construct full URL
        source_url = urljoin(base_url, source_path.lstrip('/'))
        
        try:
            # Make request with redirect tracking
            response = requests.get(source_url, allow_redirects=True, timeout=10)
            
            final_url = response.url
            
            # Check if the final URL matches the expected destination
            if final_url != expected_destination:
                print(f"❌ Mismatch for {source_path}")
                print(f"   Expected: {expected_destination}")
                print(f"   Actually went to: {final_url}")
                print(f"   Status code: {response.status_code}")
                print()
            else:
                print(f"✅ {source_path} -> {expected_destination}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error checking {source_path}")
            print(f"   Error: {str(e)}")
            print()

if __name__ == "__main__":
    rules_file = "../rules.csv"
    check_redirects(rules_file)