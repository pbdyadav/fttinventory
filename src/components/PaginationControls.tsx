type PageSizeOption = number | "all";

type PaginationControlsProps = {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: PageSizeOption;
  pageSizeOptions?: PageSizeOption[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
  className?: string;
};

const buildPageItems = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "..."> = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push("...");

  for (let page = left; page <= right; page += 1) {
    pages.push(page);
  }

  if (right < totalPages - 1) pages.push("...");
  pages.push(totalPages);

  return pages;
};

export default function PaginationControls({
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions = [25, 50, 100, 250, "all"],
  onPageChange,
  onPageSizeChange,
  className = "",
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), safeTotalPages);
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === "all" ? totalItems : pageSize) + 1;
  const endItem =
    totalItems === 0
      ? 0
      : pageSize === "all"
        ? totalItems
        : Math.min(totalItems, safeCurrentPage * pageSize);
  const pageItems = buildPageItems(safeCurrentPage, safeTotalPages);

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="shrink-0 whitespace-nowrap text-sm text-gray-600">
          Showing {startItem}–{endItem} of {totalItems}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <button
            type="button"
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage <= 1}
          >
            &lt; Previous
          </button>

          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
            {pageItems.map((item, index) =>
              item === "..." ? (
                <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  className={`min-w-9 shrink-0 rounded-lg border px-3 py-2 text-sm ${
                    item === safeCurrentPage
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage >= safeTotalPages}
          >
            Next &gt;
          </button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="text-sm text-gray-500">Rows per page</span>
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            value={String(pageSize)}
            onChange={(event) =>
              onPageSizeChange(event.target.value === "all" ? "all" : Number(event.target.value))
            }
          >
            {pageSizeOptions.map((option) => (
              <option key={String(option)} value={String(option)}>
                {option === "all" ? "All" : option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
