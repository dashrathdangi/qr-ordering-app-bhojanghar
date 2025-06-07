'use client';

export default function OutletSelector({ selectedOutlet, onChange, outlets }) {
  return (
    <select
      value={selectedOutlet}
      onChange={onChange}
      className="border rounded px-3 py-1 text-sm"
    >
      <option value="all">All Outlets</option>
      {outlets.map((outlet) => (
        <option key={outlet.slug} value={outlet.slug}>
          {outlet.name || outlet.slug}
        </option>
      ))}
    </select>
  );
}
