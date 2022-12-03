import { bookmarksResponse } from "utils/config/api-response";
import { getSession } from 'next-auth/client';
import { getToken } from 'next-auth/jwt';
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
  res.send(await bookmarksResponse());
}
