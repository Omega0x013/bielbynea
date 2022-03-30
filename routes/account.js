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
        // The action is to log in
        if (req.body.username && req.body.password) {
          // The request contains the correct form data
          try {
            // SELECT * FROM users WHERE username == "?";
            const data = await db.users.doc(req.body.username).get().then(
              (doc) => doc.data(),
            );
            // make a hash from the password salted by the username
            const hash = crypto.createHash("sha256").update(
              req.body.username + req.body.password,
            ).digest("base64");
            // the user has a correct hash
            if (data.hash == hash) {
              // make a new token
              const token = uuid4();
              // set the browser cookies to save the data on the client side
              res.cookie("username", req.body.username);
              res.cookie("token", token);
              res.cookie("nsfw", data.nsfw);
              res.cookie("moderator", data.moderator);
              // update the firestore with the new session token
              await db.users.doc(req.body.username).update({ token: token });
              // send the success message to the button
              res.status(200).json({ message: "success" });
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
         * Fulfils objective 1
         */
        /**
         * ACTION create
         * Create a new account
         * {
         *    username,
         *    password1,
         *    password2
         * }
         */

        // verify that the body contains the requisite information
        if (
          req.body && req.body.username && req.body.password1 &&
          req.body.password2
        ) {
          try {
            // check if a row with the same username exists
            // SELECT * FROM users WHERE username == "?";
            const doc = db.users.doc(req.body.username);
            if (!await doc.get().then((doc) => doc.exists)) {
              // check if the passwords match (also happens on frontend, this is backup)
              if (req.body.password1 == req.body.password2) {
                // generate the user's hash
                const hash = crypto.createHash("sha256").update(
                  req.body.username + req.body.password1,
                ).digest("base64");
                // generate the user's token
                const token = uuid4();
                // sanitise the user's bio
                const bio = req.body.bio
                  ? req.body.bio.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")
                    .replace("\n", "<br>")
                  : "No bio provided";

                // set cookies for browser
                res.cookie("username", req.body.username);
                res.cookie("token", token);
                res.cookie("nsfw", false);
                res.cookie("moderator", false);

                // set row in firestore
                await doc.set({
                  hash: hash,
                  bio: bio,
                  token: token,
                  nsfw: false,
                  moderator: false,
                  points: 3,
                });

                res.status(200).json({ message: "success" });
              } else {
                res.status(401).json({ error: "password-mismatch" });
              }
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
            // verify user
            const data = await db.users.doc(req.cookies.username).get().then(
              (doc) => doc.data(),
            );
            if (data.token == req.cookies.token && data.points > 0) {
              if (req.body) {
                const fields = {};
                // They are changing NSFW
                // only if they are trying to set the NSFW should it be updated
                if (
                  req.body.nsfw
                ) {
                  fields["nsfw"] = req.body.nsfw == "on";
                }

                // They are changing their password
                // verify that passwords are not null and are the same
                if (
                  req.body.password1
                ) {
                  if (req.body.password1 == req.body.password2) {
                    // generate hash from the new password
                    const newHash = crypto.createHash("sha256").update(
                      req.cookies.username + req.body.password1,
                    );
                    // check if the hashes are the same
                    if (newHash != data.hash) {
                      fields["hash"] = newHash;
                    } else {
                      res.status(400).json({ error: "same-password" });
                    }
                  } else {
                    res.status(400).json({ error: "invalid-details" });
                  }
                }

                // They are changing their bio
                if (req.body.bio) {
                  // sanitise bio
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
                  // update the row with the new fields
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
    }
  },
};
