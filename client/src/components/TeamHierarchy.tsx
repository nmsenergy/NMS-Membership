import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import RankBadge from "./RankBadge";
import { Card } from "./ui/card";

interface TreeNode {
  id: number;
  name: string;
  rank: string;
  referralCode: string;
  children?: TreeNode[];
}

interface TeamHierarchyProps {
  root: TreeNode;
  maxDepth?: number;
}

const TreeNode: React.FC<{ node: TreeNode; depth: number; maxDepth?: number }> = ({
  node,
  depth,
  maxDepth = 5,
}) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isMaxDepth = maxDepth && depth >= maxDepth;

  return (
    <div className="ml-0">
      <div className="flex items-center gap-2 py-2">
        {hasChildren && !isMaxDepth && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 hover:bg-muted rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        <Card className="flex-1 p-2 rounded-lg border-0 bg-muted/30 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {(node.name || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{node.name}</p>
            <p className="text-xs text-muted-foreground">{node.referralCode}</p>
          </div>
          <RankBadge rank={node.rank} size="sm" />
        </Card>
      </div>

      {isExpanded && hasChildren && !isMaxDepth && (
        <div className="ml-4 border-l border-border/50 pl-0">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} maxDepth={maxDepth} />
          ))}
        </div>
      )}

      {isMaxDepth && hasChildren && (
        <div className="ml-4 text-xs text-muted-foreground py-1">
          + {node.children!.length} 位下级成员
        </div>
      )}
    </div>
  );
};

export const TeamHierarchy: React.FC<TeamHierarchyProps> = ({ root, maxDepth = 5 }) => {
  return (
    <div className="space-y-2">
      <TreeNode node={root} depth={0} maxDepth={maxDepth} />
    </div>
  );
};

export default TeamHierarchy;
