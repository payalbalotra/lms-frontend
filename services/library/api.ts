/**
 * Library data layer — integrates with backend /api/v1/procedures endpoints.
 *
 * Endpoints:
 * - GET  /api/v1/procedures       (List Procedures, Bearer auth)
 * - GET  /api/v1/procedures/:slug  (Get Procedure by slug)
 * - POST /api/v1/procedures       (Create Procedure, Bearer auth)
 */

import http from '@/lib/http';
import { LIBRARY_ENDPOINTS } from './endpoints';
import type { Procedure, CreateProcedureInput } from '@/lib/types';
import type { ProcedureFilterOptions } from './types';

function makeHeaders(cookieHeader?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }
  return headers;
}

function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

function normalizeStep(st: any): any {
  const isCrit = !!st.critical;
  let criticalLimit = st.criticalLimit;

  if (isCrit) {
    const hasValues =
      criticalLimit &&
      typeof criticalLimit.value === 'string' &&
      criticalLimit.value.trim().length > 0;

    if (hasValues) {
      criticalLimit = {
        value: criticalLimit.value.trim(),
        howToCheck: criticalLimit.howToCheck?.trim() || 'Visual and tactile verification',
        breachLabel: criticalLimit.breachLabel?.trim() || 'Standard threshold breached',
        breachResponse: criticalLimit.breachResponse?.trim() || 'Stop preparation and notify kitchen lead',
        ...(criticalLimit.label?.trim() ? { label: criticalLimit.label.trim() } : {}),
        ...(criticalLimit.subtitle?.trim() ? { subtitle: criticalLimit.subtitle.trim() } : {}),
        ...(criticalLimit.icon?.trim() ? { icon: criticalLimit.icon.trim() } : {}),
      };
    } else {
      criticalLimit = {
        value: 'Standard holding limit',
        howToCheck: 'Visual and tactile verification',
        breachLabel: 'Standard threshold breached',
        breachResponse: 'Stop preparation and notify kitchen lead',
      };
    }
  } else {
    criticalLimit = undefined;
  }

  return {
    id: st.id || `s-${Math.random().toString(36).slice(2, 8)}`,
    body: typeof st.body === 'string' ? { en: st.body, es: st.body } : (st.body || { en: '', es: '' }),
    critical: isCrit,
    criticalLimit,
    ...(st.images ? { images: st.images } : {}),
    ...(st.videoSegment ? { videoSegment: st.videoSegment } : {}),
    ...(st.timer ? { timer: st.timer } : {}),
    ...(st.note ? { note: st.note } : {}),
    ...(st.compareImages ? { compareImages: st.compareImages } : {}),
  };
}

function normalizeBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  return blocks.map((block) => {
    if (block.kind === 'image') {
      let src = block.src || '';
      if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        src = `${origin}${src.startsWith('/') ? '' : '/'}${src}`;
      }
      return {
        ...block,
        src,
        alt: typeof block.alt === 'string' ? { en: block.alt, es: block.alt } : (block.alt || { en: 'Procedure image', es: 'Imagen del procedimiento' }),
        hint: block.hint === 'diagram' ? 'diagram' : 'photo',
      };
    }
    if (block.kind === 'recipe') {
      const factors = Array.isArray(block.factors) && block.factors.length > 0 ? block.factors : [1];
      const rawIngredients = Array.isArray(block.ingredients) ? block.ingredients : [];
      const ingredients = rawIngredients.map((ing: any) => {
        let amounts = Array.isArray(ing.amounts) ? [...ing.amounts] : [];
        while (amounts.length < factors.length) amounts.push('1');
        if (amounts.length > factors.length) amounts = amounts.slice(0, factors.length);
        return {
          name: ing.name || 'Ingredient',
          form: ing.form,
          allergen: !!ing.allergen,
          unit: ing.unit,
          amounts,
        };
      });
      const rawSteps = Array.isArray(block.steps) && block.steps.length > 0 ? block.steps : [{ id: 's-1', body: { en: 'Prepare ingredients', es: 'Preparar ingredientes' } }];
      const steps = rawSteps.map(normalizeStep);

      return {
        ...block,
        factors: ingredients.length > 0 ? factors : undefined,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        steps,
      };
    }
    if (block.kind === 'method') {
      const rawSteps = Array.isArray(block.steps) && block.steps.length > 0 ? block.steps : [{ id: 's-1', body: { en: 'Follow instructions', es: 'Seguir instrucciones' } }];
      const steps = rawSteps.map(normalizeStep);
      return {
        ...block,
        steps,
      };
    }
    return block;
  });
}

