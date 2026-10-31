import { describe, expect, it } from 'vitest';
import { toMarkdown } from './format';
import {
  parsePlaylistPage,
  playlistFilename,
  playlistMarkdown,
  playlistMessage,
  type BrowseResponse,
} from './playlist';

const video = (id: string, title: string) => ({
  lockupViewModel: {
    contentId: id,
    contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
    metadata: { lockupMetadataViewModel: { title: { content: title } } },
  },
});
const more = (token: string) => ({
  continuationItemViewModel: { continuationCommand: { innertubeCommand: { continuationCommand: { token } } } },
});

describe('parsePlaylistPage', () => {
  it('reads the first page: title, owner, videos and the next-page token', () => {
    const json: BrowseResponse = {
      metadata: { playlistMetadataRenderer: { title: 'Coding Challenges' } },
      sidebar: {
        playlistSidebarRenderer: {
          items: [
            {},
            {
              playlistSidebarSecondaryInfoRenderer: {
                videoOwner: { videoOwnerRenderer: { title: { runs: [{ text: 'The Coding Train' }] } } },
              },
            },
          ],
        },
      },
      contents: {
        twoColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        itemSectionRenderer: {
                          contents: [
                            video('a', 'First'),
                            { lockupViewModel: { contentId: 'PLx', contentType: 'LOCKUP_CONTENT_TYPE_PLAYLIST' } },
                            video('b', 'Second'),
                            more('t1'),
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    };
    expect(parsePlaylistPage(json)).toEqual({
      title: 'Coding Challenges',
      channel: 'The Coding Train',
      videos: [
        { id: 'a', title: 'First' },
        { id: 'b', title: 'Second' },
      ],
      token: 't1',
    });
  });

  it('reads a continuation page, which ends without a token', () => {
    const json: BrowseResponse = {
      onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [video('c', 'Third')] } }],
    };
    expect(parsePlaylistPage(json)).toEqual({ videos: [{ id: 'c', title: 'Third' }] });
  });
});

describe('playlistMarkdown', () => {
  it('puts the playlist header above video sections nested at level 2', () => {
    const sections = [toMarkdown({ id: 'a', title: 'First' }, [{ startMs: 0, text: 'Hi.' }], false, 2)];
    expect(playlistMarkdown({ id: 'PL1', title: 'List', channel: 'Me' }, sections)).toBe(
      '# List\n\n- URL: https://www.youtube.com/playlist?list=PL1\n- Channel: Me\n- Videos: 1\n\n' +
        '## First\n\n- URL: https://www.youtube.com/watch?v=a\n\n### Transcript\n\nHi.\n',
    );
  });
});

describe('playlistFilename', () => {
  it('replaces characters not allowed in file names and marks the timestamp variant', () => {
    expect(playlistFilename('React: hooks / state?', false)).toBe('React_ hooks _ state_.md');
    expect(playlistFilename('List', true)).toBe('List (z czasem).md');
  });
});

describe('playlistMessage', () => {
  it('counts videos without a transcript', () => {
    expect(playlistMessage(45, 3)).toBe('Pobrano 42/45, 3 bez transkryptu');
    expect(playlistMessage(10, 0)).toBe('Pobrano 10/10');
  });
});
