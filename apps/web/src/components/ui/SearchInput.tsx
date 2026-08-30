import { useState, useEffect, useRef } from "react";

type Props = {
  value?: string;
  onSearch: (q: string) => void;
  placeholder?: string;
};

export default function SearchInput({ value = "", onSearch, placeholder = "Search..." }: Props) {
  const [input, setInput] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(v), 300);
  };

  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">
        search
      </span>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full h-12 pl-11 pr-4 text-sm rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-tertiary-container/30 focus:border-tertiary-container"
      />
    </div>
  );
}