"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LuArrowLeft,
  LuCheck,
  LuChevronRight,
  LuEye,
  LuFileText,
  LuLayoutGrid,
  LuSearch,
  LuSignature,
  LuSparkles,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { Drawer } from "@/components/ui/drawer";
import { BilingualInput, type BilingualValue } from "@/components/ui/bilingual-input";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { getAllStepProgress } from "@/lib/getStepProgress";
import { StatusPill } from "@/components/ui/status-pill";
import { PageHeader } from "@/components/admin/page-header";
import { FormSection } from "@/components/admin/form-section";
import { IconTile } from "@/components/ui/icon-tile";
import { getCategoryIcon } from "@/lib/category-icons";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { type RecipeIngredientItem } from "@/components/admin/recipe-ingredients-editor";
import { BlockRenderer } from "@/components/doc/block-renderer";
import { NotionBlockList } from "@/app/[locale]/admin/library/new/notion-block-list";
import { cn } from "@/lib/utils";
import {
  ApiException,
  createProcedure,
  createQuiz,
  getQuizById,
  listCategories,
  listEmployees,
  listRoles,
  listStations,
  updateProcedure,
  updateQuiz,
} from "@/lib/api";
import {
  buildBody,
  emptyIngredient,
  emptyYieldItems,
  toEditorContent,
} from "@/lib/procedure-draft";
import type {
  AdminEmployee,
  Category,
  CreateProcedureInput,
  Procedure,
  ProcedureAudience,
  ProcedureBlock,
  ProcedureProtection,
  ProcedureQuiz,
  ProcedureYieldItem,
  Role,
  Station,
} from "@/lib/types";

/**
 * One page for writing a procedure, new or existing.
 *
 * It replaced a five-step wizard (Details, Content, Quiz, Access, Review) that
 * asked the same questions for a two-line cleaning note as for a master
 * recipe. The page holds only the writing: a title, where it lives, and what
 * it says. Who may see it, how closely it is guarded and whether it has a quiz
 * are asked when it is published, in one short panel, so a manager never faces
 * a form longer than the thing they came to write -- the way Notion and Medium
 * ask for settings at Publish. Everyone is the default audience
 * (PROJECT_OVERVIEW §02: restriction is a deliberate choice), so for most
 * procedures that panel is one glance and "Publish now".
 *
 * The same page opens an existing procedure with everything filled in, which
 * is how a draft gets finished and a published recipe gets corrected.
 */

const EVERYONE: ProcedureAudience = {
  mode: "everyone",
  stationIds: [],
  roleIds: [],
  employeeIds: [],
};

