import type { RawEvent } from '../storage/events';
import { appendEvent } from '../storage/events';

type AuthorRef = {
  id?: string;
  name?: string;
  createdAt?: number | string;
};

type PostRef = {
  id?: string;
  authorId?: string;
  author?: string;
  createdAt?: number | string;
  url?: string;
  crosspostParentId?: string;
};

const toMs = (raw: number | string | undefined): number => {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === 'number') return raw < 1e12 ? raw * 1000 : raw;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const authorName = (a: AuthorRef | undefined): string =>
  a?.name ?? a?.id ?? 'unknown';

const authorCreatedAt = (a: AuthorRef | undefined): number =>
  toMs(a?.createdAt);

export const ingestPostSubmit = async (
  sub: string,
  payload: unknown
): Promise<void> => {
  const p = payload as { post?: PostRef; author?: AuthorRef };
  if (!p?.post?.id) return;
  const event: RawEvent = {
    kind: 'post',
    id: p.post.id,
    author: authorName(p.author),
    authorCreatedAt: authorCreatedAt(p.author),
    postedAt: toMs(p.post.createdAt) || Date.now(),
    threadId: p.post.id,
    url: p.post.url,
    crosspostParentId: p.post.crosspostParentId,
  };
  await appendEvent(sub, event);
};

export const ingestCommentSubmit = async (
  sub: string,
  payload: unknown
): Promise<void> => {
  const p = payload as {
    comment?: {
      id?: string;
      parentId?: string;
      postId?: string;
      createdAt?: number | string;
    };
    author?: AuthorRef;
  };
  if (!p?.comment?.id) return;
  const event: RawEvent = {
    kind: 'comment',
    id: p.comment.id,
    author: authorName(p.author),
    authorCreatedAt: authorCreatedAt(p.author),
    postedAt: toMs(p.comment.createdAt) || Date.now(),
    parentId: p.comment.parentId ?? p.comment.postId ?? '',
    threadId: p.comment.postId ?? p.comment.parentId ?? '',
  };
  await appendEvent(sub, event);
};

export const ingestReport = async (
  sub: string,
  payload: unknown
): Promise<void> => {
  const p = payload as {
    targetPost?: { id?: string; authorId?: string };
    targetComment?: { id?: string; authorId?: string };
    reason?: string;
    user?: AuthorRef;
  };
  const targetId = p?.targetComment?.id ?? p?.targetPost?.id;
  if (!targetId) return;
  const event: RawEvent = {
    kind: 'report',
    id: `${targetId}:${Date.now()}`,
    reporter: authorName(p.user),
    targetUser:
      p?.targetComment?.authorId ?? p?.targetPost?.authorId ?? 'unknown',
    targetId,
    reason: p.reason ?? '',
    reportedAt: Date.now(),
  };
  await appendEvent(sub, event);
};

export const ingestModAction = async (
  sub: string,
  payload: unknown
): Promise<void> => {
  const p = payload as {
    action?: string;
    moderator?: AuthorRef;
    targetPost?: { id?: string };
    targetComment?: { id?: string };
    targetUser?: AuthorRef;
    actionedAt?: number | string;
  };
  const event: RawEvent = {
    kind: 'modAction',
    actor: authorName(p?.moderator),
    action: p?.action ?? 'unknown',
    targetId:
      p?.targetComment?.id ?? p?.targetPost?.id ?? authorName(p?.targetUser),
    at: toMs(p?.actionedAt) || Date.now(),
  };
  await appendEvent(sub, event);
};
