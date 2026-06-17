import architectureOverview from '../../../docs/ARCHITECTURE_OVERVIEW.md?raw';
import gettingStarted from '../../../docs/GETTING_STARTED.md?raw';
import apiReference from '../../../API.md?raw';
import rankingRulesGuide from '../../../docs/RANKING_RULES.md?raw';
import automationExamples from '../../../examples/README.md?raw';

export interface DocsArticle {
  slug: string;
  title: string;
  description: string;
  sourcePath: string;
  content: string;
}

export const docsArticles: DocsArticle[] = [
  {
    slug: 'architecture-overview',
    title: 'Architecture overview',
    description: 'End-to-end view of the delivery surfaces, shared control layer, automation services, and Coveo platform execution flow.',
    sourcePath: 'docs/ARCHITECTURE_OVERVIEW.md',
    content: architectureOverview,
  },
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: 'Quick orientation for the standalone app, embedded extension, and the most common workflows.',
    sourcePath: 'docs/GETTING_STARTED.md',
    content: gettingStarted,
  },
  {
    slug: 'api-reference',
    title: 'Import API',
    description: 'Programmatic CSV upload details, request formats, and response examples.',
    sourcePath: 'API.md',
    content: apiReference,
  },
  {
    slug: 'ranking-rules',
    title: 'Ranking rules',
    description: 'JSON structure, validation behavior, and export or import examples for rules.',
    sourcePath: 'docs/RANKING_RULES.md',
    content: rankingRulesGuide,
  },
  {
    slug: 'automation-examples',
    title: 'Automation examples',
    description: 'Shell, Node.js, Python, and CI automation references for imports.',
    sourcePath: 'examples/README.md',
    content: automationExamples,
  },
];
