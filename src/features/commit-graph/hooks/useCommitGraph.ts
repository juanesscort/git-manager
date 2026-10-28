import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CommitInfo } from "../../../types/git";

export interface GraphNode {
  commit: CommitInfo;
  lane: number;
  color: string;
  parentLanes: number[];
  activeLanes: number[];
}

export const LANE_COLORS = [
  "#38bdf8", // Sky blue
  "#c084fc", // Purple
  "#fb923c", // Orange
  "#34d399", // Emerald
  "#f472b6", // Pink
  "#facc15", // Amber
  "#22d3ee", // Cyan
  "#a78bfa", // Violet
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
        maxCount: 150,
      });
      setCommits(result);

      // Pass 1: Allocate lanes to all commits topologically
      const commitLaneMap = new Map<string, number>();
      const activeLanes: (string | null)[] = [];

      for (const commit of result) {
        let lane = activeLanes.indexOf(commit.oid);

        if (lane === -1) {
          lane = activeLanes.indexOf(null);
          if (lane === -1) {
            lane = activeLanes.length;
            activeLanes.push(null);
          }
        }

        commitLaneMap.set(commit.oid, lane);

        // Update active lanes: first parent keeps the lane
        if (commit.parent_oids.length > 0) {
          activeLanes[lane] = commit.parent_oids[0];
        } else {
          activeLanes[lane] = null;
        }

        // Additional parents (merges) get their own lanes
        for (let i = 1; i < commit.parent_oids.length; i++) {
          const parentOid = commit.parent_oids[i];
          if (!activeLanes.includes(parentOid)) {
            const nextLane = activeLanes.indexOf(null);
            if (nextLane !== -1) {
              activeLanes[nextLane] = parentOid;
            } else {
              activeLanes.push(parentOid);
            }
          }
        }
      }

      // Pass 2: Build graph nodes with parent lines and passing lanes
      const currentActiveLanes: (string | null)[] = [];
      const nodes: GraphNode[] = [];

      for (let idx = 0; idx < result.length; idx++) {
        const commit = result[idx];
        const lane = commitLaneMap.get(commit.oid) ?? 0;
        const color = LANE_COLORS[lane % LANE_COLORS.length];

        while (currentActiveLanes.length <= lane) {
          currentActiveLanes.push(null);
        }
        currentActiveLanes[lane] = commit.oid;

        // Determine parent lanes
        const parentLanes: number[] = [];
        for (const pOid of commit.parent_oids) {
          const pLane = commitLaneMap.get(pOid);
          if (pLane !== undefined) {
            parentLanes.push(pLane);
          } else {
            parentLanes.push(lane);
          }
        }

        // Passing lanes at this row (other active lanes that aren't this commit's lane)
        const passing: number[] = [];
        for (let l = 0; l < currentActiveLanes.length; l++) {
          if (l !== lane && currentActiveLanes[l] !== null) {
            passing.push(l);
          }
        }

        nodes.push({
          commit,
          lane,
          color,
          parentLanes,
          activeLanes: passing,
        });

        // Update currentActiveLanes for next rows
        if (commit.parent_oids.length > 0) {
          currentActiveLanes[lane] = commit.parent_oids[0];
        } else {
          currentActiveLanes[lane] = null;
        }

        for (let i = 1; i < commit.parent_oids.length; i++) {
          const pOid = commit.parent_oids[i];
          const pLane = commitLaneMap.get(pOid) ?? lane;
          while (currentActiveLanes.length <= pLane) {
            currentActiveLanes.push(null);
          }
          currentActiveLanes[pLane] = pOid;
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
