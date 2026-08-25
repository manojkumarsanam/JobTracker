/**
 * Renders the add/edit application form from the user's field
 * configuration. Built-in fields map to fixed Application columns; custom
 * fields are collected into `extra`.
 */

import { useMemo, useState } from "react";
import type { FormValues } from "../lib/form";
import {
  BUILTIN_KEYS,
  parseOptions,
  type BuiltinKey,
  type FieldDefinition,
} from "../types";
import "./DynamicForm.css";

interface Props {
  fields: FieldDefinition[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  autoFocus?: boolean;
}

function isBuiltinKey(key: string): key is BuiltinKey {
  return (BUILTIN_KEYS as readonly string[]).includes(key);
}

export default function DynamicForm({
  fields,
  values,
  onChange,
  autoFocus,
}: Props) {
  const visible = useMemo(
    () => fields.filter((f) => f.visible).sort((a, b) => a.sort_order - b.sort_order),
    [fields],
  );
  const [customPortal, setCustomPortal] = useState(false);

  const get = (field: FieldDefinition): string => {
    if (isBuiltinKey(field.key)) return values.builtin[field.key] ?? "";
    const v = values.extra[field.key];
    return v == null ? "" : String(v);
  };

  const set = (field: FieldDefinition, value: string | boolean) => {
    if (isBuiltinKey(field.key)) {
      onChange({
        ...values,
        builtin: { ...values.builtin, [field.key]: String(value) },
      });
    } else {
      onChange({ ...values, extra: { ...values.extra, [field.key]: value } });
    }
  };

  return (
    <div className="dynamic-form">
      {visible.map((field, i) => {
        const value = get(field);
        const commonProps = {
          autoFocus: autoFocus && i === 0,
          required: field.required,
        };
        return (
          <div className="form-field" key={field.key}>
            <label htmlFor={`field-${field.key}`}>
              {field.label}
              {field.required && <span className="required-mark"> *</span>}
            </label>
            {field.field_type === "textarea" ? (
              <textarea
                id={`field-${field.key}`}
                value={value}
                onChange={(e) => set(field, e.target.value)}
                {...commonProps}
              />
            ) : field.field_type === "select" ? (
              customPortal && field.key === "portal" ? (
                <input
                  id={`field-${field.key}`}
                  value={value}
                  placeholder="Type a portal name"
                  onChange={(e) => set(field, e.target.value)}
                  {...commonProps}
                />
              ) : (
                <select
                  id={`field-${field.key}`}
                  value={value}
                  onChange={(e) => {
                    if (e.target.value === "__other__") {
                      setCustomPortal(true);
                      set(field, "");
                    } else {
                      set(field, e.target.value);
                    }
                  }}
                  {...commonProps}
                >
                  <option value="">—</option>
                  {parseOptions(field).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {field.key === "portal" && (
                    <option value="__other__">Other…</option>
                  )}
                </select>
              )
            ) : field.field_type === "checkbox" ? (
              <input
                id={`field-${field.key}`}
                type="checkbox"
                checked={value === "true"}
                onChange={(e) => set(field, e.target.checked)}
              />
            ) : (
              <input
                id={`field-${field.key}`}
                type={
                  field.field_type === "number"
                    ? "number"
                    : field.field_type === "date"
                      ? "date"
                      : "text"
                }
                value={value}
                onChange={(e) => set(field, e.target.value)}
                {...commonProps}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
