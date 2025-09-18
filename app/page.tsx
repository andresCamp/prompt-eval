'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Image as ImageIcon, ListChecks, SquarePen, History } from "lucide-react";

const SUGGESTED_SLUGS = [
  "prompt-playground",
  "marketing-brief",
  "model-benchmark",
  "ux-research",
  "ad-variations",
  "design-concepts",
  "storyboard-shots",
  "legal-review",
  "qa-regression",
  "growth-experiments",
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const FLOW_DEFINITIONS = [
  {
    type: "text" as const,
    title: "Generate Text",
    description: "Start a new threaded chat to explore prompt variants and capture results.",
    path: "text",
    icon: SquarePen,
    cta: "Open text workspace",
  },
  {
    type: "object" as const,
    title: "Generate Object",
    description: "Define schemas and run structured generations with snapshot support.",
    path: "object",
    icon: ListChecks,
    cta: "Open object workspace",
  },
  {
    type: "image" as const,
    title: "Generate Image",
    description: "Launch an image-focused session to remix and iterate on visual prompts.",
    path: "image",
    icon: ImageIcon,
    cta: "Open image workspace",
  },
] satisfies Array<{
  type: "text" | "object" | "image";
  title: string;
  description: string;
  path: string;
  icon: typeof SquarePen;
  cta: string;
}>;

const HISTORY_KEY_PREFIXES = [
  { type: "text" as const, prefix: "generate-text-chat-config-" },
  { type: "object" as const, prefix: "generate-object-chat-config-" },
  { type: "image" as const, prefix: "image-playground-config-" },
];

type FlowType = (typeof FLOW_DEFINITIONS)[number]["type"];

type HistoryEntry = {
  slug: string;
  flows: FlowType[];
};

export default function Home() {
  const [slug, setSlug] = useState<string>(SUGGESTED_SLUGS[0]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  const normalizedSlug = slugify(slug);
  const slugIsValid = normalizedSlug.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadHistory = () => {
      const map = new Map<string, Set<FlowType>>();

      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key) continue;

        const match = HISTORY_KEY_PREFIXES.find(({ prefix }) => key.startsWith(prefix));
        if (!match) continue;

        const slugFromKey = key.slice(match.prefix.length);
        if (!slugFromKey) continue;

        if (!map.has(slugFromKey)) {
          map.set(slugFromKey, new Set<FlowType>());
        }
        map.get(slugFromKey)?.add(match.type);
      }

      const nextEntries = Array.from(map.entries())
        .map<HistoryEntry>(([storedSlug, flows]) => ({
          slug: storedSlug,
          flows: Array.from(flows).sort(
            (a, b) =>
              FLOW_DEFINITIONS.findIndex((flow) => flow.type === a) -
              FLOW_DEFINITIONS.findIndex((flow) => flow.type === b)
          ),
        }))
        .sort((a, b) => a.slug.localeCompare(b.slug));

      setHistoryEntries(nextEntries);
    };

    loadHistory();
    window.addEventListener("storage", loadHistory);
    window.addEventListener("focus", loadHistory);

    return () => {
      window.removeEventListener("storage", loadHistory);
      window.removeEventListener("focus", loadHistory);
    };
  }, []);

  const flows = FLOW_DEFINITIONS.map((flow) => ({
    ...flow,
    href: `/${flow.path}/${normalizedSlug || ""}`,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-6 py-16 sm:px-10">
        <header className="flex flex-col gap-6 text-center sm:text-left">
          <span className="mx-auto w-fit rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm font-medium uppercase tracking-[0.2em] text-white/80 sm:mx-0">
            Prompt Evaluation Studio
          </span>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold leading-[1.15] sm:text-4xl md:text-[44px]">
              Choose a flow, set your slug, and jump straight into generation.
            </h1>
            <p className="text-base text-white/70 sm:text-lg">
              Use a shared slug to keep related experiments together across text, structured
              objects, and image runs.
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <label className="flex flex-col gap-3" htmlFor="slug-input">
            <span className="text-sm font-medium text-white/80">Workspace slug</span>
            <input
              id="slug-input"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              placeholder="e.g. product-launch"
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <p className="text-xs text-white/60">
              A slug is the title of your experiment (e.g. story-images). It creates a dedicated
              workspace under that link.
            </p>
            <span className="text-xs text-white/50">
              Final slug:
              <code className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs text-white">
                {normalizedSlug || "<empty>"}
              </code>
            </span>
          </label>

          <div className="grid w-full grid-flow-row dense grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
            {SUGGESTED_SLUGS.map((suggestion) => {
              return (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setSlug(slugify(suggestion))}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/35 hover:text-white whitespace-nowrap"
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {flows.map((flow) => {
            const Icon = flow.icon;
            const content = (
              <div className="group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/40 hover:bg-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white/10 p-2 text-white">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h2 className="text-lg font-semibold text-white sm:text-xl">{flow.title}</h2>
                  </div>
                  <ArrowUpRight className="size-4 text-white/40 transition group-hover:text-white" aria-hidden />
                </div>
                <p className="text-sm text-white/70 sm:text-base">{flow.description}</p>
                <span className="mt-auto text-xs font-semibold uppercase tracking-wide text-white/60">
                  {flow.cta}
                </span>
              </div>
            );

            return slugIsValid ? (
              <Link key={flow.title} href={flow.href} className="block">
                {content}
              </Link>
            ) : (
              <div
                key={flow.title}
                className="block cursor-not-allowed opacity-60"
                aria-disabled
                role="link"
              >
                {content}
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 p-2 text-white">
              <History className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">Workspace history</h2>
              <p className="text-sm text-white/60">
                These links reflect sessions saved in your browser&apos;s local storage.
              </p>
            </div>
          </div>

          {historyEntries.length === 0 ? (
            <p className="text-sm text-white/50">
              Launch a workspace to see it appear here for easy return visits.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {historyEntries.map((entry) => (
                <div
                  key={entry.slug}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-white">
                      {entry.slug}
                    </code>
                    <span className="text-xs font-medium uppercase tracking-wide text-white/40">
                      {entry.flows.length} {entry.flows.length === 1 ? "flow" : "flows"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.flows.map((flowType) => {
                      const flow = flows.find((item) => item.type === flowType);
                      if (!flow) return null;
                      const Icon = flow.icon;
                      return (
                        <Link
                          key={`${entry.slug}-${flowType}`}
                          href={`/${flow.path}/${entry.slug}`}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/35 hover:text-white"
                        >
                          <Icon className="size-4" aria-hidden />
                          {flow.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
