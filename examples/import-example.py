#!/usr/bin/env python3
"""
Example Python script for importing listing pages via the API

Installation:
    pip install requests

Usage:
    python import-example.py [path-to-csv-file]

Environment variables:
    COVEO_ORG_ID - Your Coveo organization ID
    COVEO_TRACKING_ID - Your tracking ID
    COVEO_API_TOKEN - Your API token
    API_ENDPOINT - The import API endpoint URL
"""

import os
import sys
import json
import requests


def import_listings(csv_file_path):
    """Import listing pages from a CSV file using the API"""
    
    # Configuration
    config = {
        'organizationId': os.environ.get('COVEO_ORG_ID', 'your-organization-id'),
        'trackingId': os.environ.get('COVEO_TRACKING_ID', 'your-tracking-id'),
        'accessToken': os.environ.get('COVEO_API_TOKEN', 'your-api-token'),
        'platformUrl': os.environ.get('PLATFORM_URL', 'https://platform.cloud.coveo.com'),
        'apiEndpoint': os.environ.get('API_ENDPOINT', 'https://your-app.netlify.app/api/import')
    }
    
    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"❌ Error: CSV file not found: {csv_file_path}")
        sys.exit(1)
    
    print("🚀 Importing listing pages...")
    print(f"   File: {csv_file_path}")
    print(f"   Organization: {config['organizationId']}")
    print(f"   Tracking ID: {config['trackingId']}")
    print("")
    
    # Prepare the request
    with open(csv_file_path, 'rb') as file:
        files = {'file': file}
        data = {
            'organizationId': config['organizationId'],
            'trackingId': config['trackingId'],
            'accessToken': config['accessToken'],
            'platformUrl': config['platformUrl']
        }
        
        try:
            # Make API request
            response = requests.post(config['apiEndpoint'], files=files, data=data)
            result = response.json()
            
            if response.ok and result.get('success'):
                print("✅ Success!")
                print("")
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ Error (HTTP {response.status_code})")
                print("")
                print(json.dumps(result, indent=2))
                sys.exit(1)
                
        except requests.exceptions.RequestException as error:
            print(f"❌ Request failed: {error}")
            sys.exit(1)


if __name__ == '__main__':
    # Get CSV file path from command line or use default
    csv_file_path = sys.argv[1] if len(sys.argv) > 1 else '../samples/listings-sample.csv'
    import_listings(csv_file_path)
