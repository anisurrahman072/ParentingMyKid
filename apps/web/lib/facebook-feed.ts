/** Public-safe shapes returned to the browser for the landing Facebook feed. */

export type FacebookFeedPage = {
  name: string;
  pictureUrl: string | null;
};

export type FacebookFeedPost = {
  id: string;
  text: string;
  createdTime: string;
  permalinkUrl: string;
  imageUrl: string | null;
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  /** Post impressions when Insights is allowed; otherwise null. */
  viewCount: number | null;
};

export type FacebookFeedResponse = {
  configured: boolean;
  posts: FacebookFeedPost[];
  page: FacebookFeedPage | null;
  /** Short Graph API message when posts could not be loaded (token/permissions). */
  graphError?: string;
};
