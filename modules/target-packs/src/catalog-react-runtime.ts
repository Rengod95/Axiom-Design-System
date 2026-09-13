/** Generated runtime owns input/focus mechanics; values remain consumer controlled. */
export const CATALOG_REACT_RUNTIME = `
const CatalogOverlayContext = React.createContext(false);
export function AxiomOverlayHost({children}:{children:React.ReactNode}) { return <CatalogOverlayContext.Provider value={true}>{children}</CatalogOverlayContext.Provider>; }
function useCatalogOverlay() { if(!React.useContext(CatalogOverlayContext)) throw new Error("Axiom catalog overlays require an explicit AxiomOverlayHost"); }
function catalogMoveFocus(event:React.KeyboardEvent<HTMLElement>,selector:string) {
 const controls=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(selector)).filter(item=>!item.disabled);
 if(!controls.length)return; const current=controls.indexOf(document.activeElement as HTMLButtonElement);
 let next:number|undefined;
 if(event.key==="ArrowRight"||event.key==="ArrowDown")next=(current+1)%controls.length;
 else if(event.key==="ArrowLeft"||event.key==="ArrowUp")next=(current+controls.length-1)%controls.length;
 else if(event.key==="Home")next=0;else if(event.key==="End")next=controls.length-1;
 if(next!==undefined){event.preventDefault();controls[next]!.focus();}
}
function CatalogCheck({indeterminate,...props}:React.InputHTMLAttributes<HTMLInputElement>&{indeterminate:boolean}) {
 const ref=React.useRef<HTMLInputElement>(null);React.useEffect(()=>{if(ref.current)ref.current.indeterminate=indeterminate;},[indeterminate]);return <input ref={ref} {...props}/>;
}
`;
