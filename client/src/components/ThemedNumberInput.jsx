import React from 'react';
import { Minus, Plus } from 'lucide-react';

const themeClasses = {
  default: {
    input:
      'border-slate-200/80 bg-white/90 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:shadow-[0_0_0_1px_rgba(14,165,233,0.25),0_0_0_6px_rgba(14,165,233,0.08)] dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-950 dark:focus:border-brand-500 dark:focus:bg-slate-950',
    control:
      'border-slate-200/80 bg-white/75 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm active:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:active:bg-slate-800/80',
  },
  dark: {
    input:
      'border-slate-800 bg-slate-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-slate-500 hover:border-slate-700 hover:bg-slate-950 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:shadow-[0_0_0_1px_rgba(14,165,233,0.2),0_0_0_6px_rgba(14,165,233,0.08)]',
    control:
      'border-slate-800 bg-slate-900/95 text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-800/80',
  },
};

const clampValue = (value, min, max) => {
  let next = value;
  if (typeof min === 'number' && Number.isFinite(min)) {
    next = Math.max(min, next);
  }
  if (typeof max === 'number' && Number.isFinite(max)) {
    next = Math.min(max, next);
  }
  return next;
};

const getPrecision = (step) => {
  if (typeof step !== 'number' || !Number.isFinite(step)) {
    return 0;
  }
  const decimalPart = step.toString().split('.')[1];
  return decimalPart ? decimalPart.length : 0;
};

const formatSteppedValue = (value, step) => {
  const precision = getPrecision(step);
  return precision > 0 ? value.toFixed(precision) : String(value);
};

const ThemedNumberInput = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  theme = 'default',
  className = '',
  inputClassName = '',
  placeholder,
  disabled = false,
  onBlur,
  name,
  id,
  autoFocus = false,
  inputMode = 'decimal',
}) => {
  const styles = themeClasses[theme] || themeClasses.default;
  const numericValue = Number(value);
  const canDecrement = !disabled && (value === '' || !Number.isFinite(numericValue) || typeof min !== 'number' || numericValue > min);
  const canIncrement = !disabled && (value === '' || !Number.isFinite(numericValue) || typeof max !== 'number' || numericValue < max);

  const emitValue = (nextValue) => {
    onChange?.(nextValue);
  };

  const handleInputChange = (event) => {
    emitValue(event.target.value);
  };

  const handleStep = (direction) => {
    if (disabled) {
      return;
    }

    const stepValue = typeof step === 'number' && Number.isFinite(step) ? step : 1;
    const baseValue = Number.isFinite(numericValue) ? numericValue : typeof min === 'number' ? min : 0;
    const steppedValue = clampValue(baseValue + direction * stepValue, min, max);
    emitValue(formatSteppedValue(steppedValue, stepValue));
  };

  const handleBlur = (event) => {
    const rawValue = event.target.value;

    if (rawValue === '') {
      onBlur?.(event);
      return;
    }

    const parsedValue = Number(rawValue);
    if (Number.isFinite(parsedValue)) {
      const clampedValue = clampValue(parsedValue, min, max);
      if (clampedValue !== parsedValue) {
        emitValue(formatSteppedValue(clampedValue, typeof step === 'number' ? step : 1));
      }
    }

    onBlur?.(event);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        name={name}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (['e', 'E'].includes(event.key)) {
            event.preventDefault();
          }
          if (typeof min === 'number' && min >= 0 && ['-', '+'].includes(event.key)) {
            event.preventDefault();
          }
        }}
        className={`no-spinner w-full rounded-2xl border py-3 pl-4 pr-16 text-sm font-semibold outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${styles.input} ${inputClassName}`}
      />

      <div className="absolute inset-y-1.5 right-1.5 flex w-11 flex-col gap-1">
        <button
          type="button"
          aria-label="Increase value"
          disabled={!canIncrement}
          onClick={() => handleStep(1)}
          className={`flex flex-1 items-center justify-center rounded-xl border transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${styles.control}`}
        >
          <Plus size={14} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Decrease value"
          disabled={!canDecrement}
          onClick={() => handleStep(-1)}
          className={`flex flex-1 items-center justify-center rounded-xl border transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${styles.control}`}
        >
          <Minus size={14} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};

export default ThemedNumberInput;
