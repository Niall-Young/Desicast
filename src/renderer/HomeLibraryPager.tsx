import { useEffect, useState, type ReactNode } from "react";
import { LeftRegular, RightRegular } from "@mingcute/react/core-regular";
import { IconButton } from "@/components/ui/icon-button";
import "./home-library-pager.css";

const PAGE_SIZE = 8;

export function HomeLibraryPager({ items }: { items: ReactNode[] }) {
  const [requestedPage, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount - 1);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  return (
    <div className="home-library-pager">
      <div className="home-library-viewport">
        <div
          className="home-library-track"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {Array.from({ length: pageCount }, (_, index) => (
            <div
              key={index}
              className="home-library-grid home-library-page"
              inert={index !== page}
              aria-hidden={index !== page}
            >
              {items.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE)}
            </div>
          ))}
        </div>
      </div>
      {pageCount > 1 && (
        <nav className="home-library-pagination" aria-label="图标库分页">
          <IconButton
            kind="plain"
            aria-label="上一页图标库"
            title="上一页"
            disabled={page === 0}
            onClick={() => setPage(Math.max(0, page - 1))}
          >
            <LeftRegular />
          </IconButton>
          <span
            className="home-library-page-number"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {page + 1} / {pageCount}
          </span>
          <IconButton
            kind="plain"
            aria-label="下一页图标库"
            title="下一页"
            disabled={page === pageCount - 1}
            onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
          >
            <RightRegular />
          </IconButton>
        </nav>
      )}
    </div>
  );
}
