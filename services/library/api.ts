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

function cleanLoc(v: any, fallback = 'Content'): { en: string; es: string } {
  if (typeof v === 'string') {
    const s = v.trim() || fallback;
    return { en: s, es: s };
  }
  const en = (v?.en ?? '').trim();
  const es = (v?.es ?? '').trim();
  const valid = en || es || fallback;
  return {
    en: en || valid,
    es: es || valid,
  };
}

function cleanLocOptional(v: any, defEn = '', defEs = ''): { en?: string; es?: string } {
  if (!v) return defEn || defEs ? { en: defEn || undefined, es: defEs || undefined } : {};
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return defEn || defEs ? { en: defEn || undefined, es: defEs || undefined } : {};
    return { en: s, es: s };
  }
  const en = (v.en ?? '').trim() || defEn;
  const es = (v.es ?? '').trim() || defEs;
  const res: { en?: string; es?: string } = {};
  if (en) res.en = en;
  if (es) res.es = es;
  return res;
}

function normalizeStep(st: any, idx = 1): any {
  const isCrit = !!st.critical;
  let criticalLimit = st.criticalLimit;

  if (isCrit && criticalLimit && typeof criticalLimit.value === 'string' && criticalLimit.value.trim().length > 0) {
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
    criticalLimit = undefined;
  }

  let timer = undefined;
  if (st.timer && typeof st.timer.seconds === 'number' && st.timer.seconds > 0) {
    timer = {
      seconds: Math.round(st.timer.seconds),
      label: (st.timer.label || '').trim() || 'Timer',
    };
  }

  let note = undefined;
  if (st.note && (st.note.body?.en?.trim() || st.note.body?.es?.trim() || (typeof st.note.body === 'string' && st.note.body.trim()))) {
    const validSeverities = ['warn', 'tip', 'alt', 'equip', 'allergen'];
    note = {
      severity: validSeverities.includes(st.note.severity) ? st.note.severity : 'tip',
      body: cleanLoc(st.note.body, 'Note'),
    };
  }

  let videoSegment = undefined;
  if (st.videoSegment && typeof st.videoSegment.src === 'string' && st.videoSegment.src.trim().length > 0) {
    videoSegment = {
      src: st.videoSegment.src.trim(),
      startSec: Math.max(0, Math.round(Number(st.videoSegment.startSec) || 0)),
      endSec: Math.max(0, Math.round(Number(st.videoSegment.endSec) || 0)),
    };
  }

  let images: any[] | undefined = undefined;
  if (Array.isArray(st.images) && st.images.length > 0) {
    const validImgs = st.images
      .filter((img: any) => img && typeof img.src === 'string' && img.src.trim().length > 0)
      .map((img: any) => ({
        src: img.src.trim(),
        alt: cleanLocOptional(img.alt, 'Step photo', 'Foto del paso'),
        ...(img.caption ? { caption: cleanLocOptional(img.caption) } : {}),
      }));
    if (validImgs.length > 0) images = validImgs;
  }

  return {
    id: st.id || `s-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    body: cleanLoc(st.body, `Step ${idx}`),
    critical: isCrit,
    ...(criticalLimit ? { criticalLimit } : {}),
    ...(timer ? { timer } : {}),
    ...(note ? { note } : {}),
    ...(videoSegment ? { videoSegment } : {}),
    ...(images ? { images } : {}),
    ...(typeof st.discardAt === 'boolean' ? { discardAt: st.discardAt } : {}),
    ...(typeof st.discardAtHours === 'number' ? { discardAtHours: st.discardAtHours } : {}),
    ...(typeof st.compareImages === 'boolean' ? { compareImages: st.compareImages } : {}),
    ...(typeof st.videoSrc === 'string' && st.videoSrc.trim() ? { videoSrc: st.videoSrc.trim() } : {}),
    ...(typeof st.videoCaption === 'string' && st.videoCaption.trim() ? { videoCaption: st.videoCaption.trim() } : {}),
  };
}

function normalizeBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];

  const normalized: any[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== 'object' || !block.kind) continue;

    if (block.kind === 'text') {
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'text',
        body: cleanLoc(block.body, 'Content text'),
      });
      continue;
    }

    if (block.kind === 'heading') {
      const level = [1, 2, 3].includes(block.level) ? block.level : 2;
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'heading',
        level,
        text: cleanLoc(block.text, 'Heading'),
      });
      continue;
    }

    if (block.kind === 'warning') {
      const validSeverities = ['warn', 'tip', 'alt', 'equip', 'allergen'];
      const severity = validSeverities.includes(block.severity) ? block.severity : 'warn';
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'warning',
        severity,
        body: cleanLoc(block.body, 'Warning notification'),
      });
      continue;
    }

    if (block.kind === 'image') {
      let src = (block.src || '').trim();
      if (!src) src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
      if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        src = `${origin}${src.startsWith('/') ? '' : '/'}${src}`;
      }
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'image',
        src,
        alt: cleanLocOptional(block.alt, 'Procedure image', 'Imagen del procedimiento'),
        ...(block.caption ? { caption: cleanLocOptional(block.caption) } : {}),
        hint: block.hint === 'diagram' ? 'diagram' : 'photo',
      });
      continue;
    }

    if (block.kind === 'video') {
      const src = (block.src || '').trim() || 'https://www.youtube.com';
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'video',
        src,
        ...(block.caption ? { caption: cleanLocOptional(block.caption) } : {}),
      });
      continue;
    }

    if (block.kind === 'attachment') {
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'attachment',
        title: cleanLoc(block.title, 'Document attachment'),
        href: (block.href || '').trim() || '#',
        ...(block.meta?.trim() ? { meta: block.meta.trim() } : {}),
      });
      continue;
    }

    if (block.kind === 'table') {
      let rawHeaders = Array.isArray(block.headers) ? block.headers : [];
      if (rawHeaders.length === 0) {
        rawHeaders = [{ en: 'Item', es: 'Artículo' }];
      }
      const headers = rawHeaders.map((h: any, j: number) => cleanLoc(h, `Column ${j + 1}`));
      const rawRows = Array.isArray(block.rows) ? block.rows : [];
      const rows = rawRows.map((row: any) => {
        const rowArr = Array.isArray(row) ? row : [];
        return headers.map((_: unknown, colIdx: number) => cleanLoc(rowArr[colIdx], '—'));
      });
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'table',
        headers,
        rows: rows.length > 0 ? rows : [headers.map(() => cleanLoc(null, '—'))],
      });
      continue;
    }

    if (block.kind === 'checklist') {
      const rawItems = Array.isArray(block.items) ? block.items : [];
      const items = (rawItems.length > 0 ? rawItems : [{ id: 'cl-1', text: { en: 'Item 1', es: 'Elemento 1' } }])
        .map((it: any, j: number) => ({
          id: it.id || `cl-${j + 1}`,
          text: cleanLoc(it.text, `Item ${j + 1}`),
        }));
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'checklist',
        title: cleanLoc(block.title, 'Checklist'),
        items,
      });
      continue;
    }

    if (block.kind === 'method') {
      const rawSteps = Array.isArray(block.steps) && block.steps.length > 0
        ? block.steps.filter((s: any) => s && (s.body?.en?.trim() || s.body?.es?.trim() || (typeof s.body === 'string' && s.body.trim()) || s.images?.length || s.timer))
        : [];
      const steps = (rawSteps.length > 0 ? rawSteps : [{ id: 's-1', body: { en: 'Follow instructions', es: 'Seguir instrucciones' } }])
        .map((s: any, idx: number) => normalizeStep(s, idx + 1));
      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'method',
        steps,
      });
      continue;
    }

    if (block.kind === 'recipe') {
      const rawIngredients = Array.isArray(block.ingredients) ? block.ingredients : [];
      const validIngredients = rawIngredients.filter(
        (ing: any) => ing && typeof ing.name === 'string' && ing.name.trim().length > 0,
      );

      let factors: number[] | undefined = undefined;
      let ingredients: any[] | undefined = undefined;

      if (validIngredients.length > 0) {
        factors = Array.isArray(block.factors) && block.factors.length > 0
          ? block.factors.map((f: any) => Math.max(1, Math.round(Number(f) || 1)))
          : [1];

        ingredients = validIngredients.map((ing: any) => {
          let amounts = Array.isArray(ing.amounts) ? [...ing.amounts] : [];
          amounts = amounts.map((a: any) => (typeof a === 'string' && a.trim().length > 0 ? a.trim() : '1'));
          while (amounts.length < factors!.length) amounts.push('1');
          if (amounts.length > factors!.length) amounts = amounts.slice(0, factors!.length);

          return {
            name: ing.name.trim(),
            ...(ing.form?.trim() ? { form: ing.form.trim() } : {}),
            allergen: !!ing.allergen,
            ...(ing.unit?.trim() ? { unit: ing.unit.trim() } : {}),
            amounts,
          };
        });
      }

      let allergen = undefined;
      if (block.allergen && Array.isArray(block.allergen.selectedAllergens) && block.allergen.selectedAllergens.length > 0) {
        const validChips = block.allergen.selectedAllergens.filter((k: any) => typeof k === 'string' && k.trim().length > 0);
        if (validChips.length > 0) {
          allergen = {
            summary: (block.allergen.summary || '').trim() || 'Contains allergens',
            detail: (block.allergen.detail || '').trim() || 'Please check ingredients list for allergen details',
            selectedAllergens: validChips,
          };
        }
      }

      const rawYield = Array.isArray(block.yieldItems) ? block.yieldItems : [];
      const yieldItems = rawYield
        .filter((y: any) => y && typeof y.label === 'string' && y.label.trim().length > 0 && typeof y.value === 'string' && y.value.trim().length > 0)
        .map((y: any) => ({
          label: y.label.trim(),
          value: y.value.trim(),
          ...(y.unit?.trim() ? { unit: y.unit.trim() } : {}),
          ...(typeof y.scales === 'boolean' ? { scales: y.scales } : {}),
        }));

      const rawSteps = Array.isArray(block.steps) && block.steps.length > 0
        ? block.steps.filter((s: any) => s && (s.body?.en?.trim() || s.body?.es?.trim() || (typeof s.body === 'string' && s.body.trim()) || s.images?.length || s.timer))
        : [];
      const steps = (rawSteps.length > 0 ? rawSteps : [{ id: 's-1', body: { en: 'Prepare ingredients', es: 'Preparar ingredientes' } }])
        .map((s: any, idx: number) => normalizeStep(s, idx + 1));

      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'recipe',
        ...(block.audience?.trim() ? { audience: block.audience.trim() } : {}),
        ...(allergen ? { allergen } : {}),
        ...(yieldItems.length > 0 ? { yieldItems } : {}),
        ...(factors ? { factors } : {}),
        ...(ingredients ? { ingredients } : {}),
        steps,
      });
      continue;
    }

    if (block.kind === 'ingredients') {
      const rawIngredients = Array.isArray(block.ingredients) ? block.ingredients : [];
      const validIngredients = rawIngredients.filter(
        (ing: any) => ing && typeof ing.name === 'string' && ing.name.trim().length > 0,
      );

      let factors: number[] | undefined = undefined;
      let ingredients: any[] | undefined = undefined;

      if (validIngredients.length > 0) {
        factors = Array.isArray(block.factors) && block.factors.length > 0
          ? block.factors.map((f: any) => Math.max(1, Math.round(Number(f) || 1)))
          : [1];

        ingredients = validIngredients.map((ing: any) => {
          let amounts = Array.isArray(ing.amounts) ? [...ing.amounts] : [];
          amounts = amounts.map((a: any) => (typeof a === 'string' && a.trim().length > 0 ? a.trim() : '1'));
          while (amounts.length < factors!.length) amounts.push('1');
          if (amounts.length > factors!.length) amounts = amounts.slice(0, factors!.length);

          return {
            name: ing.name.trim(),
            ...(ing.form?.trim() ? { form: ing.form.trim() } : {}),
            allergen: !!ing.allergen,
            ...(ing.unit?.trim() ? { unit: ing.unit.trim() } : {}),
            amounts,
          };
        });
      }

      let allergen = undefined;
      if (block.allergen && Array.isArray(block.allergen.selectedAllergens) && block.allergen.selectedAllergens.length > 0) {
        const validChips = block.allergen.selectedAllergens.filter((k: any) => typeof k === 'string' && k.trim().length > 0);
        if (validChips.length > 0) {
          allergen = {
            summary: (block.allergen.summary || '').trim() || 'Contains allergens',
            detail: (block.allergen.detail || '').trim() || 'Please check ingredients list for allergen details',
            selectedAllergens: validChips,
          };
        }
      }

      const rawYield = Array.isArray(block.yieldItems) ? block.yieldItems : [];
      const yieldItems = rawYield
        .filter((y: any) => y && typeof y.label === 'string' && y.label.trim().length > 0 && typeof y.value === 'string' && y.value.trim().length > 0)
        .map((y: any) => ({
          label: y.label.trim(),
          value: y.value.trim(),
          ...(y.unit?.trim() ? { unit: y.unit.trim() } : {}),
          ...(typeof y.scales === 'boolean' ? { scales: y.scales } : {}),
        }));

      normalized.push({
        id: block.id || `b-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'ingredients',
        ...(block.audience?.trim() ? { audience: block.audience.trim() } : {}),
        ...(allergen ? { allergen } : {}),
        ...(yieldItems.length > 0 ? { yieldItems } : {}),
        ...(factors ? { factors } : {}),
        ...(ingredients ? { ingredients } : {}),
      });
      continue;
    }
  }

  return normalized;
}

