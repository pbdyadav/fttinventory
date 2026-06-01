type FilterOption = {
  label: string;
  value: string;
};

type AdvancedFilterPanelProps = {
  title: string;
  fromDate: string;
  toDate: string;
  selectLabel: string;
  selectValue: string;
  selectOptions: FilterOption[];
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onSelectChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
};

export default function AdvancedFilterPanel({
  title,
  fromDate,
  toDate,
  selectLabel,
  selectValue,
  selectOptions,
  onFromDateChange,
  onToDateChange,
  onSelectChange,
  onApply,
  onClear,
  onClose,
}: AdvancedFilterPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              These filters work with the current search box.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              From Date
            </label>
            <input
              type="date"
              className="w-full rounded border p-2"
              value={fromDate}
              onChange={(event) => onFromDateChange(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              To Date
            </label>
            <input
              type="date"
              className="w-full rounded border p-2"
              value={toDate}
              onChange={(event) => onToDateChange(event.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {selectLabel}
            </label>
            <select
              className="w-full rounded border p-2"
              value={selectValue}
              onChange={(event) => onSelectChange(event.target.value)}
            >
              <option value="">All</option>
              {selectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
