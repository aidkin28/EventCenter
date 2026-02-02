"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

interface YearSelectorProps {
  value: number;
  onChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

export function YearSelector({
  value,
  onChange,
  minYear = 2020,
  maxYear = new Date().getFullYear(),
}: YearSelectorProps) {
  const years = [];
  for (let year = maxYear; year >= minYear; year--) {
    years.push(year);
  }

  return (
    <Select
      value={value.toString()}
      onValueChange={(v) => onChange(parseInt(v))}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