export function ProcedureEditor({
  locale,
  categories: initialCategories,
  initial,
}: {
  locale: string;
  categories: Category[];
  /** The procedure being edited; absent for a new one. */
  initial?: Procedure;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const tErr = useTranslations("admin.library.new.errors");
  const tStep = useTranslations("admin.library.new.stepper");
  const tQuizDesc = useTranslations("admin.library.new.quiz");
  const router = useRouter();
  const isEdit = Boolean(initial);
  const isEs = locale === "es";

  /* ---------------------------------------------------------- reference -- */

  const [categories, setCategories] =
    React.useState<Category[]>(initialCategories);
  const [stations, setStations] = React.useState<Station[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [people, setPeople] = React.useState<AdminEmployee[]>([]);
  React.useEffect(() => {
    let alive = true;
    void Promise.all([
      listCategories("loc-main", { includeArchived: false }),
      listStations("loc-main"),
      listRoles(),
      listEmployees({ status: "active" }),
    ])
      .then(([c, s, r, e]) => {
        if (!alive) return;
        if (c.categories.length) setCategories(c.categories);
        setStations(s.stations);
        setRoles(r.roles);
        setPeople(e.employees);
      })
      .catch(() => {
        /* the pickers show their empty text */
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------------------------------------ content -- */

  const start = React.useMemo(
    () => (initial ? toEditorContent(initial) : null),
    [initial],
  );
  const [lang, setLang] = React.useState<"en" | "es">(isEs ? "es" : "en");
  const [title, setTitle] = React.useState<BilingualValue>({
    en: initial?.titleEn ?? "",
    es: initial?.titleEs ?? "",
  });
  const [purpose, setPurpose] = React.useState<BilingualValue>({
    en: initial?.purposeEn ?? "",
    es: initial?.purposeEs ?? "",
  });
  const [categoryId, setCategoryId] = React.useState<string>(
    initial?.category?.id ?? "",
  );
  const [subcategoryId, setSubcategoryId] = React.useState<string>(
    initial?.subcategoryId ?? "",
  );
  const [stationIds, setStationIds] = React.useState<string[]>(
    initial?.stationScope?.stationIds ?? [],
  );
  const [blocks, setBlocks] = React.useState<ProcedureBlock[]>(
    start?.blocks ?? [],
  );
  const [ingredients, setIngredients] = React.useState<RecipeIngredientItem[]>(
    start?.ingredients ?? [emptyIngredient()],
  );
  const [yieldItems, setYieldItems] = React.useState<ProcedureYieldItem[]>(
    start?.yieldItems ?? emptyYieldItems(),
  );
  const [batch, setBatch] = React.useState(1);

  const savedQuiz = initial?.quizId ? getQuizById(initial.quizId) : null;
  const [quiz, setQuiz] = React.useState<ProcedureQuiz | null>(
    savedQuiz
      ? { questions: savedQuiz.questions, attached: savedQuiz.attached }
      : null,
  );
  const [audience, setAudience] = React.useState<ProcedureAudience>(
    initial?.audience ?? EVERYONE,
  );
  const [protection, setProtection] = React.useState<ProcedureProtection>(
    initial?.protection ?? "standard",
  );

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  /* The four steps of the new-procedure wizard, in build order. The category
     and subcategory selects used to sit at the top of step 1 — they were
     lifted out so the writer meets "what is this and what does it say" before
     being asked where to file it; that level of bookkeeping belongs to the
     library, not the editor. State stays here so URL-prefilled values from a
     category deep-link still flow into the saved record. */
  const STEPS = [
    { id: "details", label: tStep("stepContent"), num: 1 },
    { id: "quiz", label: tStep("stepQuiz"), num: 2 },
    { id: "access", label: tStep("stepAccess"), num: 3 },
    { id: "review", label: tStep("stepReview"), num: 4 },
  ] as const;
  type WizardStepId = (typeof STEPS)[number]["id"];
  const [step, setStep] = React.useState<WizardStepId>("details");
  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const isFirstStep = stepIdx === 0;
  const isLastStep = stepIdx === STEPS.length - 1;

  // Opened from a category page ("Add procedure" on Cleaning → Dishwashing),
  // the URL names where it goes: ?category=<slug>&subcategory=<slug>&accessStations=<ids>.
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    if (prefilled.current || initial || !categories.length) return;
    prefilled.current = true;
    const q = new URLSearchParams(window.location.search);
    const cat = categories.find((c) => c.slug === q.get("category"));
    if (!cat) return;
    setCategoryId(cat.id);
    const sub = cat.subcategories?.find((s) => s.slug === q.get("subcategory"));
    if (!sub) return;
    setSubcategoryId(sub.id);
    const fromUrl = (q.get("accessStations") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (sub.isStationSpecific)
      setStationIds(fromUrl.length ? fromUrl : (sub.stations ?? []));
  }, [categories, initial]);

  // Every edit marks the page dirty; one wrapper instead of a line per field.
  const edit =
    <T,>(set: React.Dispatch<React.SetStateAction<T>>) =>
      (v: T): void => {
        set(v);
        setDirty(true);
      };

  // Leaving with unsaved work asks first.
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent): void => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ------------------------------------------------------------ derived -- */

  const category = categories.find((c) => c.id === categoryId);
  const subcategory = category?.subcategories?.find(
    (s) => s.id === subcategoryId,
  );
  const isRecipe = Boolean(
    category && /recipe/i.test(`${category.slug} ${category.nameEn}`),
  );
  const nameOf = (c: { nameEn: string; nameEs?: string }): string =>
    isEs ? c.nameEs || c.nameEn : c.nameEn;

  const titleValue = lang === "en" ? title.en : title.es;
  const purposeValue = lang === "en" ? purpose.en : purpose.es;

  const body = React.useMemo(
    () =>
      buildBody({
        blocks,
        recipe: isRecipe
          ? { ingredients, yieldItems, title: { en: title.en, es: title.es } }
          : null,
      }),
    [blocks, isRecipe, ingredients, yieldItems, title],
  );

  // Per-step fill ratio, recomputed on every keystroke so the stepper reads
  // as live progress rather than "you are on step 2". The rules live in
  // lib/getStepProgress.ts so they are easy to read and easy to change.
  const stepProgress = React.useMemo(
    () =>
      getAllStepProgress({
        title,
        purpose,
        blocks,
        quiz,
        subcategoryId,
        isStationSpecific: Boolean(subcategory?.isStationSpecific),
        audience,
      }),
    [title, purpose, blocks, quiz, subcategoryId, subcategory?.isStationSpecific, audience],
  );

  const hasQuizContent = React.useMemo(() => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return false;
    return quiz.questions.some((q) => {
      const promptHasText = Boolean(
        (q.prompt?.en && q.prompt.en.trim().length > 0) ||
        (q.prompt?.es && q.prompt.es.trim().length > 0)
      );
      const choicesHaveText = q.choices?.some(
        (c) =>
          Boolean(
            (c.label?.en && c.label.en.trim().length > 0) ||
            (c.label?.es && c.label.es.trim().length > 0)
          )
      );
      return promptHasText || choicesHaveText;
    });
  }, [quiz]);

  const quizCount = quiz?.questions.length ?? 0;
  const whoSummary = (() => {
    if (audience.mode === "everyone") return t("whoEveryone");
    const names = [
      ...audience.stationIds.map(
        (id) => stations.find((s) => s.id === id)?.name,
      ),
      ...audience.roleIds.map((id) => roles.find((r) => r.id === id)?.name),
      ...audience.employeeIds.map(
        (id) => people.find((p) => p.id === id)?.name,
      ),
    ].filter(Boolean);
    return names.length
      ? t("whoSummarySome", { list: names.join(", ") })
      : t("whoSummaryNobody");
  })();

  /* --------------------------------------------------------------- import -- */
  /* The "Import a document" button was removed: the underlying extraction
     pipeline is not part of this build, so exposing the action would let a
     manager upload a file to nowhere. Adding it back lands as its own slice
     (extraction service + signed upload + wizard step) when those arrive. */

  /* ----------------------------------------------------------------- save -- */

  function save(status: "draft" | "published"): void {
    setError(null);
    if (!title.en.trim() && !title.es.trim()) {
      setError(t("titleRequired"));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    startTransition(async () => {
      try {
        // The quiz lives in its own table: keep its row, make one, or drop it.
        let quizId: string | null = null;
        if (quiz && hasQuizContent && quiz.questions.length > 0) {
          if (initial?.quizId) {
            await updateQuiz(initial.quizId, {
              questions: quiz.questions,
              attached: quiz.attached,
            });
            quizId = initial.quizId;
          } else {
            quizId = (
              await createQuiz({
                questions: quiz.questions,
                attached: quiz.attached,
              })
            ).quiz.id;
          }
        }
        const input: CreateProcedureInput = {
          titleEn: title.en.trim() || title.es.trim(),
          // Left empty when nobody wrote it, so the library can say "No Spanish
          // yet" instead of passing the English off as Spanish.
          titleEs: title.es.trim(),
          purposeEn: purpose.en.trim() || purpose.es.trim(),
          purposeEs: purpose.es.trim(),
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          stationScope: subcategory?.isStationSpecific
            ? { mode: stationIds.length ? "specific" : "all", stationIds }
            : null,
          status,
          bodyEn: body,
          bodyEs: body,
          quizId,
          audience: audience.mode === "everyone" ? null : audience,
          protection,
        };
        if (initial) await updateProcedure(initial.id, input);
        else await createProcedure(input);
        setDirty(false);
        router.push(`/${locale}/admin/library`);
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiException ? err.message : tErr("generic"));
      }
    });
  }

  const published = initial?.status === "published";

  /* --------------------------------------------------------------- render -- */

  return (
    <div>
      <div className="mx-auto max-w-page">
        <PageHeader
          eyebrow={t("back")}
          eyebrowHref={`/${locale}/admin/library`}
          title={isEdit ? t("titleEdit") : t("titleNew")}
        />
      </div>

      <div className="sticky top-[56px] z-10 -mx-4 border-b border-[var(--color-line-2)]/60 bg-[var(--color-bg-admin)]/95 px-4 py-2.5 backdrop-blur-md transition-shadow sm:-mx-6 sm:px-6 lg:top-[75px] lg:-mx-10 lg:px-10">
        <div className="mx-auto max-w-page">
          <WizardStepper
            className="my-0"
            ariaLabel={tStep("ariaLabel")}
            current={step}
            steps={STEPS.map((s) => ({
              id: s.id,
              label: s.label,
              progress: stepProgress[s.id],
            }))}
            onSelect={(id) => setStep(id as WizardStepId)}
          />
        </div>
      </div>

      {/* Floating Preview button, bottom-right. Always reachable regardless
          of scroll, sits above the fixed bottom footer (Cancel / Save draft /
          Next) so it never overlaps the navigation actions. The pill itself
          is the only thing inside its z-stacked wrapper; the wrapper is
          pointer-events-none so the empty gutter behind the pill never
          traps clicks meant for the form. */}
      <div className="pointer-events-none fixed bottom-[90px] right-5 z-30 lg:right-6">
        <Button
          type="button"
          variant="surface"
          icon={LuEye}
          onClick={() => setPreviewOpen(true)}
          className="pointer-events-auto shadow-e2"
        >
          {t("preview")}
        </Button>
      </div>

      <div className="mx-auto max-w-page mt-4 space-y-4 pb-20">
        {error ? (
          <p
            role="alert"
            className="rounded-[var(--radius-lg)] bg-[var(--color-bad-tint)] px-4 py-3 font-semibold text-[var(--color-bad)]"
          >
            {error}
          </p>
        ) : null}

        {/* ── Step 1 — what it is and what it says ────────────────────── */}
        {step === "details" ? (
          <>
            <FormSection
              id="proc-details"
              icon={LuFileText}
              title={t("detailsTitle")}
            >
              <div className="space-y-5">
                <BilingualInput
                  label={t("fieldTitle")}
                  required
                  maxLength={100}
                  value={title}
                  onChange={(next) => edit(setTitle)(next)}
                  placeholder={{
                    en: "Enter the procedure title...",
                    es: "Ingresa el título del procedimiento...",
                  }}
                />

                <BilingualInput
                  label={t("fieldPurpose")}
                  required
                  multiline
                  maxLength={500}
                  value={purpose}
                  onChange={(next) => edit(setPurpose)(next)}
                  placeholder={{
                    en: "Enter the purpose of this procedure...",
                    es: "Ingresa el propósito de este procedimiento...",
                  }}
                />
              </div>
            </FormSection>

            {/* ── What it says ─────────────────────────────────────────── */}
            {/* ── What it says ─────────────────────────────────────────── */}
            <FormSection
              id="proc-content"
              icon={LuLayoutGrid}
              title={t("contentTitle")}
              subtitle={
                isRecipe ? t("contentSubtitleRecipe") : t("contentSubtitle")
              }
              headerAction={
                <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)]">
                  {t("contentBlocksCount", { count: blocks.length })}
                </span>
              }
            >
              <NotionBlockList blocks={blocks} onChange={edit(setBlocks)} />
            </FormSection>
          </>
        ) : null}

        {/* ── Step 2 — knowledge check ──────────────────────────────── */}
        {step === "quiz" ? (
          <FormSection
            id="proc-quiz"
            icon={LuSparkles}
            title={t("quizTitle")}
            subtitle={tQuizDesc("description")}
          >
            {/* The quiz author needs a question on screen the moment they
                land on this step — no Drawer gate, no Add button. Passing
                `null` lets the editor seed one blank question (attached
                off, four empty options) so the "Attach" toggle and Question 1
                are visible immediately. On first edit the parent state
                catches up through `edit(setQuiz)`. */}
            <QuizEditor
              value={quiz}
              hideHeader
              onChange={(next) => {
                if (!quiz) setQuiz(next);
                else edit(setQuiz)(next);
              }}
            />
          </FormSection>
        ) : null}

        {/* ── Step 3 — Categories accordion + Station row + Assign block ── */}
        {step === "access" ? (
          <div className="space-y-6">
            {/* Block 1 — pick the category & subcategory. The accordion shows
                one parent category at a time; the chosen subcategory drives
                what shows below (station row for station-specific
                subcategories, employee list always). */}
            <FormSection
              id="proc-categories"
              icon={LuLayoutGrid}
              title={t("categoriesTitle")}
              subtitle={t("categoriesSubtitle")}
            >
              <CategoryAccordion
                categories={categories}
                selectedSubcategoryId={subcategoryId}
                onSelectSubcategory={(catId, subId) => {
                  edit(setCategoryId)(catId);
                  edit(setSubcategoryId)(subId);
                }}
                locale={locale}
              />
            </FormSection>

            {/* Block 2 — Stations. A standalone row so the manager sees
                where the procedure will land before scrolling into the
                employee list. General subcategories hide it: "All stations"
                is the implicit default and a picker there would invite
                confusion. */}
            {subcategory && subcategory.isStationSpecific ? (
              <section
                id="proc-stations"
                className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
              >
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuLayoutGrid} />
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    {t("stationsRowTitle")}
                  </h3>
                  <StatusPill tone="info">
                    {audience.stationIds.length === 0
                      ? t("stationsRowNone")
                      : t("stationsRowCount", {
                        count: audience.stationIds.length,
                      })}
                  </StatusPill>
                </div>
                <div className="mt-3">
                  <MultiSelectChips
                    id="who-stations"
                    label={t("stationsAddTitle")}
                    value={audience.stationIds}
                    onChange={(v) =>
                      edit(setAudience)({ ...audience, stationIds: v })
                    }
                    options={stations.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    addLabel={t("whoAdd")}
                    emptyText={t("stationsEmpty")}
                  />
                </div>
              </section>
            ) : null}

            {/* Block 3 — Assign. Lists employees filtered by the chosen
                stations (or everyone, when the subcategory is general).
                The block supplies its own header bar (icon + title + picked
                chip on the left, search on the right) so it sits in a plain
                card instead of a FormSection — the header would otherwise
                repeat itself. */}
            <section
              id="proc-assign"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <AssignBlock
                people={people}
                stations={stations}
                roles={roles}
                filterStationIds={
                  subcategory?.isStationSpecific
                    ? audience.stationIds
                    : null
                }
                selected={audience.employeeIds}
                onToggle={(id) => {
                  const next = audience.employeeIds.includes(id)
                    ? audience.employeeIds.filter((x) => x !== id)
                    : [...audience.employeeIds, id];
                  edit(setAudience)({ ...audience, employeeIds: next });
                }}
                isEs={isEs}
              />
            </section>
          </div>
        ) : null}

        {/* ── Step 4 — review before publishing ─────────────────────── */}
        {step === "review" ? (
          <div className="space-y-6">
            {/* Preview card — what the procedure looks like at a glance.
               The Drawer already holds the full read-through; this card just
               gives the manager the title, the purpose, and a way to jump
               back into the preview without scrolling the wizard. */}
            <section
              id="proc-review-preview"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewPreviewLabel")}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-[var(--color-ink)]">
                    {(isEs ? title.es || title.en : title.en || title.es) ||
                      t("previewUntitled")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                    {(title.en || title.es) && (purpose.en || purpose.es)
                      ? isEs
                        ? purpose.es || purpose.en
                        : purpose.en || purpose.es
                      : t("reviewPreviewEmpty")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  icon={LuEye}
                  onClick={() => setPreviewOpen(true)}
                >
                  {t("reviewPreviewCta")}
                </Button>
              </div>
            </section>

            {/* Summary card — every other fact about the procedure. */}
            <section
              id="proc-review-summary"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex items-center gap-2">
                <IconTile size="xs" icon={LuFileText} />
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                  {t("reviewSummaryHeading")}
                </h3>
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                {t("reviewSummarySubtitle")}
              </p>

              <ul className="mt-5 grid gap-5 sm:grid-cols-2">
                {/* Where it lives — category + subcategory */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuLayoutGrid} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewWhereLabel")}
                    </p>
                  </div>
                  {category ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-[var(--color-ink-3)]">
                        {t("reviewWhereCategory")}
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {nameOf(category)}
                      </p>
                      {subcategory ? (
                        <>
                          <p className="mt-2 text-sm text-[var(--color-ink-3)]">
                            {t("reviewWhereSubcategory")}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                              {nameOf(subcategory)}
                            </p>
                            <StatusPill
                              tone={
                                subcategory.isStationSpecific ? "info" : "neutral"
                              }
                            >
                              {subcategory.isStationSpecific
                                ? t("reviewStationsStationSpecific")
                                : t("reviewStationsGeneral")}
                            </StatusPill>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                      {t("reviewWhereEmpty")}
                    </p>
                  )}
                </li>

                {/* Stations — list of chosen station names, or "All stations" */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuLayoutGrid} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewStationsLabel")}
                    </p>
                  </div>
                  {subcategory && subcategory.isStationSpecific ? (
                    audience.stationIds.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {audience.stationIds.map((id) => {
                          const station = stations.find((s) => s.id === id);
                          return (
                            <li key={id}>
                              <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1 text-sm font-semibold text-[var(--color-ink)]">
                                {station?.name ?? id}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                        {t("reviewStationsNone")}
                      </p>
                    )
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                      {t("reviewStationsAll")}
                    </p>
                  )}
                </li>

                {/* People assigned */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuUsers} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewAssignLabel")}
                    </p>
                    {audience.mode === "everyone" ? null : (
                      <span className="text-sm font-normal text-[var(--color-ink-3)]">
                        {t("assignPicked", { count: audience.employeeIds.length })}
                      </span>
                    )}
                  </div>
                  {audience.mode === "everyone" ? (
                    <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                      {t("reviewAssignEveryone")}
                    </p>
                  ) : audience.employeeIds.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {audience.employeeIds.map((id) => {
                        const person = people.find((p) => p.id === id);
                        if (!person) return null;
                        const personStationList = person.stationIds
                          .map((sid) => stations.find((s) => s.id === sid)?.name)
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <li
                            key={id}
                            className="flex items-center gap-2 rounded-full border border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] px-2.5 py-1"
                          >
                            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[10px] font-bold text-[var(--color-surface)]">
                              {initialsOf(person.name)}
                            </span>
                            <span className="text-sm font-semibold text-[var(--color-brand-700)]">
                              {person.name}
                            </span>
                            {personStationList ? (
                              <span className="text-xs font-normal text-[var(--color-brand-700)] opacity-80">
                                · {personStationList}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                      {t("reviewAssignEmpty")}
                    </p>
                  )}
                </li>

                {/* Quiz */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuSparkles} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewQuizLabel")}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {quizCount
                        ? t("reviewQuizSummary", { count: quizCount })
                        : t("quizNone")}
                    </p>
                    {quizCount > 0 ? (
                      <StatusPill tone={quiz?.attached ? "ok" : "neutral"}>
                        {quiz?.attached
                          ? t("reviewQuizAttached")
                          : t("reviewQuizDetached")}
                      </StatusPill>
                    ) : null}
                  </div>
                </li>

                {/* Protection */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuSignature} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewProtectionLabel")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {t(
                      protection === "master"
                        ? "protectionMaster"
                        : protection === "confidential"
                          ? "protectionConfidential"
                          : "protectionStandard",
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                    {t("protectionHint")}
                  </p>
                </li>
              </ul>
            </section>

            {/* Ready to go live — the publishing reassurance, plus the
               notification count. Lives outside the summary card so it can
               stretch edge-to-edge with the rocket icon, like the sketch. */}
            <section
              id="proc-review-ready"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex items-start gap-3">
                <IconTile size="sm" icon={LuSparkles} tone="quiet" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">
                    {isEdit ? t("saveTitle") : t("reviewReadyHeading")}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                    {isEdit ? t("publishDescription") : t("reviewReadyBody")}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-sm text-[var(--color-ink-2)]">
                <LuFileText
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[var(--color-ink-3)]"
                />
                <p>
                  {audience.mode === "everyone"
                    ? t("reviewReadyNotifyEveryone")
                    : audience.employeeIds.length > 0
                      ? t("reviewReadyNotify", {
                        count: audience.employeeIds.length,
                      })
                      : t("reviewReadyNotifyNobody")}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {/* ── Sticky wizard footer ───────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-sticky flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-e2 sm:px-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
          <StatusPill tone={published ? "ok" : "neutral"} withDot>
            {published ? t("statusPublished") : t("statusDraft")}
          </StatusPill>
          {dirty ? (
            <span className="text-[var(--color-warn-ink)]">{t("unsaved")}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!isFirstStep ? (
            <Button
              type="button"
              variant="neutral"
              icon={LuArrowLeft}
              onClick={() => setStep(STEPS[stepIdx - 1].id)}
            >
              {t("wizardBack")}
            </Button>
          ) : (
            <Link href={`/${locale}/admin/library`}>
              <Button type="button" variant="ghost">
                {t("cancel")}
              </Button>
            </Link>
          )}
          {published ? null : (
            <Button
              type="button"
              variant="surface"
              disabled={pending}
              onClick={() => save("draft")}
            >
              {t("saveDraft")}
            </Button>
          )}
          {isLastStep ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => save("published")}
            >
              {published ? t("saveChanges") : t("publishNow")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep(STEPS[stepIdx + 1].id)}
            >
              {step === "quiz" && !hasQuizContent
                ? t("wizardSkip")
                : t("wizardNext")}
            </Button>
          )}
        </div>
      </div>

      {/* ── What a cook will see ─────────────────────────────────────── */}
      <Drawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t("preview")}
        closeLabel={t("cancel")}
        size="lg"
      >
        <div className="space-y-4">
          <SegmentedControl
            label={t("language")}
            value={lang}
            onChange={(v) => setLang(v as "en" | "es")}
            segments={[
              { value: "en", label: "EN" },
              { value: "es", label: "ES" },
            ]}
          />
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)]">
            {(lang === "en" ? title.en || title.es : title.es || title.en) ||
              t("previewUntitled")}
          </h2>
          {purpose.en || purpose.es ? (
            <p className="text-[var(--color-ink-2)]">
              {lang === "en" ? purpose.en || purpose.es : purpose.es || purpose.en}
            </p>
          ) : null}
          {blocks.length || isRecipe ? (
            <BlockRenderer blocks={body.blocks} locale={lang} />
          ) : (
            <p className="text-[var(--color-ink-3)]">{t("previewEmpty")}</p>
          )}
        </div>
      </Drawer>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers -- */

/**
 * Accordion of parent categories. The chosen parent expands; the others
 * collapse. Subcategories sit inside as pills — clicking one picks it. A
 * "general" subcategory is rendered as a plain pill; a "station-specific"
 * subcategory wears a small station tag so the manager can tell at a glance
 * which ones will ask for stations and which apply everywhere.
 */
function CategoryAccordion({
  categories,
  selectedSubcategoryId,
  onSelectSubcategory,
  locale,
}: {
  categories: Category[];
  selectedSubcategoryId: string;
  onSelectSubcategory: (categoryId: string, subcategoryId: string) => void;
  locale: string;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const isEs = locale === "es";

  // Open the parent that holds the currently selected subcategory, falling
  // back to the first category so the accordion never starts fully closed.
  const owningParentId = React.useMemo(() => {
    for (const c of categories) {
      if (c.subcategories?.some((s) => s.id === selectedSubcategoryId)) {
        return c.id;
      }
    }
    return categories[0]?.id ?? null;
  }, [categories, selectedSubcategoryId]);

  const [openId, setOpenId] = React.useState<string | null>(owningParentId);
  React.useEffect(() => {
    // Keep the parent of the live selection expanded even after the user
    // picks a subcategory from elsewhere — otherwise the pill they just
    // tapped disappears inside a closed card.
    if (owningParentId) setOpenId(owningParentId);
  }, [owningParentId]);

  if (categories.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] p-4 text-sm text-[var(--color-ink-2)]">
        {t("categoriesEmpty")}
      </div>
    );
  }

  const subName = (s: { nameEn: string; nameEs?: string }): string =>
    isEs ? s.nameEs || s.nameEn : s.nameEn;
  const catName = (c: { nameEn: string; nameEs?: string }): string =>
    isEs ? c.nameEs || c.nameEn : c.nameEn;

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const isOpen = openId === cat.id;
        const subs = cat.subcategories ?? [];
        // A row is "active" when this parent owns the current selection —
        // the whole header gets a brand tint and a brand icon tile, so the
        // chosen category is unmissable. The checkmark on the right is the
        // same affordance every selected list row wears.
        const isActiveParent = subs.some(
          (s) => s.id === selectedSubcategoryId,
        );
        const CatIcon = getCategoryIcon(cat);
        return (
          <div
            key={cat.id}
            className={cn(
              "overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--color-surface)] shadow-2xs",
              isActiveParent ? "border-[var(--color-line-2)]" : "border-[var(--color-line-2)]",
            )}
          >
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : cat.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenId(isOpen ? null : cat.id);
                }
              }}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]",
                isActiveParent
                  ? "bg-[var(--color-brand-tint)]"
                  : isOpen
                    ? "bg-[var(--color-wash)]"
                    : "hover:bg-[var(--color-wash)]",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile
                  size="sm"
                  icon={CatIcon}
                  tone={isActiveParent ? "quiet" : "neutral"}
                />
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "truncate text-sm font-semibold",
                      isActiveParent
                        ? "text-[var(--color-brand-700)]"
                        : "text-[var(--color-ink)]",
                    )}
                  >
                    {catName(cat)}
                  </h3>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-xs leading-meta",
                      isActiveParent
                        ? "text-[var(--color-brand-700)] opacity-80"
                        : "text-[var(--color-ink-3)]",
                    )}
                  >
                    {subs.length === 0
                      ? t("categoriesNoSubs")
                      : t("categoriesCount", { count: subs.length })}
                  </p>
                </div>
              </div>
              {isActiveParent ? (
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[var(--color-surface)]"
                >
                  <LuCheck aria-hidden="true" className="size-4" />
                </span>
              ) : (
                <LuChevronRight
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 text-[var(--color-ink-3)] transition-transform",
                    isOpen && "rotate-90 text-[var(--color-ink-2)]",
                  )}
                />
              )}
            </div>

            {isOpen ? (
              <div className="border-t border-[var(--color-line)] p-4">
                {subs.length === 0 ? (
                  <p className="text-sm text-[var(--color-ink-3)]">
                    {t("categoriesNoSubs")}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2" role="list">
                    {subs.map((sub) => {
                      const isSelected = selectedSubcategoryId === sub.id;
                      return (
                        <li key={sub.id}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              onSelectSubcategory(cat.id, sub.id)
                            }
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold transition-colors",
                              isSelected
                                ? "border-[var(--color-brand-600)] text-[var(--color-brand-700)] ring-2 ring-[var(--color-brand-tint)]"
                                : "border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-line-hover)] hover:bg-[var(--color-wash)]",
                            )}
                          >
                            {isSelected ? (
                              <LuCheck
                                aria-hidden="true"
                                className="size-4 text-[var(--color-brand-600)]"
                              />
                            ) : null}
                            <span>{subName(sub)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The Assign block under the categories accordion. Lists employees:
 * - When the manager picked a station-specific subcategory and at least one
 *   station: employees whose `stationIds` intersect the picked stations.
 * - Otherwise (general subcategory, or station-specific but no stations
 *   chosen yet): every active employee on the team.
 *
 * A search bar narrows the list by name, code or role. Cards render in a
 * 3-column grid; the first nine show by default and the rest are revealed
 * by "Show N more". Tapping a card toggles that employee in or out of the
 * procedure's audience.
 */
function AssignBlock({
  people,
  stations,
  roles,
  filterStationIds,
  selected,
  onToggle,
}: {
  people: AdminEmployee[];
  stations: Station[];
  roles: Role[];
  filterStationIds: string[] | null;
  selected: string[];
  onToggle: (id: string) => void;
  isEs: boolean;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState(false);
  const VISIBLE_COUNT = 9;

  const roleNameById = React.useMemo(
    () => new Map(roles.map((r) => [r.id, r.name])),
    [roles],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (filterStationIds && filterStationIds.length > 0) {
        const overlap = p.stationIds.some((id) => filterStationIds.includes(id));
        if (!overlap) return false;
      }
      if (!q) return true;
      const role = (p.role ?? "").toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.employeeCode ?? "").toLowerCase().includes(q) ||
        role.includes(q)
      );
    });
  }, [people, filterStationIds, search]);

  const stationNameById = React.useMemo(
    () => new Map(stations.map((s) => [s.id, s.name])),
    [stations],
  );

  // When the search query narrows the list past the visible threshold, we
  // just show everything that matches — no need to gate behind "Show more"
  // when the manager is already drilling down with text.
  const visible = search.trim() || expanded ? filtered : filtered.slice(0, VISIBLE_COUNT);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="space-y-4">
      {/* Top bar — title + count + search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <IconTile size="xs" icon={LuUsers} />
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {t("assignTitle")}
          </h3>
          {selected.length > 0 ? (
            <span className="text-sm font-normal text-[var(--color-ink-3)] whitespace-nowrap">
              {t("assignPicked", { count: selected.length })}
            </span>
          ) : null}
        </div>
        <div className="relative ml-auto flex w-[380px] max-w-full shrink-0 items-center rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1.5 transition-colors focus-within:border-[var(--color-brand)]">
          <LuSearch aria-hidden="true" className="mr-2 size-4 shrink-0 text-[var(--color-ink-3)]" />
          <label className="sr-only" htmlFor="assign-search">
            {t("assignSearch")}
          </label>
          <input
            id="assign-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("assignSearchPlaceholder")}
            className="w-full min-w-0 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              aria-label={t("assignClear")}
              onClick={() => setSearch("")}
              className="ml-1 shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Employee cards — three columns, generous tap targets. */}
      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] p-6 text-center text-sm text-[var(--color-ink-2)]">
          {filterStationIds && filterStationIds.length > 0
            ? t("assignEmptyStations", {
              stations: filterStationIds
                .map((id) => stationNameById.get(id) ?? id)
                .join(", "),
            })
            : t("assignEmpty")}
        </div>
      ) : (
        <>
          <ul
            role="list"
            aria-label={t("assignTitle")}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((p) => {
              const isOn = selected.includes(p.id);
              const initials = initialsOf(p.name);
              const assignedRoleName = p.roleIds
                .map((id) => roleNameById.get(id))
                .filter(Boolean)[0] ||
                (p.role === "admin" ? "Head Chef" : "Line Cook");
              const stationList = p.stationIds
                .map((id) => stationNameById.get(id))
                .filter(Boolean);
              const personStations = stationList.join(" · ");
              const subtitle = [assignedRoleName, personStations].filter(Boolean).join(" · ") || assignedRoleName;

              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => onToggle(p.id)}
                    className={cn(
                      "flex w-full items-center gap-[12px] rounded-[var(--radius-lg)] border-2 px-[14px] py-[8px] text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                      isOn
                        ? "border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]"
                        : "border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-brand-600)]",
                    )}
                  >
                    <div className="flex size-[30px] shrink-0 items-center justify-center">
                      {isOn ? (
                        <span
                          className="flex size-[22px] items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[var(--color-surface)] shadow-xs"
                          aria-hidden="true"
                        >
                          <LuCheck className="size-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span
                          className="flex size-[30px] items-center justify-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] text-[11px] font-semibold text-[var(--color-ink-2)]"
                          aria-hidden="true"
                        >
                          {initials}
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold leading-tight",
                          isOn
                            ? "text-[var(--color-brand-700)]"
                            : "text-[var(--color-ink)]",
                        )}
                      >
                        {p.name}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs leading-tight mt-0.5",
                          isOn
                            ? "text-[var(--color-brand-700)] opacity-85"
                            : "text-[var(--color-ink-3)]",
                        )}
                      >
                        {subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {hiddenCount > 0 && !search.trim() ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] py-[10px] text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-line-3)] hover:bg-[var(--color-panel)]"
            >
              <LuFileText aria-hidden="true" className="size-4 text-[var(--color-ink-2)]" />
              <span>{t("assignShowMore", { count: hiddenCount })}</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/** First letter of the first two words, uppercase. "María González" -> "MG". */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}
