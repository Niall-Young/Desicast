/** Centered status surface; it does not take focus or dismiss on outside clicks. */
export function IconLoading() {
  return (
    <div className="icon-loading-overlay">
      <div className="icon-loading-pop" role="status" aria-label="Loading">
        <span className="icon-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}
