import * as React from 'react';
import {
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningFill,
  RiErrorWarningLine,
  RiPlayFill,
  RiTempColdLine,
} from 'react-icons/ri';
import { IMG, type Media } from './recipe-data';

/** The pieces the overview and cook mode both draw. */

export function Warn({ children, kind = 'warn' }: { children: React.ReactNode; kind?: 'warn' | 'allergen' }): React.ReactElement {
  return (
    <div className={`note-block n-${kind}`}>
      <span className="ico">
        {kind === 'allergen' ? (
          <RiErrorWarningFill className="i" aria-hidden="true" />
        ) : (
          <RiAlertLine className="i" aria-hidden="true" />
        )}
      </span>
      <div>
        <span className="label">{kind === 'allergen' ? 'Allergen' : 'Warning'}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function CritLimit(): React.ReactElement {
  return (
    <div className="crit">
      <h3 className="crit-h">
        <RiTempColdLine className="i i-sm" aria-hidden="true" />
        Critical limit
      </h3>
      <div className="crit-b">
        <p className="crit-num">4&nbsp;°C (39&nbsp;°F) or below</p>
        <p className="crit-sub">Into the walk-in within 30 minutes of finishing. Check before service.</p>
        <dl className="crit-parts">
          <div className="crit-part">
            <dt className="crit-lbl">How to check</dt>
            <dd>Probe the centre of the pan with a sanitised thermometer. Record on the Cold Holding Log.</dd>
          </div>
          <div className="crit-part breach">
            <dt className="crit-lbl">
              <RiErrorWarningLine className="i i-sm" aria-hidden="true" />
              If it is above 4&nbsp;°C
            </dt>
            <dd>Discard. Guacamole is not reheated, so there is no way to bring it back. Tell the chef on duty.</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** What the thumbnail says it opens, for a screen reader. */
export function mediaWord(m: Media): string {
  if (m.kind === 'clip') return `the video clip, ${m.len}`;
  if (m.kind === 'compare') return 'the right and wrong photos';
  return 'the photo';
}

/**
 * The step's picture at the size of a line: enough to recognise, and the way
 * into cook mode, where it is full size. A clip says it moves and how long; the
 * pair shows both halves.
 */
export function Thumb({ media, onOpen, label }: { media: Media; onOpen: () => void; label: string }): React.ReactElement {
  return (
    <button type="button" className={media.kind === 'compare' ? 'step-thumb is-pair' : 'step-thumb'} aria-label={label} onClick={onOpen}>
      {media.kind === 'compare' ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${IMG}/${media.ok.src}`} alt="" loading="lazy" className="ok" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${IMG}/${media.no.src}`} alt="" loading="lazy" className="no" />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${IMG}/${media.src}`} alt="" loading="lazy" />
      )}
      {media.kind === 'clip' ? (
        <span className="badge">
          <RiPlayFill className="i i-sm" aria-hidden="true" />
          {media.len}
        </span>
      ) : null}
    </button>
  );
}

/** The step's picture at full width, on its cook-mode screen. */
export function BigMedia({ media }: { media: Media }): React.ReactElement {
  if (media.kind === 'compare') {
    return (
      <div className="cook-media cook-pair">
        {(['ok', 'no'] as const).map((k) => (
          <figure key={k} className={k}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${IMG}/${media[k].src}`} alt={media[k].alt} width={800} height={600} />
            <figcaption>
              {k === 'ok' ? <RiCheckLine className="i i-sm" aria-hidden="true" /> : <RiCloseLine className="i i-sm" aria-hidden="true" />}
              {k === 'ok' ? 'Correct' : 'Over-mashed'}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <figure className="cook-media">
      <div className="frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${IMG}/${media.src}`} alt={media.alt} width={1200} height={900} />
        {media.kind === 'clip' ? (
          <>
            <button className="play" type="button" aria-label={`Play this step's clip, ${media.len}`}>
              <RiPlayFill className="i i-lg" aria-hidden="true" />
            </button>
            <span className="dur">{media.len}</span>
          </>
        ) : null}
      </div>
      {media.kind === 'photo' && media.caption ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  );
}
