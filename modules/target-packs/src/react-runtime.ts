/** Shared emitted React lifecycle is also compiled by an independent consumer fixture. */
export const REACT_LIFECYCLE_SOURCE = `
type Presence = "removed" | "present" | "exiting";
function usePresence(open: boolean, duration: number, cleanup: number) {
  const [phase, setPhase] = React.useState<Presence>(open ? "present" : "removed");
  React.useEffect(() => {
    if (open && phase === "removed") setPhase("present");
    else if (!open && phase === "present") setPhase("exiting");
  }, [open, phase]);
  React.useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(() => setPhase("removed"), Math.min(duration, cleanup));
    return () => clearTimeout(timer);
  }, [phase, duration, cleanup]);
  return phase;
}
type HostState = { active: string | undefined; register: (id: string) => void; unregister: (id: string) => void };
const HostContext = React.createContext<HostState | null>(null);
function useHostEntry(present: boolean) {
  const host = React.useContext(HostContext); const id = React.useId();
  if (!host) throw new Error("Axiom Toast requires an explicit AxiomToastHost");
  const { register, unregister } = host;
  React.useEffect(() => { if (!present) return; register(id); return () => unregister(id); }, [present, id, register, unregister]);
  return host.active === id;
}
function useHostQueue(): HostState {
  const [queue, setQueue] = React.useState<string[]>([]);
  const register = React.useCallback((id: string) => setQueue(previous => previous.includes(id) ? previous : [...previous, id]), []);
  const unregister = React.useCallback((id: string) => setQueue(previous => previous.filter(item => item !== id)), []);
  return React.useMemo(() => ({ active: queue[0], register, unregister }), [queue, register, unregister]);
}
`;