export function normalizeBackendProcedure(raw: any): Procedure {
  // The backend marks archived rows with `status: "archived"` (plus
  // `previousStatus`) and sends no `isArchived` boolean. Map that onto the
  // frontend's separate `isArchived` flag — otherwise archived procedures
  // fail the `statusFilter === 'archived'` branch (which checks isArchived)
  // and keep showing in the default list. Without this, archiving works API-
  // side but the Archived filter reads "0 of N".
  const archived = raw.isArchived ?? raw.status === 'archived';
  const status = raw.status === 'archived' ? (raw.previousStatus ?? 'draft') : raw.status;
  return {
    ...raw,
    status,
    subcategoryId: raw.subcategory?.id ?? raw.subcategoryId ?? null,
    category: raw.category ?? null,
    stationScope:
      raw.stationScope ??
      (raw.stationId ? { mode: 'specific', stationIds: [raw.stationId] } : null),
    iconImageUrl: raw.iconImageUrl ?? raw.procedureImage ?? null,
    version: raw.version ?? 1,
    isArchived: archived,
    audience: raw.audience ?? null,
    protection: raw.protection ?? 'standard',
    quizId: raw.quizId ?? null,
    linkedTrainingId: raw.linkedTrainingId ?? null,
    quizMode: raw.quizMode ?? 'training',
  };
}

