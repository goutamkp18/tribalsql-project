import { apiFetch, ApiResponse } from './api';
import { RetainedMemory, RecalledMemory, ReflectedKnowledge, MentalModel, LearningEvent } from '../types';
import { 
  mockRetainedMemories, 
  mockRecalledMemories, 
  mockReflectedKnowledge, 
  mockMentalModels 
} from '../data/mockMemories';
import { mockLearningEvents } from '../data/mockLearning';

export async function retainMemory(payload: {
  title: string;
  type: string;
  ruleText: string;
  description: string;
  author: string;
  categoryTag: string;
  question?: string;
  wrong_sql?: string;
  corrected_sql?: string;
  business_rule?: string;
}): Promise<ApiResponse<RetainedMemory>> {
  const question = payload.question || payload.title || 'NovaMart Policy Query';
  const businessRule = payload.business_rule || payload.ruleText || payload.description || '';
  const wrongSql = payload.wrong_sql || payload.description || 'None';
  const correctedSql = payload.corrected_sql || '';

  const response = await apiFetch<any>(
    '/api/correct',
    {
      method: 'POST',
      body: JSON.stringify({
        question,
        business_rule: businessRule,
        wrong_sql: wrongSql,
        corrected_sql: correctedSql,
        title: payload.title,
        type: payload.type,
        ruleText: payload.ruleText,
        description: payload.description,
        author: payload.author,
        categoryTag: payload.categoryTag,
      }),
    },
    async () => {
      const newMemory: RetainedMemory = {
        id: `mem-${Date.now().toString().slice(-4)}`,
        type: payload.type as any,
        title: payload.title,
        description: payload.description,
        ruleText: payload.ruleText,
        createdAt: new Date().toISOString(),
        confidenceScore: 0.99,
        timesApplied: 1,
        author: payload.author || 'Current User',
        verified: true,
        categoryTag: payload.categoryTag || 'Custom Rule',
      };
      return newMemory;
    }
  );

  if (response.source === 'fastapi' && response.data) {
    const raw = response.data;
    const memory: RetainedMemory = {
      id: raw.id || `mem-${Date.now().toString().slice(-4)}`,
      type: (raw.type as any) || (payload.type as any) || 'human_correction',
      title: raw.title || payload.title || 'Retained Business Rule',
      description: raw.description || payload.description || businessRule,
      ruleText: raw.ruleText || businessRule,
      createdAt: raw.createdAt || new Date().toISOString(),
      confidenceScore: raw.confidenceScore ?? 0.99,
      timesApplied: raw.timesApplied ?? 1,
      author: raw.author || payload.author || 'Current User / GP',
      verified: true,
      categoryTag: raw.categoryTag || payload.categoryTag || 'Business Rule',
    };
    return {
      ...response,
      data: memory,
    };
  }

  return response;
}

export async function recallMemory(query: string): Promise<ApiResponse<RecalledMemory[]>> {
  const response = await apiFetch<any>(
    `/api/memory/inspect?q=${encodeURIComponent(query)}`,
    {
      method: 'GET',
    },
    async () => {
      return mockRecalledMemories;
    }
  );

  if (response.source === 'fastapi' && response.data) {
    const raw = response.data;
    const items = raw.recalled_items || raw.memory_context?.recalled_items || [];
    if (Array.isArray(items) && items.length > 0) {
      const adapted: RecalledMemory[] = items.map((item: any, idx: number) => ({
        id: item.id || `recalled-${idx + 1}`,
        memoryId: item.id || `mem-${idx + 1}`,
        title: item.text ? (item.text.slice(0, 45) + '...') : (item.title || 'Recalled Rule'),
        relevanceScore: item.score ?? 0.95,
        selectionReason: item.context || 'Recalled from Hindsight Cloud Memory',
        queryId: `q-${idx + 1}`,
        queryText: query,
        timestamp: item.timestamp || new Date().toISOString(),
        appliedRule: item.text || item.content || item.ruleText || '',
      }));
      return {
        ...response,
        data: adapted,
      };
    }
    return {
      ...response,
      data: mockRecalledMemories,
    };
  }

  return response;
}

export async function reflectMemory(query: string = 'Calculate net revenue from premium customers.'): Promise<ApiResponse<ReflectedKnowledge[]>> {
  const response = await apiFetch<any>(
    `/api/memory/inspect?q=${encodeURIComponent(query)}`,
    {
      method: 'GET',
    },
    async () => {
      return mockReflectedKnowledge;
    }
  );

  if (response.source === 'fastapi' && response.data) {
    const raw = response.data;
    const playbook: string = raw.synthesized_playbook || raw.memory_context?.synthesized_playbook || '';
    if (playbook && !playbook.includes('Memory recall disabled')) {
      const sections = playbook
        .split(/###|\n\n/)
        .map(s => s.trim())
        .filter(s => s.length > 25);
      
      const reflectedList: ReflectedKnowledge[] = sections.slice(0, 5).map((sec, idx) => {
        let theme = 'Hindsight Synthesized Rule';
        if (sec.toLowerCase().includes('revenue') || sec.toLowerCase().includes('formula')) {
          theme = 'Corporate GAAP Revenue Standard';
        } else if (sec.toLowerCase().includes('customer') || sec.toLowerCase().includes('tier') || sec.toLowerCase().includes('gold')) {
          theme = 'Customer Segmentation & LTV Rules';
        } else if (sec.toLowerCase().includes('test') || sec.toLowerCase().includes('internal')) {
          theme = 'Internal QA Account Exclusions';
        } else if (sec.toLowerCase().includes('refund')) {
          theme = 'Refund & Return Deduction Policy';
        }

        return {
          id: `ref-live-${idx + 1}`,
          theme,
          synthesizedFact: sec.replace(/^#+\s*/, ''),
          confidence: 0.99,
          supportingEvidence: [
            `Recalled from Hindsight Bank: "${raw.bank_id || 'novamart-prod-db'}"`,
            `Synthesized by Hindsight Reflect engine across ${raw.recalled_items?.length || 20}+ verified analyst inputs`,
            'Enforces AST syntax and business constraint validation'
          ],
          impactScope: 'Enterprise Policy Guardrail',
          lastReflected: new Date().toISOString(),
        };
      });

      return {
        ...response,
        data: reflectedList.length > 0 ? reflectedList : mockReflectedKnowledge,
      };
    }
  }

  return response;
}

export async function getMentalModels(): Promise<ApiResponse<MentalModel[]>> {
  return apiFetch<MentalModel[]>(
    '/api/memory/mental-models',
    {
      method: 'GET',
    },
    async () => {
      return mockMentalModels;
    }
  );
}

export async function getLearningHistory(filter: string = 'all'): Promise<ApiResponse<LearningEvent[]>> {
  return apiFetch<LearningEvent[]>(
    `/api/memory/learning-history?filter=${filter}`,
    {
      method: 'GET',
    },
    async () => {
      if (filter === 'all') return mockLearningEvents;
      return mockLearningEvents.filter(ev => ev.verificationStatus === filter);
    }
  );
}

export async function getRetainedMemories(): Promise<ApiResponse<RetainedMemory[]>> {
  const response = await apiFetch<any>(
    '/api/memory/retained',
    {
      method: 'GET',
    },
    async () => {
      return mockRetainedMemories;
    }
  );

  if (response.source === 'fastapi' && response.data && Array.isArray(response.data) && response.data.length > 0) {
    return response as ApiResponse<RetainedMemory[]>;
  }

  return {
    ...response,
    data: mockRetainedMemories,
  };
}
