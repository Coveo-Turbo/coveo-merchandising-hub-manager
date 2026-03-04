/**
 * Example Node.js script for importing listing pages via the API
 * 
 * Installation:
 *   npm install form-data node-fetch@2
 * 
 * Usage:
 *   node import-example.js [path-to-csv-file]
 * 
 * Environment variables:
 *   COVEO_ORG_ID - Your Coveo organization ID
 *   COVEO_TRACKING_ID - Your tracking ID
 *   COVEO_API_TOKEN - Your API token
 *   API_ENDPOINT - The import API endpoint URL
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const config = {
  organizationId: process.env.COVEO_ORG_ID || 'your-organization-id',
  trackingId: process.env.COVEO_TRACKING_ID || 'your-tracking-id',
  accessToken: process.env.COVEO_API_TOKEN || 'your-api-token',
  platformUrl: process.env.PLATFORM_URL || 'https://platform.cloud.coveo.com',
  apiEndpoint: process.env.API_ENDPOINT || 'https://your-app.netlify.app/api/import'
};

async function importListings(csvFilePath) {
  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Importing listing pages...');
  console.log(`   File: ${csvFilePath}`);
  console.log(`   Organization: ${config.organizationId}`);
  console.log(`   Tracking ID: ${config.trackingId}`);
  console.log('');

  // Create form data
  const form = new FormData();
  form.append('file', fs.createReadStream(csvFilePath));
  form.append('organizationId', config.organizationId);
  form.append('trackingId', config.trackingId);
  form.append('accessToken', config.accessToken);
  form.append('platformUrl', config.platformUrl);

  try {
    // Make API request
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Success!');
      console.log('');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`❌ Error (HTTP ${response.status})`);
      console.error('');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Request failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Get CSV file path from command line or use default
const csvFilePath = process.argv[2] || '../samples/listings-sample.csv';

importListings(csvFilePath);
