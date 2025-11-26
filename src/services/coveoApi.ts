
import type { ConfigState, PublicListingPageRequestModel, CommercePageModelPublicListingPageResponseModel, PublicListingPageResponseModel } from '../types';

const getBaseUrl = (config: ConfigState) => config.platformUrl.replace(/\/$/, '');

export const bulkCreateListings = async (
  config: ConfigState,
  listings: PublicListingPageRequestModel[]
) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/listings/pages/bulk-create`;
  
  // Chunking to respect API limits (100 items per request max per Swagger)
  const chunkSize = 50;
  const chunks = [];
  
  for (let i = 0; i < listings.length; i += chunkSize) {
    chunks.push(listings.slice(i, i + chunkSize));
  }

  const results = [];

  for (const chunk of chunks) {
    try {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            errorMessage += `: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      results.push(data);
    } catch (error) {
      console.error("Failed to push chunk", error);
      throw error;
    }
  }

  return results;
};

export const bulkUpdateListings = async (
  config: ConfigState,
  listings: PublicListingPageRequestModel[]
) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/listings/pages/bulk-update`;
  
  const chunkSize = 50;
  const chunks = [];
  
  for (let i = 0; i < listings.length; i += chunkSize) {
    chunks.push(listings.slice(i, i + chunkSize));
  }

  const results = [];

  for (const chunk of chunks) {
    try {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            errorMessage += `: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      results.push(data);
    } catch (error) {
      console.error("Failed to update chunk", error);
      throw error;
    }
  }

  return results;
};

export const fetchAllListings = async (config: ConfigState): Promise<PublicListingPageResponseModel[]> => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/listings/pages`;
  let page = 0;
  let allItems: PublicListingPageResponseModel[] = [];
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

      const data: CommercePageModelPublicListingPageResponseModel = await response.json();
      
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

export const bulkDeleteListings = async (config: ConfigState, ids: string[]) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/listings/pages/bulk-delete`;
  const chunkSize = 50; 
  
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const response = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(chunk)
    });

    if (!response.ok) {
        throw new Error(`Failed to delete chunk: ${await response.text()}`);
    }
  }
};

// Global Search Configuration
export const getGlobalSearchConfig = async (config: ConfigState) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/configurations/search/global?trackingId=${config.trackingId}`;
  const response = await fetch(url, {
    headers: { 
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json' 
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const updateGlobalSearchConfig = async (config: ConfigState, data: unknown) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/configurations/search/global`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

// Global Listing Configuration
export const getGlobalListingConfig = async (config: ConfigState) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/configurations/listings/global?trackingId=${config.trackingId}`;
  const response = await fetch(url, {
    headers: { 
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json' 
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const updateGlobalListingConfig = async (config: ConfigState, data: unknown) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/configurations/listings/global`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

// Global Product Suggest Configuration
export const getGlobalProductSuggestConfig = async (config: ConfigState) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/configurations/productSuggest?trackingId=${config.trackingId}`;
  const response = await fetch(url, {
    headers: { 
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json' 
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const updateGlobalProductSuggestConfig = async (config: ConfigState, data: unknown) => {
  const baseUrl = getBaseUrl(config);
  // Fixed: Add trackingId to query params as required by API for PUT
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/configurations/productSuggest?trackingId=${config.trackingId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const createGlobalProductSuggestConfig = async (config: ConfigState, data: unknown) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/configurations/productSuggest`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};


// Global Recommendations Configuration (Slot Global)
export const getGlobalRecommendationsConfig = async (config: ConfigState) => {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/recommendations/slots/global/query-configuration?trackingId=${config.trackingId}`;
  const response = await fetch(url, {
    headers: { 
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json' 
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

export const updateGlobalRecommendationsConfig = async (config: ConfigState, data: unknown) => {
  const baseUrl = getBaseUrl(config);
  // Fixed: Add trackingId to query params as required by API for PUT
  const url = `${baseUrl}/rest/organizations/${config.organizationId}/commerce/v2/recommendations/slots/global/query-configuration?trackingId=${config.trackingId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};

// Fetch field values from Coveo Search API for category generation
export const fetchFieldValues = async (
  config: ConfigState, 
  field: string, 
  codeField: string,
  catalogId: string, 
  maxValues: number
): Promise<Array<{value: string, codeValue?: string, count: number}>> => {
  const baseUrl = getBaseUrl(config);
  const searchUrl = `${baseUrl}/rest/search/v2`;
  
  // Build query with catalog filter if provided
  let aq = '';
  if (catalogId) {
    aq = `@source=="${catalogId}"`;
  }
  
  // First, get the main field values with groupBy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupBy: any[] = [{
    field: field,
    sortCriteria: 'occurrences',
    maximumNumberOfValues: maxValues,
    completeFacetWithStandardValues: false
  }];
  
  const requestBody = {
    q: '',
    aq: aq,
    numberOfResults: 0,
    groupBy: groupBy
  };
  
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'organizationId': config.organizationId
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Search API Error: ${errorText}`);
  }
  
  const data = await response.json();
  
  // Extract values from the groupBy result
  const mainFieldValues = data.groupByResults?.[0]?.values || [];
  
  // If we need to fetch code values, make individual queries for each category
  // This ensures we get the correlated values properly
  const results = [];
  
  for (const item of mainFieldValues) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryValue: any = {
      value: item.value,
      count: item.numberOfResults || 0
    };
    
    // If we have a code field and it's different from the main field, fetch the correlated code value
    if (codeField && codeField !== field) {
      try {
        // Query for documents that have this specific category value
        let categoryAq = `${field}=="${item.value}"`;
        if (aq) {
          categoryAq = `${aq} AND ${categoryAq}`;
        }
        
        const codeResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'organizationId': config.organizationId
          },
          body: JSON.stringify({
            q: '',
            aq: categoryAq,
            numberOfResults: 1,
            fieldsToInclude: [codeField]
          })
        });
        
        if (codeResponse.ok) {
          const codeData = await codeResponse.json();
          if (codeData.results && codeData.results.length > 0) {
            const firstResult = codeData.results[0];
            // Get the code value from raw fields
            const codeValue = firstResult.raw?.[codeField.replace('@', '')];
            if (codeValue) {
              categoryValue.codeValue = codeValue;
            }
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // If fetching code value fails, continue without it
      }
    }
    
    results.push(categoryValue);
  }
  
  return results;
};
