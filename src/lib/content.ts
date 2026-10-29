import siteJson from '../content/site.json';
import projectsJson from '../content/projects.json';

export type Link = { label: string; href: string };

export type Media =
  | { kind: 'video'; src: string; poster?: string; alt?: string }
  | { kind: 'image'; src: string; alt?: string }
  | { kind: 'demo'; demo: 'quantum' }
  | { kind: 'none'; note?: string };

export type Project = {
  id: string;
  title: string;
  blurb: string;
  stack: string;
  links: Link[];
  media: Media;
};

export type Page = 'home' | 'projects' | 'other';

export const pages: { id: Page; label: string; href: string }[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'projects', label: 'Projects', href: '/projects/' },
  { id: 'other', label: 'Other', href: '/other/' },
];

export const site = siteJson;
export const projects = projectsJson as Project[];

export type EntryType = 'post' | 'image' | 'project';
export const entryLabels: Record<EntryType, string> = { post: 'Post', image: 'Image', project: 'Project' };

type EditKind = 'text' | 'href' | 'media' | 'item' | 'add' | 'append' | 'body' | 'images';

export const edit = (kind: EditKind, address: string, extra: Record<string, string> = {}) =>
  import.meta.env.DEV
    ? { [`data-edit-${kind}`]: address, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`data-edit-${k}`, v])) }
    : {};

export const monthYear = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
