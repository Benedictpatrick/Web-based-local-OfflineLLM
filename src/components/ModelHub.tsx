"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AVAILABLE_MODELS,
  deleteModelCache,
  getDeviceInfo,
  getLoadedModelId,
  hasWebGpu,
  isLikelyTooLargeForDevice,
  isModelCached,
  isWebgpuOnly,
  type ModelCategory,
  type ModelId,
} from "@/lib/llm";
import { BRAND_ICONS, MULTI_COLOR_ICONS, PROVIDER_NAMES, type Provider } from "@/lib/brandIcons";
import { haptic } from "@/lib/haptics";

const CATEGORY_LABELS: Record<ModelCategory, string> = {
  tiny: "Tiny",
  balanced: "Balanced",
  powerful: "Powerful",
  coding: "Coding",
  math: "Math",
  reasoning: "Reasoning",
};

const TAG_CLASS = "rounded-md bg-surface-hover px-1.5 py-0.5 text-xs font-medium text-foreground-muted";

function BrandMark({ provider }: { provider: Provider }) {
  const multi = MULTI_COLOR_ICONS[provider];
  if (multi) {
    return (
      <svg width="12" height="12" viewBox={multi.viewBox} className="shrink-0" aria-hidden="true">
        {multi.paths.map((p, i) => (
          <path key={i} fill={p.fill} d={p.d} />
        ))}
      </svg>
    );
  }
  const icon = BRAND_ICONS[provider];
  if (!icon) return null;
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={icon.hex} className="shrink-0" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

function CompanyBadge({ provider }: { provider: Provider }) {
  return (
    <span className={`inline-flex items-center gap-1 ${TAG_CLASS}`}>
      <BrandMark provider={provider} />
      {PROVIDER_NAMES[provider]}
    </span>
  );
}

export default function ModelHub({
  active,
  onSelectModel,
}: {
  active: boolean;
  onSelectModel: (id: ModelId) => void;
}) {
  const [cached, setCached] = useState<Partial<Record<ModelId, boolean>>>({});
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const [activeModelId, setActiveModelId] = useState<ModelId | null>(null);
  const [deletingId, setDeletingId] = useState<ModelId | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<ModelId | null>(null);
  const [providerFilter, setProviderFilter] = useState<Provider | "all">("all");
  const memoryGb = getDeviceInfo().memoryGb;

  const providers = useMemo(() => {
    const seen = new Set<Provider>();
    const ordered: Provider[] = [];
    for (const m of AVAILABLE_MODELS) {
      if (!seen.has(m.provider)) {
        seen.add(m.provider);
        ordered.push(m.provider);
      }
    }
    return ordered;
  }, []);

  const visibleModels =
    providerFilter === "all"
      ? AVAILABLE_MODELS
      : AVAILABLE_MODELS.filter((m) => m.provider === providerFilter);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    hasWebGpu().then((v) => {
      if (!cancelled) setWebgpu(v);
    });
    const id = requestAnimationFrame(() => setActiveModelId(getLoadedModelId()));
    for (const m of AVAILABLE_MODELS) {
      isModelCached(m.id).then((isCached) => {
        if (!cancelled) setCached((prev) => ({ ...prev, [m.id]: isCached }));
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [active]);

  async function handleDelete(id: ModelId) {
    setDeletingId(id);
    try {
      await deleteModelCache(id);
      setCached((prev) => ({ ...prev, [id]: false }));
    } finally {
      setDeletingId(null);
    }
  }

  function handleDeleteClick(id: ModelId) {
    if (confirmDeleteId === id) {
      haptic("warning");
      setConfirmDeleteId(null);
      handleDelete(id);
      return;
    }
    haptic("tap");
    setConfirmDeleteId(id);
    setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 4000);
  }

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 py-6">
        <div className="mb-1">
          <h1 className="text-lg font-semibold tracking-tight">Model Hub</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Browse and switch between models. Downloads happen once and everything runs on this
            device from then on.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              providerFilter === "all"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-foreground-muted hover:bg-surface-hover"
            }`}
            onClick={() => {
              haptic("tap");
              setProviderFilter("all");
            }}
          >
            All
          </button>
          {providers.map((p) => (
            <button
              key={p}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                providerFilter === p
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-foreground-muted hover:bg-surface-hover"
              }`}
              onClick={() => {
                haptic("tap");
                setProviderFilter(p);
              }}
            >
              <BrandMark provider={p} />
              {PROVIDER_NAMES[p]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleModels.map((m) => {
            const gpuLocked = webgpu === false && isWebgpuOnly(m);
            const isActive = m.id === activeModelId;
            const tooLarge = !gpuLocked && isLikelyTooLargeForDevice(m.sizeGB, memoryGb);
            return (
              <div
                key={m.id}
                className={`flex flex-col rounded-2xl border p-4 transition-colors ${
                  isActive ? "border-accent" : "border-border"
                } ${gpuLocked ? "opacity-50" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <CompanyBadge provider={m.provider} />
                  <span className={TAG_CLASS}>{CATEGORY_LABELS[m.category]}</span>
                  <span className={TAG_CLASS}>~{m.sizeGB}GB</span>
                  {isActive && (
                    <span className="ml-auto shrink-0 rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-2 font-medium">{m.label.replace(/\s*\([^)]*\)\s*$/, "")}</p>
                {m.hubDescription && (
                  <p className="mt-1 text-sm text-foreground-muted">{m.hubDescription}</p>
                )}
                {gpuLocked && (
                  <p className="mt-1 text-xs text-amber-500">
                    Requires WebGPU, which isn&apos;t available on this device.
                  </p>
                )}
                {tooLarge && (
                  <p className="mt-1 text-xs text-amber-500">
                    May be too large for this device (~{memoryGb}GB RAM reported).
                  </p>
                )}
                <div className="mt-auto flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
                    onClick={() => {
                      haptic("tap");
                      onSelectModel(m.id);
                    }}
                    disabled={gpuLocked || isActive}
                  >
                    {isActive ? "In use" : cached[m.id] ? "Use this model" : "Download & use"}
                  </button>
                  {cached[m.id] && !isActive && (
                    <button
                      type="button"
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        confirmDeleteId === m.id
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-red-500/40 text-red-500 hover:bg-red-500 hover:text-white"
                      }`}
                      onClick={() => handleDeleteClick(m.id)}
                      disabled={deletingId === m.id}
                    >
                      {deletingId === m.id
                        ? "Deleting…"
                        : confirmDeleteId === m.id
                          ? "Tap to confirm"
                          : "Delete cache"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
