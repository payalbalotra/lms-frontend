'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { listCategories, listProcedures } from '@/lib/api';
import type { Procedure, Category, ProcedureStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  LuArrowDownAZ,
  LuArrowRight,
  LuArrowUpAZ,
  LuBrush,
  LuBuilding2,
  LuCircleCheck,
  LuClock,
  LuFilePen,
  LuFileSearch,
  LuFileText,
  LuFilter,
  LuFolder,
  LuGlobe,
  LuHistory,
  LuLayers,
  LuLayoutGrid,
  LuListChecks,
  LuRefreshCw,
  LuSearch,
  LuShieldAlert,
  LuStore,
  LuTruck,
  LuUtensils,
  LuWrench,
  LuX,
} from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';
import { StatusPill } from '@/components/ui/status-pill';
import { FilterChips } from '@/components/ui/filter-chips';

interface LibraryProcedureExplorerProps {
  procedures: Procedure[];
  categories: Category[];
  locale: string;
}

/**
 * The library, for a manager: category filters with counts, a search and sort
 * bar, and the procedures as a list or a grid.
 *
 * Every category wears the same neutral badge — the panel with ink-2 on it — and
 * is told apart by its icon and its name rather than by a colour of its own. A
 * palette of one hue per category was the first version; with eight categories it
 * turned the page into a chart of colours that mean nothing to a reader who has
 * not learnt the key.
 */