export function normalizeBackendProcedure(raw: any): Procedure {
  return {
    ...raw,
    subcategoryId: raw.subcategory?.id ?? raw.subcategoryId ?? null,
    category: raw.category ?? null,
    stationScope:
      raw.stationScope ??
      (raw.stationId ? { mode: 'specific', stationIds: [raw.stationId] } : null),
    iconImageUrl: raw.iconImageUrl ?? raw.procedureImage ?? null,
    version: raw.version ?? 1,
    isArchived: raw.isArchived ?? false,
    audience: raw.audience ?? null,
    protection: raw.protection ?? 'standard',
    quizId: raw.quizId ?? null,
    linkedTrainingId: raw.linkedTrainingId ?? null,
    quizMode: raw.quizMode ?? 'training',
  };
}

export async function fetchProcedures(
  options: ProcedureFilterOptions = {},
  _isAdmin = false,
  cookieHeader?: string,
): Promise<{ procedures: Procedure[]; total?: number }> {
  const headers = makeHeaders(cookieHeader);
  const params: Record<string, any> = {};
  if (options.status) params.status = options.status;

  const { data } = await http.get<{
    success: boolean;
    data: { procedures: Procedure[] };
  }>(LIBRARY_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    params,
  });

  const rawList = Array.isArray(data.data?.procedures) ? data.data.procedures : [];
  const procedures = rawList.map(normalizeBackendProcedure);
  return { procedures, total: procedures.length };
}

