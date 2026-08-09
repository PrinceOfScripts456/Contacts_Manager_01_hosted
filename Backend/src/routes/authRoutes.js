import express from "express";
const router = express.Router();

import userSchema from "../schema/user.js";
import validateUser from "../middlewares/validateUser.js";
import { showRoutes } from "../utils/utils.js";

import showAllUsers from "../controllers/users/showUsers.js";
import signup from "../controllers/users/signup.js";
import login from "../controllers/users/login.js";
import deleteUser from "../controllers/users/deleteUser.js";


router.get("/", showRoutes, showAllUsers);
router.post("/signup", showRoutes, validateUser(userSchema), signup);
router.post("/login", showRoutes, login);
router.delete("/:id", showRoutes, deleteUser);


export default router;