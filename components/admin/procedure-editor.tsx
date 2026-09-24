"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LuEye,
  LuFileText,
  LuLayoutGrid,
  LuPlus,
  LuUtensils,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { Drawer } from "@/components/ui/drawer";
import { BilingualInput, type BilingualValue } from "@/components/ui/bilingual-input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { PageHeader } from "@/components/admin/page-header";
import { FormSection } from "@/components/admin/form-section";
import { QuizEditor } from "@/components/admin/quiz-editor";
import {
  RecipeIngredientsEditor,
  type RecipeIngredientItem,
} from "@/components/admin/recipe-ingredients-editor";
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

  const [publishOpen, setPublishOpen] = React.useState(false);
  const [quizOpen, setQuizOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

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
        if (quiz && quiz.questions.length > 0) {
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
    <div className="mx-auto max-w-page">
      <PageHeader
        eyebrow={t("back")}
        eyebrowHref={`/${locale}/admin/library`}
        title={isEdit ? t("titleEdit") : t("titleNew")}
        actions={
          <Button
            type="button"
            variant="surface"
            icon={LuEye}
            onClick={() => setPreviewOpen(true)}
          >
            {t("preview")}
          </Button>
        }
      />

      <div className="mt-6 space-y-6 pb-8">
        {error ? (
          <p
            role="alert"
            className="rounded-[var(--radius-lg)] bg-[var(--color-bad-tint)] px-4 py-3 font-semibold text-[var(--color-bad)]"
          >
            {error}
          </p>
        ) : null}

        {/* ── What it is and where it lives ─────────────────────────── */}
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
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label id="proc-cat-l">{t("fieldCategory")}</Label>
                <CustomSelect
                  ariaLabelledBy="proc-cat-l"
                  value={categoryId || "none"}
                  onChange={(v) => {
                    edit(setCategoryId)(v === "none" ? "" : v);
                    setSubcategoryId("");
                    setStationIds([]);
                  }}
                  options={[
                    { value: "none", label: t("categoryNone") },
                    ...categories
                      .filter((c) => !c.isArchived)
                      .map((c) => ({ value: c.id, label: nameOf(c) })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label id="proc-sub-l">{t("fieldSubcategory")}</Label>
                <CustomSelect
                  ariaLabelledBy="proc-sub-l"
                  value={subcategoryId || "none"}
                  disabled={!category?.subcategories?.length}
                  onChange={(v) => {
                    const next = v === "none" ? "" : v;
                    edit(setSubcategoryId)(next);
                    const sub = category?.subcategories?.find(
                      (s) => s.id === next,
                    );
                    setStationIds(
                      sub?.isStationSpecific ? (sub.stations ?? []) : [],
                    );
                  }}
                  options={[
                    { value: "none", label: t("subcategoryNone") },
                    ...(category?.subcategories ?? []).map((s) => ({
                      value: s.id,
                      label: nameOf(s),
                    })),
                  ]}
                />
              </div>
            </div>
            {subcategory?.isStationSpecific ? (
              <MultiSelectChips
                id="proc-stations"
                label={t("fieldStations")}
                hint={t("stationsHint")}
                value={stationIds}
                onChange={edit(setStationIds)}
                options={stations.map((s) => ({ value: s.id, label: s.name }))}
                addLabel={t("stationsAdd")}
                emptyText={t("stationsEmpty")}
              />
            ) : null}
          </div>
        </FormSection>

        {/* ── A recipe's ingredients and yield ──────────────────────── */}
        {isRecipe ? (
          <FormSection
            id="proc-ingredients"
            icon={LuUtensils}
            title={t("ingredientsTitle")}
            subtitle={t("ingredientsSubtitle")}
          >
            <RecipeIngredientsEditor
              ingredients={ingredients}
              onChange={edit(setIngredients)}
              selectedFactor={batch}
              onSelectFactor={setBatch}
              yieldItems={yieldItems}
              onChangeYield={edit(setYieldItems)}
            />
          </FormSection>
        ) : null}

        {/* ── What it says ───────────────────────────────────────────── */}
        <FormSection
          id="proc-content"
          icon={LuLayoutGrid}
          title={t("contentTitle")}
          subtitle={
            isRecipe ? t("contentSubtitleRecipe") : t("contentSubtitle")
          }
        >
          <NotionBlockList blocks={blocks} onChange={edit(setBlocks)} />
        </FormSection>
      </div>

      {/* ── Save, always in reach ────────────────────────────────────── */}
      <div className="sticky bottom-0 z-sticky -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 sm:-mx-6 sm:px-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
          <StatusPill tone={published ? "ok" : "neutral"} withDot>
            {published ? t("statusPublished") : t("statusDraft")}
          </StatusPill>
          {dirty ? (
            <span className="text-[var(--color-warn-ink)]">{t("unsaved")}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${locale}/admin/library`}>
            <Button type="button" variant="ghost">
              {t("cancel")}
            </Button>
          </Link>
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
          <Button
            type="button"
            aria-haspopup="dialog"
            disabled={pending}
            onClick={() => setPublishOpen(true)}
          >
            {published ? t("saveChanges") : t("publish")}
          </Button>
        </div>
      </div>

      {/* ── Asked at publish: who, how guarded, and a quiz ───────────── */}
      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} size="lg">
        <ModalHeader
          title={published ? t("saveTitle") : t("publishTitle")}
          description={t("publishDescription")}
          onClose={() => setPublishOpen(false)}
          closeLabel={t("cancel")}
        />
        <ModalBody>
          <section aria-labelledby="pub-who" className="space-y-3">
            <h3
              id="pub-who"
              className="text-md font-semibold text-[var(--color-ink)]"
            >
              {t("whoTitle")}
            </h3>
            <div className="space-y-6">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">{t("whoTitle")}</legend>
                {(["everyone", "some"] as const).map((mode) => (
                  <label
                    key={mode}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-[var(--radius-lg)] border p-4 transition-colors duration-[var(--dur)] ease-[var(--ease)]",
                      audience.mode === mode
                        ? "border-[var(--color-ring)] bg-[var(--color-brand-tint)]"
                        : "border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line-hover)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="proc-audience"
                      className="mt-1 accent-[var(--color-brand-600)]"
                      checked={audience.mode === mode}
                      onChange={() => edit(setAudience)({ ...audience, mode })}
                    />
                    <span>
                      <span className="block font-semibold text-[var(--color-ink)]">
                        {mode === "everyone" ? t("whoEveryone") : t("whoSome")}
                      </span>
                      <span className="block text-sm text-[var(--color-ink-2)]">
                        {mode === "everyone"
                          ? t("whoEveryoneHint")
                          : t("whoSomeHint")}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {audience.mode === "some" ? (
                <div className="space-y-5">
                  <MultiSelectChips
                    id="who-stations"
                    label={t("whoStations")}
                    value={audience.stationIds}
                    onChange={(v) =>
                      edit(setAudience)({ ...audience, stationIds: v })
                    }
                    options={stations.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    addLabel={t("whoAdd")}
                    emptyText={t("whoNobody")}
                  />
                  <MultiSelectChips
                    id="who-roles"
                    label={t("whoRoles")}
                    value={audience.roleIds}
                    onChange={(v) =>
                      edit(setAudience)({ ...audience, roleIds: v })
                    }
                    options={roles.map((r) => ({ value: r.id, label: r.name }))}
                    addLabel={t("whoAdd")}
                    emptyText={t("whoNobody")}
                  />
                  <MultiSelectChips
                    id="who-people"
                    label={t("whoPeople")}
                    value={audience.employeeIds}
                    onChange={(v) =>
                      edit(setAudience)({ ...audience, employeeIds: v })
                    }
                    options={people.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    addLabel={t("whoAdd")}
                    emptyText={t("whoNobody")}
                  />
                </div>
              ) : null}

              <div className="space-y-2 border-t border-[var(--color-line)] pt-5">
                <p
                  id="proc-protection-l"
                  className="text-sm font-semibold text-[var(--color-ink)]"
                >
                  {t("protectionTitle")}
                </p>
                <SegmentedControl
                  label={t("protectionTitle")}
                  value={protection}
                  onChange={(v) =>
                    edit(setProtection)(v as ProcedureProtection)
                  }
                  segments={[
                    { value: "standard", label: t("protectionStandard") },
                    {
                      value: "confidential",
                      label: t("protectionConfidential"),
                    },
                    { value: "master", label: t("protectionMaster") },
                  ]}
                />
                <p className="text-sm text-[var(--color-ink-2)]">
                  {t("protectionHint")}
                </p>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="pub-quiz"
            className="flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-5"
          >
            <div className="min-w-0 flex-1">
              <h3
                id="pub-quiz"
                className="flex items-center gap-2 text-md font-semibold text-[var(--color-ink)]"
              >
                {t("quizTitle")}
                <StatusPill tone="neutral">{t("quizOptional")}</StatusPill>
              </h3>
              <p className="text-sm text-[var(--color-ink-2)]">
                {quizCount
                  ? t("quizCount", { count: quizCount })
                  : t("quizNone")}
              </p>
            </div>
            {quiz && quizCount ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => edit(setQuiz)(null)}
              >
                {t("quizRemove")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={() => {
                if (!quiz) setQuiz({ questions: [], attached: true });
                setPublishOpen(false);
                setQuizOpen(true);
              }}
            >
              {quizCount ? t("quizEdit") : t("quizAdd")}
            </Button>
          </section>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPublishOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => save("published")}
          >
            {published ? t("saveChanges") : t("publishNow")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Writing a quiz needs room, so it gets a drawer; Done goes back to the panel. */}
      <Drawer
        open={quizOpen}
        onClose={() => {
          setQuizOpen(false);
          setPublishOpen(true);
        }}
        title={t("quizTitle")}
        closeLabel={t("quizDone")}
        size="lg"
        footer={
          <Button
            type="button"
            onClick={() => {
              setQuizOpen(false);
              setPublishOpen(true);
            }}
          >
            {t("quizDone")}
          </Button>
        }
      >
        {quiz ? <QuizEditor value={quiz} onChange={edit(setQuiz)} /> : null}
      </Drawer>

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
