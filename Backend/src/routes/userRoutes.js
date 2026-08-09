import express from "express";
const router = express.Router();

import { signupSchema, loginShcema, updateUserSchema } from "../schema/user.js";
import validateUser from "../middlewares/validateUser.js";
import authUser from "../middlewares/authUser.js"
import { showRoutes } from "../utils/utils.js";

import showAllUsers from "../controllers/users/showUsers.js";
import signup from "../controllers/users/signup.js";
import login from "../controllers/users/login.js";
import logout from "../controllers/users/logout.js";
import restoreSession from "../controllers/users/restoreSession.js";
import updateUser from "../controllers/users/updateUser.js";
import deleteUser from "../controllers/users/deleteUser.js";


router.get("/", showRoutes, showAllUsers);

router.post("/login", showRoutes, validateUser(loginShcema), login);
router.post("/signup", showRoutes, validateUser(signupSchema), signup, login);

router.post("/logout", showRoutes, authUser, logout);
router.get("/restoreSession", showRoutes, authUser, restoreSession);

router.get("/:id", showRoutes, authUser);
router.put("/:id", showRoutes, authUser, validateUser(updateUserSchema), updateUser);
router.delete("/:id", showRoutes, authUser, deleteUser);


export default router;