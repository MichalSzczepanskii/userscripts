interface ListItem {
  lockupViewModel?: {
    contentId?: string;
    contentType?: string;
    metadata?: { lockupMetadataViewModel?: { title?: { content?: string } } };
  };
  continuationItemViewModel?: {
    continuationCommand?: { innertubeCommand?: { continuationCommand?: { token?: string } } };
  };
}

/** The parts of a `/youtubei/v1/browse` response for a playlist (`VL<id>`) or its continuation. */
export interface BrowseResponse {
  metadata?: { playlistMetadataRenderer?: { title?: string } };
  sidebar?: {
    playlistSidebarRenderer?: {
      items?: {
        playlistSidebarSecondaryInfoRenderer?: {
          videoOwner?: { videoOwnerRenderer?: { title?: { runs?: { text?: string }[] } } };
        };
      }[];
    };
  };
  contents?: {
    twoColumnBrowseResultsRenderer?: {
      tabs?: {
        tabRenderer?: {
          content?: { sectionListRenderer?: { contents?: { itemSectionRenderer?: { contents?: ListItem[] } }[] } };
        };
      }[];
    };
  };
  onResponseReceivedActions?: { appendContinuationItemsAction?: { continuationItems?: ListItem[] } }[];
}

export interface PlaylistVideo {
  id: string;
  title: string;
}

export interface PlaylistPage {
  title?: string;
  channel?: string;
  videos: PlaylistVideo[];
  /** Token for the next page of up to 100 videos. */
  token?: string;
}

export function parsePlaylistPage(json: BrowseResponse): PlaylistPage {
  const items =
    json.onResponseReceivedActions?.[0]?.appendContinuationItemsAction?.continuationItems ??
    json.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents ??
    [];
  const videos = items.flatMap(({ lockupViewModel: lockup }) =>
    lockup?.contentId && lockup.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO'
      ? [{ id: lockup.contentId, title: lockup.metadata?.lockupMetadataViewModel?.title?.content ?? lockup.contentId }]
      : [],
  );
  const owner = json.sidebar?.playlistSidebarRenderer?.items?.find((item) => item.playlistSidebarSecondaryInfoRenderer)
    ?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer;
  return {
    title: json.metadata?.playlistMetadataRenderer?.title,
    channel: owner?.title?.runs?.[0]?.text,
    videos,
    token: items.at(-1)?.continuationItemViewModel?.continuationCommand?.innertubeCommand?.continuationCommand?.token,
  };
}

/** Playlist header followed by each video's `toMarkdown` section (rendered at level 2). */
export function playlistMarkdown(
  playlist: { id: string; title: string; channel?: string },
  sections: string[],
): string {
  const fields = [
    `- URL: https://www.youtube.com/playlist?list=${playlist.id}`,
    playlist.channel && `- Channel: ${playlist.channel}`,
    `- Videos: ${sections.length}`,
  ].filter(Boolean);
  return `# ${playlist.title}\n\n${fields.join('\n')}\n\n${sections.join('\n')}`;
}

export function playlistFilename(title: string, withTimestamps: boolean): string {
  return `${title.replace(/[\\/:*?"<>|]/g, '_').trim()}${withTimestamps ? ' (z czasem)' : ''}.md`;
}

export function playlistMessage(total: number, missing: number): string {
  return `Pobrano ${total - missing}/${total}${missing ? `, ${missing} bez transkryptu` : ''}`;
}
