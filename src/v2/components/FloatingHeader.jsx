import Controls from './Controls';
import DotLogo from './DotLogo';

// Compact header. The hero's dot-letter logo flies up into `slotRef` as you scroll; once it lands (`docked`) the bar
// fades in around it, and the project controls join once the page's own filter bar has scrolled away (`stuck`).
// Hidden from assistive tech while it's off.
export default function FloatingHeader({ docked, stuck, slotRef, onTop, ...controls }) {
  return (
    <div className={`v2-float${docked ? ' on' : ''}${stuck ? ' stuck' : ''}`} aria-hidden={!docked} inert={docked ? undefined : true}>
      <div className="v2-float-in">
        <button type="button" className="v2-float-id" onClick={onTop} aria-label="Kevin Klein, back to the top">
          <img src="/v2img/kevin.webp" alt="" width="34" height="34" />
          <span ref={slotRef} className="v2-float-logo"><DotLogo still /></span>
          <small>Director, Head of Advertiser Analytics <span className="v2-at"><i>@</i> Microsoft</span></small>
        </button>
        <div className="v2-float-ctl" inert={stuck ? undefined : true}><Controls {...controls} compact /></div>
      </div>
    </div>
  );
}