/** Default page size for full-list reads (counts, client filters). The backend
 *  defaults to `limit=10` when omitted — restaurant scale (50–100 docs) fits
 *  comfortably in one page, so one bounded request replaces paging logic. */
export const PROCEDURES_LIST_LIMIT = 200;

export async function fetchProcedures(
  options: ProcedureFilterOptions = {},
  _isAdmin = false,
  cookieHeader?: string,
): Promise<{ procedures: Procedure[]; total?: number }> {
  const headers = makeHeaders(cookieHeader);
  const limit = options.limit ?? PROCEDURES_LIST_LIMIT;
  const page = options.page ?? 1;
  const search = options.search ?? options.q ?? undefined;

  // ID-list filters live on GET /procedures/filter; plain status/search/page
  // stay on GET /procedures. Both return { procedures, meta }.
  const useFilter =
    (options.categoryIds?.length ?? 0) > 0 ||
    (options.subcategoryIds?.length ?? 0) > 0 ||
    (options.stationIds?.length ?? 0) > 0;
  const params: Record<string, any> = { page, limit };
  if (options.status) params.status = options.status;
  if (search) params.search = search;
  if (useFilter) {
    if (options.categoryIds?.length) params.categoryIds = options.categoryIds.join(',');
    if (options.subcategoryIds?.length) params.subcategoryIds = options.subcategoryIds.join(',');
    if (options.stationIds?.length) params.stationIds = options.stationIds.join(',');
  }

  const { data } = await http.get<{
    success: boolean;
    data: { procedures: Procedure[]; meta?: { total: number; totalPages: number } };
  }>(useFilter ? LIBRARY_ENDPOINTS.FILTER : LIBRARY_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    params,
  });

  const rawList = Array.isArray(data.data?.procedures) ? data.data.procedures : [];
  const procedures = rawList.map(normalizeBackendProcedure);
  await resolveBackendCategories(procedures, cookieHeader);
  const total = data.data?.meta?.total ?? procedures.length;
  return { procedures, total };
}

