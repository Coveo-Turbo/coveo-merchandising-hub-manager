import React, { useState } from 'react';
import { RefreshCw, Check, ArrowRight, Search, Layers } from 'lucide-react';
import type { ConfigState, PublicListingPageRequestModel } from '../types';
import { fetchFieldValues } from '../services/coveoApi';

interface CategoryValue {
  value: string;
  codeValue?: string;
  count: number;
  selected: boolean;
}

interface CategoryGeneratorProps {
  config: ConfigState;
  onGenerate: (listings: PublicListingPageRequestModel[]) => void;
  isConfigValid: boolean;
}

// Helper function to get leaf value from hierarchical field
const getLeafValue = (value: string): string => {
  const parts = value.split('|').map(p => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || value;
};

// Helper function to slugify a string for URLs
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with -
    .replace(/-+/g, '-')       // Replace multiple - with single -
    .trim();
};

export const CategoryGenerator: React.FC<CategoryGeneratorProps> = ({ 
  config, 
  onGenerate, 
  isConfigValid 
}) => {
  const [field, setField] = useState('@ec_category');
  const [codeField, setCodeField] = useState('@ec_category_code');
  const [catalogId, setCatalogId] = useState('');
  const [maxValues, setMaxValues] = useState(100);
  const [urlPattern, setUrlPattern] = useState('https://example.com/c/{{code_value | leaf}}');
  const [pageNamePattern, setPageNamePattern] = useState('{{code_value | leaf}} - {{value | leaf}}');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryValue[]>([]);
  const [status, setStatus] = useState<{type: 'success'|'error'|'info', message: string} | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const values = await fetchFieldValues(config, field, codeField, catalogId, maxValues);
      const categoryValues: CategoryValue[] = values.map(v => ({
        value: v.value,
        codeValue: v.codeValue,
        count: v.count,
        selected: false
      }));
      setCategories(categoryValues);
      setStatus({ 
        type: 'success', 
        message: `Loaded ${categoryValues.length} categories from index` 
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setStatus({ 
        type: 'error', 
        message: `Failed to fetch values: ${error.message}` 
      });
      setCategories([]);
    }
    setLoading(false);
  };

  const handleSelectAll = () => {
    setCategories(categories.map(c => ({ ...c, selected: true })));
  };

  const handleDeselectAll = () => {
    setCategories(categories.map(c => ({ ...c, selected: false })));
  };

  const toggleCategory = (index: number) => {
    const newCategories = [...categories];
    newCategories[index].selected = !newCategories[index].selected;
    setCategories(newCategories);
  };

  const replaceTemplate = (template: string, category: CategoryValue): string => {
    let result = template;
    
    // Replace {{value | leaf}} with leaf value
    result = result.replace(/\{\{value\s*\|\s*leaf\}\}/g, slugify(getLeafValue(category.value)));
    // Replace {{value}} with full value
    result = result.replace(/\{\{value\}\}/g, slugify(category.value));
    
    if (category.codeValue) {
      // Replace {{code_value | leaf}} with leaf code value
      result = result.replace(/\{\{code_value\s*\|\s*leaf\}\}/g, slugify(getLeafValue(category.codeValue)));
      // Replace {{code_value}} with full code value
      result = result.replace(/\{\{code_value\}\}/g, slugify(category.codeValue));
    }
    
    return result;
  };

  const handleGenerate = () => {
    const selectedCategories = categories.filter(c => c.selected);
    
    if (selectedCategories.length === 0) {
      setStatus({ 
        type: 'error', 
        message: 'Please select at least one category' 
      });
      return;
    }

    const listings: PublicListingPageRequestModel[] = selectedCategories.map(category => {
      // Generate page name
      const pageName = replaceTemplate(pageNamePattern, category)
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Generate URL
      const url = replaceTemplate(urlPattern, category);
      
      // Create listing with full category value as filter
      const listing: PublicListingPageRequestModel = {
        name: pageName,
        trackingId: config.trackingId,
        patterns: [{ url }],
        pageRules: [{
          name: `Rule: ${field} = ${category.value}`,
          filters: [{
            fieldName: field,
            operator: 'isExactly',
            value: {
              type: 'string',
              value: category.value
            }
          }]
        }]
      };
      
      return listing;
    });

    onGenerate(listings);
  };

  const selectedCount = categories.filter(c => c.selected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-blue-50 rounded-lg mr-3">
            <Layers className="w-6 h-6 text-coveo-blue" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-coveo-dark">Category Generator</h2>
            <p className="text-sm text-gray-500">Auto-generate listing pages from catalog categories</p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-coveo-dark uppercase tracking-wide mb-4">Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category Field</label>
            <input 
              type="text" 
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue"
              placeholder="@ec_category"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Code Field (Optional)</label>
            <input 
              type="text" 
              value={codeField}
              onChange={(e) => setCodeField(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue"
              placeholder="@ec_category_code"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Catalog ID (Source Name)</label>
            <input 
              type="text" 
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue"
              placeholder="e.g., my-catalog"
            />
            <p className="text-xs text-gray-500 mt-1">Scopes field values to this source only</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Max Values</label>
            <input 
              type="number" 
              value={maxValues}
              onChange={(e) => setMaxValues(parseInt(e.target.value) || 100)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue"
              min="1"
              max="1000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">URL Pattern</label>
          <input 
            type="text" 
            value={urlPattern}
            onChange={(e) => setUrlPattern(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue font-mono text-sm"
            placeholder="https://example.com/c/{{code_value | leaf}}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use: <code className="bg-gray-100 px-1 rounded">{"{{value}}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{{code_value}}"}</code>, 
            or with <code className="bg-gray-100 px-1 rounded">| leaf</code> filter for hierarchical fields
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Page Name Pattern</label>
          <input 
            type="text" 
            value={pageNamePattern}
            onChange={(e) => setPageNamePattern(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coveo-blue focus:border-coveo-blue font-mono text-sm"
            placeholder="{{code_value | leaf}} - {{value | leaf}}"
          />
          <p className="text-xs text-gray-500 mt-1">
            Pattern for the listing page name (same variables available)
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleFetch}
            disabled={!isConfigValid || loading || !field}
            className="flex items-center px-6 py-2.5 bg-coveo-blue text-white rounded-lg hover:bg-blue-800 shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Fetch Categories
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`p-4 rounded-lg border flex items-center ${
          status.type === 'success' ? 'bg-green-50 text-green-800 border-green-100' : 
          status.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 
          'bg-blue-50 text-blue-800 border-blue-100'
        }`}>
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      {/* Results Table */}
      {categories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="text-sm font-bold text-coveo-dark uppercase tracking-wide">
                Categories ({selectedCount} of {categories.length} selected)
              </h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-medium text-coveo-blue bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Category Value
                  </th>
                  {codeField && (
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Code Value
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Preview URL
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-blue-50 transition-colors cursor-pointer ${category.selected ? 'bg-blue-50/50' : ''}`}
                    onClick={() => toggleCategory(idx)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={category.selected}
                        onChange={() => toggleCategory(idx)}
                        className="w-4 h-4 text-coveo-blue rounded focus:ring-coveo-blue cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {category.value}
                    </td>
                    {codeField && (
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {category.codeValue || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {category.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono truncate max-w-xs">
                      {replaceTemplate(urlPattern, category)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={selectedCount === 0}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              <Check className="w-5 h-5 mr-2" />
              Generate & Review ({selectedCount})
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