export function getCategoryTheme(slug: string): {
  icon: IconType;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  const normalized = (slug || '').toLowerCase();
  switch (normalized) {
    case 'recipes':
    case 'recipe':
      return {
        icon: LuUtensils,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'station':
    case 'station-procedures':
      return {
        icon: LuStore,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'cleaning':
    case 'cleaning-schedules':
      return {
        icon: LuBrush,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'admin':
    case 'general':
    case 'general-procedures':
      return {
        icon: LuFileText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'delivery':
    case 'delivery-receiving':
      return {
        icon: LuTruck,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'food-safety':
    case 'safety':
      return {
        icon: LuShieldAlert,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'equipment':
    case 'equipment-handling':
      return {
        icon: LuWrench,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    default:
      return {
        icon: LuFolder,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
  }
}

// 28 Procedure demo suite with realistic titles, purpose, metadata, subcategories and language tags
const FULL_DEMO_SUITE: (Procedure & {
  subCategory?: string;
  languages?: string;
})[] = [
  {
    id: 'proc-1',
    slug: 'chicken-tinga',
    titleEn: 'Chicken Tinga',
    titleEs: 'Tinga de Pollo',
    purposeEn: 'Shredded chicken in a chipotle tomato sauce. Perfect for tacos, tostadas and more.',
    purposeEs: 'Pollo deshebrado en salsa de tomate y chipotle. Perfecto para tacos, tostadas y más.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-16T14:30:00Z',
    subCategory: 'Main Menu',
    languages: 'EN / ES',
  },
  {
    id: 'proc-2',
    slug: 'grill-station-setup',
    titleEn: 'Grill Station Setup',
    titleEs: 'Configuración de Estación de Parrilla',
    purposeEn: 'Step-by-step instructions for preparing the grill station.',
    purposeEs: 'Instrucciones paso a paso para preparar la estación de parrilla.',
    category: {
      id: 'cat-station',
      slug: 'station',
      nameEn: 'Station Procedure',
      nameEs: 'Procedimiento de Estación',
      isArchived: false,
    },
    status: 'draft',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Carlos Ruiz',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-15T11:20:00Z',
    subCategory: 'Kitchen Stations',
    languages: 'EN',
  },
  {
    id: 'proc-3',
    slug: 'deep-cleaning-walk-in-cooler',
    titleEn: 'Deep Cleaning - Walk-in Cooler',
    titleEs: 'Limpieza Profunda - Enfriador de Entrada',
    purposeEn: 'Complete cleaning and sanitization procedure for the walk-in cooler.',
    purposeEs: 'Procedimiento completo de limpieza y desinfección del enfriador.',
    category: {
      id: 'cat-cleaning',
      slug: 'cleaning',
      nameEn: 'Cleaning Schedules',
      nameEs: 'Horarios de Limpieza',
      isArchived: false,
    },
    status: 'draft',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Ana Torres',
    createdAt: '2026-09-03T10:00:00Z',
    updatedAt: '2026-09-14T09:15:00Z',
    subCategory: 'Maintenance',
    languages: 'EN / ES',
  },
  {
    id: 'proc-4',
    slug: 'food-safety-basics',
    titleEn: 'Food Safety Basics',
    titleEs: 'Fundamentos de Seguridad Alimentaria',
    purposeEn: 'Key food safety principles for all team members.',
    purposeEs: 'Principios clave de seguridad alimentaria para todos los miembros.',
    category: {
      id: 'cat-admin',
      slug: 'general',
      nameEn: 'General Procedures',
      nameEs: 'Procedimientos Generales',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Training Team',
    createdAt: '2026-09-04T10:00:00Z',
    updatedAt: '2026-09-12T16:45:00Z',
    subCategory: 'Food Safety',
    languages: 'EN',
  },
  {
    id: 'proc-5',
    slug: 'salsa-roja',
    titleEn: 'Salsa Roja',
    titleEs: 'Salsa Roja Tradicional',
    purposeEn: 'Traditional red salsa with fresh tomatoes and mild chili.',
    purposeEs: 'Salsa roja tradicional con tomates frescos y chile suave.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-10T13:10:00Z',
    subCategory: 'Sauces & Dressings',
    languages: 'EN / ES',
  },
  {
    id: 'proc-6',
    slug: 'dishwashing-station',
    titleEn: 'Dishwashing Station',
    titleEs: 'Estación de Lavado de Platos',
    purposeEn: 'Proper setup and operation of the dishwashing station.',
    purposeEs: 'Configuración y operación adecuada de la estación de lavavajillas.',
    category: {
      id: 'cat-station',
      slug: 'station',
      nameEn: 'Station Procedure',
      nameEs: 'Procedimiento de Estación',
      isArchived: false,
    },
    status: 'draft',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Luis Martinez',
    createdAt: '2026-09-06T10:00:00Z',
    updatedAt: '2026-09-08T08:30:00Z',
    subCategory: 'Back of House',
    languages: 'EN',
  },
  {
    id: 'proc-7',
    slug: 'guacamole-prep',
    titleEn: 'Fresh Guacamole Preparation',
    titleEs: 'Preparación de Guacamole Fresco',
    purposeEn: 'Authentic guacamole with ripe Hass avocados, lime, onion, and cilantro.',
    purposeEs: 'Guacamole auténtico con aguacates Hass maduros, limón, cebolla y cilantro.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-07T10:00:00Z',
    updatedAt: '2026-09-06T15:00:00Z',
    subCategory: 'Appetizers',
    languages: 'EN / ES',
  },
  {
    id: 'proc-8',
    slug: 'opening-prep-checklist',
    titleEn: 'Shift Opening Prep Checklist',
    titleEs: 'Lista de Verificación de Apertura',
    purposeEn: 'Essential morning prep steps before restaurant doors open to customers.',
    purposeEs: 'Pasos esenciales de preparación matutina antes de abrir el restaurante.',
    category: {
      id: 'cat-admin',
      slug: 'general',
      nameEn: 'General Procedures',
      nameEs: 'Procedimientos Generales',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Carlos Ruiz',
    createdAt: '2026-09-08T10:00:00Z',
    updatedAt: '2026-09-05T07:15:00Z',
    subCategory: 'Operations',
    languages: 'EN',
  },
  {
    id: 'proc-9',
    slug: 'fryer-cleaning-routine',
    titleEn: 'Fryer Boil-out & Oil Filtering',
    titleEs: 'Limpieza de Freidora y Filtrado de Aceite',
    purposeEn: 'Daily oil filtering and weekly boil-out procedure for deep fryers.',
    purposeEs: 'Filtrado diario de aceite y procedimiento semanal para freidoras.',
    category: {
      id: 'cat-cleaning',
      slug: 'cleaning',
      nameEn: 'Cleaning Schedules',
      nameEs: 'Horarios de Limpieza',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Ana Torres',
    createdAt: '2026-09-09T10:00:00Z',
    updatedAt: '2026-09-04T18:40:00Z',
    subCategory: 'Maintenance',
    languages: 'EN / ES',
  },
  {
    id: 'proc-10',
    slug: 'carnitas-recipe',
    titleEn: 'Slow-Cooked Pork Carnitas',
    titleEs: 'Carnitas de Cerdo Tradicionales',
    purposeEn: 'Traditional citrus and spice braised pork carnitas recipe.',
    purposeEs: 'Receta tradicional de carnitas de cerdo con cítricos y especias.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-03T12:00:00Z',
    subCategory: 'Main Menu',
    languages: 'EN / ES',
  },
  {
    id: 'proc-11',
    slug: 'beverage-bar-station',
    titleEn: 'Beverage Bar & Aguas Frescas',
    titleEs: 'Barra de Bebidas y Aguas Frescas',
    purposeEn: 'Setup, dispensing, and sanitization instructions for drinks station.',
    purposeEs: 'Instrucciones de configuración y limpieza de estación de bebidas.',
    category: {
      id: 'cat-station',
      slug: 'station',
      nameEn: 'Station Procedure',
      nameEs: 'Procedimiento de Estación',
      isArchived: false,
    },
    status: 'draft',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Front Staff',
    createdAt: '2026-09-11T10:00:00Z',
    updatedAt: '2026-09-02T10:30:00Z',
    subCategory: 'Front of House',
    languages: 'EN',
  },
  {
    id: 'proc-12',
    slug: 'handwashing-protocol',
    titleEn: 'Handwashing & Hygiene Standard',
    titleEs: 'Protocolo de Lavado de Manos e Higiene',
    purposeEn: 'Mandatory 20-second handwashing protocol for food handlers.',
    purposeEs: 'Protocolo obligatorio de lavado de manos de 20 segundos.',
    category: {
      id: 'cat-admin',
      slug: 'general',
      nameEn: 'General Procedures',
      nameEs: 'Procedimientos Generales',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Safety Team',
    createdAt: '2026-09-12T10:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
    subCategory: 'Food Safety',
    languages: 'EN / ES',
  },
  {
    id: 'proc-13',
    slug: 'pico-de-gallo',
    titleEn: 'Fresh Pico de Gallo',
    titleEs: 'Pico de Gallo Fresco',
    purposeEn: 'Diced tomatoes, white onions, jalapenos, and lime juice.',
    purposeEs: 'Tomates picados, cebollas blancas, jalapeños y jugo de limón.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-13T10:00:00Z',
    updatedAt: '2026-08-30T14:15:00Z',
    subCategory: 'Sauces & Dressings',
    languages: 'EN / ES',
  },
  {
    id: 'proc-14',
    slug: 'sanitization-log-routine',
    titleEn: 'Hourly Sanitization Log Routine',
    titleEs: 'Rutina de Registro de Desinfección',
    purposeEn: 'High-touch surface sanitization checklist and hourly log.',
    purposeEs: 'Lista de verificación de desinfección de superficies.',
    category: {
      id: 'cat-cleaning',
      slug: 'cleaning',
      nameEn: 'Cleaning Schedules',
      nameEs: 'Horarios de Limpieza',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Ana Torres',
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-08-28T16:00:00Z',
    subCategory: 'Maintenance',
    languages: 'EN',
  },
  {
    id: 'proc-15',
    slug: 'taco-assembly-line',
    titleEn: 'Taco Line Station Setup',
    titleEs: 'Estación de Linea de Tacos',
    purposeEn: 'Standard operating procedure for the fast-casual taco assembly line.',
    purposeEs: 'Procedimiento estándar para la línea de ensamblaje de tacos.',
    category: {
      id: 'cat-station',
      slug: 'station',
      nameEn: 'Station Procedure',
      nameEs: 'Procedimiento de Estación',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Carlos Ruiz',
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-08-25T11:45:00Z',
    subCategory: 'Kitchen Stations',
    languages: 'EN / ES',
  },
  {
    id: 'proc-16',
    slug: 'churros-recipe',
    titleEn: 'Churros & Cinnamon Sugar',
    titleEs: 'Churros y Azúcar con Canela',
    purposeEn: 'Crispy fried churro dough tossed in cinnamon sugar.',
    purposeEs: 'Masa de churro frita y crujiente cubierta con azúcar y canela.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'draft',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-08-22T13:20:00Z',
    subCategory: 'Desserts',
    languages: 'EN',
  },
  {
    id: 'proc-17',
    slug: 'trash-disposal-recyclables',
    titleEn: 'Waste & Recycling Disposal SOP',
    titleEs: 'Manejo de Residuos y Reciclaje',
    purposeEn: 'Proper bagging, sorting, and dumpster area sanitization.',
    purposeEs: 'Embolsado, clasificación y limpieza del área de contenedores.',
    category: {
      id: 'cat-cleaning',
      slug: 'cleaning',
      nameEn: 'Cleaning Schedules',
      nameEs: 'Horarios de Limpieza',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Back Staff',
    createdAt: '2026-09-17T10:00:00Z',
    updatedAt: '2026-08-20T20:10:00Z',
    subCategory: 'Back of House',
    languages: 'EN / ES',
  },
  {
    id: 'proc-18',
    slug: 'emergency-shutoff-guide',
    titleEn: 'Emergency Gas & Water Shutoff',
    titleEs: 'Cierre de Emergencia de Gas y Agua',
    purposeEn: 'Location and operation of emergency utility shutoff valves.',
    purposeEs: 'Ubicación y operación de válvulas de cierre de emergencia.',
    category: {
      id: 'cat-admin',
      slug: 'general',
      nameEn: 'General Procedures',
      nameEs: 'Procedimientos Generales',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Safety Team',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-08-18T10:00:00Z',
    subCategory: 'Safety',
    languages: 'EN',
  },
  {
    id: 'proc-19',
    slug: 'horchata-batch-recipe',
    titleEn: 'Agua de Horchata Batch',
    titleEs: 'Agua de Horchata por Lote',
    purposeEn: 'Rice milk, cinnamon, vanilla, and condensed milk beverage recipe.',
    purposeEs: 'Receta de bebida de leche de arroz, canela, vainilla y leche condensada.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-19T10:00:00Z',
    updatedAt: '2026-08-15T15:30:00Z',
    subCategory: 'Beverages',
    languages: 'EN / ES',
  },
  {
    id: 'proc-20',
    slug: 'pos-terminal-opening',
    titleEn: 'POS Terminal & Cash Drawer',
    titleEs: 'Terminal POS y Caja Registradora',
    purposeEn: 'Opening cash count, system login, and receipt printer check.',
    purposeEs: 'Conteo de efectivo de apertura, inicio de sesión y comprobación de impresora.',
    category: {
      id: 'cat-station',
      slug: 'station',
      nameEn: 'Station Procedure',
      nameEs: 'Procedimiento de Estación',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Front Staff',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-08-12T07:45:00Z',
    subCategory: 'Front of House',
    languages: 'EN',
  },
  {
    id: 'proc-21',
    slug: 'restroom-cleaning-checklist',
    titleEn: 'Restroom Sanitization Checklist',
    titleEs: 'Lista de Limpieza de Baños',
    purposeEn: 'Step-by-step cleaning, restocking, and inspection for restrooms.',
    purposeEs: 'Limpieza paso a paso, reabastecimiento e inspección de baños.',
    category: {
      id: 'cat-cleaning',
      slug: 'cleaning',
      nameEn: 'Cleaning Schedules',
      nameEs: 'Horarios de Limpieza',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Cleaning Crew',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-08-10T17:25:00Z',
    subCategory: 'Maintenance',
    languages: 'EN / ES',
  },
  {
    id: 'proc-22',
    slug: 'allergen-cross-contact-sop',
    titleEn: 'Allergen Cross-Contact Prevention',
    titleEs: 'Prevención de Contacto Cruzado de Alérgenos',
    purposeEn: 'Rules for handling gluten, dairy, nut, and shellfish food prep.',
    purposeEs: 'Reglas para el manejo de alimentos con alérgenos.',
    category: {
      id: 'cat-admin',
      slug: 'general',
      nameEn: 'General Procedures',
      nameEs: 'Procedimientos Generales',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Safety Team',
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-08-08T11:00:00Z',
    subCategory: 'Food Safety',
    languages: 'EN / ES',
  },
  {
    id: 'proc-23',
    slug: 'queso-fundido-recipe',
    titleEn: 'Queso Fundido with Chorizo',
    titleEs: 'Queso Fundido con Chorizo',
    purposeEn: 'Melted Oaxaca cheese topped with spicy crumbled chorizo.',
    purposeEs: 'Queso Oaxaca fundido con chorizo desmenuzado picante.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-23T10:00:00Z',
    updatedAt: '2026-08-05T14:50:00Z',
    subCategory: 'Appetizers',
    languages: 'EN / ES',
  },
  {
    id: 'proc-24',
    slug: 'ice-machine-sanitization',
    titleEn: 'Ice Machine Cleaning & De-scaling',
    titleEs: 'Desinfección de Máquina de Hielo',
    purposeEn: 'Monthly de-scaling and bin sanitization for commercial ice maker.',
    purposeEs: 'Descalcificación mensual y desinfección de máquina de hielo.',
    category: {
      id: 'cat-cleaning',
      slug: 'cleaning',
      nameEn: 'Cleaning Schedules',
      nameEs: 'Horarios de Limpieza',
      isArchived: false,
    },
    status: 'draft',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Tech Team',
    createdAt: '2026-09-24T10:00:00Z',
    updatedAt: '2026-08-02T16:10:00Z',
    subCategory: 'Maintenance',
    languages: 'EN',
  },
  {
    id: 'proc-25',
    slug: 'drive-thru-window-sop',
    titleEn: 'Drive-Thru Window Workflow',
    titleEs: 'Flujo de Trabajo en Ventanilla',
    purposeEn: 'Speed-of-service guidelines and window station operation.',
    purposeEs: 'Pautas de velocidad de servicio y operación de ventanilla.',
    category: {
      id: 'cat-station',
      slug: 'station',
      nameEn: 'Station Procedure',
      nameEs: 'Procedimiento de Estación',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Front Staff',
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-07-30T12:00:00Z',
    subCategory: 'Front of House',
    languages: 'EN / ES',
  },
  {
    id: 'proc-26',
    slug: 'chipotle-crema',
    titleEn: 'Chipotle Lime Crema',
    titleEs: 'Crema de Chipotle y Limón',
    purposeEn: 'Smoky chipotle crema sauce for tacos, bowls, and salads.',
    purposeEs: 'Salsa crema de chipotle ahumado para tacos, bowls y ensaladas.',
    category: {
      id: 'cat-recipes',
      slug: 'recipes',
      nameEn: 'Recipe',
      nameEs: 'Receta',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Maria Lopez',
    createdAt: '2026-09-26T10:00:00Z',
    updatedAt: '2026-07-28T10:30:00Z',
    subCategory: 'Sauces & Dressings',
    languages: 'EN / ES',
  },
  {
    id: 'proc-27',
    slug: 'end-of-shift-closing',
    titleEn: 'Night Shift Closing Checklist',
    titleEs: 'Lista de Cierre de Turno Nocturno',
    purposeEn: 'Kitchen shutdown, refrigeration checks, and security lockup.',
    purposeEs: 'Cierre de cocina, verificación de refrigeración y seguridad.',
    category: {
      id: 'cat-admin',
      slug: 'general',
      nameEn: 'General Procedures',
      nameEs: 'Procedimientos Generales',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Carlos Ruiz',
    createdAt: '2026-09-27T10:00:00Z',
    updatedAt: '2026-07-25T23:00:00Z',
    subCategory: 'Operations',
    languages: 'EN / ES',
  },
  {
    id: 'proc-28',
    slug: 'walk-in-temp-log',
    titleEn: 'Walk-in Temp Monitoring SOP',
    titleEs: 'Monitoreo de Temperatura de Enfriador',
    purposeEn: 'HACCP temperature monitoring twice daily for coolers and freezers.',
    purposeEs: 'Monitoreo de temperatura HACCP dos veces al día para congeladores.',
    category: {
      id: 'cat-admin',
      slug: 'general',
      nameEn: 'General Procedures',
      nameEs: 'Procedimientos Generales',
      isArchived: false,
    },
    status: 'published',
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: 'Safety Team',
    createdAt: '2026-09-28T10:00:00Z',
    updatedAt: '2026-07-20T08:00:00Z',
    subCategory: 'Food Safety',
    languages: 'EN / ES',
  },
];

export function LibraryProcedureExplorer({
  procedures,
  categories,
  locale,
}: LibraryProcedureExplorerProps): React.ReactElement {
  const isEs = locale === 'es';

  const [liveCategories, setLiveCategories] = React.useState<Category[]>(categories ?? []);
  const [liveProcedures, setLiveProcedures] = React.useState<Procedure[]>(procedures ?? []);

  React.useEffect(() => {
    let isMounted = true;
    async function syncData() {
      try {
        const catRes = await listCategories('loc-main', {
          includeArchived: true,
        });
        const procRes = await listProcedures({});
        if (isMounted) {
          if (catRes.categories && catRes.categories.length > 0) {
            setLiveCategories(catRes.categories);
          }
          if (procRes.procedures && procRes.procedures.length > 0) {
            setLiveProcedures(procRes.procedures);
          }
        }
      } catch {
        // Fallback
      }
    }
    syncData();

    window.addEventListener('lms_categories_updated', syncData);
    window.addEventListener('storage', syncData);
    return () => {
      isMounted = false;
      window.removeEventListener('lms_categories_updated', syncData);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  // Filters State
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | ProcedureStatus>('all');
  const [sortBy, setSortBy] = React.useState<'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'>(
    'updated_desc',
  );
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const pageSize = 6;

  // The demo suite fills an empty library so the screen can be shown with nothing
  // in it — it is not mixed into a library that has something. Mixing them listed
  // rows whose documents do not exist: every one of those 28 titles opened a 404,
  // which is why the slug lookup used to fall back to "some other procedure".
  const allProcedures = React.useMemo(
    () => (liveProcedures && liveProcedures.length > 0 ? liveProcedures : FULL_DEMO_SUITE),
    [liveProcedures],
  );

  // Category counts & deduplication matching exact category pills in design reference
  const { categoryList, categoryCounts, categorySlugMap } = React.useMemo(() => {
    // The library's own categories first, then this fallback set for a location
    // that has none yet. Both orders matter: the real ones win, and the fallback
    // only fills gaps.
    const fallback: Category[] = [
      {
        id: 'cat-recipes',
        slug: 'recipes',
        nameEn: 'Recipe',
        nameEs: 'Recetas',
        isArchived: false,
      },
      {
        id: 'cat-station',
        slug: 'station',
        nameEn: 'Station Procedures',
        nameEs: 'Procedimientos de Estación',
        isArchived: false,
      },
      {
        id: 'cat-cleaning',
        slug: 'cleaning',
        nameEn: 'Cleaning Schedules',
        nameEs: 'Horarios de Limpieza',
        isArchived: false,
      },
      {
        id: 'cat-admin',
        slug: 'general',
        nameEn: 'General Procedures',
        nameEs: 'Procedimientos Generales',
        isArchived: false,
      },
    ];
    const rawCategories: Category[] = [...(liveCategories ?? []).filter((c) => !c.isArchived), ...fallback];

    const canonicalByName = new Map<string, Category>();
    const slugToCanonicalSlug = new Map<string, string>();

    for (const cat of rawCategories) {
      // Keyed by slug, not by name: the slug is what the filter matches on, and
      // two categories with the same slug under different names ("Recipe" and
      // "Recipes & Prep") produced two chips filtering the same set — and two
      // React children with the same key.
      const normKey = (cat.slug || cat.nameEn || cat.nameEs).toLowerCase().trim();
      const existing = canonicalByName.get(normKey);

      if (!existing) {
        canonicalByName.set(normKey, cat);
        slugToCanonicalSlug.set(cat.slug, cat.slug);
        if (cat.id) slugToCanonicalSlug.set(cat.id, cat.slug);
      } else {
        slugToCanonicalSlug.set(cat.slug, existing.slug);
        if (cat.id) slugToCanonicalSlug.set(cat.id, existing.slug);
      }
    }

    const uniqueCategories = Array.from(canonicalByName.values());
    const counts: Record<string, number> = { all: allProcedures.length };

    for (const p of allProcedures) {
      if (!p.category) {
        counts['general'] = (counts['general'] || 0) + 1;
        continue;
      }
      const rawKey = p.category.slug || p.category.id;
      const canonicalSlug = slugToCanonicalSlug.get(rawKey) || p.category.slug;
      counts[canonicalSlug] = (counts[canonicalSlug] || 0) + 1;
    }

    return {
      categoryList: uniqueCategories,
      categoryCounts: counts,
      categorySlugMap: slugToCanonicalSlug,
    };
  }, [categories, allProcedures]);

  // Options for CustomSelect dropdowns
  const categoryOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: `${isEs ? 'Todas las categorías' : 'All Categories'} (${categoryCounts.all || 0})`,
        icon: LuLayoutGrid,
      },
      ...categoryList.map((cat) => {
        const theme = getCategoryTheme(cat.slug);
        const name = isEs ? cat.nameEs : cat.nameEn;
        return {
          value: cat.slug,
          label: name,
          icon: theme.icon,
        };
      }),
    ];
  }, [categoryList, isEs]);

  const statusOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: isEs ? 'Todos los estados' : 'All Status',
        icon: LuLayers,
      },
      {
        value: 'published',
        label: isEs ? 'Publicados' : 'Published',
        icon: LuCircleCheck,
      },
      {
        value: 'draft',
        label: isEs ? 'Borradores' : 'Drafts',
        icon: LuFilePen,
      },
    ];
  }, [isEs]);

  const sortOptions = React.useMemo(() => {
    return [
      {
        value: 'updated_desc',
        label: isEs ? 'Recientes primero' : 'Recently updated',
        icon: LuClock,
      },
      {
        value: 'updated_asc',
        label: isEs ? 'Antiguos primero' : 'Oldest updated',
        icon: LuHistory,
      },
      {
        value: 'title_asc',
        label: isEs ? 'Título A-Z' : 'Title A-Z',
        icon: LuArrowDownAZ,
      },
      {
        value: 'title_desc',
        label: isEs ? 'Título Z-A' : 'Title Z-A',
        icon: LuArrowUpAZ,
      },
    ];
  }, [isEs]);

  // Filtered procedures
  const filteredProcedures = React.useMemo(() => {
    return allProcedures
      .filter((p) => {
        // Category Filter
        if (selectedCategorySlug !== 'all') {
          if (!p.category) {
            if (selectedCategorySlug !== 'general') return false;
          } else {
            const rawKey = p.category.slug || p.category.id;
            const canonicalSlug = categorySlugMap.get(rawKey) || p.category.slug;
            if (canonicalSlug !== selectedCategorySlug) return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'all' && p.status !== statusFilter) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const titleEn = (p.titleEn || '').toLowerCase();
          const titleEs = (p.titleEs || '').toLowerCase();
          const purposeEn = (p.purposeEn || '').toLowerCase();
          const purposeEs = (p.purposeEs || '').toLowerCase();
          const slug = (p.slug || '').toLowerCase();
          const catName = p.category ? (isEs ? p.category.nameEs : p.category.nameEn).toLowerCase() : '';

          const match =
            titleEn.includes(q) ||
            titleEs.includes(q) ||
            purposeEn.includes(q) ||
            purposeEs.includes(q) ||
            slug.includes(q) ||
            catName.includes(q);

          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title_asc') {
          const titleA = (isEs ? a.titleEs || a.titleEn : a.titleEn || a.titleEs).toLowerCase();
          const titleB = (isEs ? b.titleEs || b.titleEn : b.titleEn || b.titleEs).toLowerCase();
          return titleA.localeCompare(titleB);
        }
        if (sortBy === 'title_desc') {
          const titleA = (isEs ? a.titleEs || a.titleEn : a.titleEn || a.titleEs).toLowerCase();
          const titleB = (isEs ? b.titleEs || b.titleEn : b.titleEn || b.titleEs).toLowerCase();
          return titleB.localeCompare(titleA);
        }
        if (sortBy === 'updated_asc') {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [allProcedures, selectedCategorySlug, statusFilter, searchQuery, sortBy, isEs, categorySlugMap]);

  const hasActiveFilters = selectedCategorySlug !== 'all' || statusFilter !== 'all' || searchQuery.trim().length > 0;

  const resetFilters = (): void => {
    setSelectedCategorySlug('all');
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination bounds
  const totalItems = filteredProcedures.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedProcedures = filteredProcedures.slice(startIndex, startIndex + pageSize);
  return (
    <div className="space-y-6">
      {/* The categories, as filters, on their own row. The count in each pill
          answers "is there anything in there?" before the click. */}
      <div className="space-y-2">
        <span className="block text-sm font-semibold text-[var(--color-ink-3)]">
          {isEs ? 'Categorías' : 'Categories'}
        </span>

        <FilterChips
          label={isEs ? 'Categoría' : 'Category'}
          value={selectedCategorySlug}
          onChange={(slug) => {
            setSelectedCategorySlug(slug);
            setCurrentPage(1);
          }}
          chips={[
            { value: 'all', label: isEs ? 'Todas' : 'All', count: categoryCounts.all || 0 },
            ...categoryList.map((cat) => ({
              value: cat.slug,
              label: isEs ? cat.nameEs : cat.nameEn,
              count: categoryCounts[cat.slug] || 0,
            })),
          ]}
        />
      </div>

      {/* One control per question. The search field was a hand-built copy of the
          one in the admin bar — same job, same shape, two implementations. The
          view switch is the segmented control the language switch and the batch
          scaler use. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3">
        <div className="find" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="library-search">
            {isEs ? 'Buscar en la biblioteca' : 'Search the library'}
          </label>
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            placeholder={isEs ? 'Buscar por título, slug o descripción…' : 'Search by title, slug or description…'}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={isEs ? 'Borrar búsqueda' : 'Clear search'}
              className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val as ProcedureStatus | 'all');
                setCurrentPage(1);
              }}
              options={statusOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as typeof sortBy)}
              options={sortOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>

          <div className="segbar" role="group" aria-label={isEs ? 'Vista' : 'View'}>
            <button
              type="button"
              aria-current={viewMode === 'list' ? 'true' : undefined}
              onClick={() => setViewMode('list')}
              title={isEs ? 'Lista' : 'List'}
            >
              <LuListChecks aria-hidden="true" />
              <span className="sr-only">{isEs ? 'Lista' : 'List'}</span>
            </button>
            <button
              type="button"
              aria-current={viewMode === 'grid' ? 'true' : undefined}
              onClick={() => setViewMode('grid')}
              title={isEs ? 'Cuadrícula' : 'Grid'}
            >
              <LuLayoutGrid aria-hidden="true" />
              <span className="sr-only">{isEs ? 'Cuadrícula' : 'Grid'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Notification Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-panel)] px-4 py-2 text-sm border border-[var(--color-line)]">
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <LuFilter aria-hidden="true" className="text-[var(--color-ink-2)]" />
            <span>
              {isEs ? 'Mostrando' : 'Showing'}{' '}
              <strong className="text-[var(--color-ink)]">{filteredProcedures.length}</strong> {isEs ? 'de' : 'of'}{' '}
              <strong className="text-[var(--color-ink)]">{allProcedures.length}</strong>{' '}
              {isEs ? 'procedimientos' : 'procedures'}
            </span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 font-semibold text-[var(--color-brand-700)] hover:underline"
          >
            <LuRefreshCw aria-hidden="true" />
            <span>{isEs ? 'Limpiar filtros' : 'Reset filters'}</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredProcedures.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-16 text-center space-y-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-wash)] text-[var(--color-ink-3)] text-xl">
            <LuFileSearch aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)]">
              {isEs ? 'No se encontraron procedimientos' : 'No procedures found'}
            </h3>
            <p className="text-sm text-[var(--color-ink-2)] max-w-note">
              {isEs
                ? 'Intenta ajustar tus términos de búsqueda o selecciona otra categoría.'
                : 'Try adjusting your search query or selecting another category filter.'}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetFilters}
              className="rounded-[var(--radius-lg)] border-[var(--color-line-2)]"
            >
              {isEs ? 'Ver todos los procedimientos' : 'View all procedures'}
            </Button>
          )}
        </article>
      ) : viewMode === 'list' ? (
        /* List View - Rich Cards Matching Design Specification */
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {paginatedProcedures.map((p, index) => {
            const catName = p.category ? (isEs ? p.category.nameEs : p.category.nameEn) : 'General';
            const catSlug = p.category?.slug ?? 'general';
            const theme = getCategoryTheme(catSlug);
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;
            const isRecipe = catSlug === 'recipes' || catSlug === 'recipe' || p.slug.includes('recipe');
            const languagesText =
              (p as any).languages || ((p.titleEn && p.titleEs) || (p.purposeEn && p.purposeEs) ? 'EN / ES' : 'EN');
            const subCategory =
              (p as any).subCategory ||
              (isRecipe
                ? 'Main Menu'
                : catSlug.includes('station')
                  ? 'Kitchen Stations'
                  : catSlug.includes('clean')
                    ? 'Maintenance'
                    : 'Food Safety');
            const isFirstCard = index === 0 && validCurrentPage === 1;

            return (
              <li
                key={p.id}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 py-5 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]"
              >
                {/* The icon is a mark, not a framed object: the bordered tile was
                    the only one of its kind in the product. */}
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-panel)] text-lg text-[var(--color-ink-2)]"
                  >
                    <Icon icon={theme.icon} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h4 className="min-w-0 truncate text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-brand-700)]">
                        {title}
                      </h4>
                      <StatusPill tone={p.status === 'published' ? 'ok' : 'neutral'} withDot>
                        {p.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
                      </StatusPill>
                    </div>

                    {purpose ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-body text-[var(--color-ink-2)]">{purpose}</p>
                    ) : null}

                    {/* One meta line: what it is, what languages it exists in, and
                        when it last moved. The category was also a badge above and
                        a column to the right; it is said once, here. */}
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-meta text-[var(--color-ink-3)]">
                      <span>{catName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{languagesText}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {isEs ? 'Actualizado' : 'Updated'}{' '}
                        {new Date(p.updatedAt).toLocaleDateString(isEs ? 'es' : 'en', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center self-start md:self-center">
                  <Link href={`/${locale}/procedures/${p.slug}`}>
                    <Button variant="neutral" size="sm" className="gap-2 font-semibold">
                      <span>{isEs ? 'Ver' : 'View'}</span>
                      <LuArrowRight aria-hidden="true" className="text-sm" />
                    </Button>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProcedures.map((p) => {
            const catName = p.category ? (isEs ? p.category.nameEs : p.category.nameEn) : 'General';
            const catSlug = p.category?.slug ?? 'general';
            const theme = getCategoryTheme(catSlug);
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;

            return (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* The same mark as the list row: a tile, not a framed
                        object, and the same badge from the same component. */}
                    <span
                      aria-hidden="true"
                      className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-panel)] text-lg text-[var(--color-ink-2)]"
                    >
                      <Icon icon={theme.icon} />
                    </span>

                    <StatusPill tone={p.status === 'published' ? 'ok' : 'neutral'} withDot>
                      {p.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
                    </StatusPill>
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-[var(--color-ink-3)] block">{catName}</span>
                    <h4 className="line-clamp-2 text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-brand-700)]">
                      {title}
                    </h4>
                    {purpose && (
                      <p className="line-clamp-2 pt-1 text-sm leading-body text-[var(--color-ink-2)]">{purpose}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex items-center justify-between text-sm">
                  <span className="text-[var(--color-ink-3)]">
                    {new Date(p.updatedAt).toLocaleDateString(isEs ? 'es' : 'en', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <Link href={`/${locale}/procedures/${p.slug}`}>
                    <Button variant="neutral" size="sm" className="gap-2 font-semibold">
                      <span>{isEs ? 'Ver' : 'View'}</span>
                      <LuArrowRight aria-hidden="true" className="text-sm" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-line)] text-sm text-[var(--color-ink-3)]">
          <div>
            Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} of {totalItems} procedures
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="flex size-8 items-center justify-center text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)] disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              <Icon icon="ri-arrow-left-s-line" className="text-base" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-sm font-bold transition-all',
                  validCurrentPage === pageNum
                    ? 'bg-[var(--color-brand-600)] text-white shadow-e1'
                    : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
                )}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="flex size-8 items-center justify-center text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)] disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
            >
              <Icon icon="ri-arrow-right-s-line" className="text-base" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
