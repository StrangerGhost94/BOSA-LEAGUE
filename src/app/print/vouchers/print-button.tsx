"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-full bg-[#CC2654] px-5 py-2 text-sm font-semibold text-white">
      Print
    </button>
  );
}
