import React from 'react';
const variants = {
  primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  secondary: 'bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-50',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'text-emerald-600 hover:bg-emerald-50',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3 text-base' };
export default function Button({ children, variant='primary', size='md', loading, className='', ...props }) {
  return (
    <button className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {children}
    </button>
  );
}
