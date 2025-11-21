
import React, { useState, useEffect } from 'react';
import { Steps } from './components/Steps';
import type { ConfigState, CsvRow, PublicListingPageRequestModel, ListingPageApiPageRuleModel } from './types';
import { 
    bulkCreateListings, 
    bulkUpdateListings,
    fetchAllListings, 
    bulkDeleteListings, 
    getGlobalSearchConfig, 
    updateGlobalSearchConfig, 
    getGlobalListingConfig, 
    updateGlobalListingConfig,
    getGlobalProductSuggestConfig,
    updateGlobalProductSuggestConfig,
    createGlobalProductSuggestConfig,
    getGlobalRecommendationsConfig,
    updateGlobalRecommendationsConfig,
    listFieldValues
} from './services/coveoApi';
import { enhanceListingWithAI } from './services/geminiService';
import { SAMPLE_CONFIGS } from './services/sampleConfigs';
import { 
    Upload, FileText, Settings, Play, Sparkles, AlertCircle, CheckCircle, 
    ArrowRight, Globe, Trash2, Save, RefreshCw, Code, LayoutList,
    Menu, X, Bug, Plus, Trash, Link as LinkIcon, Copy, ClipboardPaste, Languages, Tag
} from 'lucide-react';
import Papa from 'papaparse';

type AppView = 'wizard' | 'global-config' | 'maintenance' | 'generator';
type GlobalConfigType = 'search' | 'listing' | 'product-suggest' | 'recommendation';

