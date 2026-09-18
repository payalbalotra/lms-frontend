import * as React from 'react';
import type { IconType } from 'react-icons';
import {
  LuArrowDown,
  LuArrowLeftRight,
  LuArrowRight,
  LuArrowUp,
  LuBell,
  LuBrush,
  LuBuilding2,
  LuCake,
  LuChartColumn,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuClock,
  LuCopy,
  LuCrown,
  LuEllipsis,
  LuFileLock2,
  LuFilePen,
  LuFileText,
  LuFilter,
  LuFlag,
  LuFlame,
  LuFocus,
  LuFolder,
  LuFolders,
  LuGlobe,
  LuGripVertical,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuImagePlus,
  LuInfo,
  LuLanguages,
  LuLayoutGrid,
  LuLightbulb,
  LuLink,
  LuListOrdered,
  LuMapPin,
  LuPaperclip,
  LuPencil,
  LuPlane,
  LuPlus,
  LuRocket,
  LuRotateCcw,
  LuScale,
  LuSearch,
  LuSend,
  LuShield,
  LuShieldOff,
  LuUserCog,
  LuShip,
  LuSnowflake,
  LuSparkles,
  LuSprayCan,
  LuStore,
  LuTable,
  LuTestTube,
  LuThermometer,
  LuTrash2,
  LuTriangleAlert,
  LuTruck,
  LuType,
  LuUpload,
  LuStar,
  LuUsers,
  LuUtensils,
  LuVideo,
  LuWrench,
  LuX,
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
  icon,
  className,
}: {
  /** A component, or a name the registry below resolves. */
  icon: IconType | string;
  className?: string;
}): React.ReactElement {
  const Glyph = typeof icon === 'string' ? iconByName(icon) : icon;
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
  // The names the screens merged in from feat/procedures were written against.
  // That branch predates the move to Lucide components, and the Remix stylesheet
  // is no longer loaded — so without this table every icon on those screens is an
  // empty <i>. Mapping here rather than editing nine files keeps their markup and
  // our icons, and a name that is not in this table falls back to a document.
  'ri-add-line': LuPlus,
  'ri-alert-line': LuTriangleAlert,
  'ri-arrow-down-line': LuArrowDown,
  'ri-arrow-left-right-line': LuArrowLeftRight,
  'ri-arrow-left-s-line': LuChevronLeft,
  'ri-arrow-right-line': LuArrowRight,
  'ri-arrow-right-s-line': LuChevronRight,
  'ri-arrow-up-line': LuArrowUp,
  'ri-article-line': LuFileText,
  'ri-attachment-line': LuPaperclip,
  'ri-bar-chart-2-line': LuChartColumn,
  'ri-building-2-line': LuBuilding2,
  'ri-cake-3-line': LuCake,
  'ri-cake-line': LuCake,
  'ri-check-line': LuCheck,
  'ri-checkbox-circle-line': LuCircleCheck,
  'ri-close-line': LuX,
  'ri-delete-bin-line': LuTrash2,
  'ri-drag-move-2-line': LuGripVertical,
  'ri-earth-fill': LuGlobe,
  'ri-error-warning-line': LuCircleAlert,
  'ri-file-copy-line': LuCopy,
  'ri-file-text-line': LuFileText,
  'ri-filter-3-line': LuFilter,
  'ri-fire-line': LuFlame,
  'ri-flag-line': LuFlag,
  'ri-focus-3-line': LuFocus,
  'ri-folder-3-line': LuFolder,
  'ri-folders-line': LuFolders,
  'ri-global-line': LuGlobe,
  'ri-h-1': LuHeading1,
  'ri-h-2': LuHeading2,
  'ri-h-3': LuHeading3,
  'ri-image-add-line': LuImagePlus,
  'ri-image-fill': LuImage,
  'ri-image-line': LuImage,
  'ri-information-line': LuInfo,
  'ri-knife-line': LuUtensils,
  'ri-layout-grid-line': LuLayoutGrid,
  'ri-lightbulb-line': LuLightbulb,
  'ri-link': LuLink,
  'ri-list-ordered': LuListOrdered,
  'ri-loop-left-line': LuRotateCcw,
  'ri-map-pin-line': LuMapPin,
  'ri-more-fill': LuEllipsis,
  'ri-notification-3-line': LuBell,
  'ri-pencil-line': LuPencil,
  'ri-plane-line': LuPlane,
  'ri-restaurant-2-line': LuUtensils,
  'ri-restaurant-line': LuUtensils,
  'ri-rocket-2-line': LuRocket,
  'ri-search-eye-line': LuSearch,
  'ri-search-line': LuSearch,
  'ri-send-plane-fill': LuSend,
  'ri-shield-cross-line': LuShieldOff,
  'ri-shield-line': LuShield,
  'ri-shield-user-fill': LuUserCog,
  'ri-shield-user-line': LuUserCog,
  'ri-ship-line': LuShip,
  'ri-snowflake-line': LuSnowflake,
  'ri-sparkling-2-line': LuSparkles,
  'ri-spray-line': LuSprayCan,
  'ri-store-2-line': LuStore,
  'ri-store-3-line': LuStore,
  'ri-table-line': LuTable,
  'ri-team-line': LuUsers,
  'ri-text': LuType,
  'ri-tools-line': LuWrench,
  'ri-truck-line': LuTruck,
  'ri-upload-2-line': LuUpload,
  'ri-user-star-line': LuStar,
  'ri-video-add-line': LuVideo,
  'ri-video-fill': LuVideo,
  'ri-video-line': LuVideo,
  'ri-vip-crown-line': LuCrown,
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
