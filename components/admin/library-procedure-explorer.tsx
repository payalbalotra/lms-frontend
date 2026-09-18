'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Procedure, Category, ProcedureStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';

interface LibraryProcedureExplorerProps {
  procedures: Procedure[];
  categories: Category[];
  locale: string;
}

/**
 * Exact color palette & icon mappings matching design specification image:
 * - Recipe: Peach/Orange (#FFF0E6 bg, #E0533C icon/text)
 * - Station Procedures: Blue (#EBF5FF bg, #2563EB icon/text)
 * - Cleaning Schedules: Green (#E6F4EA bg, #16A34A icon/text)
 * - General Procedures: Purple (#F3E8FF bg, #9333EA icon/text)
 */
export function getCategoryTheme(slug: string): {
  icon: string;
  badgeBg: string;
  pillIconBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  const normalized = (slug || '').toLowerCase();
  if (normalized.includes('recipe')) {
    return {
      icon: 'ri-restaurant-line',
      badgeBg: 'bg-[#FFF0E6] text-[#E0533C]',
      pillIconBg: 'bg-[#FFF0E6] text-[#E0533C]',
      badgeText: 'text-[#E0533C]',
      badgeBorder: 'border-orange-200/80',
    };
  }
  if (normalized.includes('station')) {
    return {
      icon: 'ri-restaurant-2-line',
      badgeBg: 'bg-[#EBF5FF] text-[#2563EB]',
      pillIconBg: 'bg-[#EBF5FF] text-[#2563EB]',
      badgeText: 'text-[#2563EB]',
      badgeBorder: 'border-blue-200/80',
    };
  }
  if (normalized.includes('clean')) {
    return {
      icon: 'ri-spray-line',
      badgeBg: 'bg-[#E6F4EA] text-[#16A34A]',
      pillIconBg: 'bg-[#E6F4EA] text-[#16A34A]',
      badgeText: 'text-[#16A34A]',
      badgeBorder: 'border-emerald-200/80',
    };
  }
  if (normalized.includes('delivery')) {
    return {
      icon: 'ri-truck-line',
      badgeBg: 'bg-[#EBF5FF] text-[#2563EB]',
      pillIconBg: 'bg-[#EBF5FF] text-[#2563EB]',
      badgeText: 'text-[#2563EB]',
      badgeBorder: 'border-blue-200/80',
    };
  }
  return {
    icon: 'ri-file-text-line',
    badgeBg: 'bg-[#F3E8FF] text-[#9333EA]',
    pillIconBg: 'bg-[#F3E8FF] text-[#9333EA]',
    badgeText: 'text-[#9333EA]',
    badgeBorder: 'border-purple-200/80',
  };
}

