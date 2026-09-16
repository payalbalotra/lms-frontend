/**
 * Mock data for the procedures demo. Real data comes from the API.
 * Authoritative reference: /DESIGN.md §4 (document anatomy) and
 * /docs/SOP_LIBRARY_PLAN.md §3 (block discriminated union).
 */

import type {
  Procedure,
  ProcedureBlock,
  ProcedureMethodStep,
  Localised,
} from './types';

const en = (s: string): string => s;

function both(s: string): Localised {
  return { en: s, es: s };
}

const audienceBody =
  'Everyone who prepares, cooks or plates food. It covers cutting boards, prep tables, knives, tongs, the slicer, and any other surface or tool that food touches.';

const equipmentBody =
  'Two buckets, labelled Wash and Sanitise · detergent · clean cloths, one per bucket · quaternary ammonium sanitiser · test strips for that sanitiser.';

const sanitiserWarningBody =
  'Sanitiser is a chemical. Never mix it with any other product, and never with bleach or anything containing ammonia: the fumes are dangerous. Keep it away from food and away from open containers.';

const methodSteps: ProcedureMethodStep[] = [
  {
    id: en('cleaning-step-1'),
    body: both('Scrape all food debris off the surface and into the bin.'),
  },
  {
    id: en('cleaning-step-2'),
    body: both(
      'Wash with detergent and warm water from the Wash bucket. Work the whole surface, including the edges, the corners and the underside of any lip.',
    ),
  },
  {
    id: en('cleaning-step-3'),
    body: both(
      'Rinse with clean water. No detergent should be left on the surface, because it stops the sanitiser working.',
    ),
  },
  {
    id: en('cleaning-step-4'),
    critical: true,
    body: both(
      'Apply sanitiser from the Sanitise bucket. Leave it on the surface for the full contact time. Do not wipe it off early.',
    ),
    criticalLimit: {
      value: en('200 ppm, for at least 30 seconds'),
      subtitle: en(
        'Quaternary ammonium. Confirm both numbers against the label on the bottle you are actually using: the manufacturer sets them, not this procedure.',
      ),
      howToCheck: en(
        'Dip a test strip in the bucket. Read it against the colour chart on the bottle, not from memory. Record it on the Sanitiser Log.',
      ),
      breachLabel: en('If it reads below 200 ppm'),
      breachResponse: en(
        'Do not use the bucket. Empty it, make a fresh solution, and test again before you sanitise anything.',
      ),
    },
  },
  {
    id: en('cleaning-step-5'),
    body: both(
      'Let the surface air dry. Do not dry it with a towel: a towel puts contamination straight back onto the surface you just sanitised.',
    ),
  },
];

const monitoring = [
  'Test the Sanitise bucket with a strip at the start of every shift.',
  'Test it again every 4 hours, and whenever it has been remade.',
  'Write the reading and the time on the Sanitiser Log, and initial it.',
  'The chef on duty checks the log before close.',
];

const fixes = [
  {
    failure: 'The strip reads below 200 ppm',
    response:
      'Empty the bucket, make a fresh solution and test again. Nothing gets sanitised from a weak bucket.',
  },
  {
    failure: 'A surface was used after being sanitised from a weak bucket',
    response:
      'Clean and sanitise that surface again. Throw away any ready-to-eat food that touched it.',
  },
  {
    failure:
      'The solution is cloudy, has debris in it, or is more than 4 hours old',
    response:
      'Make it fresh, whatever the strip says. A strip does not measure how dirty the water is.',
  },
  {
    failure: 'You are not sure whether a surface was sanitised',
    response: 'Sanitise it. There is no cost to doing it twice.',
  },
];

const recordsBody =
  'Sanitiser Log. Initialled by whoever tested the bucket, checked by the chef on duty at close, and kept for one year.';

