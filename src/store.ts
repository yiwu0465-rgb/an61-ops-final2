// global state management using zustand - this is where all our app data lives
import { create } from "zustand";
import type { Satellite, Threat, ActionLog } from "./types";
import type { TleRecord } from "./services/tle";

type Store = {
  satellites: Satellite[];           // list of satellites we're tracking
  threats: Threat[];                 // current threats detected
  actionLog: ActionLog[];            // history of actions we've executed
  executedThreatIds: Set<string>;    // keeps track of which threats have already been executed
  debrisCache: TleRecord[];          // cached tle data from celestrak (only loaded when "load realtime data" clicked)
  addSatellite: (sat: Satellite) => void;
  setSatellites: (satellites: Satellite[]) => void;
  removeSatellite: (index: number) => void;
  setThreats: (threats: Threat[]) => void;
  logAction: (entry: ActionLog) => void;
  markThreatExecuted: (threatId: string) => void;
  setDebrisCache: (debris: TleRecord[]) => void;
};

// create the store with all our state and actions
export const useStore = create<Store>((set) => ({
  satellites: [],
  threats: [],
  actionLog: [],
  executedThreatIds: new Set<string>(),
  debrisCache: [],
  
  // add a single satellite to the list
  addSatellite: (sat: Satellite) =>
    set((state) => ({ satellites: [...state.satellites, sat] })),
  
  // replace all satellites (used when loading from api)
  setSatellites: (satellites: Satellite[]) =>
    set(() => ({ satellites })),
  
  // remove a satellite by its index in the array
  removeSatellite: (index: number) =>
    set((state) => ({ satellites: state.satellites.filter((_, i) => i !== index) })),
  
  // update the threats list, keeping track of which ones have already been executed
  setThreats: (threats: Threat[]) => 
    set((state) => {
      // preserve executed status for threats that still exist
      const newExecutedIds = new Set<string>();
      threats.forEach(threat => {
        if (state.executedThreatIds.has(threat.id)) {
          newExecutedIds.add(threat.id);
        }
      });
      return { threats, executedThreatIds: newExecutedIds };
    }),
  
  // add a new entry to the action log (newest first)
  logAction: (entry) =>
    set((s) => ({actionLog: [entry, ...s.actionLog]})),
  
  // mark a threat as having been executed (prevents duplicate executions)
  markThreatExecuted: (threatId: string) =>
    set((state) => {
      const newSet = new Set(state.executedThreatIds);
      newSet.add(threatId);
      return { executedThreatIds: newSet };
    }),
  
  // cache debris tle data (only loaded when "load realtime data" is clicked)
  setDebrisCache: (debris: TleRecord[]) =>
    set(() => ({ debrisCache: debris })),
}));
