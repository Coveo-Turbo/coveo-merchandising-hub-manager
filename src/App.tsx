import React, { useState } from 'react';
import { Steps } from './components/Steps';
import type { ConfigState, CsvRow, PublicListingPageRequestModel, ListingPageApiPageRuleModel } from './types';
import { 
    bulkCreateListings, 
    fetchAllListingIds, 
    bulkDeleteListings, 
    getGlobalSearchConfig, 
    updateGlobalSearchConfig, 
    getGlobalListingConfig, 
    updateGlobalListingConfig 
} from './services/coveoApi';
import { enhanceListingWithAI } from './services/geminiService';
import { 
    Upload, FileText, Settings, Play, Sparkles, AlertCircle, CheckCircle, 
    Database, ArrowRight, Globe, Trash2, Save, RefreshCw, Code, LayoutList,
    Menu, X
} from 'lucide-react';
import Papa from 'papaparse';

type AppView = 'wizard' | 'global-config' | 'maintenance';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('wizard');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error'|'info', message: string} | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Configuration State
  const [config, setConfig] = useState<ConfigState>({
    organizationId: '',
    trackingId: '',
    accessToken: '',
    platformUrl: 'https://platform.cloud.coveo.com' 
  });

  // Wizard Data State
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
  const [mappedListings, setMappedListings] = useState<PublicListingPageRequestModel[]>([]);

  // Global Config State
  const [globalConfigType, setGlobalConfigType] = useState<'search' | 'listing'>('search');
  const [jsonConfig, setJsonConfig] = useState<string>('');

  const isConfigValid = config.organizationId && config.trackingId && config.accessToken;

  // --- Wizard Handlers ---
  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfigValid) {
      setStep(2);
    } else {
      setStatus({type: 'error', message: 'Please fill in all required fields.'});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setStatus({ type: 'error', message: `CSV Error: ${results.errors[0].message}` });
          return;
        }
        
        const rows = results.data as CsvRow[];
        if (!rows[0]?.Name || !rows[0]?.UrlPattern) {
             setStatus({ type: 'error', message: `CSV must contain 'Name' and 'UrlPattern' columns.` });
             return;
        }
        
        setParsedData(rows);
        mapRowsToListings(rows);
        setStep(3);
        setStatus(null);
      }
    });
  };

  const mapRowsToListings = (rows: CsvRow[]) => {
    const listingsMap = new Map<string, PublicListingPageRequestModel>();

    rows.forEach(row => {
      if (!row.Name) return;

      let listing = listingsMap.get(row.Name);
      if (!listing) {
        listing = {
          name: row.Name,
          trackingId: config.trackingId,
          patterns: [],
          pageRules: []
        };
        listingsMap.set(row.Name, listing);
      }

      if (row.UrlPattern) {
        const urls = row.UrlPattern.split(';').map(u => u.trim()).filter(u => u.length > 0);
        urls.forEach(url => {
            if (!listing!.patterns.some(p => p.url === url)) {
                listing!.patterns.push({ url: url });
            }
        });
      }

      if (row.FilterField && row.FilterValue) {
        const rule: ListingPageApiPageRuleModel = {
          name: `Rule - ${row.FilterValue} (${row.FilterField})`,
          filters: [{
            fieldName: row.FilterField,
            operator: row.FilterOperator || 'contains',
            value: {
              type: 'string',
              value: row.FilterValue
            }
          }]
        };

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

    setMappedListings(Array.from(listingsMap.values()));
  };

  const handleAiEnhancement = async () => {
    setLoading(true);
    const newListings = [...mappedListings];
    let enhancedCount = 0;

    for (let i = 0; i < newListings.length; i++) {
      if (newListings[i].pageRules.length === 0) {
        const suggestion = await enhanceListingWithAI(newListings[i].name);
        if (suggestion) {
          newListings[i].pageRules.push({
            name: `AI Generated Rule`,
            filters: [{
              fieldName: suggestion.field,
              operator: suggestion.operator,
              value: {
                type: 'string',
                value: suggestion.value
              }
            }]
          });
          enhancedCount++;
        }
      }
    }
    setMappedListings(newListings);
    setLoading(false);
    setStatus({ type: 'success', message: `Enhanced ${enhancedCount} listings with AI suggestions.` });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await bulkCreateListings(config, mappedListings);
      setStatus({ type: 'success', message: 'Successfully created listing pages in CMH.' });
      setStep(4);
    } catch (e) {
      setStatus({ type: 'error', message: `${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  // --- Global Config Handlers ---
  const fetchGlobalConfig = async () => {
      setLoading(true);
      setJsonConfig('');
      setStatus(null);
      try {
          const data = globalConfigType === 'search' 
            ? await getGlobalSearchConfig(config) 
            : await getGlobalListingConfig(config);
          setJsonConfig(JSON.stringify(data, null, 2));
      } catch (e) {
          setStatus({ type: 'error', message: `Failed to fetch config: ${(e as Error).message}` });
      } finally {
          setLoading(false);
      }
  };

  const saveGlobalConfig = async () => {
      setLoading(true);
      setStatus(null);
      try {
          const payload = JSON.parse(jsonConfig);
          if (globalConfigType === 'search') {
              await updateGlobalSearchConfig(config, payload);
          } else {
              await updateGlobalListingConfig(config, payload);
          }
          setStatus({ type: 'success', message: 'Configuration updated successfully.' });
      } catch (e) {
          setStatus({ type: 'error', message: `Failed to save: ${(e as Error).message}` });
      } finally {
          setLoading(false);
      }
  };

  // --- Maintenance Handlers ---
  const handleDeleteAllListings = async () => {
      setLoading(true);
      setStatus({ type: 'info', message: 'Fetching all listing pages...' });
      try {
          const ids = await fetchAllListingIds(config);
          if (ids.length === 0) {
              setStatus({ type: 'info', message: 'No listing pages found to delete.' });
              return;
          }

          setStatus({ type: 'info', message: `Deleting ${ids.length} listing pages...` });
          await bulkDeleteListings(config, ids);
          setStatus({ type: 'success', message: `Successfully deleted ${ids.length} listing pages.` });
      } catch (e) {
          setStatus({ type: 'error', message: `Delete failed: ${(e as Error).message}` });
      } finally {
          setLoading(false);
          setIsDeleteConfirming(false);
      }
  };

  const navigateTo = (targetView: AppView) => {
      if (!isConfigValid && targetView !== 'wizard') return;
      
      setView(targetView);
      if (targetView === 'wizard') {
          setStep(isConfigValid ? 2 : 1);
      }
      setIsMobileMenuOpen(false);
  };

  // --- Views Renderers ---

  const renderConfigForm = () => (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
            <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-coveo-blue" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Connect to Coveo Platform</h2>
            <p className="text-slate-500 mt-2">Enter your organization details to enable tools.</p>
        </div>
        
        <form onSubmit={handleConfigSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform Region</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <select
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-transparent outline-none transition bg-white appearance-none"
                            value={config.platformUrl}
                            onChange={e => setConfig({...config, platformUrl: e.target.value})}
                        >
                            <option value="https://platform.cloud.coveo.com">US (platform.cloud.coveo.com)</option>
                            <option value="https://platform-ca.cloud.coveo.com">Canada (platform-ca.cloud.coveo.com)</option>
                            <option value="https://platform-eu.cloud.coveo.com">Europe (platform-eu.cloud.coveo.com)</option>
                            <option value="https://platform-au.cloud.coveo.com">Australia (platform-au.cloud.coveo.com)</option>
                        </select>
                    </div>
                </div>
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
                    <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-transparent outline-none transition"
                        placeholder="e.g. myorg"
                        value={config.organizationId}
                        onChange={e => setConfig({...config, organizationId: e.target.value})}
                    />
                </div>
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID</label>
                    <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-transparent outline-none transition"
                        placeholder="e.g. mycommerce_store"
                        value={config.trackingId}
                        onChange={e => setConfig({...config, trackingId: e.target.value})}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform Access Token</label>
                <input 
                    type="password" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-transparent outline-none transition"
                    placeholder="xx..."
                    value={config.accessToken}
                    onChange={e => setConfig({...config, accessToken: e.target.value})}
                />
                 <p className="text-xs text-gray-400 mt-1">Required privileges: Merchandising Hub - Edit</p>
            </div>
            <button type="submit" className="w-full bg-coveo-blue hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition shadow-lg flex justify-center items-center gap-2">
                Connect <ArrowRight className="h-4 w-4" />
            </button>
        </form>
    </div>
  );

  const renderGlobalConfig = () => (
      <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="text-lg font-bold text-slate-800">Global Configuration Manager</h3>
                      <p className="text-sm text-gray-500">View and edit global configurations directly.</p>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button 
                          onClick={() => setGlobalConfigType('search')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition ${globalConfigType === 'search' ? 'bg-white shadow-sm text-coveo-blue' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Search Config
                      </button>
                      <button 
                          onClick={() => setGlobalConfigType('listing')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition ${globalConfigType === 'listing' ? 'bg-white shadow-sm text-coveo-blue' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Listing Config
                      </button>
                  </div>
              </div>

              <div className="flex gap-4 mb-4">
                  <button 
                      onClick={fetchGlobalConfig}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                  >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Load Configuration
                  </button>
                   <button 
                      onClick={saveGlobalConfig}
                      disabled={loading || !jsonConfig}
                      className="flex items-center gap-2 px-4 py-2 bg-coveo-blue text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
                  >
                      <Save className="h-4 w-4" />
                      Save Changes
                  </button>
              </div>

              <div className="relative">
                  <div className="absolute top-0 right-0 bg-gray-100 px-3 py-1 text-xs text-gray-500 rounded-bl-lg border-b border-l border-gray-200 font-mono">JSON Editor</div>
                  <textarea 
                      className="w-full h-[500px] font-mono text-sm p-4 bg-slate-900 text-slate-50 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-transparent outline-none resize-y"
                      value={jsonConfig}
                      onChange={e => setJsonConfig(e.target.value)}
                      placeholder="Load configuration to view and edit JSON..."
                      spellCheck={false}
                  />
              </div>
          </div>
      </div>
  );

  const renderMaintenance = () => (
      <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100">
              <div className="flex items-start gap-4">
                  <div className="bg-red-50 p-3 rounded-full">
                      <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800">Reset All Listing Pages</h3>
                      <p className="text-gray-600 mt-2 mb-6">
                          This action will permanently delete <strong>ALL</strong> listing pages associated with the configured Tracking ID within this organization. 
                          This is typically used to clean up a test environment before a fresh import.
                      </p>
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                          <div className="flex">
                              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                              <p className="text-sm text-red-700">
                                  Warning: This action allows for bulk deletion and cannot be undone. Ensure you are targeting the correct environment.
                              </p>
                          </div>
                      </div>
                      
                      {!isDeleteConfirming ? (
                          <button 
                              onClick={() => setIsDeleteConfirming(true)}
                              disabled={loading}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition font-bold disabled:opacity-50"
                          >
                              <Trash2 className="h-4 w-4" />
                              Delete All Listings
                          </button>
                      ) : (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                              <p className="text-center text-red-600 font-semibold">Are you sure? This cannot be undone.</p>
                              <div className="flex gap-4">
                                  <button 
                                      onClick={() => setIsDeleteConfirming(false)}
                                      disabled={loading}
                                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium disabled:opacity-50"
                                  >
                                      Cancel
                                  </button>
                                  <button 
                                      onClick={handleDeleteAllListings}
                                      disabled={loading}
                                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold disabled:opacity-50"
                                  >
                                      {loading ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                      {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );

  const renderWizard = () => (
      <>
        <div className="mb-12">
           <Steps currentStep={step} />
        </div>
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-h-[400px]">
            {/* Step 2: Upload */}
            {step === 2 && (
                <div className="p-8 text-center">
                     <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="h-8 w-8 text-coveo-orange" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload CSV Configuration</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Upload a CSV file with headers: <code>Name</code>, <code>UrlPattern</code>. Optional: <code>FilterField</code>, <code>FilterValue</code>, <code>Language</code>, <code>Country</code>, <code>Currency</code>.
                    </p>

                    <div className="flex flex-col items-center justify-center">
                         <label className="w-full max-w-lg flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg shadow-lg tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue hover:text-white transition-colors border-dashed border-2 border-coveo-blue/30 hover:border-coveo-blue">
                            <FileText className="w-8 h-8 text-coveo-blue" />
                            <span className="mt-2 text-base leading-normal text-slate-600">Select a CSV file</span>
                            <input type='file' className="hidden" accept=".csv" onChange={handleFileUpload} />
                        </label>
                        
                        <div className="mt-8 text-left bg-gray-50 p-4 rounded-md text-sm text-gray-600 font-mono border border-gray-200 w-full max-w-2xl overflow-x-auto">
                            <p className="font-bold text-gray-800 mb-2">Example CSV Structure:</p>
                            Name,UrlPattern,FilterField,FilterValue,Language,Country<br/>
                            Summer Sale,https://site.com/sale;https://site.com/summer,ec_category,shoes,en,US<br/>
                            Summer Sale,,ec_category,chaussures,fr,CA<br/>
                            New Arrivals,https://site.com/new,,,
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
                <div className="p-0 flex flex-col h-full">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                             <h2 className="text-xl font-bold text-slate-800">Preview Configurations</h2>
                             <p className="text-sm text-slate-500">{mappedListings.length} pages identified</p>
                        </div>
                        <div className="flex gap-3">
                             <button 
                                onClick={handleAiEnhancement}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-medium border border-purple-200 disabled:opacity-50"
                            >
                                <Sparkles className="h-4 w-4" />
                                {loading ? 'Analyzing...' : 'Auto-Generate Rules (AI)'}
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2 bg-coveo-blue text-white rounded-lg hover:bg-blue-800 transition shadow-md font-medium disabled:opacity-50"
                            >
                                <Play className="h-4 w-4" />
                                {loading ? 'Pushing to CMH...' : 'Push to CMH'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-auto max-h-[500px]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL Patterns</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rules Configured</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {mappedListings.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.patterns.map((p, i) => <div key={i}>{p.url}</div>)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.pageRules.length > 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
                                                    {item.pageRules.length} Rule(s)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    No Rules
                                                </span>
                                            )}
                                            <div className="space-y-1 mt-1">
                                                {item.pageRules.map((r, i) => (
                                                    <div key={i} className="text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                                        <div className="font-medium text-gray-700">
                                                            {r.filters[0]?.fieldName} {r.filters[0]?.operator} <span className="text-indigo-600">"{String(r.filters[0]?.value?.value)}"</span>
                                                        </div>
                                                        {r.locales && r.locales.length > 0 && (
                                                            <div className="text-gray-400 italic text-[10px]">
                                                                Locale: {r.locales.map(l => [l.language, l.country, l.currency].filter(Boolean).join('-')).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
                 <div className="p-16 text-center">
                    <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-4">Job Complete!</h2>
                    <p className="text-lg text-slate-500 mb-8">
                        Your listing configurations have been successfully pushed to the Coveo Merchandising Hub.
                    </p>
                    <button 
                        onClick={() => { setStep(2); setMappedListings([]); setParsedData([]); }}
                        className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition shadow-lg font-medium"
                    >
                        Start New Import
                    </button>
                </div>
            )}
        </div>
      </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-coveo-dark text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Database className="h-6 w-6 text-coveo-orange" />
                    <h1 className="text-xl font-semibold">Coveo Merchandising Hub Manager</h1>
                </div>
                
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <nav className="flex gap-1">
                        <button 
                            onClick={() => navigateTo('wizard')} 
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${view === 'wizard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                        <div className="flex items-center gap-2">
                                <LayoutList className="h-4 w-4" />
                                Import Wizard
                        </div>
                        </button>
                        <button 
                            onClick={() => navigateTo('global-config')}
                            disabled={!isConfigValid}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-30 ${view === 'global-config' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                        <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                Global Config
                        </div>
                        </button>
                        <button 
                            onClick={() => navigateTo('maintenance')}
                            disabled={!isConfigValid}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-30 ${view === 'maintenance' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                        <div className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Maintenance
                        </div>
                        </button>
                    </nav>
                    <div className="text-xs text-gray-500 border-l border-gray-700 pl-6">V1.1</div>
                </div>

                {/* Mobile Menu Button */}
                <div className="-mr-2 flex md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-700">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    <button 
                        onClick={() => navigateTo('wizard')}
                        className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${view === 'wizard' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-2">
                            <LayoutList className="h-5 w-5" />
                            Import Wizard
                        </div>
                    </button>
                    <button 
                        onClick={() => navigateTo('global-config')}
                        disabled={!isConfigValid}
                        className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium disabled:opacity-30 ${view === 'global-config' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            Global Config
                        </div>
                    </button>
                    <button 
                        onClick={() => navigateTo('maintenance')}
                        disabled={!isConfigValid}
                        className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium disabled:opacity-30 ${view === 'maintenance' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Maintenance
                        </div>
                    </button>
                </div>
                <div className="pt-4 pb-3 border-t border-gray-700">
                    <div className="px-5 text-xs text-gray-500">Version 1.1</div>
                </div>
            </div>
        )}
      </header>

      <main className="flex-grow container mx-auto max-w-5xl px-4 py-12">
        {/* Status Banner */}
        {status && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {status.type === 'error' ? <AlertCircle className="h-5 w-5 flex-shrink-0"/> : <CheckCircle className="h-5 w-5 flex-shrink-0"/>}
                <span>{status.message}</span>
            </div>
        )}

        {!isConfigValid || (step === 1 && view === 'wizard') ? (
            renderConfigForm()
        ) : (
            <>
                {view === 'wizard' && renderWizard()}
                {view === 'global-config' && renderGlobalConfig()}
                {view === 'maintenance' && renderMaintenance()}
            </>
        )}
      </main>
    </div>
  );
};

export default App;