import { describe, expect, it } from 'vitest';
import { copyMessage, formatTime, languageLabel, parseJson3, pickDefaultTrack, toMarkdown } from './format';

describe('formatTime', () => {
  it('formats minutes and hours', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(201_900)).toBe('3:21');
    expect(formatTime(3_725_000)).toBe('1:02:05');
  });
});

describe('parseJson3', () => {
  it('joins segments, collapses whitespace and drops empty events', () => {
    const json = {
      events: [
        { tStartMs: 0 },
        { tStartMs: 1200, segs: [{ utf8: 'All right, so here' }, { utf8: ' we are,\nin front' }] },
        { tStartMs: 3400, segs: [{ utf8: '\n' }] },
        { tStartMs: 5000, segs: [{ utf8: 'of the elephants' }] },
      ],
    };
    expect(parseJson3(json)).toEqual([
      { startMs: 1200, text: 'All right, so here we are, in front' },
      { startMs: 5000, text: 'of the elephants' },
    ]);
  });
});

describe('pickDefaultTrack', () => {
  const tracks = [
    { baseUrl: 'a', languageCode: 'en' },
    { baseUrl: 'b', languageCode: 'pl' },
  ];

  it('uses the default caption track of the default audio track', () => {
    expect(pickDefaultTrack({ captionTracks: tracks, audioTracks: [{ defaultCaptionTrackIndex: 1 }] })?.baseUrl).toBe(
      'b',
    );
  });

  it('falls back to the first listed track', () => {
    expect(pickDefaultTrack({ captionTracks: tracks, audioTracks: [{ captionTrackIndices: [0, 1] }] })?.baseUrl).toBe(
      'a',
    );
    expect(pickDefaultTrack(undefined)).toBeUndefined();
  });
});

describe('toMarkdown', () => {
  const video = {
    id: 'jNQXAC9IVRw',
    title: 'Me at the zoo',
    channel: 'jawed',
    published: '2005-04-23T20:31:52-07:00',
    language: languageLabel('en', 'asr'),
  };
  const cues = [
    { startMs: 1200, text: 'All right,' },
    { startMs: 65_000, text: 'cool.' },
  ];

  it('renders plain transcript', () => {
    expect(toMarkdown(video, cues, false)).toBe(
      '# Me at the zoo\n\n' +
        '- URL: https://www.youtube.com/watch?v=jNQXAC9IVRw\n- Channel: jawed\n- Published: 2005-04-23\n- Language: en (auto)\n\n' +
        '## Transcript\n\nAll right, cool.\n',
    );
  });

  it('renders timestamps, one cue per line', () => {
    expect(toMarkdown(video, cues, true)).toContain('## Transcript\n\n[0:01] All right,\n[1:05] cool.\n');
  });

  it('marks a missing transcript', () => {
    expect(toMarkdown({ id: 'x', title: 'T' }, [], false)).toBe(
      '# T\n\n- URL: https://www.youtube.com/watch?v=x\n\n## Transcript\n\n_No transcript available._\n',
    );
    expect(toMarkdown({ id: 'x', title: 'T' }, [], false, 2, 'Transcript fetch failed.')).toContain(
      '### Transcript\n\n_Transcript fetch failed._\n',
    );
  });
});

describe('copyMessage', () => {
  it('confirms a copied transcript', () => {
    expect(copyMessage(true, true, false)).toBe('Skopiowano');
    expect(copyMessage(true, true, true)).toBe('Skopiowano (z czasem)');
  });

  it('tells a video without captions from a broken fetch', () => {
    for (const withTimestamps of [false, true]) {
      expect(copyMessage(false, false, withTimestamps)).toBe('Brak transkryptu, skopiowano tylko nagłówek');
      expect(copyMessage(false, true, withTimestamps)).toBe(
        'Napisy są, ale pobieranie nie działa — zaktualizuj skrypt',
      );
    }
  });
});
