/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import path from "path";
import crypto from "crypto";
import { v4 as uuid4 } from "uuid";

export default {
  get: async (req, res) => {
    if (req.accepts("html")) {
      /**
       * It's a browser
       */
      if (req.cookies.username && req.cookies.token) {
        try {
          const data = await db.users.doc(req.cookies.username).get().then(
            (doc) => doc.data(),
          );
          if (data.token == req.cookies.token) {
            res.sendFile(path.join(path.resolve() + "/static/account.html"));
            return;
          }
        } catch {
          res.sendFile(path.join(path.resolve() + "/static/login.html"));
          ["username", "token", "nsfw"].forEach((cookie) =>
            res.clearCookie(cookie)
          );
        }
      } else {
        res.sendFile(path.join(path.resolve() + "/static/login.html"));
      }
    } else if (req.accepts("json")) {
      /**
       * It's the JS
       */
      if (req.cookies.username && req.cookies.token) {
        try {
          const data = await db.users.doc(req.cookies.username).get().then(
            (doc) => doc.data(),
          );
          if (data.token == req.cookies.token) {
            res.status(200).json({
              username: data.username,
              bio: data.bio,
              nsfw: data.nsfw,
              points: data.points,
            });
          }
        } catch {
          res.status(401).json({ error: "invalid-credentials" });
        }
      } else {
        res.status(401).json({ error: "invalid-credentials" });
      }
    } else {
      /**
       * The server can't give a response in an acceptable type
       */
      res.status(406);
    }
  },
  post: async (req, res) => {
    /**
     * The body parsing middleware allows for both
     * - application/json
     * - application/x-www-form-urlencoded
     */
    res.type("application/json");
    switch (req.body.action) {
      case "login":
        if (req.body.username && req.body.password) {
          try {
            const data = await db.users.doc(req.body.username).get().then(
              (doc) => doc.data(),
            );
            const hash = crypto.createHash("sha256").update(
              req.body.username + req.body.password,
            ).digest("base64");
            if (data.hash == hash) {
              const token = uuid4();
              res.cookie("username", req.body.username);
              res.cookie("token", token);
              res.cookie("nsfw", data.nsfw);
              res.cookie("moderator", data.moderator);
              res.status(200).json({ message: "success" });
              await db.users.doc(req.body.username).update({ token: token });
            } else {
              res.status(400).json({ error: "invalid-login" });
            }
          } catch (e) {
            console.error(e.message);
            res.status(400).json({ error: "invalid-login" });
          }
        } else {
          res.status(400).json({ error: "invalid-login" });
        }
        break;
      case "create":
        /**
         * ACTION create
         * Create a new account
         * {
         *    username,
         *    password1,
         *    password2
         * }
         */
        if (
          req.body && req.body.username && req.body.password1 &&
          req.body.password2
        ) {
          try {
            const doc = db.users.doc(req.body.username);
            if (!await doc.get().then((doc) => doc.exists)) {
              const hash = crypto.createHash("sha256").update(
                req.body.username + req.body.password1,
              ).digest("base64");
              const token = uuid4();
              const bio = req.body.bio
                ? req.body.bio.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;")
                  .replace("\n", "<br>")
                : "No bio provided";

              res.cookie("username", req.body.username);
              res.cookie("token", token);
              res.cookie("nsfw", false);
              res.cookie("moderator", false);
              res.status(200).json({ message: "success" });

              await doc.set({
                hash: hash,
                bio: bio,
                token: token,
                nsfw: false,
                moderator: false,
                points: 3,
              });
            } else {
              res.status(401).json({ error: "user-exists" });
            }
          } catch (e) {
            console.error(e.message);
            res.status(500).json({ error: "internal-error" });
          }
        }
        break;
      case "set":
        /**
         * ACTION set
         * Update the details for the logged in user
         * {
         *    [nsfw,]
         *    [password1,]
         *    [password2,]
         *    [bio]
         * }
         */
        if (req.cookies.username && req.cookies.token) {
          try {
            const data = await db.users.doc(req.cookies.username).get().then(
              (doc) => doc.data(),
            );
            if (data.token == req.cookies.token && data.points > 0) {
              if (req.body) {
                const fields = {};
                // They are changing NSFW
                if (
                  req.body.nsfw
                ) {
                  fields["nsfw"] = req.body.nsfw == "on";
                }

                // They are changing their password
                if (
                  req.body.password1
                ) {
                  if (req.body.password1 == req.body.password2) {
                    const newHash = crypto.createHash("sha256").update(
                      req.cookies.username + req.body.password1,
                    );
                    if (newHash != data.hash) {
                      fields["hash"] = newHash;
                    } else {
                      res.status(400).json({ error: "invalid-details" });
                    }
                  } else {
                    res.status(400).json({ error: "invalid-details" });
                  }
                }

                // They are changing their bio
                if (req.body.bio) {
                  fields["bio"] = req.body.bio
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")
                    .replace("\n", "<br>");
                }

                // If it fails they've made a mistake
                try {
                  await db.users.doc(req.cookies.username).update(fields);
                  res.status(200).json({ message: "success" });
                } catch (e) {
                  console.error(e.message);
                  res.status(400).json({ error: "invalid-details" });
                }
              } else {
                res.status(400).json({ error: "invalid-details" });
              }
            }
          } catch (e) {
            console.error(e.message);
            res.status(401).json({ error: "invalid-credentials" });
          }
        } else {
          res.status(401).json({ error: "invalid-credentials" });
        }
        break;
      case "refresh":
        if (req.cookies.username && req.cookies.token) {
          try {
            const data = await db.users.doc(req.cookies.username).get().then(
              (doc) => doc.data(),
            );
            if (data.token == req.cookies.token) {
              res.cookie("nsfw", data.nsfw);
              res.cookie("moderator", data.moderator);
            }
          } catch {
            res.status(401).json({ error: "invalid-credentials" });
          }
        } else {
          res.status(401).json({ error: "invalid-credentials" });
        }
      default:
        res.status(400).json({ error: "invalid-action" });
    }
  },
};
