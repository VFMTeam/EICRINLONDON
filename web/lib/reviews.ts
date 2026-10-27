// Published customer reviews, newest first. Reviews sent through the website
// form are emailed to the team and only appear here once they are added.
export type Review = { name: string; service: string; rating: number; text: string };

export const reviews: Review[] = [];
