import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CommitInfo } from "../../../types/git";

export interface GraphNode {
  commit: CommitInfo;
  lane: number;
  color: string;
}

const LANE_COLORS = [
  "#38bdf8", // Sky blue
  "#34d399", // Emerald
  "#c084fc", // Purple
  "#fbbf24", // Amber
  "#f472b6", // Pink
  "#a3e635", // Lime
  "#22d3ee", // Cyan
];

export function useCommitGraph(repoPath: string) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);

  const fetchCommits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<CommitInfo[]>("get_commits_cmd", {
        path: repoPath,
        maxCount: 100,
      });
      setCommits(result);

      // Compute visual lanes for the commits
      // Simple and robust lane allocator:
      const activeOids: (string | null)[] = [];
      const nodes: GraphNode[] = [];

      for (const commit of result) {
        let lane = activeOids.indexOf(commit.oid);

        if (lane === -1) {
          // Find first free lane
          lane = activeOids.indexOf(null);
          if (lane === -1) {
            lane = activeOids.length;
            activeOids.push(null);
          }
        }

        const color = LANE_COLORS[lane % LANE_COLORS.length];
        nodes.push({ commit, lane, color });

        // Update active lanes with parents
        activeOids[lane] = commit.parent_oids.length > 0 ? commit.parent_oids[0] : null;

        // Additional parents (merges) get extra lanes
        for (let i = 1; i < commit.parent_oids.length; i++) {
          const parentOid = commit.parent_oids[i];
          if (!activeOids.includes(parentOid)) {
            const nextLane = activeOids.indexOf(null);
            if (nextLane !== -1) {
              activeOids[nextLane] = parentOid;
            } else {
              activeOids.push(parentOid);
            }
          }
        }
      }

      setGraphNodes(nodes);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    fetchCommits();
  }, [fetchCommits]);

  return {
    commits,
    graphNodes,
    loading,
    error,
    selectedCommit,
    setSelectedCommit,
    refreshCommits: fetchCommits,
  };
}
