import {useCallback, useEffect, useState} from 'react';
import Papa from 'papaparse';
import type {ApiTransport, ContextResolver, SessionStore} from '../core/contracts';
import {
  bulkCreateListings,
  bulkCreateRankingRules,
  bulkDeleteListings,
  bulkUpdateListings,
  createGlobalProductSuggestConfig,
  fetchAllListings,
  fetchAllRules,
  fetchTrackingIdsFromCatalogMappings,
  getContextMappings,
  getGlobalListingConfig,
  getGlobalProductSuggestConfig,
  getGlobalRecommendationsConfig,
  getGlobalSearchConfig,
  updateContextMappings,
  updateGlobalListingConfig,
  updateGlobalProductSuggestConfig,
  updateGlobalRecommendationsConfig,
  updateGlobalSearchConfig,
} from '../services/coveoApi';
import {enhanceListingWithAI} from '../services/geminiService';
import {deployCommerceTroubleshootConsole as deployCommerceTroubleshootConsoleRequest} from '../services/commerceTroubleshootConsoleService';
import {SAMPLE_CONFIGS} from '../services/sampleConfigs';
import type {
  AppStatus,
  BulkCreateRulesResult,
  ContextMappingDefinition,
  ContextMappingsDocument,
  CommerceTroubleshootDeployFormState,
  CommerceTroubleshootDeployResult,
  ConfigState,
  ContextMappingsDataShape,
  CsvRow,
  GlobalConfigDataShape,
  GlobalConfigType,
  JsonObject,
  ListingStep,
  MerchandisingHubRulePayload,
  PublicListingPageRequestModel,
  QueryConfigData,
  RuleImportModel,
  SessionContext,
  SharedSettings,
  SortDefinition,
} from '../types';
import {convertListingsToCsv} from '../utils/csvExport';
import {mapRowsToListings} from '../utils/csvParser';
import {downloadRankingRulesJSON, parseRankingRulesJSON, toImportPayload} from '../utils/rankingRulesIO';

const DEFAULT_CONFIG: ConfigState = {
  organizationId: '',
  trackingId: '',
  accessToken: '',
  platformUrl: 'https://platform.cloud.coveo.com',
};

const DEFAULT_TROUBLESHOOT_DEPLOY_FORM: CommerceTroubleshootDeployFormState = {
  hostedPageName: '',
  hostedPageId: '',
  trackingId: '',
  dryRun: false,
};

const getErrorMessage = (error: unknown, fallback = 'Unknown error') =>
  error instanceof Error && error.message ? error.message : fallback;

const parseContextMappingsString = (value: string): {parsed: ContextMappingsDataShape | null; error: string | null} => {
  if (!value.trim()) {
    return {parsed: null, error: null};
  }

  try {
    return {parsed: JSON.parse(value) as ContextMappingsDataShape, error: null};
  } catch (error) {
    return {parsed: null, error: getErrorMessage(error, 'Invalid JSON.')};
  }
};

const isContextMappingsDocument = (value: ContextMappingsDataShape | null): value is ContextMappingsDocument =>
  Boolean(value) && !Array.isArray(value) && typeof value === 'object';

const createDefaultSession = (config: ConfigState): SessionContext => ({
  ...config,
  trackingIds: config.trackingId ? [config.trackingId] : [],
  source: 'manual',
});

const defaultGlobalSearchConfig = (): GlobalConfigDataShape => ({
  queryConfiguration: {
    perPage: 24,
    additionalFields: [],
    sorts: [],
  },
  rules: {rankingRules: [], filterRules: [], pinRules: []},
});

const defaultProductSuggestConfig = (session: SessionContext): GlobalConfigDataShape => ({
  trackingId: session.trackingId,
  queryConfiguration: {
    additionalFields: [],
    perPage: 10,
  },
});

const defaultRecommendationsConfig = (): GlobalConfigDataShape => ({
  additionalFields: [],
  perPage: 5,
});

export interface UseManagerControllerOptions {
  runtime: 'standalone' | 'extension';
  transport: ApiTransport;
  contextResolver: ContextResolver;
  sessionStore?: SessionStore;
}

