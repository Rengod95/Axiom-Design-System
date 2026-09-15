import type { StudioComponent } from "../../ads-core/src/index.ts";

/** React source remains standalone; the traversal only opens this component's intrinsic anchors. */
export const CATALOG_REACT_AUTHORED_RUNTIME = `
function catalogAuthoredTree(node:React.ReactNode,append:(partId:string)=>React.ReactNode,order:Record<string,string[]>):React.ReactNode {
  const flatten=(children:React.ReactNode):React.ReactNode[]=>React.Children.toArray(children).flatMap(child=>React.isValidElement(child)&&child.type===React.Fragment?flatten((child.props as {children?:React.ReactNode}).children):[child]);
  const visit=(children:React.ReactNode):React.ReactNode=>React.Children.map(children,child=>{
    if(!React.isValidElement(child)||(typeof child.type!=="string"&&child.type!==React.Fragment))return child;
    const element=child as React.ReactElement<{children?:React.ReactNode;"data-part"?:string}>;
    const partId=element.props["data-part"],nested=visit(element.props.children),extra=partId?append(partId):null;
    if(extra==null&&element.props.children===undefined)return element;
    const combined=[...flatten(nested),...flatten(extra)],sequence=order[partId!]??[];
    const positions=combined.flatMap((item,index)=>React.isValidElement(item)&&typeof(item.props as {"data-part"?:string})["data-part"]==="string"?[index]:[]);
    const ordered=positions.map(index=>combined[index]!).sort((a,b)=>sequence.indexOf((a as React.ReactElement<{"data-part":string}>).props["data-part"])-sequence.indexOf((b as React.ReactElement<{"data-part":string}>).props["data-part"]));
    positions.forEach((position,index)=>{combined[position]=ordered[index]!;});
    return React.cloneElement(element,{},combined);
  });
  const result=visit(node);return Array.isArray(result)&&result.length===1?result[0]:result;
}
`;

/** Authored children are templates; collection anchors instantiate them once per item key. */
export function catalogReactAuthored(component: StudioComponent, composition: { render(partId: string): string }): { hooks: string; wrap(output: string): string } {
  const design = component.web, catalog = component.catalog!;
  const custom = (id: string) => component.parts.find(part => part.id === id)?.elementKind !== undefined;
  const render = (partId: string): string => {
    const part = component.parts.find(part => part.id === partId)!;
    const tag = design.elements?.[part.id] ?? (part.elementKind === "text" ? "span" : "div");
    const slot = catalog.slots.find(slot => slot.ownerPartRef === part.id);
    const text = part.text === undefined ? "" : `{${JSON.stringify(part.text)}}`;
    const children = text + (design.layout[part.id]?.childOrder ?? []).map(render).join("") + composition.render(part.id);
    return `<${tag} key=${JSON.stringify(part.id)} data-part=${JSON.stringify(part.id)}>${slot ? `{${part.role}??(<>${children}</>)}` : children}</${tag}>`;
  };
  const anchors = component.parts.filter(part => !custom(part.id));
  const cases = anchors.flatMap(part => {
    const children = (design.layout[part.id]?.childOrder ?? []).filter(custom).map(render).join("") + composition.render(part.id);
    const slot = catalog.slots.find(slot => slot.ownerPartRef === part.id);
    return children ? [`case ${JSON.stringify(part.id)}:return ${slot ? `${part.role}!=null?null:` : ""}<>${children}</>;`] : [];
  });
  const order = Object.fromEntries(Object.entries(design.layout).map(([id, layout]) => [id, layout.childOrder]));
  return { hooks: `const axiomAuthoredChildren=(partId:string):React.ReactNode=>{switch(partId){${cases.join("")}default:return null;}};`, wrap: output => `catalogAuthoredTree(${output},axiomAuthoredChildren,${JSON.stringify(order)})` };
}
