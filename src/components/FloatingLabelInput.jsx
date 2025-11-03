import React from 'react';

const FloatingLabelInput = ({ id, label, type = 'text', value, onChange, name, className = '', disabled = false }) => {
  return (
    <div className="relative group">
      <input
        type={type}
        id={id}
        name={name}
        className={`block px-3 pb-2.5 pt-5 w-full text-sm bg-background rounded-xl border-2 border-input appearance-none transition-smooth focus:outline-none focus:ring-0 focus:border-primary peer disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary/50 ${className}`}
        placeholder=" "
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete="off"
        data-lpignore="true"
        data-form-type="other"
        spellCheck="false"
        aria-autocomplete="none"
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-muted-foreground duration-300 transform -translate-y-4 scale-75 top-3 z-10 origin-[0] bg-background px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none"
      >
        {label}
      </label>
    </div>
  );
};

export default FloatingLabelInput;