interface SharedSettings {
    perPage?: number;
    additionalFields?: string[];
    sorts?: any[];
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('wizard');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error'|'info', message: string} | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const [config, setConfig] = useState<ConfigState>({
    organizationId: '',
    trackingId: '',
    accessToken: '',
    platformUrl: 'https://platform.cloud.coveo.com' // Default to US
  });

  const [parsedListings, setParsedListings] = useState<PublicListingPageRequestModel[]>([]);
  
  // Global Config State
  const [globalConfigType, setGlobalConfigType] = useState<GlobalConfigType>('search');
  const [globalConfigData, setGlobalConfigData] = useState<any>(null);
  const [globalConfigString, setGlobalConfigString] = useState<string>('');
  
  // Shared Settings Clipboard
  const [sharedSettings, setSharedSettings] = useState<SharedSettings | null>(null);
  
  // Sort UI State
  const [pendingSortLabels, setPendingSortLabels] = useState<{language: string, value: string}[]>([]);
  const [pendingSortLang, setPendingSortLang] = useState('en');
  const [pendingSortLabelValue, setPendingSortLabelValue] = useState('');

  // Generator State
  const [genField, setGenField] = useState('@ec_category');
  const [genCatalogId, setGenCatalogId] = useState('');
  const [genLimit, setGenLimit] = useState(50);
  const [genUrlPattern, setGenUrlPattern] = useState('https://example.com/c/{{value}}');
  const [fetchedValues, setFetchedValues] = useState<{value: string, numberOfResults: number}[]>([]);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  // Developer Mode Trigger (URL or Easter Egg)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
        setDevMode(true);
    }
  }, []);

  const handleVersionClick = () => {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount === 5) {
          setDevMode(!devMode);
          setStatus({ type: 'info', message: `Developer Mode ${!devMode ? 'Enabled' : 'Disabled'}` });
          setClickCount(0);
      }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setStatus(null);
  };

  const loadSampleConfig = (index: number = 0) => {
    const sample = SAMPLE_CONFIGS[index];
    if (sample) {
        setConfig({
            organizationId: sample.organizationId,
            trackingId: sample.trackingId,
            accessToken: sample.accessToken || '',
            platformUrl: sample.platformUrl
        });
        setStatus({ type: 'success', message: `Loaded sample: ${sample.name}` });
    }
  };

  const isConfigValid = config.organizationId && config.trackingId && config.accessToken;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
            const listings = mapRowsToListings(results.data);
            setParsedListings(listings);
            setStatus({ type: 'success', message: `Successfully parsed ${listings.length} unique listings from ${results.data.length} rows.` });
            setStep(3);
        } catch (e: any) {
            setStatus({ type: 'error', message: `Parsing error: ${e.message}` });
        }
        setLoading(false);
      },
      error: (error) => {
        setStatus({ type: 'error', message: `CSV Error: ${error.message}` });
        setLoading(false);
      }
    });
  };

  const mapRowsToListings = (rows: CsvRow[]): PublicListingPageRequestModel[] => {
    const listingsMap = new Map<string, PublicListingPageRequestModel>();

    rows.forEach(row => {
        if (!row.Name) return; // Skip invalid rows

        const name = row.Name.trim();
        
        // Get existing or create new listing
        let listing = listingsMap.get(name);
        if (!listing) {
            listing = {
                name: name,
                trackingId: config.trackingId,
                patterns: [],
                pageRules: []
            };
            listingsMap.set(name, listing);
        }

        // Add URL Patterns (support multiple separated by ;)
        if (row.UrlPattern) {
            const urls = row.UrlPattern.split(';').map(u => u.trim()).filter(u => u);
            urls.forEach(url => {
                // Avoid duplicates
                if (!listing!.patterns.find(p => p.url === url)) {
                    listing!.patterns.push({ url });
                }
            });
        }

        // Add Rule if filter is present
        if (row.FilterField) {
            const localeParts = [row.Language, row.Country, row.Currency].filter(Boolean);
            const localeSuffix = localeParts.length > 0 ? ` [${localeParts.join('-')}]` : '';
            
            // Generate unique descriptive name
            const baseRuleName = `Rule: ${row.FilterField} ${row.FilterOperator || 'is'} ${row.FilterValue}${localeSuffix}`;
            
            // Ensure uniqueness within this listing page
            let ruleName = baseRuleName;
            let counter = 1;
            while (listing.pageRules.some(r => r.name === ruleName)) {
                counter++;
                ruleName = `${baseRuleName} (${counter})`;
            }

            const rule: ListingPageApiPageRuleModel = {
                name: ruleName,
                filters: [{
                    fieldName: row.FilterField,
                    operator: row.FilterOperator || 'isExactly',
                    value: {
                        type: 'string',
                        value: row.FilterValue
                    }
                }]
            };

            // Add Locale if present
            if (row.Language || row.Country || row.Currency) {
                rule.locales = [{
                    language: row.Language || undefined,
                    country: row.Country || undefined,
                    currency: row.Currency || undefined
                }];
            }

            listing.pageRules.push(rule);
        }
    });

    return Array.from(listingsMap.values());
  };

  const handleEnhanceWithAI = async (index: number) => {
    const listing = parsedListings[index];
    setLoading(true);
    try {
        const suggestion = await enhanceListingWithAI(listing.name);
        if (suggestion) {
            const updatedListings = [...parsedListings];
            
            // Ensure unique name for AI rule too
            const baseRuleName = `AI Suggested: ${suggestion.field}`;
            let ruleName = baseRuleName;
            let counter = 1;
            while (updatedListings[index].pageRules.some(r => r.name === ruleName)) {
                counter++;
                ruleName = `${baseRuleName} (${counter})`;
            }

            updatedListings[index].pageRules.push({
                name: ruleName,
                filters: [{
                    fieldName: suggestion.field,
                    operator: suggestion.operator,
                    value: { type: 'string', value: suggestion.value }
                }]
            });
            setParsedListings(updatedListings);
            setStatus({ type: 'success', message: `Enhanced "${listing.name}" with AI rule.` });
        } else {
            setStatus({ type: 'info', message: 'AI could not generate a confident suggestion.' });
        }
    } catch (e) {
        setStatus({ type: 'error', message: 'AI enhancement failed.' });
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus(null);
    try {
      // 1. Fetch existing listings to check for duplicates (Upsert logic)
      let existingListings: {id: string, name: string}[] = [];
      try {
          existingListings = await fetchAllListings(config);
      } catch (e) {
          console.warn("Could not fetch existing listings, assuming creation mode.", e);
      }

      const toCreate: PublicListingPageRequestModel[] = [];
      const toUpdate: PublicListingPageRequestModel[] = [];

      parsedListings.forEach(parsed => {
          const existing = existingListings.find(e => e.name === parsed.name);
          if (existing) {
              toUpdate.push({ ...parsed, id: existing.id });
          } else {
              toCreate.push(parsed);
          }
      });

      let message = "";

      // 2. Perform Updates
      if (toUpdate.length > 0) {
          await bulkUpdateListings(config, toUpdate);
          message += `Updated ${toUpdate.length} listings. `;
      }

      // 3. Perform Creations
      if (toCreate.length > 0) {
          await bulkCreateListings(config, toCreate);
          message += `Created ${toCreate.length} listings. `;
      }

      setStatus({ type: 'success', message: message || "No changes needed." });
      if (toCreate.length > 0 || toUpdate.length > 0) {
          setStep(4); // Move to Done
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    }
    setLoading(false);
  };

  const handleDeleteAllListings = async () => {
      setLoading(true);
      setStatus({ type: 'info', message: 'Fetching all listings...' });
      try {
          const allListings = await fetchAllListings(config);
          const ids = allListings.map(l => l.id);
          
          if (ids.length === 0) {
              setStatus({ type: 'info', message: 'No listings found to delete.' });
              setLoading(false);
              setIsDeleteConfirming(false);
              return;
          }

          setStatus({ type: 'info', message: `Deleting ${ids.length} listings...` });
          await bulkDeleteListings(config, ids);
          setStatus({ type: 'success', message: `Successfully deleted ${ids.length} listings.` });
      } catch (error: any) {
          console.error("Delete error", error);
          setStatus({ type: 'error', message: `Deletion failed: ${error.message}` });
      }
      setLoading(false);
      setIsDeleteConfirming(false);
  };

  // --- Category Generator Handlers ---
  
  const handleFetchCategories = async () => {
    setLoading(true);
    setStatus(null);
    try {
        const response = await listFieldValues(config, genField, genCatalogId || undefined, genLimit);
        setFetchedValues(response.values || []);
        setStatus({ type: 'success', message: `Fetched ${response.values?.length || 0} values.` });
    } catch (error: any) {
        setStatus({ type: 'error', message: `Failed to fetch values: ${error.message}` });
    }
    setLoading(false);
  };

  const toggleValueSelection = (value: string) => {
      const newSet = new Set(selectedValues);
      if (newSet.has(value)) {
          newSet.delete(value);
      } else {
          newSet.add(value);
      }
      setSelectedValues(newSet);
  };

  const handleGenerateListings = () => {
    const newListings: PublicListingPageRequestModel[] = [];
    const cleanField = genField.startsWith('@') ? genField.substring(1) : genField;

    selectedValues.forEach(value => {
        const url = genUrlPattern.replace('{{value}}', value)
            .replace('{{value_slug}}', value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        
        // Avoid duplicate rules in parsing logic
        const ruleName = `Auto: ${cleanField} is ${value}`;

        const listing: PublicListingPageRequestModel = {
            name: value,
            trackingId: config.trackingId,
            patterns: [{ url }],
            pageRules: [{
                name: ruleName,
                filters: [{
                    fieldName: cleanField,
                    operator: 'isExactly',
                    value: { type: 'string', value: value }
                }]
            }]
        };
        newListings.push(listing);
    });

    // Merge with any existing parsed listings if user went back and forth
    const merged = [...parsedListings, ...newListings];
    setParsedListings(merged);
    
    // Reset generator state
    setFetchedValues([]);
    setSelectedValues(new Set());
    
    // Switch to Preview
    setView('wizard');
    setStep(3);
    setStatus({ type: 'success', message: `Generated ${newListings.length} new listing configurations. Please review.` });
  };

  // --- Global Config Handlers ---

  const handleFetchGlobal = async () => {
      setLoading(true);
      setStatus(null);
      try {
          let data;
          if (globalConfigType === 'search') {
             data = await getGlobalSearchConfig(config);
             if (data.id === null) {
                 // Inject default template if not configured
                 data = {
                     ...data,
                     queryConfiguration: {
                         perPage: 24,
                         additionalFields: [],
                         sorts: []
                     },
                     rules: { rankingRules: [], filterRules: [], pinRules: [] }
                 };
                 setStatus({ type: 'info', message: 'Global Search not yet configured. Loaded default template.' });
             }
          } else if (globalConfigType === 'listing') {
             data = await getGlobalListingConfig(config);
          } else if (globalConfigType === 'product-suggest') {
             try {
                data = await getGlobalProductSuggestConfig(config);
             } catch (e: any) {
                if (e.message && e.message.includes('NOT_FOUND')) {
                    data = {
                        trackingId: config.trackingId,
                        queryConfiguration: { additionalFields: [], perPage: 10 }
                    };
                    setStatus({ type: 'info', message: 'Configuration not found. Loaded default template.' });
                } else {
                    throw e;
                }
             }
          } else if (globalConfigType === 'recommendation') {
             try {
                 data = await getGlobalRecommendationsConfig(config);
             } catch (e: any) {
                 data = {
                     additionalFields: [],
                     perPage: 5
                 };
                 setStatus({ type: 'info', message: 'Global Recommendation config could not be fetched. Loaded default template.' });
             }
          }
          
          setGlobalConfigData(data);
          setGlobalConfigString(JSON.stringify(data, null, 2));
      } catch (error: any) {
          setStatus({ type: 'error', message: `Failed to fetch config: ${error.message}` });
      }
      setLoading(false);
  };

  const handleSaveGlobal = async () => {
      setLoading(true);
      setStatus(null);
      try {
          const parsedData = JSON.parse(globalConfigString);
          
          if (globalConfigType === 'search') {
             await updateGlobalSearchConfig(config, parsedData);
          } else if (globalConfigType === 'listing') {
             await updateGlobalListingConfig(config, parsedData);
          } else if (globalConfigType === 'product-suggest') {
             try {
                await updateGlobalProductSuggestConfig(config, parsedData);
             } catch (e: any) {
                 console.warn("Product Suggest Update failed, attempting creation. Error:", e);
                 // If update fails, try create. 
                 // Note: Update might fail with 404 (if new) or 400 (if malformed). 
                 // If malformed, Create will likely fail too.
                 await createGlobalProductSuggestConfig(config, parsedData);
             }
          } else if (globalConfigType === 'recommendation') {
             await updateGlobalRecommendationsConfig(config, parsedData);
          }

          setStatus({ type: 'success', message: 'Configuration saved successfully.' });
          handleFetchGlobal(); // Refresh
      } catch (error: any) {
          setStatus({ type: 'error', message: `Failed to save: ${error.message}` });
      }
      setLoading(false);
  };

  // --- Renderers ---

  const renderCommonSettings = () => {
    if (!globalConfigData) return null;

    // Support nested queryConfiguration or direct object (depending on endpoint)
    const qc = globalConfigData.queryConfiguration || globalConfigData;
    
    const updateField = (key: string, value: any) => {
        let newData;
        if (globalConfigData.queryConfiguration) {
            newData = { 
                ...globalConfigData, 
                queryConfiguration: { ...globalConfigData.queryConfiguration, [key]: value } 
            };
        } else {
            // For simple endpoints that might return the config directly
            newData = { ...globalConfigData, [key]: value };
        }
        setGlobalConfigData(newData);
        setGlobalConfigString(JSON.stringify(newData, null, 2));
    };

    const handleCopySettings = () => {
        const settings: SharedSettings = {
            perPage: qc.perPage,
            additionalFields: qc.additionalFields || [],
            sorts: qc.sorts
        };
        setSharedSettings(settings);
        setStatus({ type: 'success', message: 'Settings copied to clipboard' });
    };

    const handlePasteSettings = () => {
        if (!sharedSettings) return;
        
        let newQc = { ...qc };
        if (sharedSettings.perPage !== undefined) newQc.perPage = sharedSettings.perPage;
        if (sharedSettings.additionalFields) newQc.additionalFields = sharedSettings.additionalFields;
        
        // Only paste sorts if allowed for this type
        if (!['recommendation', 'product-suggest'].includes(globalConfigType) && sharedSettings.sorts) {
            newQc.sorts = sharedSettings.sorts;
        }

        let newData;
        if (globalConfigData.queryConfiguration) {
            newData = { ...globalConfigData, queryConfiguration: newQc };
        } else {
            newData = { ...globalConfigData, ...newQc };
        }

        setGlobalConfigData(newData);
        setGlobalConfigString(JSON.stringify(newData, null, 2));
        setStatus({ type: 'success', message: 'Settings applied from clipboard' });
    };

    const addListString = (listKey: string, value: string) => {
        if (!value) return;
        const currentList = qc[listKey] || [];
        if (!currentList.includes(value)) {
            updateField(listKey, [...currentList, value]);
        }
    };

    const removeListString = (listKey: string, value: string) => {
        const currentList = qc[listKey] || [];
        updateField(listKey, currentList.filter((item: string) => item !== value));
    };

    // Sort Handlers
    const sorts = qc.sorts || [];
    
    const addSort = (criteria: string, field?: string, direction?: string) => {
        const newSort = criteria === 'relevance' 
            ? { sortCriteria: 'relevance' }
            : { 
                sortCriteria: 'fields', 
                fields: [{ 
                    field, 
                    direction, 
                    displayNames: pendingSortLabels.length > 0 ? pendingSortLabels : [{ language: 'en', value: field }]
                }] 
            };
        updateField('sorts', [...sorts, newSort]);
        setPendingSortLabels([]);
        setPendingSortLabelValue('');
    };
    
    const removeSort = (index: number) => {
        const newSorts = [...sorts];
        newSorts.splice(index, 1);
        updateField('sorts', newSorts);
    };

    const addPendingLabel = () => {
        if (pendingSortLabelValue && pendingSortLang) {
            setPendingSortLabels([...pendingSortLabels, { language: pendingSortLang, value: pendingSortLabelValue }]);
            setPendingSortLabelValue('');
        }
    };

    return (
        <div className="bg-white p-6 border border-gray-200 rounded-xl mb-6 shadow-sm transition-all">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="text-sm font-bold text-coveo-dark uppercase tracking-wide">Common Settings</h3>
                 <div className="flex space-x-2">
                    <button 
                        onClick={handleCopySettings}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                        title="Copy settings"
                    >
                        <Copy className="w-3 h-3 mr-1.5" /> Copy
                    </button>
                    <button 
                        onClick={handlePasteSettings}
                        disabled={!sharedSettings}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-coveo-blue bg-blue-50 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Paste settings"
                    >
                        <ClipboardPaste className="w-3 h-3 mr-1.5" /> Paste
                    </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Per Page */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Results Per Page</label>
                    <input 
                        type="number" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue transition-all"
                        value={qc.perPage || 0}
                        onChange={(e) => updateField('perPage', parseInt(e.target.value))}
                    />
                </div>

                {/* Additional Fields */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Fields</label>
                    <div className="flex gap-2 mb-2">
                        <input 
                            id="newFieldInput"
                            type="text" 
                            className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue"
                            placeholder="e.g. ec_brand"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    addListString('additionalFields', e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                        <button 
                            onClick={() => {
                                const input = document.getElementById('newFieldInput') as HTMLInputElement;
                                addListString('additionalFields', input.value);
                                input.value = '';
                            }}
                            className="p-2.5 bg-coveo-light text-coveo-blue rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(qc.additionalFields || []).map((field: string) => (
                            <span key={field} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {field}
                                <button onClick={() => removeListString('additionalFields', field)} className="ml-1.5 text-blue-400 hover:text-blue-600">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sort Config (Only for Search and Listing) */}
            {!['recommendation', 'product-suggest'].includes(globalConfigType) && (
                <div className="mt-8 border-t border-gray-100 pt-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Sort Configuration</label>
                    
                    {/* Existing Sorts */}
                    <div className="space-y-2 mb-4">
                        {sorts.length === 0 && <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-md">No sorts configured.</p>}
                        {sorts.map((sort: any, idx: number) => (
                            <div key={idx} className="flex items-start justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm group hover:border-coveo-blue transition-all">
                                <div>
                                    {sort.sortCriteria === 'relevance' ? (
                                        <span className="font-semibold text-gray-700 flex items-center"><Sparkles className="w-3 h-3 mr-2 text-coveo-purple"/>Relevance</span>
                                    ) : (
                                        <div className="flex flex-col">
                                            <div className="flex items-center mb-1">
                                                <span className="font-semibold text-coveo-blue mr-2">{sort.fields?.[0]?.field}</span> 
                                                <span className="uppercase text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{sort.fields?.[0]?.direction}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {sort.fields?.[0]?.displayNames?.map((dn: any, dnIdx: number) => (
                                                    <span key={dnIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-50 text-gray-600 border border-gray-200">
                                                        <span className="font-bold mr-1">{dn.language}:</span> {dn.value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removeSort(idx)} className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors">
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New Sort */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                <select id="newSortType" className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-coveo-blue">
                                    <option value="relevance">Relevance</option>
                                    <option value="field">Field</option>
                                </select>
                            </div>
                            <div className="flex-[2]" id="fieldInputs">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Field Name</label>
                                <input type="text" id="newSortField" placeholder="e.g. ec_price" className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-coveo-blue" />
                            </div>
                            <div className="w-24">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Order</label>
                                <select id="newSortDir" className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-coveo-blue">
                                    <option value="desc">Desc</option>
                                    <option value="asc">Asc</option>
                                </select>
                            </div>
                        </div>

                        {/* Display Name Builder */}
                        <div id="labelInputs" className="pt-2 border-t border-gray-200">
                             <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center">
                                <Languages className="w-3 h-3 mr-1"/> Display Names (Required for Field Sort)
                             </label>
                             <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    className="w-16 p-2 border border-gray-300 rounded-md text-sm text-center" 
                                    placeholder="en" 
                                    value={pendingSortLang}
                                    onChange={(e) => setPendingSortLang(e.target.value)}
                                />
                                <input 
                                    type="text" 
                                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm" 
                                    placeholder="Label (e.g. Price)" 
                                    value={pendingSortLabelValue}
                                    onChange={(e) => setPendingSortLabelValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addPendingLabel()}
                                />
                                <button onClick={addPendingLabel} className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-bold"><Plus className="w-3 h-3"/></button>
                             </div>
                             
                             {pendingSortLabels.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {pendingSortLabels.map((lbl, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                            <span className="font-bold mr-1">{lbl.language}:</span> {lbl.value}
                                            <button onClick={() => setPendingSortLabels(pendingSortLabels.filter((_, i) => i !== idx))} className="ml-1.5 hover:text-red-500"><X className="w-3 h-3"/></button>
                                        </span>
                                    ))}
                                </div>
                             )}
                        </div>

                        <button 
                            onClick={() => {
                                const type = (document.getElementById('newSortType') as HTMLSelectElement).value;
                                if (type === 'relevance') {
                                    addSort('relevance');
                                } else {
                                    const field = (document.getElementById('newSortField') as HTMLInputElement).value;
                                    const dir = (document.getElementById('newSortDir') as HTMLSelectElement).value;
                                    if (field) {
                                        if (pendingSortLabels.length === 0) {
                                            alert("Please add at least one Display Name.");
                                            return;
                                        }
                                        addSort('fields', field, dir || 'desc');
                                        (document.getElementById('newSortField') as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                            className="w-full h-9 bg-coveo-blue text-white rounded-md hover:bg-blue-800 shadow-sm text-sm font-medium transition-colors"
                        >
                            Add Sort Configuration
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderCategoryGenerator = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-coveo-dark mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-coveo-blue" />
                Fetch Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Field</label>
                    <input 
                        type="text" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue"
                        value={genField}
                        onChange={(e) => setGenField(e.target.value)}
                        placeholder="@ec_category"
                    />
                    <p className="text-xs text-gray-500 mt-1">Include the '@' prefix.</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Catalog ID (Optional)</label>
                    <input 
                        type="text" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue"
                        value={genCatalogId}
                        onChange={(e) => setGenCatalogId(e.target.value)}
                        placeholder="e.g. my-catalog"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Max Values</label>
                    <input 
                        type="number" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue"
                        value={genLimit}
                        onChange={(e) => setGenLimit(parseInt(e.target.value))}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">URL Pattern</label>
                    <input 
                        type="text" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue"
                        value={genUrlPattern}
                        onChange={(e) => setGenUrlPattern(e.target.value)}
                        placeholder="https://site.com/c/{{value}}"
                    />
                     <p className="text-xs text-gray-500 mt-1">Use <span className="font-mono bg-gray-100 px-1 rounded">{'{{value}}'}</span> or <span className="font-mono bg-gray-100 px-1 rounded">{'{{value_slug}}'}</span> as placeholders.</p>
                </div>
            </div>
            <button 
                onClick={handleFetchCategories}
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-coveo-blue hover:bg-blue-800 focus:outline-none transition-colors"
            >
                {loading ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : 'Fetch Values'}
            </button>
        </div>

        {fetchedValues.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h4 className="font-bold text-gray-700">Select Values to Generate</h4>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{selectedValues.size} selected</span>
                        <button 
                            onClick={handleGenerateListings}
                            disabled={selectedValues.size === 0}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            Generate & Review <ArrowRight className="w-4 h-4 ml-1.5" />
                        </button>
                    </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-coveo-blue focus:ring-coveo-blue"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedValues(new Set(fetchedValues.map(v => v.value)));
                                            } else {
                                                setSelectedValues(new Set());
                                            }
                                        }}
                                        checked={fetchedValues.length > 0 && selectedValues.size === fetchedValues.length}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Value</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Occurrences</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {fetchedValues.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-coveo-blue focus:ring-coveo-blue"
                                            checked={selectedValues.has(item.value)}
                                            onChange={() => toggleValueSelection(item.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.value}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.numberOfResults}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );

  const renderConfigForm = () => (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <div className="grid grid-cols-1 gap-6">
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Organization ID</label>
            <input 
            type="text" 
            name="organizationId"
            value={config.organizationId}
            onChange={handleConfigChange}
            className="block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-coveo-blue focus:ring-2 focus:ring-coveo-blue/20 transition-all" 
            placeholder="e.g. myorganization"
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tracking ID</label>
            <input 
            type="text" 
            name="trackingId"
            value={config.trackingId}
            onChange={handleConfigChange}
            className="block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-coveo-blue focus:ring-2 focus:ring-coveo-blue/20 transition-all" 
            placeholder="e.g. ecommerce-site"
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Region</label>
            <select
            name="platformUrl"
            value={config.platformUrl}
            onChange={handleConfigChange}
            className="block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-coveo-blue focus:ring-2 focus:ring-coveo-blue/20 transition-all"
            >
                <option value="https://platform.cloud.coveo.com">US (platform.cloud.coveo.com)</option>
                <option value="https://platform-ca.cloud.coveo.com">Canada (platform-ca.cloud.coveo.com)</option>
                <option value="https://platform-eu.cloud.coveo.com">Europe (platform-eu.cloud.coveo.com)</option>
                <option value="https://platform-au.cloud.coveo.com">Australia (platform-au.cloud.coveo.com)</option>
            </select>
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Access Token</label>
            <input 
            type="password" 
            name="accessToken"
            value={config.accessToken}
            onChange={handleConfigChange}
            className="block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-coveo-blue focus:ring-2 focus:ring-coveo-blue/20 transition-all" 
            placeholder="xx-xxxx-xxxx-xxxx"
            />
        </div>
      </div>
      
      <div className="flex gap-4 pt-4">
        <button 
          onClick={() => setStep(2)}
          disabled={!isConfigValid}
          className="flex-1 flex justify-center items-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-coveo-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coveo-orange disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
        >
          Connect <ArrowRight className="ml-2 h-5 w-5" />
        </button>
        {devMode && (
            SAMPLE_CONFIGS.length > 1 ? (
                <select 
                    onChange={(e) => loadSampleConfig(parseInt(e.target.value))}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-coveo-blue/20 transition-all"
                    defaultValue=""
                >
                    <option value="" disabled>Load Sample...</option>
                    {SAMPLE_CONFIGS.map((sample, idx) => (
                        <option key={idx} value={idx}>{sample.name}</option>
                    ))}
                </select>
            ) : (
                <button 
                    onClick={() => loadSampleConfig(0)}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                >
                    Load Sample
                </button>
            )
        )}
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="max-w-3xl mx-auto text-center space-y-8">
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-16 hover:border-coveo-blue hover:bg-blue-50/50 transition-all cursor-pointer bg-white group">
        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Upload className="h-10 w-10 text-coveo-blue" />
        </div>
        <div className="mt-4 flex flex-col items-center text-sm text-gray-600 justify-center">
          <label className="relative cursor-pointer rounded-md font-bold text-coveo-blue focus-within:outline-none hover:text-blue-700 text-lg">
            <span>Click to upload CSV</span>
            <input type="file" className="sr-only" accept=".csv" onChange={handleFileUpload} />
          </label>
          <p className="mt-2 text-gray-500">or drag and drop your file here</p>
        </div>
        <p className="text-xs text-gray-400 mt-6 font-mono bg-gray-50 inline-block px-2 py-1 rounded">Required: Name, UrlPattern, FilterField, FilterValue</p>
      </div>
      
      <div className="text-left bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 shadow-sm">
        <h4 className="text-sm font-bold text-coveo-blue mb-3 flex items-center">
            <FileText className="w-5 h-5 mr-2" /> Example CSV Structure
        </h4>
        <pre className="text-xs text-slate-700 overflow-x-auto p-4 bg-white rounded-lg border border-slate-200 font-mono leading-relaxed shadow-inner">
          Name,UrlPattern,FilterField,FilterValue,Language<br/>
          "Summer Sale","https://site.com/summer",ec_category,Summer,en<br/>
          "Summer Sale","https://site.com/ete",ec_category,Ete,fr<br/>
          "Summer Sale","https://site.com/summer-promo",,,en
        </pre>
        <div className="text-sm text-slate-600 mt-4 space-y-2 pl-2 border-l-4 border-coveo-blue/30">
            <p className="font-medium">Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Rows with the same <strong>Name</strong> are merged into a single Listing Configuration.</li>
                <li>Use multiple rows to define <strong>arrays of URL patterns</strong> or <strong>locale-specific rules</strong>.</li>
                <li>You can also separate multiple URLs in a single cell using semicolons (;).</li>
            </ul>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
            <h3 className="text-lg font-bold text-coveo-dark">Configuration Preview</h3>
            <p className="text-sm text-gray-500">Review your listings before pushing to Coveo.</p>
        </div>
        <span className="px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-coveo-blue border border-blue-200">
          {parsedListings.length} Listings Found
        </span>
      </div>

      {/* Table Container with expanded height for Preview Step */}
      <div className={`overflow-y-auto border border-gray-200 rounded-xl shadow-sm bg-white ${step === 3 ? 'h-[75vh]' : 'max-h-[500px]'}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Page Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">URL Patterns</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Rules</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parsedListings.map((listing, idx) => (
              <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-coveo-dark align-top">{listing.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 align-top">
                  <div className="flex flex-wrap gap-2">
                      {listing.patterns.length > 0 ? listing.patterns.map((p, pIdx) => (
                          <span key={pIdx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 max-w-full truncate hover:bg-white hover:border-coveo-blue/50 transition-colors" title={p.url}>
                              <LinkIcon className="w-3 h-3 mr-1.5 flex-shrink-0 opacity-50" />
                              <span className="truncate max-w-[200px]">{p.url}</span>
                          </span>
                      )) : (
                          <span className="text-gray-400 italic text-xs">No patterns</span>
                      )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 align-top">
                  <ul className="space-y-3">
                    {listing.pageRules.map((rule, rIdx) => (
                        <li key={rIdx} className="flex items-start text-xs">
                            <div className={`px-3 py-2 rounded-lg border w-full shadow-sm ${rule.name.includes('AI Suggested') ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-200'}`}>
                                <div className={`font-semibold ${rule.name.includes('AI Suggested') ? 'text-coveo-purple' : 'text-gray-800'}`}>
                                    {rule.name.includes('AI Suggested') && <Sparkles className="w-3 h-3 inline mr-1"/>}
                                    {rule.name}
                                </div>
                                <div className="mt-1.5 text-gray-600 font-mono bg-gray-50/50 p-1 rounded">
                                    {rule.filters.map(f => `${f.fieldName} ${f.operator} "${f.value.value}"`).join(', ')}
                                </div>
                                {rule.locales && rule.locales.length > 0 && (
                                    <div className="mt-2 pt-1 border-t border-gray-100 flex items-center text-gray-400 text-[10px] uppercase tracking-wide">
                                        <Globe className="w-3 h-3 mr-1.5"/>
                                        {[rule.locales[0].language, rule.locales[0].country].filter(Boolean).join('-')}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                  </ul>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                  <button 
                    onClick={() => handleEnhanceWithAI(idx)}
                    className="group flex items-center px-3 py-2 text-xs font-medium rounded-md text-coveo-purple bg-purple-50 hover:bg-coveo-purple hover:text-white transition-all"
                    disabled={loading}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5 group-hover:animate-pulse" />
                    AI Enhance
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center py-3 px-8 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 transform hover:-translate-y-0.5 transition-all"
        >
          {loading ? <RefreshCw className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
          Push to CMH
        </button>
      </div>
    </div>
  );

  const renderGlobalConfig = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center mb-6 bg-gray-50 p-2 rounded-lg border border-gray-200">
             <div className="flex space-x-1">
                 {(['search', 'listing', 'product-suggest', 'recommendation'] as GlobalConfigType[]).map(type => (
                     <button
                        key={type}
                        onClick={() => { setGlobalConfigType(type); setGlobalConfigData(null); setGlobalConfigString(''); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            globalConfigType === type 
                            ? 'bg-white text-coveo-blue shadow-sm ring-1 ring-gray-200' 
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                     >
                         {type === 'product-suggest' ? 'Product Suggest' : type.charAt(0).toUpperCase() + type.slice(1)}
                     </button>
                 ))}
             </div>
             <button 
                onClick={handleFetchGlobal}
                disabled={!isConfigValid || loading}
                className="flex items-center px-4 py-2 bg-coveo-blue text-white rounded-md text-sm font-medium hover:bg-blue-800 shadow-sm transition-colors disabled:bg-gray-300"
             >
                 <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                 Load Config
             </button>
          </div>

          {!isConfigValid && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-lg flex items-center shadow-sm">
                  <AlertCircle className="w-5 h-5 mr-3" />
                  Please configure your connection in the Wizard tab first.
              </div>
          )}

          {globalConfigData && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderCommonSettings()}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg opacity-50 group-hover:opacity-100 transition duration-200 blur"></div>
                    <div className="relative">
                        <textarea
                            value={globalConfigString}
                            onChange={(e) => setGlobalConfigString(e.target.value)}
                            className="w-full h-[600px] font-mono text-sm p-6 border border-gray-200 rounded-lg bg-slate-900 text-slate-50 focus:ring-2 focus:ring-coveo-blue focus:border-transparent shadow-inner leading-relaxed"
                            spellCheck={false}
                        />
                        <div className="absolute top-4 right-4">
                            <button
                                onClick={handleSaveGlobal}
                                disabled={loading}
                                className="flex items-center px-5 py-2.5 bg-coveo-orange text-white rounded-md shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Config
                            </button>
                        </div>
                    </div>
                </div>
             </div>
          )}
      </div>
  );

  const renderMaintenance = () => (
      <div className="max-w-3xl mx-auto space-y-8 py-12">
          <div className="bg-white border border-red-100 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start">
                  <div className="flex-shrink-0 bg-red-100 p-3 rounded-full">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-6 flex-1">
                      <h3 className="text-xl font-bold text-gray-900">Danger Zone: Delete All Listings</h3>
                      <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                          <p>
                              This action will permanently delete <strong>ALL</strong> listing pages associated with the tracking ID 
                              <span className="font-mono bg-gray-100 px-2 py-0.5 mx-1 rounded text-red-600 font-bold border border-gray-200">{config.trackingId}</span>.
                          </p>
                          <p className="mt-2">
                              This allows you to reset your environment. Please ensure you have backups of your configurations (e.g., CSV files) before proceeding.
                          </p>
                      </div>
                      <div className="mt-8">
                          {!isDeleteConfirming ? (
                              <button
                                  onClick={() => setIsDeleteConfirming(true)}
                                  disabled={!isConfigValid || loading}
                                  className="inline-flex items-center px-6 py-3 border border-red-200 text-sm font-bold rounded-lg shadow-sm text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                              >
                                  <Trash2 className="w-5 h-5 mr-2" />
                                  Delete All Listings
                              </button>
                          ) : (
                              <div className="flex items-center space-x-4 bg-red-50 p-4 rounded-lg border border-red-100 animate-in fade-in zoom-in duration-200">
                                  <span className="text-sm font-medium text-red-800">Are you sure?</span>
                                  <button
                                      onClick={handleDeleteAllListings}
                                      disabled={loading}
                                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                  >
                                      {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                                  </button>
                                  <button
                                      onClick={() => setIsDeleteConfirming(false)}
                                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                  >
                                      Cancel
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const navItems = [
      { id: 'wizard', label: 'Import Wizard', icon: LayoutList },
      { id: 'generator', label: 'Category Generator', icon: Tag },
      { id: 'global-config', label: 'Global Config', icon: Code },
      { id: 'maintenance', label: 'Maintenance', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-coveo-blue/20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
               {/* Coveo Logo SVG */}
               <div className="w-8 h-8 transition-transform hover:scale-105">
                 <svg viewBox='0 0 104 104' fill='none' xmlns='http://www.w3.org/2000/svg'><g clip-path='url(#clip0_3523_79576)'><path d='M88.9098 15.003C79.9589 6.10373 68.4937 1.10413 56.7268 0.00422152C55.3188 -0.0957704 54.5142 1.60409 55.5199 2.60401L74.3269 21.3025C74.4275 21.4025 74.3269 21.6025 74.1257 21.5025C68.6949 17.6028 62.56 15.403 56.2239 14.803C55.2182 14.703 54.7153 15.9029 55.4193 16.6029L68.2926 29.4018C68.3931 29.5018 68.2926 29.7018 68.0914 29.6018C64.5714 27.202 60.5485 25.8021 56.4251 25.4022C55.7211 25.3022 55.3188 26.2021 55.8216 26.6021L77.6458 48.3003C78.1486 48.8003 78.9532 48.4003 78.8526 47.7004C78.4504 43.6007 77.0423 39.601 74.6286 36.1013C74.528 36.0013 74.7292 35.8013 74.8298 35.9013L87.2001 48.2003C87.9041 48.9003 89.111 48.3003 89.0104 47.4004C88.5076 41.2009 86.295 35.0014 82.3727 29.7018C82.2721 29.6018 82.4732 29.4018 82.5738 29.5018L101.381 48.2003C102.387 49.2002 104.096 48.4003 103.996 46.9004C102.889 35.3014 97.8608 23.9023 88.9098 15.003Z' fill='#00ADFF'/><path d='M15.0901 15.003C24.041 97.8963 35.5062 1.10413 47.2731 0.00422152C48.6811 -0.0957704 49.4857 1.60409 48.48 2.60401L29.673 21.3025C29.5724 21.4025 29.673 21.6025 29.8741 21.5025C35.305 17.6028 41.4399 15.403 47.776 14.803C48.7817 14.703 49.2845 15.9029 48.5805 16.6029L35.7073 29.4018C35.6068 29.5018 35.7073 29.7018 35.9085 29.6018C39.4285 27.202 43.4514 25.8021 47.5748 25.4022C48.2788 25.3022 48.6811 26.2021 48.1783 26.6021L26.3541 48.4003C25.8513 48.9003 25.0467 48.5003 25.1473 47.8003C25.5495 43.7007 26.9576 39.701 29.3713 36.2013C29.4719 36.1013 29.2707 35.9013 29.1701 36.0013L16.7998 48.3003C16.0958 49.0002 14.8889 48.4003 14.9895 47.5004C15.5929 41.2009 17.8055 35.0014 21.7278 29.7018C21.8284 29.6018 21.6272 29.4018 21.5267 29.5018L2.61912 48.2003C1.6134 49.2002 -0.096326 48.4003 0.00424601 46.9004C1.11054 35.3014 6.13914 23.9023 15.0901 15.003Z' fill='#F05245'/><path d='M15.0901 88.997C24.041 97.8963 35.5062 102.896 47.2731 103.996C48.6811 104.096 49.4857 102.396 48.48 101.396L29.673 82.6975C29.5724 82.5975 29.673 82.3975 29.8741 82.4975C35.305 86.3972 41.4399 88.597 47.776 89.197C48.7817 89.297 49.2845 88.0971 48.5805 87.3971L35.7073 74.5982C35.6068 74.4982 35.7073 74.2982 35.9085 74.3982C39.4285 76.798 43.4514 78.1979 47.5748 78.5978C48.2788 78.6978 48.6811 77.7979 48.1783 77.3979L26.3541 55.5997C25.8513 55.0997 25.0467 55.4997 25.1473 56.1997C25.5495 60.2993 26.9576 64.299 29.3713 67.7987C29.4719 67.8987 29.2707 68.0987 29.1701 67.9987L16.7998 55.6997C16.0958 54.9998 14.8889 55.5997 14.9895 56.4996C15.5929 62.7991 17.8055 68.9986 21.7278 74.2982C21.8284 74.3982 21.6272 74.5982 21.5267 74.4982L2.61912 55.7997C1.6134 54.7998 -0.096326 55.5997 0.00424601 57.0996C1.11054 68.6986 6.13914 80.0977 15.0901 88.997Z' fill='#1CEBCF'/><path d='M88.9098 88.997C79.9589 97.8963 68.4937 102.896 56.7268 103.996C55.3188 104.096 54.5142 102.396 55.5199 101.396L74.3269 82.6975C74.4275 82.5975 74.3269 82.3975 74.1257 82.4975C68.6949 86.3972 62.56 88.597 56.2239 89.197C55.2182 89.2969 54.7153 88.097 55.4193 87.3971L68.2926 74.5981C68.3931 74.4981 68.2926 74.2982 68.0914 74.3982C64.5714 76.798 60.5485 78.1978 56.4251 78.5978C55.7211 78.6978 55.3188 77.7979 55.8216 77.3979L77.6458 55.6997C78.1486 55.1997 78.9532 55.5997 78.8526 56.2996C78.4504 60.3993 77.0423 64.399 74.6286 67.8987C74.528 67.9987 74.7292 68.1987 74.8298 68.0987L87.2001 55.7997C87.9041 55.0997 89.111 55.6997 89.0104 56.5996C88.5076 62.7991 86.295 68.9986 82.3727 74.3982C82.2721 74.4981 82.4732 74.6981 82.5738 74.5981L101.381 55.8997C102.387 54.8997 104.096 55.6997 103.996 57.1996C102.889 68.6986 97.8608 80.0977 88.9098 88.997Z' fill='#FFE300'/></g><defs><clipPath id='clip0_3523_79576'><rect width='104' height='104' fill='white'/></clipPath></defs></svg>
               </div>
              <div className="flex flex-col justify-center">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-coveo-blue to-blue-600 bg-clip-text text-transparent">
                    Coveo Merchandising Hub Manager
                  </h1>
                  <div className="flex items-center space-x-2">
                      <span onClick={handleVersionClick} className="text-[10px] font-semibold text-gray-400 cursor-default hover:text-coveo-blue tracking-wider">V1.2</span>
                      {devMode && <span className="text-[10px] bg-coveo-orange text-white px-1.5 py-0.5 rounded-full font-bold tracking-wide shadow-sm">DEV MODE</span>}
                  </div>
              </div>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => isConfigValid && setView(item.id as AppView)}
                        className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            view === item.id 
                                ? 'text-white bg-coveo-blue shadow-md' 
                                : 'text-gray-500 hover:text-coveo-blue hover:bg-blue-50'
                        } ${!isConfigValid ? 'opacity-40 cursor-not-allowed' : ''}`}
                        disabled={!isConfigValid}
                    >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center">
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-gray-500 hover:text-coveo-blue p-2 transition-colors"
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Nav Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200 shadow-lg absolute w-full z-50">
                <div className="px-4 pt-2 pb-4 space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (isConfigValid) {
                                    setView(item.id as AppView);
                                    setIsMobileMenuOpen(false);
                                }
                            }}
                            className={`block w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                                view === item.id 
                                    ? 'text-coveo-blue bg-blue-50 border border-blue-100' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            } ${!isConfigValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!isConfigValid}
                        >
                             <div className="flex items-center">
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.label}
                             </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </header>

      {/* Main Content Area */}
      <main 
        className={`${step === 3 && view === 'wizard' ? 'max-w-[95%]' : 'max-w-5xl'} mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-500 ease-in-out`}
      >
        {/* Status Messages */}
        {status && (
          <div className={`mb-8 p-4 rounded-xl shadow-sm border flex items-start animate-in slide-in-from-top-2 ${
            status.type === 'success' ? 'bg-green-50 text-green-800 border-green-100' : 
            status.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 
            'bg-blue-50 text-blue-800 border-blue-100'
          }`}>
             <div className="flex-shrink-0 mt-0.5">
                {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : 
                 status.type === 'error' ? <AlertCircle className="h-5 w-5" /> :
                 <Bug className="h-5 w-5" />}
             </div>
             <div className="ml-3 text-sm font-medium">{status.message}</div>
             <button onClick={() => setStatus(null)} className="ml-auto text-current opacity-50 hover:opacity-100"><X className="w-4 h-4"/></button>
          </div>
        )}

        {view === 'wizard' && (
            <>
                <div className="mb-10 flex justify-center">
                   <Steps currentStep={step} onStepClick={(s) => isConfigValid && setStep(s)} />
                </div>

                <div className="bg-white shadow-xl shadow-gray-100 rounded-2xl p-8 border border-gray-100 transition-all">
                  {step === 1 && renderConfigForm()}
                  {step === 2 && renderUpload()}
                  {step === 3 && renderPreview()}
                  {step === 4 && (
                    <div className="text-center py-16 space-y-6">
                      <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900">Mission Accomplished!</h3>
                      <p className="text-gray-500 max-w-md mx-auto text-lg">Your listing pages have been successfully pushed to the Coveo Merchandising Hub.</p>
                      <button 
                        onClick={() => { setParsedListings([]); setStep(2); setStatus(null); }}
                        className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-coveo-blue hover:bg-blue-800 shadow-md transition-all"
                      >
                        Upload Another CSV
                      </button>
                    </div>
                  )}
                </div>
            </>
        )}

        {view === 'generator' && (
             <div className="bg-white shadow-xl shadow-gray-100 rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center mb-8">
                    <div className="p-2 bg-blue-50 rounded-lg mr-4">
                        <Tag className="w-6 h-6 text-coveo-blue" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-coveo-dark">Category Listing Generator</h2>
                        <p className="text-sm text-gray-500">Auto-generate listing pages from existing index values.</p>
                    </div>
                </div>
                {renderCategoryGenerator()}
            </div>
        )}

        {view === 'global-config' && (
            <div className="bg-white shadow-xl shadow-gray-100 rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center mb-8">
                    <div className="p-2 bg-blue-50 rounded-lg mr-4">
                        <Code className="w-6 h-6 text-coveo-blue" />
                    </div>
                    <h2 className="text-2xl font-bold text-coveo-dark">Global Configuration Manager</h2>
                </div>
                {renderGlobalConfig()}
            </div>
        )}

        {view === 'maintenance' && (
            <div className="bg-white shadow-xl shadow-gray-100 rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center mb-8">
                    <div className="p-2 bg-gray-50 rounded-lg mr-4">
                        <Settings className="w-6 h-6 text-gray-700" />
                    </div>
                    <h2 className="text-2xl font-bold text-coveo-dark">System Maintenance</h2>
                </div>
                {renderMaintenance()}
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
