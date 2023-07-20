import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(".", process.env.NODE_ENV !== "production" ? ".env.development" : ".env");
// setup environment
dotenv.config({
  path: envPath,
});

const { NODE_ENV } = process.env;

export { NODE_ENV };
