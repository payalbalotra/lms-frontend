/**
 * Mock data for the procedures demo. Real data comes from the API.
 * Authoritative reference: /DESIGN.md §4 (document anatomy).
 *
 * The fields here mirror, in order, the blocks of sop-template.html and
 * sop-recipe-format.html. A block that is "required" in DESIGN.md
 * (facts, doc-purpose, doc-title, method, doc-acts, doc-ctl) is a
 * non-optional field here.
 */

export type CriticalLimit = {
  label?: string;   // "Critical limit"
  icon?: string;    // remix class, default "ri-test-tube-line"
  value: string;    // "200 ppm, for at least 30 seconds"
  subtitle?: string;
  howToCheck: string;
  breachLabel: string;
  breachResponse: string;
};

export type NoteKind = 'warn' | 'tip' | 'alt' | 'equip' | 'allergen';

export type Procedure = {
  id: string;
  category: string;
  title: string;
  /** Remix icon class for the page icon. */
  icon: string;
  /** Optional cover image (16:9 banner). The cleaning SOP has none. */
  cover?: { src: string; alt: string };
  purpose: string;
  facts: Array<{
    icon: string;
    label: string;
    value: string;
    kind?: 'ok' | 'default';
  }>;
  audience?: string;
  equipment?: string;
  beforeNotes?: Array<{ kind: NoteKind; body: string }>;
  prereqs?: Array<{ id: string; label: string; done?: boolean }>;
  method: Array<{ body: string; critical?: boolean; criticalLimit?: CriticalLimit }>;
  monitoring?: string[];
  fixes?: Array<{ failure: string; response: string }>;
  records?: string;
  attachments: Array<{ title: string; meta: string; href: string }>;
  related: Array<{ title: string; meta: string; href: string }>;
  control: Array<{ label: string; value: string }>;
};

const CLEANING: Procedure = {
  id: 'cleaning-and-sanitising',
  category: 'Station Procedures',
  title: 'Cleaning and sanitising food contact surfaces',
  icon: 'ri-brush-line',
  // No cover: the cleaning SOP ships as icon → crumb → title → purpose.
  purpose:
    'To prevent foodborne illness by making sure every surface that touches food is cleaned and sanitised before it is used.',
  facts: [
    { icon: 'ri-community-line',     label: 'Applies to',  value: 'All stations' },
    { icon: 'ri-user-line',          label: 'Owner',       value: 'Chef Raúl Medina' },
    { icon: 'ri-verified-badge-line', label: 'Verified',   value: '4 Sep 2026', kind: 'ok' },
    { icon: 'ri-calendar-line',      label: 'Next review', value: '4 Sep 2027' },
  ],
  audience:
    'Everyone who prepares, cooks or plates food. It covers cutting boards, prep tables, knives, tongs, the slicer, and any other surface or tool that food touches.',
  equipment:
    'Two buckets, labelled Wash and Sanitise · detergent · clean cloths, one per bucket · quaternary ammonium sanitiser · test strips for that sanitiser',
  beforeNotes: [
    {
      kind: 'warn',
      body: 'Sanitiser is a chemical. Never mix it with any other product, and never with bleach or anything containing ammonia: the fumes are dangerous. Keep it away from food and away from open containers.',
    },
  ],
  method: [
    { body: 'Scrape all food debris off the surface and into the bin.' },
    { body: 'Wash with detergent and warm water from the Wash bucket. Work the whole surface, including the edges, the corners and the underside of any lip.' },
    { body: 'Rinse with clean water. No detergent should be left on the surface, because it stops the sanitiser working.' },
    {
      critical: true,
      body: 'Apply sanitiser from the Sanitise bucket. Leave it on the surface for the full contact time. Do not wipe it off early.',
      criticalLimit: {
        value: '200 ppm, for at least 30 seconds',
        subtitle:
          'Quaternary ammonium. Confirm both numbers against the label on the bottle you are actually using: the manufacturer sets them, not this procedure.',
        howToCheck:
          'Dip a test strip in the bucket. Read it against the colour chart on the bottle, not from memory. Record it on the Sanitiser Log.',
        breachLabel: 'If it reads below 200 ppm',
        breachResponse:
          'Do not use the bucket. Empty it, make a fresh solution, and test again before you sanitise anything.',
      },
    },
    { body: 'Let the surface air dry. Do not dry it with a towel: a towel puts contamination straight back onto the surface you just sanitised.' },
  ],
  monitoring: [
    'Test the Sanitise bucket with a strip at the start of every shift.',
    'Test it again every 4 hours, and whenever it has been remade.',
    'Write the reading and the time on the Sanitiser Log, and initial it.',
    'The chef on duty checks the log before close.',
  ],
  fixes: [
    {
      failure: 'The strip reads below 200 ppm',
      response: 'Empty the bucket, make a fresh solution and test again. Nothing gets sanitised from a weak bucket.',
    },
    {
      failure: 'A surface was used after being sanitised from a weak bucket',
      response: 'Clean and sanitise that surface again. Throw away any ready-to-eat food that touched it.',
    },
    {
      failure: 'The solution is cloudy, has debris in it, or is more than 4 hours old',
      response: 'Make it fresh, whatever the strip says. A strip does not measure how dirty the water is.',
    },
    {
      failure: 'You are not sure whether a surface was sanitised',
      response: 'Sanitise it. There is no cost to doing it twice.',
    },
  ],
  records:
    'Sanitiser Log. Initialled by whoever tested the bucket, checked by the chef on duty at close, and kept for one year.',
  attachments: [
    { title: 'Sanitiser safety data sheet', meta: 'PDF · 1.2 MB · from the manufacturer', href: '#' },
    { title: 'Sanitiser Log, blank sheet',  meta: 'PDF · 1 page · print and post beside the sink', href: '#' },
  ],
  related: [
    { title: 'Washing hands',                  meta: 'Personal hygiene',             href: '#related' },
    { title: 'Storing and using chemicals',    meta: 'General and administrative',   href: '#related' },
    { title: 'Preventing cross-contamination', meta: 'Food safety',                  href: '#related' },
  ],
  control: [
    { label: 'Document',     value: 'SOP-002' },
    { label: 'Version',      value: '3' },
    { label: 'Effective',    value: '4 Sep 2026' },
    { label: 'Supersedes',   value: 'Version 2, 12 Feb 2026' },
    { label: 'Owner',        value: 'Chef Raúl Medina' },
    { label: 'Approved by',  value: 'Chef Raúl Medina, 4 Sep 2026' },
    { label: 'Next review',  value: '4 Sep 2027' },
    { label: 'Records kept', value: 'Sanitiser Log, 1 year' },
    { label: 'Part of',      value: 'Sanitation plan, filed with Vancouver Coastal Health' },
  ],
};

const PROCEDURES: Record<string, Procedure> = {
  'cleaning-and-sanitising': CLEANING,
};

export function getProcedure(id: string): Procedure | undefined {
  return PROCEDURES[id];
}

export function listProcedureIds(): string[] {
  return Object.keys(PROCEDURES);
}