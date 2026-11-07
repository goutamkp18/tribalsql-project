import { apiFetch, ApiResponse } from './api';
import { TableSchema } from '../types';
import { mockTables, mockDatabaseRelationships, DatabaseRelationship } from '../data/mockDatabase';

export async function getDatabaseSchema(): Promise<ApiResponse<TableSchema[]>> {
  const response = await apiFetch<any>(
    '/api/schema',
    {
      method: 'GET',
    },
    async () => {
      return mockTables;
    }
  );

  if (response.source === 'fastapi' && response.data) {
    if (Array.isArray(response.data)) {
      return { ...response, data: response.data };
    }
    if (response.data.tables && Array.isArray(response.data.tables)) {
      return { ...response, data: response.data.tables };
    }
    // Return mockTables which provide full column detail and sample rows for the UI
    return { ...response, data: mockTables };
  }

  return response;
}

export async function getTableDetails(tableName: string): Promise<ApiResponse<TableSchema | undefined>> {
  return apiFetch<TableSchema | undefined>(
    `/api/database/table/${tableName}`,
    {
      method: 'GET',
    },
    async () => {
      return mockTables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
    }
  );
}

export async function getDatabaseRelationships(): Promise<ApiResponse<DatabaseRelationship[]>> {
  return apiFetch<DatabaseRelationship[]>(
    '/api/database/relationships',
    {
      method: 'GET',
    },
    async () => {
      return mockDatabaseRelationships;
    }
  );
}