export const useManagerController = ({runtime, transport, contextResolver, sessionStore}: UseManagerControllerOptions) => {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [connectionForm, setConnectionForm] = useState<ConfigState>(DEFAULT_CONFIG);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [troubleshootDeployForm, setTroubleshootDeployForm] = useState<CommerceTroubleshootDeployFormState>(
    DEFAULT_TROUBLESHOOT_DEPLOY_FORM,
  );
  const [troubleshootDeployResult, setTroubleshootDeployResult] = useState<CommerceTroubleshootDeployResult | null>(
    null,
  );
  const [listingStep, setListingStep] = useState<ListingStep>(1);
  const [parsedListings, setParsedListings] = useState<PublicListingPageRequestModel[]>([]);
  const [globalConfigType, setGlobalConfigType] = useState<GlobalConfigType>('search');
  const [globalConfigData, setGlobalConfigData] = useState<GlobalConfigDataShape | null>(null);
  const [globalConfigString, setGlobalConfigString] = useState('');
  const [contextMappingsData, setContextMappingsData] = useState<ContextMappingsDataShape | null>(null);
  const [contextMappingsString, setContextMappingsStringState] = useState('');
  const [contextMappingsValidationError, setContextMappingsValidationError] = useState<string | null>(null);
  const [sharedSettings, setSharedSettings] = useState<SharedSettings | null>(null);
  const [pendingSortLabels, setPendingSortLabels] = useState<Array<{language: string; value: string}>>([]);
  const [pendingSortLang, setPendingSortLang] = useState('en');
  const [pendingSortLabelValue, setPendingSortLabelValue] = useState('');
  const [rankingRulesData, setRankingRulesData] = useState<RuleImportModel[]>([]);
  const [rankingRulesJSON, setRankingRulesJSON] = useState('');
  const [rankingRulesSolutionType, setRankingRulesSolutionType] = useState<'listing' | 'search'>('listing');
  const [rankingRulesType, setRankingRulesType] = useState<'ranking' | 'filter'>('ranking');
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [showManualConnection, setShowManualConnection] = useState(runtime === 'standalone');
  const [devMode, setDevMode] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const availableTrackingIds = session?.trackingIds ?? [];
  const isSessionReady = Boolean(session?.organizationId && session.accessToken && session.trackingId);
  const qc: QueryConfigData | null = globalConfigData ? globalConfigData.queryConfiguration || globalConfigData : null;

  const persistSession = useCallback(async (nextSession: SessionContext | null) => {
    if (!sessionStore) {
      return;
    }

    if (!nextSession) {
      await sessionStore.clear();
      return;
    }

    await sessionStore.save(nextSession);
  }, [sessionStore]);

  const applySession = useCallback(async (nextSession: SessionContext | null, message?: AppStatus) => {
    setSession(nextSession);
    setConnectionStatus(nextSession ? 'connected' : 'disconnected');
    setTroubleshootDeployForm(
      nextSession
        ? {
            ...DEFAULT_TROUBLESHOOT_DEPLOY_FORM,
            trackingId: nextSession.trackingId,
          }
        : DEFAULT_TROUBLESHOOT_DEPLOY_FORM,
    );
    setTroubleshootDeployResult(null);
    setListingStep(nextSession ? 2 : 1);
    setGlobalConfigData(null);
    setGlobalConfigString('');
    setContextMappingsData(null);
    setContextMappingsStringState('');
    setContextMappingsValidationError(null);
    setRankingRulesData([]);
    setRankingRulesJSON('');
    setIsDeleteConfirming(false);
    await persistSession(nextSession);
    if (message) {
      setStatus(message);
    }
  }, [persistSession]);

  useEffect(() => {
    void (async () => {
      const resolved = await contextResolver.resolve();
      if (resolved) {
        setConnectionForm({
          organizationId: resolved.organizationId,
          trackingId: resolved.trackingId,
          accessToken: resolved.accessToken,
          platformUrl: resolved.platformUrl,
        });
        await applySession(resolved);
        setShowManualConnection(false);
      } else if (runtime === 'extension') {
        setShowManualConnection(true);
      }
    })();
  }, [applySession, contextResolver, runtime]);

  const resetTransientState = () => {
    setParsedListings([]);
    setGlobalConfigData(null);
    setGlobalConfigString('');
    setContextMappingsData(null);
    setContextMappingsStringState('');
    setContextMappingsValidationError(null);
    setRankingRulesData([]);
    setRankingRulesJSON('');
    setIsDeleteConfirming(false);
  };

  const handleVersionClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    if (nextCount === 5) {
      setDevMode((current) => !current);
      setStatus({type: 'info', message: `Developer mode ${!devMode ? 'enabled' : 'disabled'}.`});
      setClickCount(0);
    }
  };

  const handleConnectionFieldChange = (key: keyof ConfigState, value: string) => {
    setConnectionForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'organizationId' || key === 'platformUrl' || key === 'accessToken' ? {trackingId: ''} : {}),
    }));
    setStatus(null);
  };

  const connectManually = async () => {
    if (!connectionForm.organizationId.trim() || !connectionForm.accessToken.trim()) {
      return;
    }

    setLoading(true);
    setConnectionStatus('connecting');
    setStatus(null);
    try {
      const baseSession = createDefaultSession(connectionForm);
      const trackingIds = await fetchTrackingIdsFromCatalogMappings(baseSession, transport);

      if (trackingIds.length === 0) {
        throw new Error('No tracking ID was returned by /trackingidcatalogmappings for this organization.');
      }

      const nextSession: SessionContext = {
        ...baseSession,
        trackingId: trackingIds[0],
        trackingIds,
        source: 'manual',
      };

      await applySession(nextSession, {
        type: 'success',
        message: `Connected successfully. Loaded ${trackingIds.length} tracking ID${trackingIds.length > 1 ? 's' : ''}.`,
      });
      setConnectionForm(nextSession);
      setShowManualConnection(false);
    } catch (error) {
      setConnectionStatus('disconnected');
      setStatus({
        type: 'error',
        message: getErrorMessage(error, 'Unable to fetch tracking IDs from catalog mappings.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await contextResolver.disconnect();
      await applySession(null, {
        type: 'info',
        message:
          runtime === 'extension'
            ? 'Hub-derived context cleared. You can refresh Hub context or connect manually.'
            : 'Disconnected. Configure Organization ID, Region, and Access Token to connect again.',
      });
      if (runtime === 'standalone') {
        setConnectionForm(DEFAULT_CONFIG);
      }
      setShowManualConnection(true);
      resetTransientState();
    } finally {
      setLoading(false);
    }
  };

  const refreshResolvedContext = async () => {
    setLoading(true);
    try {
      const refreshed = await contextResolver.refresh();
      if (refreshed) {
        setConnectionForm(refreshed);
        await applySession(refreshed, {
          type: 'success',
          message: refreshed.source === 'hub' ? 'Hub context refreshed.' : 'Stored session refreshed.',
        });
        setShowManualConnection(false);
      } else {
        setStatus({type: 'info', message: 'No Hub context is available yet. You can continue with manual connection.'});
        setShowManualConnection(true);
      }
    } catch (error) {
      setStatus({type: 'error', message: getErrorMessage(error, 'Failed to refresh session context.')});
    } finally {
      setLoading(false);
    }
  };

  const switchTrackingId = async (trackingId: string) => {
    if (!session || trackingId === session.trackingId) {
      return;
    }

    const nextSession = {...session, trackingId};
    setSession(nextSession);
    setConnectionForm(nextSession);
    setTroubleshootDeployForm((current) => ({
      ...current,
      trackingId,
    }));
    setTroubleshootDeployResult(null);
    setListingStep(2);
    setParsedListings([]);
    setContextMappingsData(null);
    setContextMappingsStringState('');
    setContextMappingsValidationError(null);
    await persistSession(nextSession);
    setStatus({type: 'info', message: `Tracking ID switched to "${trackingId}".`});
  };

  const updateTroubleshootDeployForm = <Key extends keyof CommerceTroubleshootDeployFormState>(
    key: Key,
    value: CommerceTroubleshootDeployFormState[Key],
  ) => {
    setTroubleshootDeployForm((current) => ({
      ...current,
      [key]: value,
    }));
    setTroubleshootDeployResult(null);
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file || !session) {
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const content = await file.text();
      const result = Papa.parse<CsvRow>(content, {header: true, skipEmptyLines: true});
      if (result.errors.length > 0) {
        throw new Error(result.errors.map(({message}) => message).join(', '));
      }

      const listings = mapRowsToListings(result.data, session.trackingId);
      setParsedListings(listings);
      setListingStep(3);
      setStatus({
        type: 'success',
        message: `Successfully parsed ${listings.length} unique listings from ${result.data.length} rows.`,
      });
    } catch (error) {
      setStatus({type: 'error', message: `Parsing error: ${getErrorMessage(error, 'Unable to parse CSV file.')}`});
    } finally {
      setLoading(false);
    }
  };

  const enhanceListing = async (index: number) => {
    const listing = parsedListings[index];
    if (!listing) {
      return;
    }

    setLoading(true);
    try {
      const suggestion = await enhanceListingWithAI(listing.name);
      if (!suggestion) {
        setStatus({type: 'info', message: 'AI could not generate a confident suggestion.'});
        return;
      }

      setParsedListings((current) =>
        current.map((entry, entryIndex) => {
          if (entryIndex !== index) {
            return entry;
          }

          const baseRuleName = `AI Suggested: ${suggestion.field}`;
          let nextRuleName = baseRuleName;
          let suffix = 1;

          while (entry.pageRules.some((rule) => rule.name === nextRuleName)) {
            suffix += 1;
            nextRuleName = `${baseRuleName} (${suffix})`;
          }

          return {
            ...entry,
            pageRules: [
              ...entry.pageRules,
              {
                name: nextRuleName,
                filters: [
                  {
                    fieldName: suggestion.field,
                    operator: suggestion.operator,
                    value: {type: 'string', value: suggestion.value},
                  },
                ],
              },
            ],
          };
        }),
      );

      setStatus({type: 'success', message: `Enhanced "${listing.name}" with an AI suggestion.`});
    } finally {
      setLoading(false);
    }
  };

  const submitListings = async () => {
    if (!session || parsedListings.length === 0) {
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      let existingListings: Array<{id: string; name: string}> = [];
      try {
        existingListings = await fetchAllListings(session, transport);
      } catch (error) {
        console.warn('Could not fetch existing listings, assuming creation mode.', error);
      }

      const toCreate: PublicListingPageRequestModel[] = [];
      const toUpdate: PublicListingPageRequestModel[] = [];

      parsedListings.forEach((listing) => {
        const existing = existingListings.find((entry) => entry.name === listing.name);
        if (existing) {
          toUpdate.push({...listing, id: existing.id});
        } else {
          toCreate.push(listing);
        }
      });

      if (toUpdate.length > 0) {
        await bulkUpdateListings(session, toUpdate, transport);
      }

      if (toCreate.length > 0) {
        await bulkCreateListings(session, toCreate, transport);
      }

      setListingStep(4);
      setStatus({
        type: 'success',
        message:
          toCreate.length || toUpdate.length
            ? `Updated ${toUpdate.length} and created ${toCreate.length} listing page(s).`
            : 'No changes needed.',
      });
    } catch (error) {
      setStatus({type: 'error', message: getErrorMessage(error, 'Failed to push listings to CMH.')});
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalConfig = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      let data: GlobalConfigDataShape;
      if (globalConfigType === 'search') {
        data = await getGlobalSearchConfig(session, transport);
        if (data.id === null) {
          data = defaultGlobalSearchConfig();
          setStatus({type: 'info', message: 'Global Search is not configured yet. Loaded a default template.'});
        }
      } else if (globalConfigType === 'listing') {
        data = await getGlobalListingConfig(session, transport);
      } else if (globalConfigType === 'product-suggest') {
        try {
          data = await getGlobalProductSuggestConfig(session, transport);
        } catch (error) {
          if (getErrorMessage(error, '').includes('NOT_FOUND')) {
            data = defaultProductSuggestConfig(session);
            setStatus({type: 'info', message: 'Product Suggest is not configured yet. Loaded a default template.'});
          } else {
            throw error;
          }
        }
      } else {
        try {
          data = await getGlobalRecommendationsConfig(session, transport);
        } catch {
          data = defaultRecommendationsConfig();
          setStatus({type: 'info', message: 'Recommendation config could not be fetched. Loaded a default template.'});
        }
      }

      setGlobalConfigData(data);
      setGlobalConfigString(JSON.stringify(data, null, 2));
    } catch (error) {
      setStatus({type: 'error', message: `Failed to fetch config: ${getErrorMessage(error, 'Unknown error.')}`});
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalConfig = async () => {
    if (!session || !globalConfigString) {
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const parsed = JSON.parse(globalConfigString) as JsonObject;

      if (globalConfigType === 'search') {
        await updateGlobalSearchConfig(session, parsed, transport);
      } else if (globalConfigType === 'listing') {
        await updateGlobalListingConfig(session, parsed, transport);
      } else if (globalConfigType === 'product-suggest') {
        try {
          await updateGlobalProductSuggestConfig(session, parsed, transport);
        } catch {
          await createGlobalProductSuggestConfig(session, parsed, transport);
        }
      } else {
        await updateGlobalRecommendationsConfig(session, parsed, transport);
      }

      setStatus({type: 'success', message: 'Configuration saved successfully.'});
      await fetchGlobalConfig();
    } catch (error) {
      setStatus({type: 'error', message: `Failed to save config: ${getErrorMessage(error, 'Unknown error.')}`});
    } finally {
      setLoading(false);
    }
  };

  const setContextMappingsString = (nextValue: string) => {
    setContextMappingsStringState(nextValue);
    const {parsed, error} = parseContextMappingsString(nextValue);
    setContextMappingsData(parsed);
    setContextMappingsValidationError(error);
  };

  const updateContextMappingsEditor = (nextValue: ContextMappingsDataShape) => {
    setContextMappingsData(nextValue);
    setContextMappingsStringState(JSON.stringify(nextValue, null, 2));
    setContextMappingsValidationError(null);
  };

  const addContextMapping = (mapping: ContextMappingDefinition) => {
    const nextDocument: ContextMappingsDocument = isContextMappingsDocument(contextMappingsData) ? {...contextMappingsData} : {};
    updateContextMappingsEditor({
      ...nextDocument,
      mappings: [...(nextDocument.mappings ?? []), mapping],
    });
  };

  const removeContextMapping = (index: number) => {
    if (!isContextMappingsDocument(contextMappingsData) || !contextMappingsData.mappings) {
      return;
    }

    updateContextMappingsEditor({
      ...contextMappingsData,
      mappings: contextMappingsData.mappings.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const fetchContextMappings = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const data = await getContextMappings(session, transport);
      setContextMappingsData(data);
      setContextMappingsStringState(JSON.stringify(data, null, 2));
      setContextMappingsValidationError(null);
    } catch (error) {
      setStatus({type: 'error', message: `Failed to fetch context mappings: ${getErrorMessage(error, 'Unknown error.')}`});
    } finally {
      setLoading(false);
    }
  };

  const saveContextMappings = async () => {
    if (!session || !contextMappingsString.trim()) {
      return;
    }

    const {parsed, error} = parseContextMappingsString(contextMappingsString);
    setContextMappingsData(parsed);
    setContextMappingsValidationError(error);

    if (error || !parsed) {
      setStatus({type: 'error', message: `Invalid JSON: ${error || 'Unknown error.'}`});
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      await updateContextMappings(session, parsed, transport);
      setStatus({type: 'success', message: 'Context mappings saved successfully.'});
    } catch (error) {
      setStatus({type: 'error', message: `Failed to save context mappings: ${getErrorMessage(error, 'Unknown error.')}`});
    } finally {
      setLoading(false);
    }
  };

  const loadContextMappingsFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const {parsed, error} = parseContextMappingsString(content);
      setContextMappingsStringState(content);
      setContextMappingsData(parsed);
      setContextMappingsValidationError(error);

      if (error) {
        throw new Error(error);
      }

      setStatus({type: 'success', message: 'Context mappings JSON loaded.'});
    } catch (error) {
      setStatus({type: 'error', message: `Failed to load context mappings JSON: ${getErrorMessage(error, 'Unknown error.')}`});
    }
  };

  const exportContextMappings = () => {
    if (!contextMappingsString.trim()) {
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([contextMappingsString], {type: 'application/json'}));
    link.download = `context-mappings-${session?.trackingId || 'config'}-${date}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const updateGlobalConfigData = (nextValue: GlobalConfigDataShape) => {
    setGlobalConfigData(nextValue);
    setGlobalConfigString(JSON.stringify(nextValue, null, 2));
  };

  const updateQueryConfigField = (key: keyof QueryConfigData, value: QueryConfigData[keyof QueryConfigData]) => {
    if (!globalConfigData) {
      return;
    }

    if (globalConfigData.queryConfiguration) {
      updateGlobalConfigData({
        ...globalConfigData,
        queryConfiguration: {
          ...globalConfigData.queryConfiguration,
          [key]: value,
        },
      });
      return;
    }

    updateGlobalConfigData({
      ...globalConfigData,
      [key]: value,
    });
  };

  const copySharedSettings = () => {
    if (!qc) {
      return;
    }

    setSharedSettings({
      perPage: qc.perPage,
      additionalFields: qc.additionalFields || [],
      sorts: qc.sorts,
    });
    setStatus({type: 'success', message: 'Common settings copied.'});
  };

  const pasteSharedSettings = () => {
    if (!qc || !sharedSettings) {
      return;
    }

    const nextConfig: QueryConfigData = {
      ...qc,
      ...(sharedSettings.perPage !== undefined ? {perPage: sharedSettings.perPage} : {}),
      ...(sharedSettings.additionalFields ? {additionalFields: sharedSettings.additionalFields} : {}),
    };

    if (!['recommendation', 'product-suggest'].includes(globalConfigType) && sharedSettings.sorts) {
      nextConfig.sorts = sharedSettings.sorts;
    }

    updateQueryConfigField('additionalFields', nextConfig.additionalFields);
    updateQueryConfigField('perPage', nextConfig.perPage);
    if (nextConfig.sorts) {
      updateQueryConfigField('sorts', nextConfig.sorts);
    }

    setStatus({type: 'success', message: 'Common settings pasted.'});
  };

  const addAdditionalField = (field: string) => {
    if (!qc || !field.trim()) {
      return;
    }
    const nextFields = [...new Set([...(qc.additionalFields ?? []), field.trim()])];
    updateQueryConfigField('additionalFields', nextFields);
  };

  const removeAdditionalField = (field: string) => {
    if (!qc) {
      return;
    }
    updateQueryConfigField(
      'additionalFields',
      (qc.additionalFields ?? []).filter((entry) => entry !== field),
    );
  };

  const addPendingSortLabel = () => {
    if (!pendingSortLang.trim() || !pendingSortLabelValue.trim()) {
      return;
    }

    setPendingSortLabels((current) => [
      ...current,
      {
        language: pendingSortLang.trim(),
        value: pendingSortLabelValue.trim(),
      },
    ]);
    setPendingSortLabelValue('');
  };

  const removePendingSortLabel = (index: number) => {
    setPendingSortLabels((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const addSort = (criteria: 'relevance' | 'fields', field?: string, direction?: string) => {
    if (!qc) {
      return;
    }

    const nextSort: SortDefinition =
      criteria === 'relevance'
        ? {sortCriteria: 'relevance'}
        : {
            sortCriteria: 'fields',
            fields: [
              {
                field,
                direction,
                displayNames:
                  pendingSortLabels.length > 0
                    ? pendingSortLabels
                    : field
                      ? [{language: 'en', value: field}]
                      : undefined,
              },
            ],
          };

    updateQueryConfigField('sorts', [...(qc.sorts ?? []), nextSort]);
    setPendingSortLabels([]);
    setPendingSortLabelValue('');
  };

  const removeSort = (index: number) => {
    if (!qc) {
      return;
    }
    updateQueryConfigField(
      'sorts',
      (qc.sorts ?? []).filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const fetchRankingRules = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const rules = await fetchAllRules(session, rankingRulesSolutionType, rankingRulesType, transport);
      setRankingRulesData(rules);
      setRankingRulesJSON(JSON.stringify(rules, null, 2));
      setStatus({
        type: rules.length > 0 ? 'success' : 'info',
        message:
          rules.length > 0
            ? `Fetched ${rules.length} ${rankingRulesSolutionType} ${rankingRulesType} rule(s).`
            : `No ${rankingRulesSolutionType} ${rankingRulesType} rule(s) were found.`,
      });
    } catch (error) {
      setStatus({type: 'error', message: `Failed to fetch rules: ${getErrorMessage(error, 'Unknown error.')}`});
      setRankingRulesData([]);
      setRankingRulesJSON('');
    } finally {
      setLoading(false);
    }
  };

  const exportRankingRules = () => {
    if (rankingRulesData.length === 0) {
      setStatus({type: 'error', message: 'No rules to export. Fetch rules first.'});
      return;
    }
    downloadRankingRulesJSON(rankingRulesData, rankingRulesType, rankingRulesSolutionType);
    setStatus({type: 'success', message: 'Rules exported successfully.'});
  };

  const loadRankingRulesFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    const content = await file.text();
    setRankingRulesJSON(content);
    const validation = parseRankingRulesJSON(content);

    if (!validation.valid || !validation.data) {
      setRankingRulesData([]);
      setStatus({type: 'error', message: validation.error ?? 'Invalid rules file.'});
      return;
    }

    setRankingRulesData(validation.data);
    setStatus({
      type: 'success',
      message: `Loaded ${validation.data.length} rule(s). They will be imported into "${session?.trackingId ?? ''}".`,
    });
  };

  const importRankingRules = async () => {
    if (!session || rankingRulesData.length === 0) {
      setStatus({type: 'error', message: 'No valid rules to import.'});
      return;
    }

    setLoading(true);
    setStatus({type: 'info', message: 'Importing rules...'});
    try {
      const payloads = toImportPayload(rankingRulesData, session.trackingId, rankingRulesSolutionType);
      const result = await bulkCreateRankingRules(
        session,
        payloads as MerchandisingHubRulePayload[],
        rankingRulesSolutionType,
        transport,
      );

      const summary = (resultData: BulkCreateRulesResult) => {
        if (resultData.errors.length === 0) {
          return {type: 'success' as const, message: `Successfully imported ${resultData.success.length} rule(s).`};
        }

        if (resultData.success.length > 0) {
          return {
            type: 'info' as const,
            message: `Imported ${resultData.success.length} rule(s). ${resultData.errors.length} rule(s) failed.`,
          };
        }

        return {type: 'error' as const, message: 'Failed to import the supplied rules.'};
      };

      const nextStatus = summary(result);
      setStatus(nextStatus);
      setRankingRulesData([]);
      setRankingRulesJSON('');
    } catch (error) {
      setStatus({type: 'error', message: `Import failed: ${getErrorMessage(error, 'Unknown error.')}`});
    } finally {
      setLoading(false);
    }
  };

  const exportAllListings = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setStatus({type: 'info', message: 'Fetching all listings...'});
    try {
      const listings = await fetchAllListings(session, transport);
      if (listings.length === 0) {
        setStatus({type: 'info', message: 'No listings found to export.'});
        return;
      }

      const csvRows = await convertListingsToCsv(listings, session, transport);
      const csv = Papa.unparse(csvRows, {
        columns: ['Name', 'UrlPattern', 'FilterField', 'FilterValue', 'FilterOperator', 'Language', 'Country', 'Currency'],
      });

      const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `listings-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setStatus({type: 'success', message: `Exported ${listings.length} listing(s) to CSV.`});
    } catch (error) {
      setStatus({type: 'error', message: `Export failed: ${getErrorMessage(error, 'Unknown error.')}`});
    } finally {
      setLoading(false);
    }
  };

  const deleteAllListings = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setStatus({type: 'info', message: 'Fetching all listings...'});
    try {
      const listings = await fetchAllListings(session, transport);
      const ids = listings.map((listing) => listing.id);
      if (ids.length === 0) {
        setStatus({type: 'info', message: 'No listings found to delete.'});
        setIsDeleteConfirming(false);
        return;
      }

      await bulkDeleteListings(session, ids, transport);
      setStatus({type: 'success', message: `Deleted ${ids.length} listing(s).`});
      setIsDeleteConfirming(false);
    } catch (error) {
      setStatus({type: 'error', message: `Deletion failed: ${getErrorMessage(error, 'Unknown error.')}`});
    } finally {
      setLoading(false);
    }
  };

  const deployTroubleshootConsole = async () => {
    if (!session) {
      return;
    }

    const hostedPageName = troubleshootDeployForm.hostedPageName.trim();
    const hostedPageId = troubleshootDeployForm.hostedPageId.trim();
    const trackingId = troubleshootDeployForm.trackingId.trim();

    if (!hostedPageName) {
      setStatus({type: 'error', message: 'Enter a hosted page name before deploying the troubleshoot console.'});
      return;
    }

    if (!trackingId) {
      setStatus({type: 'error', message: 'Enter a runtime default tracking ID before deploying the troubleshoot console.'});
      return;
    }

    setLoading(true);
    setTroubleshootDeployResult(null);
    setStatus({
      type: 'info',
      message: troubleshootDeployForm.dryRun
        ? 'Running a Commerce Troubleshoot Console dry-run through the backend...'
        : 'Deploying the Commerce Troubleshoot Console hosted page through the backend...',
    });

    try {
      const result = await deployCommerceTroubleshootConsoleRequest({
        organizationId: session.organizationId,
        accessToken: session.accessToken,
        platformUrl: session.platformUrl,
        trackingId,
        hostedPageName,
        ...(hostedPageId ? {hostedPageId} : {}),
        dryRun: troubleshootDeployForm.dryRun,
      });

      setTroubleshootDeployResult(result);
      if (result.hostedPageId) {
        setTroubleshootDeployForm((current) => ({
          ...current,
          hostedPageId: result.hostedPageId ?? current.hostedPageId,
        }));
      }

      setStatus({
        type: 'success',
        message: result.deployed
          ? `Commerce Troubleshoot Console deployed to hosted page "${result.hostedPageName}".`
          : `Commerce Troubleshoot Console dry-run completed for "${result.hostedPageName}".`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Troubleshoot Console deploy failed: ${getErrorMessage(error, 'Unknown error.')}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetListings = () => {
    setParsedListings([]);
    setListingStep(isSessionReady ? 2 : 1);
    setStatus(null);
  };

  const loadSampleConfig = (index: number) => {
    const sample = SAMPLE_CONFIGS[index];
    if (!sample) {
      return;
    }

    setConnectionForm({
      organizationId: sample.organizationId,
      trackingId: '',
      accessToken: sample.accessToken || '',
      platformUrl: sample.platformUrl,
    });
    setStatus({type: 'success', message: `Loaded sample: ${sample.name}`});
  };

  return {
    runtime,
    session,
    connectionForm,
    connectionStatus,
    loading,
    status,
    troubleshootDeployForm,
    troubleshootDeployResult,
    listingStep,
    parsedListings,
    globalConfigType,
    globalConfigData,
    globalConfigString,
    contextMappingsData,
    contextMappingsString,
    contextMappingsValidationError,
    sharedSettings,
    pendingSortLabels,
    pendingSortLang,
    pendingSortLabelValue,
    rankingRulesData,
    rankingRulesJSON,
    rankingRulesSolutionType,
    rankingRulesType,
    isDeleteConfirming,
    showManualConnection,
    devMode,
    availableTrackingIds,
    isSessionReady,
    qc,
    handleVersionClick,
    handleConnectionFieldChange,
    connectManually,
    disconnect,
    refreshResolvedContext,
    switchTrackingId,
    handleFileUpload,
    enhanceListing,
    submitListings,
    fetchGlobalConfig,
    saveGlobalConfig,
    setGlobalConfigType,
    setGlobalConfigString,
    fetchContextMappings,
    saveContextMappings,
    setContextMappingsString,
    addContextMapping,
    removeContextMapping,
    loadContextMappingsFile,
    exportContextMappings,
    copySharedSettings,
    pasteSharedSettings,
    addAdditionalField,
    removeAdditionalField,
    setPendingSortLang,
    setPendingSortLabelValue,
    addPendingSortLabel,
    removePendingSortLabel,
    addSort,
    removeSort,
    updateQueryConfigField,
    fetchRankingRules,
    exportRankingRules,
    loadRankingRulesFile,
    importRankingRules,
    setRankingRulesSolutionType,
    setRankingRulesType,
    exportAllListings,
    deleteAllListings,
    updateTroubleshootDeployForm,
    deployTroubleshootConsole,
    resetListings,
    setIsDeleteConfirming,
    setShowManualConnection,
    loadSampleConfig,
    setStatus,
  };
};

export type ManagerController = ReturnType<typeof useManagerController>;
