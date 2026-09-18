import * as React from 'react';
import type { IconType } from 'react-icons';
import {
  LuBrush,
  LuBuilding2,
  LuCheck,
  LuClock,
  LuFileLock2,
  LuFilePen,
  LuFileText,
  LuFolder,
  LuLanguages,
  LuScale,
  LuSnowflake,
  LuTestTube,
  LuThermometer,
  LuTruck,
  LuUtensils,
  LuWrench,
} from 'react-icons/lu';

/**
 * Renders an icon that was chosen somewhere else — a nav row, a category, a
 * block type — where the component itself travels in the data.
 *
 * Icons are decorative here: every one of them sits next to its own label, so
 * this hides them from assistive tech rather than repeating that label. An icon
 * that carries meaning on its own takes a `<span className="sr-only">` beside
 * it instead of being passed through this.
 *
 * Size comes from the surrounding font-size (react-icons default `1em`), so
 * `text-lg` sizes the glyph the same way it sizes text.
 */
export function Icon({
  icon: Glyph,
  className,
}: {
  icon: IconType;
  className?: string;
}): React.ReactElement {
  return <Glyph aria-hidden="true" className={className} />;
}

/**
 * A few icons still arrive from the API as a name — a critical limit says which
 * instrument to reach for. Anything unrecognised falls back to the test strip,
 * which is what a critical limit is checked with more often than not.
 */
const BY_NAME: Readonly<Record<string, IconType>> = {
  // instruments a critical limit names, as the API sends them
  'ri-test-tube-line': LuTestTube,
  'ri-temp-cold-line': LuSnowflake,
  'ri-thermometer-line': LuThermometer,
  'ri-time-line': LuClock,
  'ri-scales-2-line': LuScale,
  // the document sheet: its header, and the facts readout under the purpose
  'category-recipes': LuUtensils,
  'category-equipment': LuWrench,
  'category-station': LuBuilding2,
  'category-cleaning': LuBrush,
  'category-admin': LuFileLock2,
  'category-delivery': LuTruck,
  'file-text': LuFileText,
  folder: LuFolder,
  check: LuCheck,
  draft: LuFilePen,
  clock: LuClock,
  languages: LuLanguages,
};

export function iconByName(name: string | undefined): IconType {
  return (name && BY_NAME[name]) || LuFileText;
}
