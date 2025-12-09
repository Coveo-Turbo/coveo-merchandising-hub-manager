import Papa from 'papaparse';
import type { CsvRow, PublicListingPageRequestModel, ConfigState } from '../../src/types';
import { mapRowsToListings } from '../../src/utils/csvParser';

// API functions to interact with Coveo
const getBaseUrl = (platformUrl: string) => platformUrl.replace(/\/$/, '');

const fetchAllListings = async (config: ConfigState) => {
  const baseUrl = getBaseUrl(config.platformUrl);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/listings/pages`;
  let page = 0;
  let allItems: {id: string, name: string}[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${url}?trackingId=${config.trackingId}&page=${page}&perPage=100`, {
      cache: 'no-store',
      headers: { 
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch listings: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      hasMore = false;
    } else {
      allItems = [...allItems, ...data.items];
      if (page >= data.totalPages - 1) hasMore = false;
      page++;
    }
  }
  return allItems;
};

const bulkCreateListings = async (config: ConfigState, listings: PublicListingPageRequestModel[]) => {
  const baseUrl = getBaseUrl(config.platformUrl);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/listings/pages/bulk-create`;
  
  const chunkSize = 50;
  const chunks = [];
  
  for (let i = 0; i < listings.length; i += chunkSize) {
    chunks.push(listings.slice(i, i + chunkSize));
  }

  const results = [];

  for (const chunk of chunks) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) errorMessage += `: ${errorJson.message}`;
      } catch {
        errorMessage += `: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    results.push(data);
  }

  return results;
};

const bulkUpdateListings = async (config: ConfigState, listings: PublicListingPageRequestModel[]) => {
  const baseUrl = getBaseUrl(config.platformUrl);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/listings/pages/bulk-update`;
  
  const chunkSize = 50;
  const chunks = [];
  
  for (let i = 0; i < listings.length; i += chunkSize) {
    chunks.push(listings.slice(i, i + chunkSize));
  }

  const results = [];

  for (const chunk of chunks) {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) errorMessage += `: ${errorJson.message}`;
      } catch {
        errorMessage += `: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    results.push(data);
  }

  return results;
};

export default async (request: Request) => {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse the multipart/form-data or JSON body
    const contentType = request.headers.get('content-type') || '';
    
    let csvContent: string;
    let organizationId: string;
    let trackingId: string;
    let accessToken: string;
    let platformUrl: string;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const orgId = formData.get('organizationId') as string;
      const trkId = formData.get('trackingId') as string;
      const token = formData.get('accessToken') as string;
      const platform = formData.get('platformUrl') as string;

      if (!file) {
        return new Response(JSON.stringify({ error: 'Missing CSV file in request' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      csvContent = await file.text();
      organizationId = orgId;
      trackingId = trkId;
      accessToken = token;
      platformUrl = platform || 'https://platform.cloud.coveo.com';
    } else if (contentType.includes('application/json')) {
      // Handle JSON payload
      const body = await request.json();
      csvContent = body.csvContent;
      organizationId = body.organizationId;
      trackingId = body.trackingId;
      accessToken = body.accessToken;
      platformUrl = body.platformUrl || 'https://platform.cloud.coveo.com';
    } else {
      return new Response(JSON.stringify({ 
        error: 'Unsupported content type. Use multipart/form-data or application/json' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate required parameters
    if (!csvContent || !organizationId || !trackingId || !accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: csvContent, organizationId, trackingId, accessToken' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse CSV
    const parseResult = await new Promise<Papa.ParseResult<CsvRow>>((resolve, reject) => {
      Papa.parse<CsvRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject
      });
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'CSV parsing error',
        details: parseResult.errors 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Map rows to listings
    const listings = mapRowsToListings(parseResult.data, trackingId);

    if (listings.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No valid listings found in CSV. Ensure rows have Name, FilterField, and FilterValue columns.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create config object
    const config: ConfigState = {
      organizationId,
      trackingId,
      accessToken,
      platformUrl
    };

    // Fetch existing listings to check for duplicates (upsert logic)
    let existingListings: {id: string, name: string}[] = [];
    try {
      existingListings = await fetchAllListings(config);
    } catch (e) {
      console.warn("Could not fetch existing listings, assuming creation mode.", e);
    }

    const toCreate: PublicListingPageRequestModel[] = [];
    const toUpdate: PublicListingPageRequestModel[] = [];

    listings.forEach(parsed => {
      const existing = existingListings.find(e => e.name === parsed.name);
      if (existing) {
        toUpdate.push({ ...parsed, id: existing.id });
      } else {
        toCreate.push(parsed);
      }
    });

    // Perform operations
    const results = {
      totalParsed: listings.length,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      if (toUpdate.length > 0) {
        await bulkUpdateListings(config, toUpdate);
        results.updated = toUpdate.length;
      }

      if (toCreate.length > 0) {
        await bulkCreateListings(config, toCreate);
        results.created = toCreate.length;
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Successfully processed ${results.totalParsed} listings: ${results.created} created, ${results.updated} updated.`,
        results
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to push listings to Coveo API',
        message: errorMessage,
        results
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error("Import API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: errorMessage 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
