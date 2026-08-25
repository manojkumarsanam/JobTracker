/**
 * "Add chart" modal: re-enable hidden built-in charts, or build a custom
 * one by picking a chart type and a data field.
 */

import { useMemo, useState } from "react";
import {
  BUILTIN_CHARTS,
  CHART_KIND_LABELS,
  NUMERIC_KINDS,
  TIME_KINDS,
  type ChartKind,
  type CustomChartDef,
} from "../../lib/dashboard";
import type { FieldDefinition } from "../../types";
import "./ChartBuilder.css";

interface Props {
  hiddenBuiltins: string[];
  fields: FieldDefinition[];
  onAddBuiltin: (id: string) => void;
  onAddCustom: (def: CustomChartDef) => void;
  onClose: () => void;
}

export default function ChartBuilder({
  hiddenBuiltins,
  fields,
  onAddBuiltin,
  onAddCustom,
  onClose,
}: Props) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ChartKind>("bar");
  const [field, setField] = useState("portal");

  const isNumeric = NUMERIC_KINDS.includes(kind);
  const isTime = TIME_KINDS.includes(kind);

  const fieldChoices = useMemo(() => {
    const numericKeys = new Set(
      fields.filter((f) => f.field_type === "number").map((f) => f.key),
    );
    numericKeys.add("salary_expectation");

    const all = [
      ...fields.map((f) => ({ key: f.key, label: f.label })),
      { key: "status", label: "Status" },
    ];
    return isNumeric ? all.filter((f) => numericKeys.has(f.key)) : all;
  }, [fields, isNumeric]);

  const effectiveField = fieldChoices.some((f) => f.key === field)
    ? field
    : (fieldChoices[0]?.key ?? "");

  const fieldLabel =
    fieldChoices.find((f) => f.key === effectiveField)?.label ?? effectiveField;

  const add = () => {
    if (!isTime && !effectiveField) return;
    onAddCustom({
      id: `custom-${Date.now()}`,
      title:
        title.trim() ||
        (isTime
          ? `Applications ${CHART_KIND_LABELS[kind].toLowerCase()}`
          : `${fieldLabel} — ${CHART_KIND_LABELS[kind]}`),
      kind,
      field: isTime ? "" : effectiveField,
    });
    onClose();
  };

  return (
    <div className="builder-overlay" onClick={onClose}>
      <div className="builder-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add a chart</h2>

        {hiddenBuiltins.length > 0 && (
          <section>
            <h3>Bring back</h3>
            <div className="builder-builtin-list">
              {hiddenBuiltins.map((id) => {
                const label = BUILTIN_CHARTS.find((c) => c.id === id)?.label ?? id;
                return (
                  <button key={id} onClick={() => onAddBuiltin(id)}>
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h3>Build your own</h3>
          <div className="builder-form">
            <div>
              <label>Chart type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ChartKind)}
              >
                {(Object.keys(CHART_KIND_LABELS) as ChartKind[]).map((k) => (
                  <option key={k} value={k}>
                    {CHART_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            {!isTime && (
              <div>
                <label>{isNumeric ? "Numeric field" : "Field"}</label>
                <select
                  value={effectiveField}
                  onChange={(e) => setField(e.target.value)}
                >
                  {fieldChoices.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label>Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-named if left empty"
              />
            </div>
          </div>
          {isNumeric && fieldChoices.length === 0 && (
            <p className="builder-hint">
              No numeric fields available — add a field with type "number"
              in Settings, or use Salary Expectation.
            </p>
          )}
        </section>

        <div className="builder-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={add}
            disabled={!isTime && !effectiveField}
          >
            Add chart
          </button>
        </div>
      </div>
    </div>
  );
}
