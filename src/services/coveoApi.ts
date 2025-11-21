
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

// Search API V2 - List Field Values
export const listFieldValues = async (
  config: ConfigState,
  field: string,
  catalogId?: string,
  limit: number = 100
) => {
  const baseUrl = getBaseUrl(config);
  // organizationId must be a query param for Search API V2
  const url = `${baseUrl}/rest/search/v2/values?organizationId=${config.organizationId}`;

  const body: any = {
    field,
    maximumNumberOfValues: limit,
    sortCriteria: 'occurrences'
  };

  if (catalogId) {
    body.commerce = {
      catalogId,
      operation: "selectCatalogObjects"
    };
    body.queryOverride=`@source==${catalogId}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch values: ${errorText}`);
  }

  return response.json();
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

export const updateGlobalSearchConfig = async (config: ConfigState, data: any) => {
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

export const updateGlobalListingConfig = async (config: ConfigState, data: any) => {
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

export const updateGlobalProductSuggestConfig = async (config: ConfigState, data: any) => {
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

export const createGlobalProductSuggestConfig = async (config: ConfigState, data: any) => {
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

export const updateGlobalRecommendationsConfig = async (config: ConfigState, data: any) => {
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
