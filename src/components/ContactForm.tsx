import { useState, type FormEvent, type ChangeEvent } from 'react';
import type { FormField } from '../i18n/types';

interface Props {
  fields: FormField[];
  submitLabel: string;
  submittingLabel: string;
  successMessage: string;
  errorMessage: string;
  locale: string;
}

type FormState = Record<string, string>;

export default function ContactForm({
  fields,
  submitLabel,
  submittingLabel,
  successMessage,
  errorMessage,
  locale,
}: Props) {
  const initial = Object.fromEntries(fields.map((f) => [f.name, ''])) as FormState;
  const [values, setValues] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormState>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const validate = () => {
    const next: FormState = {};
    fields.forEach((field) => {
      const value = values[field.name]?.trim() ?? '';
      if (field.required && !value) {
        next[field.name] = 'required';
      } else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        next[field.name] = 'email';
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, locale }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
      setValues(initial);
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        className="rounded-2xl border border-accent/30 bg-accent-dim p-8 text-center"
        role="status"
      >
        <p className="text-accent font-medium">{successMessage}</p>
        <button
          type="button"
          className="mt-4 text-sm text-fg-muted underline hover:text-fg"
          onClick={() => setStatus('idle')}
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const hasError = Boolean(errors[field.name]);
          const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setValues((v) => ({ ...v, [field.name]: e.target.value }));

          const shared = {
            id: field.name,
            name: field.name,
            value: values[field.name],
            required: field.required,
            placeholder: field.placeholder,
            'aria-invalid': hasError || undefined,
            onChange,
            className: `w-full rounded-xl border bg-bg-elevated px-4 py-3 text-sm outline-none transition placeholder:text-fg-dim focus:border-accent ${
              hasError ? 'border-red-500/60' : 'border-border'
            }`,
          };

          return (
            <div
              key={field.name}
              className={field.type === 'textarea' ? 'sm:col-span-2' : undefined}
            >
              <label htmlFor={field.name} className="mb-2 block text-sm text-fg-muted">
                {field.label}
                {field.required && <span className="text-accent"> *</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea {...shared} rows={5} />
              ) : (
                <input {...shared} type={field.type} />
              )}
            </div>
          );
        })}
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {status === 'submitting' ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}
