/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Firestore } from "@google-cloud/firestore";

export default {
  get: async (req, res) => {
    /* The user wants to fetch a post */
    res.type("application/json");
    try {
      // SELECT * FROM posts WHERE id = "?";
      const data = await db.posts.doc(req.params.id).get().then((doc) =>
        Object.assign({ id: doc.id }, doc.data())
      );
      res.status(200).json(data);
    } catch (e) {
      // the lookup failed, which is usually because the post does not exist
      console.error(e);
      res.status(400).json({ error: "unknown-error" });
    }
  },
  post: async (req, res) => {
    res.type("application/json");
    // change behaviour based on which action the user wishes to take
    switch (req.body.action) {
      case "comment":
        // to add a comment to the post
        // check if the cookies and body contain the requisite components
        if (req.cookies.username && req.cookies.token && req.body.body) {
          try {
            // verify user
            const data = await db.users.doc(req.cookies.username).get().then(
              (doc) => doc.data(),
            );
            // check if user is logged in and is not banned
            if (data.token == req.cookies.token && data.points > 0) {
              // add a comment to the DB, sanitising the body
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
        // to change the content of the post
        // verify that the cookies contain the requisite info
        if (req.cookies.username && req.cookies.token) {
          try {
            // verify user
            const data = await db.users.doc(req.cookies.username).get().then(
              (doc) => doc.data(),
            );
            // check that the user is logged in and is not banned
            if (data.token == req.cookies.token && data.points > 0) {
              // change the body and the revision field
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
      // The user is logged in, so verify if their login details are valid
      try {
        const data = await db.users.doc(req.cookies.username).get().then(
          (doc) => doc.data(),
        );
        if (data.token == req.cookies.token && points > 0) {
          // The user is validly logged in, so check if they have the permission
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
