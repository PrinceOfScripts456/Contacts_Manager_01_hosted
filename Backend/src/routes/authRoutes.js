import express from "express";
const router = express.Router();

import userSchema from "../schema/user.js";
import validateUser from "../middlewares/validateUser.js";
import hashPassword from "../middlewares/hashPassword.js";
import { showRoutes } from "../utils/utils.js";

import showAllUsers from "../controllers/users/showUsers.js";
import createUser from "../controllers/users/registerUser.js";
import deleteUser from "../controllers/users/deleteUser.js";


router.get("/", showRoutes, showAllUsers);
router.post("/register", showRoutes, validateUser(userSchema), hashPassword, createUser);
router.delete("/:id", showRoutes, deleteUser);


export default router;