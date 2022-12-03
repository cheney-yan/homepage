import { bookmarksResponse } from "utils/config/api-response";
import { getSession } from 'next-auth/client';
import { getToken } from 'next-auth/jwt';
import createLogger from "utils/logger";

async function filterBookmarks(bookmarks, filter) {
  let bks = bookmarks.reduce(function (filtered, bookmark) {
    let bk = bookmark.bookmarks.filter(item => {
      if (item.tags==undefined || filter == undefined)
        return true
      return item.tags?.includes(filter)
    })
    if (bk.length > 0) {
      filtered.push({
        name: bookmark.name,
        bookmarks: bk
      })
    }
    return filtered;
  }, []);
  return bks
}
export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).end();
  }
  const secret = process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret, encryption: true });
  if (!token) {
    return res.status(403).end();
  }
  const { filter } = req.query;
  res.send(await filterBookmarks(await bookmarksResponse(), filter));
}
