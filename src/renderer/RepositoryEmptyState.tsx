import { Button } from "@/components/ui/button";
import bookIcon from "./design-assets/repository-empty.svg?url";
import "./repository-empty-state.css";

export function RepositoryEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="repository-empty-state">
      <div className="repository-empty-state-icon">
        <img src={bookIcon} alt="" />
      </div>
      <div className="repository-empty-state-copy">
        <h2>团队的图标，在这里集合</h2>
        <p>选择仓库和目录，DesiCast 会同步 SVG 并提供给 MCP</p>
      </div>
      <Button kind="ghost" onClick={onAdd}>
        添加仓库
      </Button>
    </div>
  );
}
