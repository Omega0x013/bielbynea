/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path from "path";
import { Firestore } from "@google-cloud/firestore";

export default {
  get: (req, res) =>
    res.status(200).sendFile(path.join(path.resolve() + "/static/create.html")),
  post: async (req, res) => {
    res.type("application/json");
    if (req.body && req.body.title && req.body.body) {
      if (req.cookies.username && req.cookies.token) {
        try {
          const data = await db.users.doc(req.cookies.username).get().then(
            (doc) => doc.data(),
          );
          if (data.token == req.cookies.token && data.points > 0) {
            const now = Firestore.Timestamp.fromDate(new Date());
            const doc = await db.posts.add({
              title: req.body.title
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace("\n", "<br>"),
              body: req.body.body
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace("\n", "<br>"),
              nsfw: !!req.body.nsfw,
              author: db.users.doc(req.cookies.username),
              created: now,
              revised: now,
              removed: false,
            });
            res.status(200).json({ message: doc.id });
          }
        } catch (e) {
          console.error(e.message);
          res.status(401).json({ error: "invalid-credentials" });
        }
      } else {
        res.status(401).json({ error: "invalid-credentials" });
      }
    } else {
      res.status(400).json({ error: "invalid-details" });
    }
  },
};