export async function fetchProcedureById(
  slugOrId: string,
  _isAdmin = false,
  cookieHeader?: string,
): Promise<Procedure> {
  const headers = makeHeaders(cookieHeader);
  const { data } = await http.get<{
    success: boolean;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.GET(slugOrId), {
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (!data.data?.procedure) {
    throw new Error(`Procedure not found: ${slugOrId}`);
  }
  return normalizeBackendProcedure(data.data.procedure);
}

export async function createProcedure(
  input: CreateProcedureInput,
  cookieHeader?: string,
): Promise<Procedure> {
  const titleEn = (input.titleEn || input.titleEs || '').trim();
  const titleEs = (input.titleEs || input.titleEn || '').trim();
  const purposeEn = (input.purposeEn || input.purposeEs || titleEn).trim();
  const purposeEs = (input.purposeEs || input.purposeEn || titleEs).trim();

  const blocksEn = normalizeBlocks(input.bodyEn?.blocks ?? []);
  const blocksEs = normalizeBlocks(input.bodyEs?.blocks ?? []);

  const finalBlocksEn = blocksEn.length > 0
    ? blocksEn
    : [{ id: 'b-init-1', kind: 'text', body: { en: purposeEn, es: purposeEs } }];
  const finalBlocksEs = blocksEs.length > 0
    ? blocksEs
    : [{ id: 'b-init-1', kind: 'text', body: { en: purposeEn, es: purposeEs } }];

  const MOCK_TO_REAL_SUBCATEGORY: Record<string, string> = {
    'sub-plating': '7ecfd968-b364-4801-abf0-859842ce7705',
    'sub-cooking': '8352bd04-2584-49f4-91b1-463123d3e4eb',
    'sub-portions': '3dd93add-e931-43d5-94c7-8eaa37dd6f8f',
    'sub-culture': 'a689329a-7cd3-4ec7-878c-ae45d295597d',
    'sub-uniform': '181a5580-5762-4ed1-9c94-04f1840cbb0b',
    'sub-conduct': '5c51ede7-8c5f-4dee-a5b8-0045ab47a00a',
    'sub-hygiene': 'd1777da5-e508-4405-9851-3c03f76b66a2',
    'sub-cross-contam': 'f170b9c2-ee80-4bd8-86f3-d03f5043fabf',
    'sub-labeling': '0b977189-7ba6-465d-b66c-b74d8811fc30',
    'sub-allergy': 'b8109b7b-5696-47c5-9fa7-c612cb261861',
    'sub-dishwashing': 'd92e92bc-386b-485f-bb25-f1bba54a4539',
    'sub-chemicals': '0635eef3-9f13-4e6a-b540-a5c171dc6c04',
    'sub-waste': '40739a28-3d9f-4c92-a9c4-4eedcf085897',
    'sub-station-setup': 'f8caa67a-d67f-4b30-b393-f28b0805e859',
    'sub-communication': '0448c821-c2e4-4605-a3fa-5a9ddfbd23c0',
    'sub-opening': 'cc035c4c-c198-4a16-819b-aba0db01639b',
    'sub-closing': '08e28476-9246-471c-aab2-d1169f857d4c',
    'sub-eod-checks': 'ffd15434-5529-478c-96f9-a6c66c3e9733',
    'sub-operation': '2a962279-9d87-4dac-a463-be3d15cbb8e8',
    'sub-equipment-safety': 'c6a1a2c9-6bd3-4b55-a345-69d08253fa37',
    'sub-equipment-cleaning': '0f77903c-9b81-4b16-a71b-ed3ee36aa510',
  };

  const subcategoryId = isUuid(input.subcategoryId)
    ? input.subcategoryId
    : input.subcategoryId && MOCK_TO_REAL_SUBCATEGORY[input.subcategoryId]
      ? MOCK_TO_REAL_SUBCATEGORY[input.subcategoryId]
      : null;
  const stationId = isUuid(input.stationId)
    ? input.stationId
    : input.stationScope?.stationIds?.[0] && isUuid(input.stationScope.stationIds[0])
      ? input.stationScope.stationIds[0]
      : null;
  const quizId = isUuid(input.quizId) ? input.quizId : null;
  const procedureImage =
    typeof input.procedureImage === 'string' && input.procedureImage.startsWith('http')
      ? input.procedureImage
      : typeof input.iconImageUrl === 'string' && input.iconImageUrl.startsWith('http')
        ? input.iconImageUrl
        : null;

  const payload: Record<string, any> = {
    titleEn,
    titleEs,
    purposeEn,
    purposeEs,
    status: input.status === 'published' ? 'published' : 'draft',
    bodyEn: { blocks: finalBlocksEn },
    bodyEs: { blocks: finalBlocksEs },
  };

  if (subcategoryId) payload.subcategoryId = subcategoryId;
  if (stationId) payload.stationId = stationId;
  if (quizId) payload.quizId = quizId;
  if (procedureImage) payload.procedureImage = procedureImage;
  if (Array.isArray(input.assignUsers) && input.assignUsers.length > 0) {
    const validUsers = input.assignUsers.filter(isUuid);
    if (validUsers.length > 0) payload.assignUsers = validUsers;
  }

  const headers = makeHeaders(cookieHeader);

  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.CREATE, payload, {
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (data.data?.procedure) {
    return {
      ...data.data.procedure,
      subcategoryId: input.subcategoryId ?? null,
      stationScope: input.stationScope ?? null,
      version: data.data.procedure.version ?? input.version ?? 1,
      isArchived: data.data.procedure.isArchived ?? false,
      audience: input.audience ?? null,
      protection: input.protection ?? 'standard',
      quizId: input.quizId ?? null,
      linkedTrainingId: input.linkedTrainingId ?? null,
      quizMode: input.quizMode ?? 'training',
    };
  }

  throw new Error('Backend did not return created procedure');
}

export async function updateProcedure(
  _id: string,
  _input: Partial<CreateProcedureInput>
): Promise<Procedure> {
  throw new Error('updateProcedure: not implemented yet');
}

export async function archiveProcedure(_id: string): Promise<Procedure> {
  throw new Error('archiveProcedure: not implemented yet');
}