// 28 Procedure demo suite with realistic titles, purpose, metadata, subcategories and language tags
const FULL_DEMO_SUITE: (Procedure & { subCategory?: string; languages?: string })[] = [
  {
    id: 'proc-1',
    slug: 'chicken-tinga',
    titleEn: 'Chicken Tinga',
    titleEs: 'Tinga de Pollo',
    purposeEn: 'Shredded chicken in a chipotle tomato sauce. Perfect for tacos, tostadas and more.',
    purposeEs: 'Pollo deshebrado en salsa de tomate y chipotle. Perfecto para tacos, tostadas y más.',
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-station', slug: 'station', nameEn: 'Station Procedure', nameEs: 'Procedimiento de Estación', isArchived: false },
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
    category: { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
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
    category: { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-station', slug: 'station', nameEn: 'Station Procedure', nameEs: 'Procedimiento de Estación', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
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
    category: { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-station', slug: 'station', nameEn: 'Station Procedure', nameEs: 'Procedimiento de Estación', isArchived: false },
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
    category: { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
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
    category: { id: 'cat-station', slug: 'station', nameEn: 'Station Procedure', nameEs: 'Procedimiento de Estación', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
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
    category: { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-station', slug: 'station', nameEn: 'Station Procedure', nameEs: 'Procedimiento de Estación', isArchived: false },
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
    category: { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
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
    category: { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
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
    category: { id: 'cat-station', slug: 'station', nameEn: 'Station Procedure', nameEs: 'Procedimiento de Estación', isArchived: false },
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
    category: { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Receta', isArchived: false },
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
    category: { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
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
    category: { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
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

  // Filters State
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | ProcedureStatus>('all');
  const [sortBy, setSortBy] = React.useState<'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'>('updated_desc');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const pageSize = 6;

  // Use full suite of 28 items if database has fewer items or merge them cleanly
  const allProcedures = React.useMemo(() => {
    if (!procedures || procedures.length === 0) {
      return FULL_DEMO_SUITE;
    }
    const existingSlugs = new Set(procedures.map((p) => p.slug));
    const extraDemos = FULL_DEMO_SUITE.filter((d) => !existingSlugs.has(d.slug));
    return [...procedures, ...extraDemos];
  }, [procedures]);

  // Category counts & deduplication matching exact category pills in design reference
  const { categoryList, categoryCounts, categorySlugMap } = React.useMemo(() => {
    const rawCategories: Category[] = [
      { id: 'cat-recipes', slug: 'recipes', nameEn: 'Recipe', nameEs: 'Recetas', isArchived: false },
      { id: 'cat-station', slug: 'station', nameEn: 'Station Procedures', nameEs: 'Procedimientos de Estación', isArchived: false },
      { id: 'cat-cleaning', slug: 'cleaning', nameEn: 'Cleaning Schedules', nameEs: 'Horarios de Limpieza', isArchived: false },
      { id: 'cat-admin', slug: 'general', nameEn: 'General Procedures', nameEs: 'Procedimientos Generales', isArchived: false },
    ];

    if (categories && categories.length > 0) {
      for (const c of categories) {
        if (!c.isArchived) rawCategories.push(c);
      }
    }

    const canonicalByName = new Map<string, Category>();
    const slugToCanonicalSlug = new Map<string, string>();

    for (const cat of rawCategories) {
      const normKey = (cat.nameEn || cat.nameEs || cat.slug).toLowerCase().trim();
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
        label: isEs ? 'Todas las categorías' : 'All Categories',
        icon: 'ri-layout-grid-line',
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
      { value: 'all', label: isEs ? 'Todos los estados' : 'All Status', icon: 'ri-stack-line' },
      { value: 'published', label: isEs ? 'Publicados' : 'Published', icon: 'ri-checkbox-circle-line' },
      { value: 'draft', label: isEs ? 'Borradores' : 'Drafts', icon: 'ri-draft-line' },
    ];
  }, [isEs]);

  const sortOptions = React.useMemo(() => {
    return [
      { value: 'updated_desc', label: isEs ? 'Recientes primero' : 'Recently updated', icon: 'ri-time-line' },
      { value: 'updated_asc', label: isEs ? 'Antiguos primero' : 'Oldest updated', icon: 'ri-history-line' },
      { value: 'title_asc', label: isEs ? 'Título A-Z' : 'Title A-Z', icon: 'ri-sort-alphabet-asc' },
      { value: 'title_desc', label: isEs ? 'Título Z-A' : 'Title Z-A', icon: 'ri-sort-alphabet-desc' },
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

  const hasActiveFilters =
    selectedCategorySlug !== 'all' || statusFilter !== 'all' || searchQuery.trim().length > 0;

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
    <div className="space-y-5">
      {/* Category Pills Row */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none scroll-smooth">
        {/* "All" Active Pill */}
        <button
          type="button"
          onClick={() => {
            setSelectedCategorySlug('all');
            setCurrentPage(1);
          }}
          className={cn(
            'group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs',
            selectedCategorySlug === 'all'
              ? 'bg-[#E0533C] text-white shadow-xs'
              : 'border border-gray-200/80 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
          )}
        >
          <span>{isEs ? 'Todas' : 'All'}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              selectedCategorySlug === 'all'
                ? 'bg-[#C8432E] text-white'
                : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200',
            )}
          >
            {categoryCounts.all || 0}
          </span>
        </button>

        {/* Unselected Category Pills with Themed Icon Squares */}
        {categoryList.map((cat) => {
          const count = categoryCounts[cat.slug] || 0;
          const isSelected = selectedCategorySlug === cat.slug;
          const theme = getCategoryTheme(cat.slug);
          const name = isEs ? cat.nameEs : cat.nameEn;

          return (
            <button
              key={cat.id || cat.slug}
              type="button"
              onClick={() => {
                setSelectedCategorySlug(cat.slug);
                setCurrentPage(1);
              }}
              className={cn(
                'group inline-flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs',
                isSelected
                  ? 'bg-[#E0533C] text-white font-bold shadow-xs'
                  : 'border border-gray-200/80 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-lg text-xs',
                  isSelected ? 'bg-white/25 text-white' : theme.pillIconBg,
                )}
              >
                <i aria-hidden="true" className={theme.icon} />
              </span>
              <span>{name}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-bold',
                  isSelected
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Search and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <i
              aria-hidden="true"
              className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400"
            />
            <Input
              type="text"
              placeholder={isEs ? 'Buscar por título, slug o descripción...' : 'Search by title, slug or description...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-8 text-xs h-9 bg-white border-gray-200/80 rounded-xl text-gray-900 focus:bg-white focus:border-[#E0533C]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                <i aria-hidden="true" className="ri-close-line" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-[180px] shrink-0">
            <CustomSelect
              value={selectedCategorySlug}
              onChange={(v) => {
                setSelectedCategorySlug(v);
                setCurrentPage(1);
              }}
              options={categoryOptions}
              size="sm"
              className="h-9 text-xs border-gray-200/80 rounded-xl bg-white"
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-[140px] shrink-0">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val as any);
                setCurrentPage(1);
              }}
              options={statusOptions}
              size="sm"
              className="h-9 text-xs border-gray-200/80 rounded-xl bg-white"
            />
          </div>
        </div>

        {/* Right side: Sort Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="w-[180px] shrink-0">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={sortOptions}
              size="sm"
              className="h-9 text-xs border-gray-200/80 rounded-xl bg-white"
            />
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex size-9 items-center justify-center rounded-xl border text-sm transition-all',
                viewMode === 'list'
                  ? 'border-orange-300 bg-[#FFF7ED] text-[#E0533C] font-bold shadow-2xs'
                  : 'border-transparent bg-transparent text-gray-400 hover:text-gray-600',
              )}
              title="List View"
            >
              <i aria-hidden="true" className="ri-list-check-2" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex size-9 items-center justify-center rounded-xl border text-sm transition-all',
                viewMode === 'grid'
                  ? 'border-orange-300 bg-[#FFF7ED] text-[#E0533C] font-bold shadow-2xs'
                  : 'border-transparent bg-transparent text-gray-400 hover:text-gray-600',
              )}
              title="Grid View"
            >
              <i aria-hidden="true" className="ri-grid-fill" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Notification Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-xl bg-orange-50/70 px-4 py-2 text-xs border border-orange-200/60">
          <div className="flex items-center gap-2 text-gray-600">
            <i aria-hidden="true" className="ri-filter-3-line text-[#E0533C]" />
            <span>
              {isEs ? 'Mostrando' : 'Showing'}{' '}
              <strong className="text-gray-900">{filteredProcedures.length}</strong>{' '}
              {isEs ? 'de' : 'of'}{' '}
              <strong className="text-gray-900">{allProcedures.length}</strong>{' '}
              {isEs ? 'procedimientos' : 'procedures'}
            </span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 font-bold text-[#E0533C] hover:underline"
          >
            <i aria-hidden="true" className="ri-refresh-line" />
            <span>{isEs ? 'Limpiar filtros' : 'Reset filters'}</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredProcedures.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center space-y-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xl">
            <i aria-hidden="true" className="ri-search-eye-line" />
          </span>
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-gray-900">
              {isEs ? 'No se encontraron procedimientos' : 'No procedures found'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              {isEs
                ? 'Intenta ajustar tus términos de búsqueda o selecciona otra categoría.'
                : 'Try adjusting your search query or selecting another category filter.'}
            </p>
          </div>
          {hasActiveFilters && (
            <Button type="button" variant="secondary" size="sm" onClick={resetFilters} className="rounded-xl border-gray-200">
              {isEs ? 'Ver todos los procedimientos' : 'View all procedures'}
            </Button>
          )}
        </article>
      ) : viewMode === 'list' ? (
        /* List View matching reference design 1:1 */
        <div className="space-y-3.5">
          {paginatedProcedures.map((p, index) => {
            const catName = p.category
              ? isEs
                ? p.category.nameEs
                : p.category.nameEn
              : 'General';
            const catSlug = p.category?.slug ?? 'general';
            const theme = getCategoryTheme(catSlug);
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;
            const isRecipe = catSlug === 'recipes' || catSlug === 'recipe' || p.slug.includes('recipe');
            const languagesText = (p as any).languages || ((p.titleEn && p.titleEs) || (p.purposeEn && p.purposeEs) ? 'EN / ES' : 'EN');
            const subCategory = (p as any).subCategory || (isRecipe ? 'Main Menu' : catSlug.includes('station') ? 'Kitchen Stations' : catSlug.includes('clean') ? 'Maintenance' : 'Food Safety');
            const isFirstCard = index === 0 && validCurrentPage === 1;

            return (
              <div
                key={p.id}
                className={cn(
                  'group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 rounded-2xl border border-gray-100 bg-white shadow-2xs hover:shadow-xs hover:border-gray-200 transition-all relative overflow-hidden',
                  isFirstCard && 'border-l-4 border-l-[#E0533C] bg-[#FFFBF7]',
                )}
              >
                {/* Left Section: Category Icon + Title + Tags + Purpose + Meta */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Category Icon Square Badge */}
                  <div
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-2xs transition-transform group-hover:scale-105',
                      theme.badgeBg,
                    )}
                  >
                    <i aria-hidden="true" className={theme.icon} />
                  </div>

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-base text-gray-900 group-hover:text-[#E0533C] transition-colors tracking-tight">
                        {title}
                      </h4>

                      {/* Category Badge */}
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', theme.badgeBg)}>
                        {isRecipe ? (
                          <>
                            <i aria-hidden="true" className="ri-restaurant-line text-xs" />
                            <span>Recipe</span>
                          </>
                        ) : (
                          <>
                            <i aria-hidden="true" className={theme.icon + ' text-xs'} />
                            <span>{catName}</span>
                          </>
                        )}
                      </span>

                      {/* Status Badge */}
                      {p.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] text-slate-600 px-2.5 py-0.5 text-[11px] font-semibold">
                          <span className="size-1.5 rounded-full bg-[#64748B]" />
                          <span>Draft</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] text-[#16A34A] px-2.5 py-0.5 text-[11px] font-semibold">
                          <span className="size-1.5 rounded-full bg-[#16A34A]" />
                          <span>Published</span>
                        </span>
                      )}
                    </div>

                    {/* Purpose */}
                    {purpose && (
                      <p className="line-clamp-2 text-xs text-gray-500 leading-relaxed">
                        {purpose}
                      </p>
                    )}

                    {/* Meta Line */}
                    <div className="flex items-center gap-2 pt-1 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <i aria-hidden="true" className="ri-file-text-line text-xs" />
                        <span>Updated {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                      {p.createdBy && (
                        <>
                          <span>·</span>
                          <span>Created by {p.createdBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle Details Section */}
                <div className="hidden lg:flex w-44 shrink-0 flex-col gap-1 text-xs text-gray-500 pr-4 border-r border-gray-100">
                  <div className="flex items-center gap-1.5 font-medium text-gray-700">
                    <i aria-hidden="true" className={theme.icon + ' text-xs ' + theme.badgeText} />
                    <span>{isRecipe ? 'Recipe' : catName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 truncate">
                    <i aria-hidden="true" className="ri-folder-3-line text-xs shrink-0" />
                    <span className="truncate">{subCategory}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <i aria-hidden="true" className="ri-global-line text-xs shrink-0" />
                    <span>{languagesText}</span>
                  </div>
                </div>

                {/* Right Actions Section: View Pill + 3 Dots Button */}
                <div className="flex items-center justify-end gap-2.5 shrink-0">
                  <Link href={`/procedures/${p.slug}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full bg-[#FFF0E6] hover:bg-[#FFE4D6] text-[#E0533C] border-0 px-4 py-1.5 text-xs font-bold gap-1.5 shadow-2xs transition-all"
                    >
                      <span>View</span>
                      <i aria-hidden="true" className="ri-arrow-right-line text-xs" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 rounded-full bg-[#F5F5F5] hover:bg-[#EAEAEA] text-gray-500 p-0 flex items-center justify-center transition-colors"
                    title="More actions"
                  >
                    <i aria-hidden="true" className="ri-more-fill text-base" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProcedures.map((p) => {
            const catName = p.category
              ? isEs
                ? p.category.nameEs
                : p.category.nameEn
              : 'General';
            const catSlug = p.category?.slug ?? 'general';
            const theme = getCategoryTheme(catSlug);
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;

            return (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs hover:border-[#E0533C]/40 hover:shadow-xs transition-all space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-2xs',
                        theme.badgeBg,
                      )}
                    >
                      <i aria-hidden="true" className={theme.icon} />
                    </div>

                    {p.status === 'draft' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] text-slate-600 px-2 py-0.5 text-[10px] font-semibold">
                        <span className="size-1.5 rounded-full bg-[#64748B]" />
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] text-[#16A34A] px-2 py-0.5 text-[10px] font-semibold">
                        <span className="size-1.5 rounded-full bg-[#16A34A]" />
                        Published
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                      {catName}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#E0533C] transition-colors line-clamp-2 leading-snug">
                      {title}
                    </h4>
                    {purpose && (
                      <p className="line-clamp-2 text-xs text-gray-500 pt-0.5">
                        {purpose}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {new Date(p.updatedAt).toLocaleDateString('en-US')}
                  </span>
                  <Link href={`/procedures/${p.slug}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-3 text-[11px] font-bold rounded-full bg-[#FFF0E6] text-[#E0533C] border-0"
                    >
                      <span>View</span>
                      <i aria-hidden="true" className="ri-arrow-right-line text-xs" />
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
          <div>
            Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} of {totalItems} procedures
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="flex size-8 items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              <i aria-hidden="true" className="ri-arrow-left-s-line text-base" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                  validCurrentPage === pageNum
                    ? 'bg-[#E0533C] text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="flex size-8 items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              <i aria-hidden="true" className="ri-arrow-right-s-line text-base" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
