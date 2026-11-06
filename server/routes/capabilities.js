import { Router } from "express";
import { getCapabilities } from "../services/capabilities.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json(getCapabilities(process.env.APP_MODE));
});

export default router;

