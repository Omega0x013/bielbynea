/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Firestore } from "@google-cloud/firestore";

export default {
  get: async (req, res) => {
    res.type("application/json");
    try {
      const data = await db.posts.doc(req.params.id).get().then((doc) =>
        Object.assign({ id: doc.id }, doc.data())
      );
      res.status(200).json(data);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "unknown-error" });
    }
  },
  post: async (req, res) => {
    res.type("application/json");
    switch (req.body.action) {
      case "comment":
        if (req.cookies.username && req.cookies.token && req.body.body) {
          try {
            const data = await db.users.doc(req.cookies.username).get().then(
              (doc) => doc.data(),
            );
            if (data.token == req.cookies.token && data.points > 0) {
              const doc = await db.comments.add({
                author: db.users.doc(req.cookies.username),
                post: db.posts.doc(req.params.id),
                body: req.body.body
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;")
                  .replace("\n", "<br>"),
                created: Firestore.Timestamp.fromDate(new Date()),
              });
              res.status(200).json({ message: "success" });
            } else {
              res.status(401).json({ error: "invalid-credentials" });
            }
          } catch (e) {
            console.error(e.message);
            res.status(401).json({ error: "invalid-credentials" });
          }
        } else {
          res.status(401).json({ error: "invalid-credentials" });
        }
        break;
      case "amend":
        if (req.cookies.username && req.cookies.token) {
          try {
            const data = await db.users.doc(req.cookies.username).get().then(
              (doc) => doc.data(),
            );
            if (data.token == req.cookies.token && data.points > 0) {
              await db.posts.doc(req.params.id).update({
                body: req.body.body
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;"),
                revision: Firestore.Timestamp.fromDate(new Date()),
              });
              res.status(200).json({ message: "success" });
            } else {
              res.status(401).json({ error: "invalid-credentials" });
            }
          } catch {
            res.status(401).json({ error: "invalid-credentials" });
          }
        } else {
          res.status(401).json({ error: "invalid-credentials" });
        }
        break;
      default:
        res.status(400).json({ error: "invalid-action" });
    }
  },
  delete: async (req, res) => {
    /**
     * Moderators can DELETE posts.
     */
    res.type("application/json");
    if (req.cookies.username && req.cookies.token) {
      try {
        const data = await db.users.doc(req.cookies.username).get().then(
          (doc) => doc.data(),
        );
        if (data.token == req.cookies.token && points > 0) {
          if (data.moderator) {
            await db.posts.doc(req.params.id).update({ remove: true });
            await db.users.doc(req.cookies.username).update({
              points: data.points - 1,
            });
            res.status(200).json({ message: "success" });
          } else {
            res.status(401).json({ error: "invalid-permissions" });
          }
        } else {
          res.status(401).json({ error: "invalid-credentials" });
        }
      } catch {
        res.status(401).json({ error: "invalid-credentials" });
      }
    } else {
      res.status(401).json({ error: "invalid-credentials" });
    }
  },
};