/** Backend procedures carry `subcategory: { id, categoryId, … }` but no
 *  category object, so every backend row reads as "General" and no category
 *  filter can match it. This resolves each row's category from the backend
 *  category list (one batched call, in parallel-safe position) and folds the
 *  in-use subcategories into their categories for the dropdowns. Failures
 *  keep the old behavior (null category) — the list still renders. */
async function resolveBackendCategories(procedures: Procedure[], cookieHeader?: string): Promise<void> {
  const needsResolution = procedures.some((p) => !p.category && p.subcategoryId);
  if (!needsResolution) return;
  try {
    const { fetchBackendCategories, backendSlug } = await import('@/services/categories/api');
    const cats = await fetchBackendCategories({}, cookieHeader);
    const byId = new Map(cats.map((c) => [c.id, c]));
    const subSeen = new Set<string>();
    for (const p of procedures) {
      const sub = (
        p as unknown as {
          subcategory?: { id: string; categoryId: string; nameEn: string; nameEs: string } | null;
        }
      ).subcategory;
      if (!sub) continue;
      const cat = byId.get(sub.categoryId);
      if (!cat) continue;
      if (!p.category) p.category = cat;
      if (!subSeen.has(sub.id)) {
        subSeen.add(sub.id);
        cat.subcategories = [
          ...(cat.subcategories ?? []),
          {
            id: sub.id,
            slug: backendSlug(sub.nameEn),
            nameEn: sub.nameEn,
            nameEs: sub.nameEs,
            categoryId: sub.categoryId,
          },
        ];
      }
    }
  } catch {
    // Backend categories unavailable — rows keep category: null (General).
  }
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

/** Backend PUT/POST validate against the full create schema, so every
 *  write must ship the complete payload. Shared between create and
 *  update: titles/purposes fall back across languages, blocks get
 *  normalised, and mock-only ids are mapped to their real UUIDs. */
function buildProcedurePayload(input: Partial<CreateProcedureInput>): Record<string, any> {
  let titleEn = (input.titleEn || input.titleEs || 'Untitled Procedure').trim();
  let titleEs = (input.titleEs || input.titleEn || 'Procedimiento sin título').trim();
  if (titleEn.length > 200) titleEn = titleEn.slice(0, 200);
  if (titleEs.length > 200) titleEs = titleEs.slice(0, 200);

  const purposeEn = (input.purposeEn || input.purposeEs || titleEn).trim() || titleEn;
  const purposeEs = (input.purposeEs || input.purposeEn || titleEs).trim() || titleEs;

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
      : input.audience?.stationIds?.[0] && isUuid(input.audience.stationIds[0])
        ? input.audience.stationIds[0]
        : null;
  const quizId = isUuid(input.quizId) ? input.quizId : null;
  const procedureImage =
    typeof input.procedureImage === 'string' && input.procedureImage.startsWith('http')
      ? input.procedureImage
      : typeof input.iconImageUrl === 'string' && input.iconImageUrl.startsWith('http')
        ? input.iconImageUrl
        : null;

  const rawAssignUsers =
    Array.isArray(input.assignUsers) && input.assignUsers.length > 0
      ? input.assignUsers
      : Array.isArray(input.audience?.employeeIds) && input.audience.employeeIds.length > 0
        ? input.audience.employeeIds
        : [];
  const validUsers = rawAssignUsers.filter(isUuid);

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
  if (validUsers.length > 0) payload.assignUsers = validUsers;

  return payload;
}

/** The backend's returned row, merged back onto the caller's intent so
 *  fields the API doesn't echo (stationScope, audience, …) survive. */
function normalizeWrittenProcedure(
  apiProcedure: Procedure,
  input: Partial<CreateProcedureInput>,
): Procedure {
  return {
    ...apiProcedure,
    subcategoryId: 'subcategoryId' in input ? (input.subcategoryId ?? null) : apiProcedure.subcategoryId,
    stationScope: input.stationScope ?? null,
    version: apiProcedure.version ?? input.version ?? 1,
    isArchived: apiProcedure.isArchived ?? false,
    audience: input.audience ?? null,
    protection: input.protection ?? 'standard',
    quizId: input.quizId ?? null,
    linkedTrainingId: input.linkedTrainingId ?? null,
    quizMode: input.quizMode ?? 'training',
  };
}

export async function createProcedure(
  input: CreateProcedureInput,
  cookieHeader?: string,
): Promise<Procedure> {
  const payload = buildProcedurePayload(input);
  const headers = makeHeaders(cookieHeader);

  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.CREATE, payload, {
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (data.data?.procedure) {
    return normalizeWrittenProcedure(data.data.procedure, input);
  }

  throw new Error('Backend did not return created procedure');
}

/** PUT /api/v1/procedures/:id — the backend validates with the same
 *  full create schema, so this ships a complete payload, not a patch. */
export async function updateProcedure(
  id: string,
  input: Partial<CreateProcedureInput>,
  cookieHeader?: string,
): Promise<Procedure> {
  const payload = buildProcedurePayload(input);
  const headers = makeHeaders(cookieHeader);

  const { data } = await http.put<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.UPDATE(id), payload, {
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (data.data?.procedure) {
    return normalizeWrittenProcedure(data.data.procedure, input);
  }

  throw new Error('Backend did not return updated procedure');
}

/** POST /api/v1/procedures/:id/archive — soft delete; the backend has
 *  no hard-delete route, archive is the remove. */
export async function archiveProcedure(id: string): Promise<Procedure> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.ARCHIVE(id));

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return archived procedure');
}

/** POST /api/v1/procedures/:id/unarchive — restores an archived procedure. */
export async function unarchiveProcedure(id: string): Promise<Procedure> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.UNARCHIVE(id));

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return unarchived procedure');
}

/** Fields a partial update may carry. The backend PATCH (when it lands)
 *  validates only present fields — same rules as the full schema, applied
 *  per field. `isArchived` is NOT sent here: archiving stays on the
 *  dedicated archive/unarchive routes (zod strips unknown keys, so sending
 *  it via PATCH would silently no-op). */
export interface ProcedurePatchInput {
  titleEn?: string;
  titleEs?: string;
  purposeEn?: string;
  purposeEs?: string;
  subcategoryId?: string | null;
  stationId?: string | null;
  quizId?: string | null;
  procedureImage?: string | null;
  assignUsers?: string[];
  status?: Procedure['status'];
}

/** PATCH /api/v1/procedures/:id — partial update: only changed fields.
 *  Throws the backend's ApiException on real failures (400 validation,
 *  401/403 auth). A 404 with an empty/HTML body (`code 'UNKNOWN'`) or 405
 *  means the route doesn't exist yet — callers fall back while waiting. */
export async function patchProcedure(id: string, patch: ProcedurePatchInput): Promise<Procedure> {
  const { data } = await http.patch<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.UPDATE(id), patch);

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return patched procedure');
}
