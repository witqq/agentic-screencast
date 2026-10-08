/** Bind Report's directed objects to the existing Screencast speech clock. */
import { anchorSeconds } from "./spotlight.js";
type Moments = typeof anchorSeconds;
interface CompositionControl { anchors(id?: string): string[]; bind(resolve: (anchor: string) => number, id?: string): void }
/** Injected after the stage, before the document; no author script or CSP edit. */
function installReportComposition(moment: Moments): void {
  const host = window as unknown as { __stage: { mount(scene: unknown): void }; __reportComposition?: CompositionControl };
  const mount = host.__stage.mount;
  host.__stage.mount = (raw: unknown): void => {
    const control = host.__reportComposition;
    const selected = raw as {target?: string};
    const target = control && selected.target ? document.querySelector(selected.target) : null;
    const id = target?.closest('[data-semantic="composition"]')?.getAttribute("data-composition-id") ?? undefined;
    mount(target?.matches('[data-semantic="composition"]') ? {...selected, __compositionFrame: true} : raw);
    if (control === undefined) return;
    const scene = raw as { duration: number; starts?: number[]; spoken?: number; beats?: number };
    const count = Math.max(1, scene.beats ?? scene.starts?.length ?? 1);
    const starts = scene.starts?.length ? scene.starts : Array.from({length:count},(_,i)=>scene.duration*i/count);
    const ends = starts.map((_,i)=>starts[i+1] ?? scene.spoken ?? scene.duration);
    const times = new Map<string,number>();
    for (const anchor of control.anchors(id)) {
      const beat = /^b(\d+)/u.exec(anchor);
      if (beat !== null && Number(beat[1]) > starts.length) throw new Error(`Report cue ${anchor} names a speech beat this scene does not have.`);
      times.set(anchor,Math.max(0,moment(anchor,starts,scene.duration,ends)));
    }
    control.bind(anchor=>{
      const time=times.get(anchor);
      if(time===undefined) throw new Error(`Unbound report composition cue: ${anchor}`);
      return time;
    }, id);
  };
}
export const REPORT_COMPOSITION_BRIDGE = `(${installReportComposition.toString()})(${anchorSeconds.toString()});`;
