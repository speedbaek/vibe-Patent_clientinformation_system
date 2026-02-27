import { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
}

export default function FormField({
  label,
  required = false,
  error,
  helpText,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input className={`field-input ${error ? 'error' : ''}`} {...inputProps} />
      {helpText && <span className="field-help">{helpText}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

// ── Select 필드 ──
interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
}

export function SelectField({
  label,
  required = false,
  options,
  ...selectProps
}: SelectFieldProps) {
  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      <select className="field-input" {...selectProps}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