const CLEANING_BLOCKS: ProcedureBlock[] = [
  { id: 'audience-h',  kind: 'heading', level: 2, text: both('Who this is for') },
  { id: 'audience-b',  kind: 'text',    body: both(audienceBody) },
  { id: 'equipment-h', kind: 'heading', level: 2, text: both('Equipment') },
  { id: 'equipment-b', kind: 'text',    body: both(equipmentBody) },
  { id: 'sanitiser-w', kind: 'warning', severity: 'warn', body: both(sanitiserWarningBody) },
  { id: 'method',      kind: 'method',  steps: methodSteps },
  { id: 'monitoring-h', kind: 'heading', level: 2, text: both('Monitoring') },
  ...monitoring.map<ProcedureBlock>((line, i) => ({
    id: `monitoring-${i}`,
    kind: 'text',
    body: both(line),
  })),
  { id: 'fixes-h', kind: 'heading', level: 2, text: both('If something goes wrong') },
  ...fixes.map<ProcedureBlock>((f, i) => ({
    id: `fix-${i}`,
    kind: 'text',
    body: both(`${f.failure} — ${f.response}`),
  })),
  { id: 'records-h', kind: 'heading', level: 2, text: both('Records') },
  { id: 'records-b', kind: 'text',    body: both(recordsBody) },
  {
    id: 'attach-1',
    kind: 'attachment',
    title: both('Sanitiser safety data sheet'),
    href: '#',
    meta: 'PDF · 1.2 MB · from the manufacturer',
  },
  {
    id: 'attach-2',
    kind: 'attachment',
    title: both('Sanitiser Log, blank sheet'),
    href: '#',
    meta: 'PDF · 1 page · print and post beside the sink',
  },
];

const RELATED: { title: string; meta: string; href: string }[] = [
  { title: 'Washing hands',                   meta: 'Personal hygiene',            href: '#related' },
  { title: 'Storing and using chemicals',     meta: 'General and administrative',  href: '#related' },
  { title: 'Preventing cross-contamination',  meta: 'Food safety',                 href: '#related' },
];

const CONTROL = [
  { label: 'Document',     value: 'SOP-002' },
  { label: 'Version',      value: '3' },
  { label: 'Effective',    value: '4 Sep 2026' },
  { label: 'Supersedes',   value: 'Version 2, 12 Feb 2026' },
  { label: 'Owner',        value: 'Chef Raúl Medina' },
  { label: 'Approved by',  value: 'Chef Raúl Medina, 4 Sep 2026' },
  { label: 'Next review',  value: '4 Sep 2027' },
  { label: 'Records kept', value: 'Sanitiser Log, 1 year' },
  { label: 'Part of',      value: 'Sanitation plan, filed with Vancouver Coastal Health' },
];

const FACTS = [
  { icon: 'ri-community-line',      label: 'Applies to',  value: 'All stations',       kind: 'default' as const },
  { icon: 'ri-user-line',           label: 'Owner',       value: 'Chef Raúl Medina',   kind: 'default' as const },
  { icon: 'ri-verified-badge-line', label: 'Verified',    value: '4 Sep 2026',         kind: 'ok' as const },
  { icon: 'ri-calendar-line',       label: 'Next review', value: '4 Sep 2027',         kind: 'default' as const },
];

const CLEANING: Procedure & { related: typeof RELATED; control: typeof CONTROL; facts: typeof FACTS } = {
  id: 'cleaning-and-sanitising',
  slug: 'cleaning-and-sanitising',
  titleEn: 'Cleaning and sanitising food contact surfaces',
  titleEs: 'Cleaning and sanitising food contact surfaces',
  purposeEn:
    'To prevent foodborne illness by making sure every surface that touches food is cleaned and sanitised before it is used.',
  purposeEs:
    'To prevent foodborne illness by making sure every surface that touches food is cleaned and sanitised before it is used.',
  categoryKey: 'stations',
  status: 'published',
  bodyEn: { blocks: CLEANING_BLOCKS },
  bodyEs: { blocks: CLEANING_BLOCKS },
  createdBy: 'seed',
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
  related: RELATED,
  control: CONTROL,
  facts: FACTS,
};

const PROCEDURES: Record<string, (typeof CLEANING)> = {
  'cleaning-and-sanitising': CLEANING,
};

export function getProcedure(id: string): (typeof CLEANING) | undefined {
  return PROCEDURES[id];
}

export function listProcedureIds(): string[] {
  return Object.keys(PROCEDURES);
}
